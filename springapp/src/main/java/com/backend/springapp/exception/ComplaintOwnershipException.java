package com.backend.springapp.exception;

/**
 * Exception thrown when a user attempts an operation on a complaint they don't own.
 * 
 * This is an AUTHORIZATION exception specific to ownership constraints.
 * Citizens can only perform certain operations on their own complaints.
 * 
 * Examples:
 * - CITIZEN trying to close someone else's complaint
 * - CITIZEN trying to cancel a complaint they didn't file
 * 
 * HTTP mapping: 403 Forbidden
 */
public class ComplaintOwnershipException extends RuntimeException {
    
    private final Long complaintId;
    private final Long attemptedUserId;
    private final Long actualOwnerId;
    
    public ComplaintOwnershipException(
            Long complaintId,
            Long attemptedUserId,
            Long actualOwnerId,
            String message) {
        super(message);
        this.complaintId = complaintId;
        this.attemptedUserId = attemptedUserId;
        this.actualOwnerId = actualOwnerId;
    }
    
    public ComplaintOwnershipException(
            Long complaintId,
            Long attemptedUserId,
            Long actualOwnerId) {
        this(
            complaintId,
            attemptedUserId,
            actualOwnerId,
            buildDefaultMessage(complaintId, attemptedUserId)
        );
    }
    
    private static String buildDefaultMessage(Long complaintId, Long attemptedUserId) {
        return String.format(
            "User %d is not the owner of complaint %d and cannot perform this operation",
            attemptedUserId, complaintId
        );
    }
    
    public Long getComplaintId() {
        return complaintId;
    }
    
    public Long getAttemptedUserId() {
        return attemptedUserId;
    }
    
    public Long getActualOwnerId() {
        return actualOwnerId;
    }
}
