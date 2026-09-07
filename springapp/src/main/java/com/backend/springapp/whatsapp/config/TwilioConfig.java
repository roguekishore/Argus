package com.backend.springapp.whatsapp.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

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

    public boolean isConfigured() {
        return enabled && !accountSid.isBlank() && !authToken.isBlank();
    }
}
