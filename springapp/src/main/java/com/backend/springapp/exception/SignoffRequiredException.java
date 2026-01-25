package com.backend.springapp.exception;

/**
 * Exception thrown when attempting to close a complaint without citizen signoff.
 * 
 * DOMAIN RULE:
 * RESOLVED → CLOSED transition is BLOCKED unless the citizen who filed
 * the complaint has explicitly accepted the resolution (CitizenSignoff with isAccepted=true).
 * 
 * WHY this exception exists:
 * - Enforces the "citizen acceptance before closure" business rule
 * - Ensures no one can close complaints without citizen consent
 * - Distinguishes this specific rule violation from other transition errors
 * 
 * NOTE: SYSTEM role (auto-close after timeout) bypasses this check.
 * This exception is for human-initiated close attempts without signoff.
 */
public class SignoffRequiredException extends RuntimeException {
    
    private final Long complaintId;
    
    public SignoffRequiredException(Long complaintId) {
        super(String.format(
            "Cannot close complaint #%d: Citizen signoff is required. " +
            "The citizen who filed this complaint must accept the resolution " +
            "via POST /api/complaints/%d/signoff before it can be closed.",
            complaintId, complaintId
        ));
        this.complaintId = complaintId;
    }
    
    public SignoffRequiredException(Long complaintId, String customMessage) {
        super(customMessage);
        this.complaintId = complaintId;
    }
    
    public Long getComplaintId() {
        return complaintId;
    }
}
