package com.backend.springapp.whatsapp.config;

import com.twilio.Twilio;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/**
 * Twilio configuration and initialization
 */
@Configuration
@Getter
public class TwilioConfig {
    
    @Value("${twilio.account.sid:}")
    private String accountSid;
    
    @Value("${twilio.auth.token:}")
    private String authToken;
    
    @Value("${twilio.whatsapp.number:whatsapp:+14155238886}")
    private String whatsappNumber;
    
    @Value("${twilio.enabled:false}")
    private boolean enabled;
    
    @PostConstruct
    public void init() {
        if (enabled && !accountSid.isBlank() && !authToken.isBlank()) {
            Twilio.init(accountSid, authToken);
            System.out.println("✅ Twilio initialized successfully");
        } else {
            System.out.println("⚠️ Twilio not configured - WhatsApp features disabled");
            System.out.println("   Set twilio.enabled=true and provide credentials in application.properties");
        }
    }
    
    public boolean isConfigured() {
        return enabled && !accountSid.isBlank() && !authToken.isBlank();
    }
}
