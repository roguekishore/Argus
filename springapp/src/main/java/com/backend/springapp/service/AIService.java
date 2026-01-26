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
    
    // Minimum confidence for complaint to be considered valid/clear
    private static final double VALIDATION_CONFIDENCE_THRESHOLD = 0.4;

    @Autowired
    private SLARepository slaRepository;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ==================== PRE-SUBMISSION VALIDATION ====================
    
    /**
     * Validate complaint text BEFORE submission to prevent vague complaints.
     * 
     * This is a lightweight check that runs when user clicks "Submit" to:
     * 1. Check if the complaint is specific enough to process
     * 2. Provide immediate feedback to improve the complaint
     * 3. Prevent vague complaints from clogging the admin queue
     * 
     * @param title Complaint title/subject
     * @param description Complaint description
     * @param location Optional location string
     * @return ValidationResult with isValid, message, and suggestion
     */
    public ValidationResult validateComplaintText(String title, String description, String location) {
        try {
            log.info("🔍 Validating complaint - Title: '{}', Description: '{}'", title, description);
            String prompt = buildValidationPrompt(title, description, location);
            String response = callGeminiAPI(prompt);  // Now uses retry with JSON enforcement
            log.info("🤖 AI validation response: {}", response);
            ValidationResult result = parseValidationResponse(response);
            log.info("✅ Validation result - isValid: {}, message: {}", result.isValid, result.message);
            return result;
        } catch (Exception e) {
            log.error("❌ Validation check failed after retries: {}", e.getMessage());
            // On error, REJECT with a helpful message to be safe during pitch
            return new ValidationResult(
                false, 
                "Please provide a clearer description of the municipal issue you're facing (e.g., pothole, garbage, streetlight).", 
                "Try describing the specific infrastructure problem and its location.", 
                0.0, 
                null
            );
        }
    }
    
    private String buildValidationPrompt(String title, String description, String location) {
        return String.format("""
            You are a STRICT gatekeeper for a Municipal Grievance System. 
            You must REJECT anything that is NOT a valid civic/municipal complaint.
            
            IMPORTANT: You MUST respond with ONLY a JSON object. No explanations, no text before or after.
            
            ## INPUT:
            Title: %s
            Description: %s
            
            ## VALID CIVIC COMPLAINTS (isValid: true):
            These are about PUBLIC INFRASTRUCTURE managed by municipality:
            - "pothole on road" → VALID
            - "garbage not collected" → VALID  
            - "streetlight not working" → VALID
            - "water leak in street" → VALID
            - "drainage blocked" → VALID
            - "road damaged" → VALID
            
            ## INVALID - REJECT THESE (isValid: false):
            
            Personal/Non-civic matters:
            - "I want to eat" → INVALID (personal need)
            - "I want to dance" → INVALID (personal activity)
            - "eat eat" → INVALID (nonsense)
            - "I'm hungry" → INVALID (personal)
            - "I need a job" → INVALID (not municipal)
            - "help me" → INVALID (too vague)
            
            Gibberish:
            - "asdfasdf" → INVALID
            - "lkxjnkjvnkjn" → INVALID
            - "test test" → INVALID
            
            ## CRITICAL RULES:
            1. The complaint MUST mention a PUBLIC INFRASTRUCTURE issue.
            2. If it talks about personal wants, food, dancing, personal activities → REJECT.
            3. If you cannot identify a specific municipal service issue → REJECT.
            4. RESPOND WITH JSON ONLY - NO OTHER TEXT!
            
            ## OUTPUT FORMAT (respond with ONLY this JSON, nothing else):
            For INVALID complaints:
            {"isValid": false, "message": "This is not a municipal complaint. Please describe an issue with public services like roads, water, garbage, or streetlights.", "suggestion": null, "confidence": 0.9}
            
            For VALID complaints:
            {"isValid": true, "message": "OK", "suggestion": null, "confidence": 0.9}
            """,
            title != null ? title : "",
            description != null ? description : ""
        );
    }
    
    private ValidationResult parseValidationResponse(String response) throws Exception {
        String cleanJson = response.trim();
        if (cleanJson.startsWith("```")) {
            cleanJson = cleanJson.replaceAll("```json\\s*", "").replaceAll("```\\s*", "");
        }
        
        JsonNode json = objectMapper.readTree(cleanJson);
        
        double confidence = json.path("confidence").asDouble(0.7);
        // Trust the AI's isValid decision - don't override with confidence threshold
        boolean isValid = json.path("isValid").asBoolean(true);
        
        return new ValidationResult(
            isValid,
            json.path("message").asText(""),
            json.path("suggestion").isNull() ? null : json.path("suggestion").asText(),
            confidence,
            json.path("category").isNull() ? null : json.path("category").asText()
        );
    }
    
    /**
     * Pre-submission validation result
     */
    public static class ValidationResult {
        public final boolean isValid;
        public final String message;
        public final String suggestion;
        public final double confidence;
        public final String detectedCategory;
        
        public ValidationResult(boolean isValid, String message, String suggestion, double confidence, String detectedCategory) {
            this.isValid = isValid;
            this.message = message;
            this.suggestion = suggestion;
            this.confidence = confidence;
            this.detectedCategory = detectedCategory;
        }
    }

    // ==================== COMPLAINT ANALYSIS ====================

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
        return callGeminiAPIWithRetry(prompt, 3);
    }
    
    private String callGeminiAPIWithRetry(String prompt, int maxRetries) throws Exception {
        String url = GEMINI_URL + "?key=" + apiKey;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // Gemini API request format with STRICT JSON mode
        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(
                    Map.of("text", prompt)
                ))
            ),
            "generationConfig", Map.of(
                "temperature", 0.1,
                "maxOutputTokens", 256,
                "responseMimeType", "application/json"  // STRICT: Force JSON output
            )
        );

        Exception lastException = null;
        
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
                String response = restTemplate.postForObject(url, request, String.class);
                
                // Extract text from Gemini response
                JsonNode root = objectMapper.readTree(response);
                String text = root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
                
                // Validate it's actually JSON before returning
                validateJsonResponse(text);
                return text;
                
            } catch (Exception e) {
                lastException = e;
                log.warn("⚠️ Gemini API attempt {}/{} failed: {}", attempt, maxRetries, e.getMessage());
                if (attempt < maxRetries) {
                    Thread.sleep(500 * attempt); // Exponential backoff
                }
            }
        }
        
        throw lastException != null ? lastException : new RuntimeException("Gemini API failed after " + maxRetries + " attempts");
    }
    
    /**
     * Validate that the response is valid JSON
     */
    private void validateJsonResponse(String response) throws Exception {
        String cleanJson = response.trim();
        if (cleanJson.startsWith("```")) {
            cleanJson = cleanJson.replaceAll("```json\\s*", "").replaceAll("```\\s*", "");
        }
        // This will throw if not valid JSON
        objectMapper.readTree(cleanJson);
    }
    
    /**
     * Call Gemini 3 Pro with MULTIMODAL input (text + image).
     * 
     * Uses inline_data to send image bytes directly (Gemini cannot fetch URLs).
     * This enables visual analysis alongside text-based classification.
     */
    private String callGeminiMultimodalAPI(String prompt, byte[] imageBytes, String mimeType) throws Exception {
        return callGeminiMultimodalAPIWithRetry(prompt, imageBytes, mimeType, 3);
    }
    
    private String callGeminiMultimodalAPIWithRetry(String prompt, byte[] imageBytes, String mimeType, int maxRetries) throws Exception {
        String url = GEMINI_MULTIMODAL_URL + "?key=" + apiKey;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // Encode image to base64
        String base64Image = Base64.getEncoder().encodeToString(imageBytes);
        
        // Build multimodal request (text + image parts) with STRICT JSON mode
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
                "maxOutputTokens", 512,  // More tokens for image analysis
                "responseMimeType", "application/json"  // STRICT: Force JSON output
            )
        );

        Exception lastException = null;
        
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
                
                log.info("📷 Calling Gemini multimodal API with image (attempt {}/{})...", attempt, maxRetries);
                String response = restTemplate.postForObject(url, request, String.class);
                
                // Extract text from Gemini response
                JsonNode root = objectMapper.readTree(response);
                String text = root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
                log.info("✅ Gemini multimodal response received");
                
                // Validate it's actually JSON before returning
                validateJsonResponse(text);
                return text;
                
            } catch (Exception e) {
                lastException = e;
                log.warn("⚠️ Gemini multimodal API attempt {}/{} failed: {}", attempt, maxRetries, e.getMessage());
                if (attempt < maxRetries) {
                    Thread.sleep(500 * attempt); // Exponential backoff
                }
            }
        }
        
        throw lastException != null ? lastException : new RuntimeException("Gemini multimodal API failed after " + maxRetries + " attempts");
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
