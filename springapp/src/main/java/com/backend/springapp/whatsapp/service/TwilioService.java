package com.backend.springapp.whatsapp.service;

import com.backend.springapp.whatsapp.config.TwilioConfig;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Service for sending WhatsApp messages via Twilio
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TwilioService {
    
    private final TwilioConfig twilioConfig;
    
    // WhatsApp message character limit
    private static final int MAX_MESSAGE_LENGTH = 1600;
    
    /**
     * Send a WhatsApp message to a user
     * 
     * @param toPhoneNumber Phone number with country code (e.g., +919876543210)
     * @param messageBody Message text to send
     * @return Message SID if successful, null if failed
     */
    public String sendMessage(String toPhoneNumber, String messageBody) {
        if (!twilioConfig.isConfigured()) {
            log.warn("Twilio not configured - message not sent to {}", toPhoneNumber);
            log.info("Would have sent: {}", messageBody);
            return null;
        }
        
        try {
            // Ensure phone number has whatsapp: prefix
            String to = toPhoneNumber.startsWith("whatsapp:") 
                ? toPhoneNumber 
                : "whatsapp:" + toPhoneNumber;
            
            // Truncate if too long
            if (messageBody.length() > MAX_MESSAGE_LENGTH) {
                messageBody = messageBody.substring(0, MAX_MESSAGE_LENGTH - 20) + "\n\n[Message truncated]";
            }
            
            Message message = Message.creator(
                new PhoneNumber(to),
                new PhoneNumber(twilioConfig.getWhatsappNumber()),
                messageBody
            ).create();
            
            log.info("WhatsApp message sent to {}, SID: {}", toPhoneNumber, message.getSid());
            return message.getSid();
            
        } catch (Exception e) {
            log.error("Failed to send WhatsApp message to {}: {}", toPhoneNumber, e.getMessage());
            return null;
        }
    }
    
    /**
     * Send a message with media (image)
     * 
     * @param toPhoneNumber Phone number
     * @param messageBody Message text
     * @param mediaUrl URL of the media to attach
     * @return Message SID if successful
     */
    public String sendMessageWithMedia(String toPhoneNumber, String messageBody, String mediaUrl) {
        if (!twilioConfig.isConfigured()) {
            log.warn("Twilio not configured - message not sent");
            return null;
        }
        
        try {
            String to = toPhoneNumber.startsWith("whatsapp:") 
                ? toPhoneNumber 
                : "whatsapp:" + toPhoneNumber;
            
            Message message = Message.creator(
                new PhoneNumber(to),
                new PhoneNumber(twilioConfig.getWhatsappNumber()),
                messageBody
            )
            .setMediaUrl(java.util.List.of(java.net.URI.create(mediaUrl)))
            .create();
            
            log.info("WhatsApp message with media sent to {}, SID: {}", toPhoneNumber, message.getSid());
            return message.getSid();
            
        } catch (Exception e) {
            log.error("Failed to send WhatsApp message with media: {}", e.getMessage());
            return null;
        }
    }
    
    /**
     * Send multiple messages (for long responses)
     * Splits message at logical breakpoints
     */
    public void sendLongMessage(String toPhoneNumber, String messageBody) {
        if (messageBody.length() <= MAX_MESSAGE_LENGTH) {
            sendMessage(toPhoneNumber, messageBody);
            return;
        }
        
        // Split at double newlines if possible
        String[] parts = messageBody.split("\n\n");
        StringBuilder currentMessage = new StringBuilder();
        
        for (String part : parts) {
            if (currentMessage.length() + part.length() + 2 > MAX_MESSAGE_LENGTH) {
                // Send current message
                if (currentMessage.length() > 0) {
                    sendMessage(toPhoneNumber, currentMessage.toString().trim());
                    currentMessage = new StringBuilder();
                }
            }
            currentMessage.append(part).append("\n\n");
        }
        
        // Send remaining
        if (currentMessage.length() > 0) {
            sendMessage(toPhoneNumber, currentMessage.toString().trim());
        }
    }
    
    /**
     * Generate TwiML response for immediate reply in webhook
     * Use this for synchronous responses
     */
    public String generateTwimlResponse(String messageBody) {
        // Escape XML special characters
        String escapedBody = messageBody
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&apos;");
        
        return """
            <?xml version="1.0" encoding="UTF-8"?>
            <Response>
                <Message>%s</Message>
            </Response>
            """.formatted(escapedBody);
    }
    
    /**
     * Generate empty TwiML response (when sending async)
     */
    public String generateEmptyTwimlResponse() {
        return """
            <?xml version="1.0" encoding="UTF-8"?>
            <Response></Response>
            """;
    }
}
