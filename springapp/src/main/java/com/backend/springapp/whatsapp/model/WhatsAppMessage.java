package com.backend.springapp.whatsapp.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

/**
 * Represents an incoming WhatsApp message from Twilio webhook
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WhatsAppMessage {
    
    // Message identifiers
    private String messageSid;
    private String accountSid;
    
    // Sender info
    private String from;          // whatsapp:+919876543210
    private String to;            // whatsapp:+14155238886 (Twilio number)
    
    // Message content
    private String body;          // Text message
    
    // Media (images, documents) - from Twilio webhook
    private int numMedia;
    private String mediaUrl0;
    private String mediaContentType0;
    
    // ===== IMAGE PROCESSING RESULTS (populated after webhook processing) =====
    
    /**
     * S3 object key after image is uploaded from Twilio.
     * Set by WhatsAppWebhookController.handleMediaMessage()
     */
    private String imageS3Key;
    
    /**
     * Raw image bytes (fetched from Twilio).
     * Transient - not persisted, used only during request processing.
     * Passed to agent for immediate AI analysis.
     */
    private byte[] imageBytes;
    
    /**
     * Normalized MIME type of the image.
     */
    private String imageMimeType;
    
    /**
     * Status/note about image processing.
     * E.g., "Image stored successfully", "Unsupported media type", etc.
     */
    private String imageProcessingNote;
    
    // Location (if shared)
    private Double latitude;
    private Double longitude;
    private String address;       // Formatted address if available
    
    // Profile info
    private String profileName;   // WhatsApp display name
    
    // Message metadata
    private String waId;          // WhatsApp ID (phone number without +)
    private String smsStatus;
    
    /**
     * Extract clean phone number without whatsapp: prefix
     */
    public String getCleanPhoneNumber() {
        if (from == null) return null;
        return from.replace("whatsapp:", "");
    }
    
    /**
     * Check if message contains location
     */
    public boolean hasLocation() {
        return latitude != null && longitude != null;
    }
    
    /**
     * Check if message contains media
     */
    public boolean hasMedia() {
        return numMedia > 0;
    }
    
    /**
     * Check if message has a processed image ready for AI analysis
     */
    public boolean hasProcessedImage() {
        return imageS3Key != null && !imageS3Key.isBlank();
    }
    
    /**
     * Check if image bytes are available (for immediate AI analysis)
     */
    public boolean hasImageBytes() {
        return imageBytes != null && imageBytes.length > 0;
    }
    
    /**
     * Check if message is empty or just whitespace
     */
    public boolean isEmpty() {
        return body == null || body.isBlank();
    }
}
