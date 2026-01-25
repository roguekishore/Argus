package com.backend.springapp.service;

import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.backend.springapp.enums.Priority;
import com.backend.springapp.model.Complaint;
import com.backend.springapp.model.SLA;
import com.backend.springapp.repository.SLARepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class AIService {

    @Value("${gemini.api.key}")
    private String apiKey;

    private static final String GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    
    // Gemini 2.0 Flash supports multimodal (image + text) analysis
    private static final String GEMINI_MULTIMODAL_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

    @Autowired
    private SLARepository slaRepository;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Analyze complaint and return AI decision
     */
    public AIDecision analyzeComplaint(Complaint complaint) {
        return analyzeComplaint(complaint, null, null);
    }
    
    /**
     * Analyze complaint with optional image evidence (MULTIMODAL).
     * 
     * ENHANCED FEATURE:
     * When image bytes are provided, uses Gemini 3 Pro's multimodal capabilities
     * to analyze both text description AND visual evidence together.
     * 
     * This enables:
     * - Issue verification: Does the image match the complaint?
     * - Safety detection: Exposed wires, open manholes, structural damage
     * - Priority adjustment: Upgrade if visual evidence shows severity
     * - Authenticity check: Stock photos vs real evidence
     * 
     * @param complaint The complaint with text description
     * @param imageBytes Optional image evidence (from S3 or upload)
     * @param imageMimeType MIME type of image (required if imageBytes provided)
     * @return AIDecision with category, priority, SLA, and image-aware reasoning
     */
    public AIDecision analyzeComplaint(Complaint complaint, byte[] imageBytes, String imageMimeType) {
        try {
            // Build prompt with SLA context
            String prompt = buildPrompt(complaint);
            
            // Call appropriate API based on whether image is present
            String response;
            if (imageBytes != null && imageBytes.length > 0) {
                log.info("📷 Analyzing complaint with image ({} bytes, {})", imageBytes.length, imageMimeType);
                response = callGeminiMultimodalAPI(prompt, imageBytes, imageMimeType);
            } else {
                response = callGeminiAPI(prompt);
            }
            
            // Parse response
            return parseResponse(response);
            
        } catch (Exception e) {
            log.error("AI analysis failed: {}", e.getMessage());
            // Fallback to OTHER category with defaults
            return new AIDecision(
                "OTHER",
                "LOW",
                14,
                "AI analysis failed: " + e.getMessage(),
                0.0,
                null  // No image analysis
            );
        }
    }

    private String buildPrompt(Complaint complaint) {
        // Get all SLA configs to show AI the available categories
        List<SLA> slaConfigs = slaRepository.findAll();
        
        String categoriesContext = slaConfigs.stream()
            .map(sla -> String.format(
                "- %s: Department=%s, DefaultSLA=%d days, BasePriority=%s, Keywords=[%s]",
                sla.getCategory().getName(),
                sla.getDepartment().getName(),
                sla.getSlaDays(),
                sla.getBasePriority(),
                sla.getCategory().getKeywords() != null ? sla.getCategory().getKeywords() : ""
            ))
            .collect(Collectors.joining("\n"));
        
        // Check if complaint has an image (for prompt customization)
        boolean hasImage = complaint.getImageS3Key() != null && !complaint.getImageS3Key().isBlank();
        
        String imageInstructions = hasImage ? """
            
            ## Image Analysis Instructions (IMAGE PROVIDED):
            - An image has been attached to this complaint
            - Analyze if the image supports/verifies the complaint description
            - Check for safety hazards visible in the image
            - If image shows more severe damage than described, UPGRADE priority
            - If image appears unrelated or suspicious, note in reasoning
            - Include image findings in your reasoning
            """ : "";

        return String.format("""
            You are a Municipal Grievance Classification AI. Analyze the citizen complaint and classify it.

            ## Available Categories (ONLY use these):
            %s

            ## Priority Levels:
            - LOW: Minor inconvenience
            - MEDIUM: Moderate issue
            - HIGH: Significant impact or safety concern
            - CRITICAL: Immediate danger, life-threatening
            %s
            ## Confidence Score Guidelines (CRITICAL - follow strictly):
            Your confidence score MUST accurately reflect how certain you are about the category assignment:
            
            HIGH CONFIDENCE (0.8-1.0): Use ONLY when:
            - The complaint clearly mentions specific keywords matching a category (e.g., "pothole", "streetlight", "water leak")
            - The issue type is unambiguous and maps directly to one category
            - Location and description provide clear context
            
            MEDIUM CONFIDENCE (0.5-0.79): Use when:
            - The complaint could fit 2-3 categories but one seems more likely
            - Some relevant keywords present but context is partial
            - Description is somewhat vague but interpretable
            
            LOW CONFIDENCE (0.0-0.49): Use when:
            - The complaint is vague, unclear, or uses generic language like "something is wrong"
            - No specific keywords matching any category
            - The description doesn't clearly indicate what type of issue it is
            - User says they "don't know" or are "not sure" which department handles it
            - Multiple categories could equally apply with no clear winner
            - Location is vague like "somewhere in the city"
            
            BE CONSERVATIVE: When in doubt, use LOWER confidence. Vague complaints should get LOW confidence (< 0.5).
            
            ## Your Task:
            1. Pick the BEST matching category from above
            2. Decide priority (can differ from base if context warrants)
            3. Decide SLA days (can shorten if urgent, but not extend beyond default)
            4. Explain your reasoning briefly
            5. Assign confidence score following the guidelines above STRICTLY

            ## Citizen Complaint:
            Title: %s
            Description: %s
            Location: %s

            ## Response Format (JSON only, no markdown):
            {"categoryName":"EXACT_CATEGORY_NAME","priority":"LOW|MEDIUM|HIGH|CRITICAL","slaDays":NUMBER,"reasoning":"Brief explanation","confidence":0.0-1.0,"imageFindings":"Findings from image analysis if applicable, null otherwise"}
            """,
            categoriesContext,
            imageInstructions,
            complaint.getTitle() != null ? complaint.getTitle() : "Not provided",
            complaint.getDescription() != null ? complaint.getDescription() : "Not provided",
            complaint.getLocation() != null ? complaint.getLocation() : "Not provided"
        );
    }

    private String callGeminiAPI(String prompt) throws Exception {
        String url = GEMINI_URL + "?key=" + apiKey;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // Gemini API request format
        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(
                    Map.of("text", prompt)
                ))
            ),
            "generationConfig", Map.of(
                "temperature", 0.1,
                "maxOutputTokens", 256
            )
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
        
        String response = restTemplate.postForObject(url, request, String.class);
        
        // Extract text from Gemini response
        JsonNode root = objectMapper.readTree(response);
        return root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
    }
    
    /**
     * Call Gemini 3 Pro with MULTIMODAL input (text + image).
     * 
     * Uses inline_data to send image bytes directly (Gemini cannot fetch URLs).
     * This enables visual analysis alongside text-based classification.
     */
    private String callGeminiMultimodalAPI(String prompt, byte[] imageBytes, String mimeType) throws Exception {
        String url = GEMINI_MULTIMODAL_URL + "?key=" + apiKey;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // Encode image to base64
        String base64Image = Base64.getEncoder().encodeToString(imageBytes);
        
        // Build multimodal request (text + image parts)
        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(
                    // Text prompt
                    Map.of("text", prompt),
                    // Image data
                    Map.of("inlineData", Map.of(
                        "mimeType", mimeType != null ? mimeType : "image/jpeg",
                        "data", base64Image
                    ))
                ))
            ),
            "generationConfig", Map.of(
                "temperature", 0.1,
                "maxOutputTokens", 512  // More tokens for image analysis
            )
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
        
        log.info("📷 Calling Gemini multimodal API with image...");
        String response = restTemplate.postForObject(url, request, String.class);
        
        // Extract text from Gemini response
        JsonNode root = objectMapper.readTree(response);
        String text = root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
        log.info("✅ Gemini multimodal response received");
        
        return text;
    }

    private AIDecision parseResponse(String response) throws Exception {
        // Clean response (remove markdown code blocks if present)
        String cleanJson = response.trim();
        if (cleanJson.startsWith("```")) {
            cleanJson = cleanJson.replaceAll("```json\\s*", "").replaceAll("```\\s*", "");
        }
        
        JsonNode json = objectMapper.readTree(cleanJson);
        
        return new AIDecision(
            json.path("categoryName").asText("OTHER"),
            json.path("priority").asText("LOW"),
            json.path("slaDays").asInt(14),
            json.path("reasoning").asText("No reasoning provided"),
            json.path("confidence").asDouble(0.5),
            json.has("imageFindings") && !json.path("imageFindings").isNull() 
                ? json.path("imageFindings").asText() 
                : null
        );
    }

    /**
     * AI decision data class - includes image findings for multimodal analysis
     */
    public static class AIDecision {
        public final String categoryName;
        public final String priority;
        public final int slaDays;
        public final String reasoning;
        public final double confidence;
        public final String imageFindings;  // NEW: Findings from image analysis

        public AIDecision(String categoryName, String priority, int slaDays, String reasoning, double confidence) {
            this(categoryName, priority, slaDays, reasoning, confidence, null);
        }
        
        public AIDecision(String categoryName, String priority, int slaDays, String reasoning, double confidence, String imageFindings) {
            this.categoryName = categoryName;
            this.priority = priority;
            this.slaDays = slaDays;
            this.reasoning = reasoning;
            this.confidence = confidence;
            this.imageFindings = imageFindings;
        }
        
        /**
         * Check if this decision includes image analysis
         */
        public boolean hasImageFindings() {
            return imageFindings != null && !imageFindings.isBlank();
        }
        
        /**
         * Get combined reasoning (text + image)
         */
        public String getFullReasoning() {
            if (hasImageFindings()) {
                return reasoning + " | Image: " + imageFindings;
            }
            return reasoning;
        }
    }
}
