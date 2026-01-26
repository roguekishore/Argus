package com.backend.springapp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO for pre-submission complaint validation.
 * AI checks if the complaint text is clear and actionable BEFORE submission.
 * 
 * This prevents vague complaints from entering the system, saving:
 * - Admin time on manual routing
 * - Citizen frustration from rejected/cancelled complaints
 * - System overhead from processing unclear requests
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ComplaintValidationDTO {
    
    /**
     * Whether the complaint is clear enough to process
     */
    private boolean isValid;
    
    /**
     * If not valid, explain what's wrong
     */
    private String message;
    
    /**
     * Specific suggestion to improve the complaint
     */
    private String suggestion;
    
    /**
     * Confidence score from AI (0.0 - 1.0)
     * isValid = true when confidence >= 0.5
     */
    private Double confidence;
    
    /**
     * Detected category (preview for user)
     */
    private String detectedCategory;
}
