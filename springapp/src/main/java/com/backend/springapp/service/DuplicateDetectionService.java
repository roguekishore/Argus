package com.backend.springapp.service;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import com.backend.springapp.dto.response.DuplicateCheckResponseDTO;
import com.backend.springapp.dto.response.DuplicateCheckResponseDTO.PotentialDuplicate;
import com.backend.springapp.model.Complaint;
import com.backend.springapp.repository.CategoryRepository;
import com.backend.springapp.repository.ComplaintRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.extern.slf4j.Slf4j;

/**
 * Service for detecting potential duplicate complaints.
 * Uses location proximity + AI text similarity analysis.
 */
@Service
@Transactional(readOnly = true)
@Slf4j
public class DuplicateDetectionService {
    
    private static final double DEFAULT_RADIUS_METERS = 500.0; // 500m radius
    private static final double SIMILARITY_THRESHOLD = 0.6;
    private static final String GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    
    @Value("${gemini.api.key}")
    private String apiKey;
    
    @Autowired
    private ComplaintRepository complaintRepository;
    
    @Autowired
    private CategoryRepository categoryRepository;
    
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    /**
     * Check for potential duplicate complaints based on:
     * 1. Location proximity (within radius)
     * 2. Text similarity (AI-powered)
     * 
     * @param description The new complaint description
     * @param latitude Location latitude
     * @param longitude Location longitude
     * @param radiusMeters Search radius (default 500m)
     * @return DuplicateCheckResponseDTO with potential duplicates
     */
    public DuplicateCheckResponseDTO checkForDuplicates(
            String description, 
            Double latitude, 
            Double longitude,
            Double radiusMeters) {
        
        if (latitude == null || longitude == null) {
            return DuplicateCheckResponseDTO.builder()
                .hasPotentialDuplicates(false)
                .potentialDuplicates(new ArrayList<>())
                .aiSummary("No location provided - cannot check for nearby duplicates")
                .build();
        }
        
        double radius = radiusMeters != null ? radiusMeters : DEFAULT_RADIUS_METERS;
        
        // Step 1: Find nearby complaints
        List<Complaint> nearbyComplaints = complaintRepository.findNearbyComplaints(
            latitude, longitude, radius
        );
        
        if (nearbyComplaints.isEmpty()) {
            return DuplicateCheckResponseDTO.builder()
                .hasPotentialDuplicates(false)
                .potentialDuplicates(new ArrayList<>())
                .aiSummary("No complaints found within " + (int)radius + "m of this location")
                .build();
        }
        
        log.info("🔍 Found {} nearby complaints within {}m", nearbyComplaints.size(), radius);
        
        // Step 2: AI similarity analysis
        List<PotentialDuplicate> duplicates = analyzeSimilarity(description, nearbyComplaints, latitude, longitude);
        
        // Step 3: Filter by similarity threshold
        List<PotentialDuplicate> significantDuplicates = duplicates.stream()
            .filter(d -> d.getSimilarityScore() >= SIMILARITY_THRESHOLD)
            .collect(Collectors.toList());
        
        String summary = significantDuplicates.isEmpty() 
            ? "Found " + nearbyComplaints.size() + " nearby complaint(s), but none appear to be duplicates"
            : "Found " + significantDuplicates.size() + " potential duplicate(s) nearby. Please review before submitting.";
        
        return DuplicateCheckResponseDTO.builder()
            .hasPotentialDuplicates(!significantDuplicates.isEmpty())
            .potentialDuplicates(significantDuplicates)
            .aiSummary(summary)
            .build();
    }
    
    /**
     * Analyze text similarity between new complaint and existing ones using AI
     */
    private List<PotentialDuplicate> analyzeSimilarity(
            String newDescription, 
            List<Complaint> nearbyComplaints,
            Double newLat,
            Double newLng) {
        
        List<PotentialDuplicate> results = new ArrayList<>();
        
        try {
            // Build prompt for batch similarity check
            String prompt = buildSimilarityPrompt(newDescription, nearbyComplaints);
            String response = callGeminiAPI(prompt);
            
            // Parse AI response and build results
            results = parseSimilarityResponse(response, nearbyComplaints, newLat, newLng);
            
        } catch (Exception e) {
            log.error("AI similarity analysis failed: {}", e.getMessage());
            // Fallback: return all nearby complaints with default similarity
            results = nearbyComplaints.stream()
                .map(c -> buildPotentialDuplicate(c, 0.5, newLat, newLng))
                .collect(Collectors.toList());
        }
        
        return results;
    }
    
