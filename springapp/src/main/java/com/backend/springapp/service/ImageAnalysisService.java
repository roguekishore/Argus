package com.backend.springapp.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Service for AI-powered image analysis using Gemini 3 Pro's multimodal capabilities.
 * 
 * CRITICAL DESIGN DECISIONS:
 * 1. Images are sent as base64-encoded bytes (Gemini cannot fetch URLs directly)
 * 2. Analysis results are cached with the complaint (avoid repeated API calls)
 * 3. Analysis failures do NOT block complaint creation
 * 4. Supports async analysis for non-blocking operations
 * 
 * IMAGE ANALYSIS CAPABILITIES:
 * - Issue verification: Does the image match the complaint description?
 * - Safety risk detection: Exposed wires, open manholes, structural damage
 * - Severity assessment: Minor, moderate, severe, critical
 * - Priority recommendation: Based on visual evidence
 * - Authenticity check: Stock photos, unrelated images, screenshots
 */
@Service
@Slf4j
public class ImageAnalysisService {

    @Value("${gemini.api.key}")
    private String apiKey;

    // Gemini 3 Pro for multimodal analysis (supports images)
    private static final String GEMINI_VISION_URL = 
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.0-pro:generateContent";

    @Autowired
    private S3StorageService s3StorageService;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Analyze complaint image with text context.
     * Combines visual evidence with complaint description for comprehensive analysis.
     * 
     * @param imageBytes Raw image bytes (from S3 or direct upload)
     * @param mimeType   Image MIME type (required for proper encoding)
     * @param complaintText Complaint description for context
     * @param complaintLocation Location for additional context
     * @return ImageAnalysisResult with findings, or null if analysis fails
     */
    public ImageAnalysisResult analyzeImage(byte[] imageBytes, String mimeType, 
                                            String complaintText, String complaintLocation) {
        if (imageBytes == null || imageBytes.length == 0) {
            log.warn("Cannot analyze empty image bytes");
            return null;
        }

        try {
            String prompt = buildAnalysisPrompt(complaintText, complaintLocation);
            String response = callGeminiVisionAPI(imageBytes, mimeType, prompt);
            return parseAnalysisResponse(response);
            
        } catch (Exception e) {
            log.error("❌ Image analysis failed: {}", e.getMessage());
            // Return a fallback result instead of null to indicate analysis was attempted
            return ImageAnalysisResult.uncertain("Analysis failed: " + e.getMessage());
        }
    }

    /**
     * Analyze image by S3 key (fetches from S3 first).
     * Use this for existing complaints that already have images stored.
     */
    public ImageAnalysisResult analyzeImageByS3Key(String s3Key, String mimeType,
                                                    String complaintText, String complaintLocation) {
        if (s3Key == null || s3Key.isBlank()) {
            log.warn("Cannot analyze: no S3 key provided");
            return null;
        }

        byte[] imageBytes = s3StorageService.downloadImage(s3Key);
        if (imageBytes == null) {
            log.warn("Cannot analyze: failed to download image from S3");
            return null;
        }

        return analyzeImage(imageBytes, mimeType, complaintText, complaintLocation);
    }

    /**
     * Async image analysis - returns a CompletableFuture.
     * Use this for non-blocking analysis (e.g., after complaint is created).
     */
    @Async
    public CompletableFuture<ImageAnalysisResult> analyzeImageAsync(
            byte[] imageBytes, String mimeType, 
            String complaintText, String complaintLocation) {
        
        return CompletableFuture.supplyAsync(() -> 
            analyzeImage(imageBytes, mimeType, complaintText, complaintLocation)
        );
    }

    /**
     * Build comprehensive analysis prompt for Gemini Vision
     */
    private String buildAnalysisPrompt(String complaintText, String location) {
        return String.format("""
            You are an AI analyst for a Municipal Grievance Redressal System.
            Analyze this image submitted as evidence for a citizen complaint.
            
            === COMPLAINT CONTEXT ===
            Description: %s
            Location: %s
            
            === YOUR ANALYSIS TASKS ===
            1. VERIFY: Does the image match the complaint description?
            2. IDENTIFY: What specific civic issue is visible (pothole, broken light, garbage, etc.)?
            3. SEVERITY: Rate the severity (MINOR, MODERATE, SEVERE, CRITICAL)
            4. SAFETY: Are there any safety hazards (exposed wires, open manholes, flooding)?
            5. AUTHENTICITY: Is this a genuine photo of the issue or potentially a stock image/screenshot?
            6. PRIORITY: Should this affect complaint priority (upgrade/maintain/downgrade)?
            
            === RESPONSE FORMAT (JSON only, no markdown) ===
            {
                "matchesDescription": true/false,
                "identifiedIssue": "Brief description of what's visible",
                "issueCategory": "POTHOLE|STREETLIGHT|GARBAGE|DRAINAGE|ELECTRICAL|WATER|ROAD_DAMAGE|OTHER",
                "severity": "MINOR|MODERATE|SEVERE|CRITICAL",
                "safetyHazards": ["list of hazards if any, empty array if none"],
                "authenticityScore": 0.0-1.0,
                "authenticityNote": "Why you think it's genuine or suspicious",
                "priorityRecommendation": "UPGRADE|MAINTAIN|DOWNGRADE",
                "priorityReason": "Brief explanation",
                "additionalFindings": "Any other relevant observations",
                "confidence": 0.0-1.0,
                "analysisNote": "Summary for human review"
            }
            
            === IMPORTANT RULES ===
            - If image is unclear/blurry, set confidence low and note uncertainty
            - If image doesn't match complaint, explain what you see instead
            - For safety hazards, err on the side of caution (report if uncertain)
            - Do NOT hallucinate - if unsure, say "unclear" or "cannot determine"
            """,
            complaintText != null ? complaintText : "Not provided",
            location != null ? location : "Not provided"
        );
    }

