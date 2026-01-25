package com.backend.springapp.whatsapp.controller;

import com.backend.springapp.whatsapp.model.WhatsAppMessage;
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
     */
    private void processAndReplyAsync(WhatsAppMessage message, String replyTo) {
        try {
            // Process message with AI (can take 20-60 seconds for thinking models)
            String response = agentService.processMessage(message);
            
            // Send response via Twilio API (not TwiML)
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
