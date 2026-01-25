package com.backend.springapp.exception;

/**
 * Exception thrown when attempting to resolve a complaint without resolution proof.
 * 
 * DOMAIN RULE:
 * IN_PROGRESS → RESOLVED transition is BLOCKED unless at least one
 * ResolutionProof record exists for the complaint.
 * 
 * WHY this exception exists:
 * - Enforces the "proof before resolution" business rule
 * - Provides clear feedback to staff about what action is needed
 * - Distinguishes this specific rule violation from other transition errors
 */
public class ResolutionProofRequiredException extends RuntimeException {
    
    private final Long complaintId;
    
    public ResolutionProofRequiredException(Long complaintId) {
        super(String.format(
            "Cannot resolve complaint #%d: Resolution proof is required. " +
            "Please submit proof via POST /api/complaints/%d/resolution-proof before resolving.",
            complaintId, complaintId
        ));
        this.complaintId = complaintId;
    }
    
    public ResolutionProofRequiredException(Long complaintId, String customMessage) {
        super(customMessage);
        this.complaintId = complaintId;
    }
    
    public Long getComplaintId() {
        return complaintId;
    }
}