    /**
     * Call Gemini Vision API with image bytes and prompt
     */
    private String callGeminiVisionAPI(byte[] imageBytes, String mimeType, String prompt) throws Exception {
        String url = GEMINI_VISION_URL + "?key=" + apiKey;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // Encode image to base64
        String base64Image = Base64.getEncoder().encodeToString(imageBytes);

        // Build multimodal request (text + image)
        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(
                    // Text part (prompt)
                    Map.of("text", prompt),
                    // Image part (inline data)
                    Map.of("inlineData", Map.of(
                        "mimeType", mimeType != null ? mimeType : "image/jpeg",
                        "data", base64Image
                    ))
                ))
            ),
            "generationConfig", Map.of(
                "temperature", 0.1,  // Low temperature for consistent analysis
                "maxOutputTokens", 1024
            )
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
        
        log.info("📸 Sending image to Gemini Vision for analysis ({} bytes, {})", 
                 imageBytes.length, mimeType);
        
        String response = restTemplate.postForObject(url, request, String.class);
        
        // Extract text from Gemini response
        JsonNode root = objectMapper.readTree(response);
        String text = root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
        
        log.info("✅ Gemini Vision analysis received");
        return text;
    }

    /**
     * Parse Gemini response into structured ImageAnalysisResult
     */
    private ImageAnalysisResult parseAnalysisResponse(String response) throws Exception {
        // Clean response (remove markdown if present)
        String cleanJson = response.trim();
        if (cleanJson.startsWith("```")) {
            cleanJson = cleanJson.replaceAll("```json\\s*", "").replaceAll("```\\s*", "");
        }

        JsonNode json = objectMapper.readTree(cleanJson);

        return new ImageAnalysisResult(
            json.path("matchesDescription").asBoolean(false),
            json.path("identifiedIssue").asText("Unknown"),
            json.path("issueCategory").asText("OTHER"),
            json.path("severity").asText("MODERATE"),
            extractStringArray(json.path("safetyHazards")),
            json.path("authenticityScore").asDouble(0.5),
            json.path("authenticityNote").asText(""),
            json.path("priorityRecommendation").asText("MAINTAIN"),
            json.path("priorityReason").asText(""),
            json.path("additionalFindings").asText(""),
            json.path("confidence").asDouble(0.5),
            json.path("analysisNote").asText("")
        );
    }

    /**
     * Extract string array from JSON node
     */
    private String[] extractStringArray(JsonNode arrayNode) {
        if (arrayNode == null || !arrayNode.isArray()) {
            return new String[0];
        }
        String[] result = new String[arrayNode.size()];
        for (int i = 0; i < arrayNode.size(); i++) {
            result[i] = arrayNode.get(i).asText();
        }
        return result;
    }

    /**
     * Result of image analysis - immutable record for safety
     */
    public record ImageAnalysisResult(
        boolean matchesDescription,
        String identifiedIssue,
        String issueCategory,
        String severity,
        String[] safetyHazards,
        double authenticityScore,
        String authenticityNote,
        String priorityRecommendation,
        String priorityReason,
        String additionalFindings,
        double confidence,
        String analysisNote
    ) {
        /**
         * Create an "uncertain" result for failed analysis
         */
        public static ImageAnalysisResult uncertain(String reason) {
            return new ImageAnalysisResult(
                false,
                "Analysis failed",
                "OTHER",
                "MODERATE",
                new String[0],
                0.0,
                reason,
                "MAINTAIN",
                "Could not analyze image",
                reason,
                0.0,
                "UNCERTAIN: " + reason
            );
        }

        /**
         * Check if analysis suggests priority upgrade
         */
        public boolean suggestsUpgrade() {
            return "UPGRADE".equals(priorityRecommendation) || hasSafetyHazards();
        }

        /**
         * Check if any safety hazards were detected
         */
        public boolean hasSafetyHazards() {
            return safetyHazards != null && safetyHazards.length > 0;
        }

        /**
         * Check if analysis is confident (threshold: 0.7)
         */
        public boolean isConfident() {
            return confidence >= 0.7;
        }

        /**
         * Check if image appears authentic
         */
        public boolean appearsAuthentic() {
            return authenticityScore >= 0.6;
        }

        /**
         * Convert to JSON string for storage
         */
        public String toJson() {
            try {
                ObjectMapper mapper = new ObjectMapper();
                return mapper.writeValueAsString(this);
            } catch (Exception e) {
                return "{\"error\": \"Serialization failed\"}";
            }
        }

        /**
         * Parse from JSON string (from database)
         */
        public static ImageAnalysisResult fromJson(String json) {
            if (json == null || json.isBlank()) {
                return null;
            }
            try {
                ObjectMapper mapper = new ObjectMapper();
                return mapper.readValue(json, ImageAnalysisResult.class);
            } catch (Exception e) {
                return null;
            }
        }
    }
}
