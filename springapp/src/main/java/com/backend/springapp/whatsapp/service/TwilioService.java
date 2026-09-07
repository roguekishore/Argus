package com.backend.springapp.whatsapp.service;

import com.backend.springapp.whatsapp.config.TwilioConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Service
@RequiredArgsConstructor
@Slf4j
public class TwilioService {

    private final TwilioConfig twilioConfig;

    private static final int MAX_MESSAGE_LENGTH = 1600;
    private static final HttpClient HTTP_CLIENT = HttpClient.newHttpClient();

    public String sendMessage(String toPhoneNumber, String messageBody) {
        if (!twilioConfig.isConfigured()) {
            log.warn("Twilio not configured - message not sent to {}", toPhoneNumber);
            return null;
        }

        try {
            String to = toPhoneNumber.startsWith("whatsapp:") ? toPhoneNumber : "whatsapp:" + toPhoneNumber;
            if (messageBody.length() > MAX_MESSAGE_LENGTH) {
                messageBody = messageBody.substring(0, MAX_MESSAGE_LENGTH - 20) + "\n\n[Message truncated]";
            }

            String sid = postToTwilio(to, twilioConfig.getWhatsappNumber(), messageBody, null);
            log.info("WhatsApp message sent to {}, SID: {}", toPhoneNumber, sid);
            return sid;

        } catch (Exception e) {
            log.error("Failed to send WhatsApp message to {}: {}", toPhoneNumber, e.getMessage());
            return null;
        }
    }

    public String sendMessageWithMedia(String toPhoneNumber, String messageBody, String mediaUrl) {
        if (!twilioConfig.isConfigured()) {
            log.warn("Twilio not configured - message not sent");
            return null;
        }

        try {
            String to = toPhoneNumber.startsWith("whatsapp:") ? toPhoneNumber : "whatsapp:" + toPhoneNumber;
            String sid = postToTwilio(to, twilioConfig.getWhatsappNumber(), messageBody, mediaUrl);
            log.info("WhatsApp message with media sent to {}, SID: {}", toPhoneNumber, sid);
            return sid;

        } catch (Exception e) {
            log.error("Failed to send WhatsApp message with media: {}", e.getMessage());
            return null;
        }
    }

    public void sendLongMessage(String toPhoneNumber, String messageBody) {
        if (messageBody.length() <= MAX_MESSAGE_LENGTH) {
            sendMessage(toPhoneNumber, messageBody);
            return;
        }

        String[] parts = messageBody.split("\n\n");
        StringBuilder current = new StringBuilder();

        for (String part : parts) {
            if (current.length() + part.length() + 2 > MAX_MESSAGE_LENGTH) {
                if (current.length() > 0) {
                    sendMessage(toPhoneNumber, current.toString().trim());
                    current = new StringBuilder();
                }
            }
            current.append(part).append("\n\n");
        }

        if (current.length() > 0) {
            sendMessage(toPhoneNumber, current.toString().trim());
        }
    }

    public String generateTwimlResponse(String messageBody) {
        String escaped = messageBody
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
            """.formatted(escaped);
    }

    public String generateEmptyTwimlResponse() {
        return """
            <?xml version="1.0" encoding="UTF-8"?>
            <Response></Response>
            """;
    }

    // Sends via Twilio Messages REST API using java.net.http (no SDK)
    private String postToTwilio(String to, String from, String body, String mediaUrl) throws Exception {
        String url = "https://api.twilio.com/2010-04-01/Accounts/"
            + twilioConfig.getAccountSid() + "/Messages.json";

        StringBuilder form = new StringBuilder();
        form.append("To=").append(encode(to));
        form.append("&From=").append(encode(from));
        form.append("&Body=").append(encode(body));
        if (mediaUrl != null && !mediaUrl.isBlank()) {
            form.append("&MediaUrl=").append(encode(mediaUrl));
        }

        String credentials = Base64.getEncoder().encodeToString(
            (twilioConfig.getAccountSid() + ":" + twilioConfig.getAuthToken())
                .getBytes(StandardCharsets.UTF_8));

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Authorization", "Basic " + credentials)
            .header("Content-Type", "application/x-www-form-urlencoded")
            .POST(HttpRequest.BodyPublishers.ofString(form.toString()))
            .build();

        HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new RuntimeException("Twilio API error: " + response.statusCode() + " " + response.body());
        }

        // Extract SID from JSON response (avoid pulling in extra JSON library)
        String responseBody = response.body();
        int sidStart = responseBody.indexOf("\"sid\":\"");
        if (sidStart >= 0) {
            sidStart += 7;
            int sidEnd = responseBody.indexOf("\"", sidStart);
            return responseBody.substring(sidStart, sidEnd);
        }
        return null;
    }

    private static String encode(String value) throws Exception {
        return java.net.URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
