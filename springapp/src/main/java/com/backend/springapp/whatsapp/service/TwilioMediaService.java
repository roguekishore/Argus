package com.backend.springapp.whatsapp.service;

import com.backend.springapp.whatsapp.config.TwilioConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;

/**
 * Service to securely fetch media (images) from Twilio.
 * 
 * WHY THIS IS NEEDED:
 * - Twilio MediaUrl requires authentication to access
 * - Free tier sandbox uses temporary URLs that may expire
 * - We need to download the image bytes to upload to S3
 * - Gemini cannot fetch URLs directly - needs raw bytes
 * 
 * SECURITY:
 * - Uses Account SID and Auth Token for Basic Auth
 * - Does not expose media URLs to clients
 * - Fetches immediately on webhook to avoid URL expiration
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TwilioMediaService {

    private final TwilioConfig twilioConfig;
    private final RestTemplate restTemplate;

    // Twilio media URL timeout (max 2 hours for free tier)
    private static final int MAX_CONTENT_LENGTH = 10 * 1024 * 1024; // 10MB max

    /**
     * Fetch media bytes from Twilio MediaUrl using authenticated request.
     * 
     * @param mediaUrl The MediaUrl provided in webhook (e.g., MediaUrl0)
     * @return byte[] of the media content, or null if fetch fails
     */
    public byte[] fetchMediaBytes(String mediaUrl) {
        if (mediaUrl == null || mediaUrl.isBlank()) {
            log.warn("Cannot fetch media: URL is null or empty");
            return null;
        }

        if (!twilioConfig.isConfigured()) {
            log.warn("Twilio not configured - cannot fetch media");
            return null;
        }

        try {
            log.info("📥 Fetching media from Twilio: {}", maskUrl(mediaUrl));

            // Build authenticated request
            HttpHeaders headers = new HttpHeaders();
            headers.setBasicAuth(twilioConfig.getAccountSid(), twilioConfig.getAuthToken());
            headers.setAccept(java.util.List.of(MediaType.ALL));

            HttpEntity<Void> entity = new HttpEntity<>(headers);

            // Make request
            ResponseEntity<byte[]> response = restTemplate.exchange(
                mediaUrl,
                HttpMethod.GET,
                entity,
                byte[].class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                byte[] mediaBytes = response.getBody();
                
                // Check size
                if (mediaBytes.length > MAX_CONTENT_LENGTH) {
                    log.warn("Media too large: {} bytes (max: {})", mediaBytes.length, MAX_CONTENT_LENGTH);
                    return null;
                }

                log.info("✅ Media fetched successfully: {} bytes", mediaBytes.length);
                return mediaBytes;
            } else {
                log.error("❌ Failed to fetch media: status={}", response.getStatusCode());
                return null;
            }

        } catch (Exception e) {
            log.error("❌ Error fetching media from Twilio: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Get content type from media URL or infer from response headers.
     * Twilio typically provides this in MediaContentType0 parameter.
     * 
     * @param contentType The content type from webhook (e.g., MediaContentType0)
     * @return Normalized MIME type
     */
    public String normalizeContentType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return "image/jpeg"; // Default assumption
        }

        // Twilio sometimes sends with charset, extract just the mime type
        String normalized = contentType.toLowerCase().split(";")[0].trim();
        
        // Map common types
        return switch (normalized) {
            case "image/jpg" -> "image/jpeg";
            case "image/heic", "image/heif" -> "image/heic";
            default -> normalized;
        };
    }

    /**
     * Check if content type is a supported image type
     */
    public boolean isSupportedImageType(String contentType) {
        if (contentType == null) return false;
        
        String normalized = normalizeContentType(contentType);
        return normalized.startsWith("image/") && (
            normalized.equals("image/jpeg") ||
            normalized.equals("image/png") ||
            normalized.equals("image/gif") ||
            normalized.equals("image/webp") ||
            normalized.equals("image/heic")
        );
    }

    /**
     * Mask URL for logging (hide sensitive parts)
     */
    private String maskUrl(String url) {
        if (url == null) return "null";
        // Mask account SID in URL if present
        return url.replaceAll("AC[a-f0-9]{32}", "AC***");
    }
}
