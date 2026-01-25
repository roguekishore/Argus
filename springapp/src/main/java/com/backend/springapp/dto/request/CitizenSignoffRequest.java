package com.backend.springapp.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Request DTO for citizen signoff on complaint resolution.
 * 
 * Used by: POST /api/complaints/{id}/signoff
 * 
 * VALIDATION RULES:
 * - isAccepted is REQUIRED
 * - If isAccepted = true: rating is required (1-5)
 * - If isAccepted = false: disputeReason is required
 * 
 * @param isAccepted       Whether citizen accepts the resolution
 * @param rating           Satisfaction rating 1-5 (required if accepted)
 * @param feedback         Optional feedback about the resolution
 * @param disputeImageS3Key S3 key for dispute evidence image (if rejecting)
 * @param disputeReason    Reason for rejection (required if not accepted)
 */
public record CitizenSignoffRequest(
    @NotNull(message = "isAccepted must be specified")
    Boolean isAccepted,
    
    @Min(value = 1, message = "Rating must be between 1 and 5")
    @Max(value = 5, message = "Rating must be between 1 and 5")
    Integer rating,
    
    String feedback,
    
    String disputeImageS3Key,
    
    String disputeReason
) {}