    private String buildSimilarityPrompt(String newDescription, List<Complaint> existingComplaints) {
        StringBuilder sb = new StringBuilder();
        sb.append("""
            You are a duplicate complaint detector. Compare the NEW complaint against existing complaints and rate similarity.
            
            Rate each existing complaint from 0.0 to 1.0:
            - 1.0 = Exact duplicate (same issue, same location)
            - 0.8-0.9 = Very likely duplicate (same issue type, very close)
            - 0.6-0.7 = Possibly related (similar issue)
            - 0.3-0.5 = Different but nearby
            - 0.0-0.2 = Completely unrelated
            
            NEW COMPLAINT:
            """);
        sb.append(newDescription).append("\n\n");
        sb.append("EXISTING COMPLAINTS:\n");
        
        for (int i = 0; i < existingComplaints.size(); i++) {
            Complaint c = existingComplaints.get(i);
            sb.append(String.format("[%d] Title: %s\nDescription: %s\nLocation: %s\n\n",
                i + 1, c.getTitle(), c.getDescription(), c.getLocation()));
        }
        
        sb.append("""
            
            Respond with ONLY a JSON array of similarity scores in order:
            [0.8, 0.3, 0.9, ...]
            
            No explanation, just the JSON array.
            """);
        
        return sb.toString();
    }
    
    private String callGeminiAPI(String prompt) throws Exception {
        String url = GEMINI_URL + "?key=" + apiKey;
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        String requestBody = objectMapper.writeValueAsString(
            java.util.Map.of(
                "contents", java.util.List.of(
                    java.util.Map.of("parts", java.util.List.of(
                        java.util.Map.of("text", prompt)
                    ))
                ),
                "generationConfig", java.util.Map.of(
                    "temperature", 0.1,
                    "maxOutputTokens", 200
                )
            )
        );
        
        HttpEntity<String> request = new HttpEntity<>(requestBody, headers);
        String response = restTemplate.postForObject(url, request, String.class);
        
        JsonNode root = objectMapper.readTree(response);
        return root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
    }
    
    private List<PotentialDuplicate> parseSimilarityResponse(
            String response, 
            List<Complaint> complaints,
            Double newLat,
            Double newLng) {
        
        List<PotentialDuplicate> results = new ArrayList<>();
        
        try {
            // Clean response (remove markdown if present)
            String cleaned = response.trim()
                .replace("```json", "")
                .replace("```", "")
                .trim();
            
            JsonNode scores = objectMapper.readTree(cleaned);
            
            for (int i = 0; i < complaints.size() && i < scores.size(); i++) {
                double similarity = scores.get(i).asDouble();
                Complaint c = complaints.get(i);
                results.add(buildPotentialDuplicate(c, similarity, newLat, newLng));
            }
        } catch (Exception e) {
            log.warn("Failed to parse similarity response: {}", e.getMessage());
            // Fallback
            for (Complaint c : complaints) {
                results.add(buildPotentialDuplicate(c, 0.5, newLat, newLng));
            }
        }
        
        return results;
    }
    
    private PotentialDuplicate buildPotentialDuplicate(
            Complaint c, 
            double similarity,
            Double newLat,
            Double newLng) {
        
        String categoryName = "Unknown";
        if (c.getCategoryId() != null) {
            categoryName = categoryRepository.findById(c.getCategoryId())
                .map(cat -> cat.getName())
                .orElse("Unknown");
        }
        
        // Calculate distance using Haversine
        double distance = calculateDistance(newLat, newLng, c.getLatitude(), c.getLongitude());
        
        return PotentialDuplicate.builder()
            .complaintId(c.getComplaintId())
            .title(c.getTitle())
            .description(c.getDescription().length() > 150 
                ? c.getDescription().substring(0, 150) + "..." 
                : c.getDescription())
            .location(c.getLocation())
            .status(c.getStatus().name())
            .categoryName(categoryName)
            .distanceMeters(Math.round(distance * 10) / 10.0)
            .similarityScore(Math.round(similarity * 100) / 100.0)
            .createdTime(c.getCreatedTime().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
            .build();
    }
    
    /**
     * Calculate distance between two points using Haversine formula
     */
    private double calculateDistance(Double lat1, Double lng1, Double lat2, Double lng2) {
        if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) {
            return 0.0;
        }
        
        final double R = 6371000; // Earth radius in meters
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
