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
    
    // Media (images, documents)
    private int numMedia;
    private String mediaUrl0;
    private String mediaContentType0;
    
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
     * Check if message is empty or just whitespace
     */
    public boolean isEmpty() {
        return body == null || body.isBlank();
    }
}
