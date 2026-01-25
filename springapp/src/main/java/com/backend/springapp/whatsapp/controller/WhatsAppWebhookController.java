package com.backend.springapp.whatsapp.controller;

import com.backend.springapp.service.S3StorageService;
import com.backend.springapp.whatsapp.model.WhatsAppMessage;
import com.backend.springapp.whatsapp.service.TwilioMediaService;
import com.backend.springapp.whatsapp.service.TwilioService;
import com.backend.springapp.whatsapp.service.WhatsAppAgentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.CompletableFuture;

/**
 * Webhook controller for Twilio WhatsApp messages.
 * 
 * Twilio sends POST requests here when users send WhatsApp messages.
 * Configure this URL in Twilio Console:
 *   https://your-domain.com/api/whatsapp/webhook
 */
@RestController
@RequestMapping("/api/whatsapp")
@RequiredArgsConstructor
@Slf4j
public class WhatsAppWebhookController {
    
    private final WhatsAppAgentService agentService;
    private final TwilioService twilioService;
    private final TwilioMediaService twilioMediaService;
    private final S3StorageService s3StorageService;
    
    /**
     * Main webhook endpoint for incoming WhatsApp messages
     * 
     * Twilio sends form-urlencoded POST with these fields:
     * - From: whatsapp:+919876543210
     * - To: whatsapp:+14155238886
     * - Body: message text
     * - MessageSid: unique message ID
     * - NumMedia: number of media attachments
     * - Latitude/Longitude: if location shared
     */
    @PostMapping(value = "/webhook", 
                 consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE,
                 produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> handleIncomingMessage(
            @RequestParam(value = "From", required = false) String from,
            @RequestParam(value = "To", required = false) String to,
            @RequestParam(value = "Body", required = false) String body,
            @RequestParam(value = "MessageSid", required = false) String messageSid,
            @RequestParam(value = "AccountSid", required = false) String accountSid,
            @RequestParam(value = "NumMedia", required = false, defaultValue = "0") int numMedia,
            @RequestParam(value = "MediaUrl0", required = false) String mediaUrl0,
            @RequestParam(value = "MediaContentType0", required = false) String mediaContentType0,
            @RequestParam(value = "Latitude", required = false) Double latitude,
            @RequestParam(value = "Longitude", required = false) Double longitude,
            @RequestParam(value = "Address", required = false) String address,
            @RequestParam(value = "ProfileName", required = false) String profileName,
            @RequestParam(value = "WaId", required = false) String waId
    ) {
        log.info("📩 Received WhatsApp message from: {} | Body: {}", from, body);
        
        // Build message object
        WhatsAppMessage message = WhatsAppMessage.builder()
            .from(from)
            .to(to)
            .body(body != null ? body : "")
            .messageSid(messageSid)
            .accountSid(accountSid)
            .numMedia(numMedia)
            .mediaUrl0(mediaUrl0)
            .mediaContentType0(mediaContentType0)
            .latitude(latitude)
            .longitude(longitude)
            .address(address)
            .profileName(profileName)
            .waId(waId)
            .build();
        
        // Return IMMEDIATELY to Twilio (avoid 15-sec timeout)
        // Process async and send response via Twilio API
        CompletableFuture.runAsync(() -> processAndReplyAsync(message, from));
        
        log.info("📤 Returning empty TwiML immediately, will send response async");
        return ResponseEntity.ok(twilioService.generateEmptyTwimlResponse());
    }
    
    /**
     * Process message asynchronously and send reply via Twilio API
     * This avoids the 15-second webhook timeout for slow AI models
     * 
     * MEDIA HANDLING (NEW):
     * When numMedia > 0, this method:
     * 1. Fetches image bytes from Twilio MediaUrl (authenticated)
     * 2. Uploads to S3 for permanent storage
     * 3. Passes S3 key to agent service for AI analysis
     */
    private void processAndReplyAsync(WhatsAppMessage message, String replyTo) {
        try {
            // STEP 1: Handle media if present (fetch from Twilio, upload to S3)
            if (message.hasMedia() && message.getMediaUrl0() != null) {
                handleMediaMessage(message);
            }
            
            // STEP 2: Process message with AI agent (now includes image context)
            String response = agentService.processMessage(message);
            
            // STEP 3: Send response via Twilio API (not TwiML)
            String sid = twilioService.sendMessage(replyTo, response);
            if (sid != null) {
                log.info("✅ Async reply sent to {}, SID: {}", replyTo, sid);
            } else {
                log.error("❌ Failed to send async reply to {}", replyTo);
            }
            
        } catch (Exception e) {
            log.error("❌ Error in async processing: {}", e.getMessage(), e);
            // Try to send error message
            twilioService.sendMessage(replyTo, "Sorry, something went wrong. Please try again.");
        }
    }

    /**
     * Handle media message: fetch from Twilio, upload to S3.
     * 
     * WHY THIS APPROACH:
     * - Twilio MediaUrls expire (especially in free tier sandbox)
     * - We need to store images permanently for evidence
     * - Gemini API cannot fetch URLs directly, needs bytes
     * - S3 provides secure, durable storage
     * 
     * The image S3 key is stored in the message for agent processing.
     */
    private void handleMediaMessage(WhatsAppMessage message) {
        try {
            String mediaUrl = message.getMediaUrl0();
            String contentType = message.getMediaContentType0();
            
            // Validate image type
            if (!twilioMediaService.isSupportedImageType(contentType)) {
                log.warn("⚠️ Unsupported media type: {}. Only images are supported.", contentType);
                message.setImageProcessingNote("Unsupported media type: " + contentType);
                return;
            }
            
            log.info("📷 Processing WhatsApp image: type={}", contentType);
            
            // Step 1: Fetch image bytes from Twilio (authenticated)
            byte[] imageBytes = twilioMediaService.fetchMediaBytes(mediaUrl);
            if (imageBytes == null || imageBytes.length == 0) {
                log.error("❌ Failed to fetch image from Twilio");
                message.setImageProcessingNote("Failed to fetch image");
                return;
            }
            
            // Step 2: Upload to S3 (complaint ID not known yet - will be linked later)
            String normalizedMimeType = twilioMediaService.normalizeContentType(contentType);
            String s3Key = s3StorageService.uploadImage(imageBytes, normalizedMimeType, null);
            
            if (s3Key == null) {
                log.error("❌ Failed to upload image to S3");
                message.setImageProcessingNote("Failed to store image");
                return;
            }
            
            // Step 3: Store S3 key and bytes in message for agent processing
            message.setImageS3Key(s3Key);
            message.setImageBytes(imageBytes);
            message.setImageMimeType(normalizedMimeType);
            message.setImageProcessingNote("Image stored successfully");
            
            log.info("✅ WhatsApp image processed: S3Key={} ({} bytes)", s3Key, imageBytes.length);
            
        } catch (Exception e) {
            log.error("❌ Error handling media message: {}", e.getMessage());
            message.setImageProcessingNote("Error: " + e.getMessage());
        }
    }
    
    /**
     * Status callback endpoint (optional)
     * Twilio calls this to update message delivery status
     */
    @PostMapping("/status")
    public ResponseEntity<String> handleStatusCallback(
            @RequestParam(value = "MessageSid", required = false) String messageSid,
            @RequestParam(value = "MessageStatus", required = false) String status,
            @RequestParam(value = "To", required = false) String to,
            @RequestParam(value = "ErrorCode", required = false) String errorCode
    ) {
        log.info("Message status update - SID: {}, Status: {}, To: {}", messageSid, status, to);
        
        if (errorCode != null) {
            log.warn("Message delivery error - SID: {}, ErrorCode: {}", messageSid, errorCode);
        }
        
        return ResponseEntity.ok("OK");
    }
    
    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("WhatsApp webhook is running");
    }
    
    /**
     * Test endpoint - simulate a message (for development)
     * POST /api/whatsapp/test
     * Body: { "phone": "+919876543210", "message": "Hello" }
     */
    @PostMapping("/test")
    public ResponseEntity<Object> testMessage(@RequestBody TestMessageRequest request) {
        log.info("Test message from: {} | Body: {}", request.phone(), request.message());
        
        WhatsAppMessage message = WhatsAppMessage.builder()
            .from("whatsapp:" + request.phone())
            .body(request.message())
            .build();
        
        String response = agentService.processMessage(message);
        
        return ResponseEntity.ok(new TestMessageResponse(
            request.phone(),
            request.message(),
            response
        ));
    }
    
    record TestMessageRequest(String phone, String message) {}
    record TestMessageResponse(String phone, String userMessage, String botResponse) {}
}
