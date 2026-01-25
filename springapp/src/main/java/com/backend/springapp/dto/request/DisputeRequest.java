package com.backend.springapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Request DTO for citizen to dispute a complaint resolution.
 * 
 * Used by: POST /api/complaints/{id}/dispute
 * 
 * DOMAIN RULES:
 * - Only the CITIZEN who filed the complaint can dispute
 * - Complaint must be in RESOLVED state
 * - Counter proof image is REQUIRED (evidence that issue persists)
 * - Dispute reason is REQUIRED (explanation of why resolution failed)
 * 
 * WHY counter proof is required:
 * - Prevents frivolous disputes
 * - Provides evidence for DEPT_HEAD to review
 * - Creates accountability for both citizen and staff
 * 
 * @param counterProofImageS3Key S3 key for counter-evidence image (REQUIRED)
 * @param disputeReason          Explanation of why resolution is inadequate (REQUIRED)
 * @param feedback               Optional additional feedback
 */
public record DisputeRequest(
    @NotBlank(message = "Counter proof image is required for dispute")
    String counterProofImageS3Key,
    
    @NotBlank(message = "Dispute reason is required")
    String disputeReason,
    
    String feedback
) {}
