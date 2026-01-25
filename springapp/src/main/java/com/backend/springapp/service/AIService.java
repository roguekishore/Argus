package com.backend.springapp.service;

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

@Service
public class AIService {

    @Value("${gemini.api.key}")
    private String apiKey;

    private static final String GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

    @Autowired
    private SLARepository slaRepository;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Analyze complaint and return AI decision
     */
    public AIDecision analyzeComplaint(Complaint complaint) {
        try {
            // Build prompt with SLA context
            String prompt = buildPrompt(complaint);
            
            // Call Gemini API
            String response = callGeminiAPI(prompt);
            
            // Parse response
            return parseResponse(response);
            
        } catch (Exception e) {
            // Fallback to OTHER category with defaults
            return new AIDecision(
                "OTHER",
                "LOW",
                14,
                "AI analysis failed: " + e.getMessage(),
                0.0
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

        return String.format("""
            You are a Municipal Grievance Classification AI. Analyze the citizen complaint and classify it.

            ## Available Categories (ONLY use these):
            %s

            ## Priority Levels:
            - LOW: Minor inconvenience
            - MEDIUM: Moderate issue
            - HIGH: Significant impact or safety concern
            - CRITICAL: Immediate danger, life-threatening

            ## Your Task:
            1. Pick the BEST matching category from above
            2. Decide priority (can differ from base if context warrants)
            3. Decide SLA days (can shorten if urgent, but not extend beyond default)
            4. Explain your reasoning briefly

            ## Citizen Complaint:
            Title: %s
            Description: %s
            Location: %s

            ## Response Format (JSON only, no markdown):
            {"categoryName":"EXACT_CATEGORY_NAME","priority":"LOW|MEDIUM|HIGH|CRITICAL","slaDays":NUMBER,"reasoning":"Brief explanation","confidence":0.0-1.0}
            """,
            categoriesContext,
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
            json.path("confidence").asDouble(0.5)
        );
    }

    /**
     * Simple data class for AI decision
     */
    public static class AIDecision {
        public final String categoryName;
        public final String priority;
        public final int slaDays;
        public final String reasoning;
        public final double confidence;

        public AIDecision(String categoryName, String priority, int slaDays, String reasoning, double confidence) {
            this.categoryName = categoryName;
            this.priority = priority;
            this.slaDays = slaDays;
            this.reasoning = reasoning;
            this.confidence = confidence;
        }
    }
}
