package com.backend.springapp.dto.response;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO for duplicate complaint detection.
 * Returns potential duplicates based on proximity + text similarity.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DuplicateCheckResponseDTO {
    
    /**
     * Whether potential duplicates were found
     */
    private boolean hasPotentialDuplicates;
    
    /**
     * List of potential duplicate complaints
     */
    private List<PotentialDuplicate> potentialDuplicates;
    
    /**
     * AI-generated summary of why these might be duplicates
     */
    private String aiSummary;
    
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class PotentialDuplicate {
        private Long complaintId;
        private String title;
        private String description;
        private String location;
        private String status;
        private String categoryName;
        private Double distanceMeters;
        private Double similarityScore;
        private String createdTime;
    }
}
