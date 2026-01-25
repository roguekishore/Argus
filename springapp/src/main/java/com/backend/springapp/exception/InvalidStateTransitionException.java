package com.backend.springapp.exception;

import com.backend.springapp.enums.ComplaintStatus;

/**
 * Exception thrown when an invalid state transition is attempted.
 * 
 * This is a BUSINESS LOGIC exception - it means the transition
 * violates the state machine rules, regardless of who is attempting it.
 * 
 * Examples:
 * - Trying to go from CLOSED back to IN_PROGRESS
 * - Trying to go from FILED directly to CLOSED (skipping IN_PROGRESS and RESOLVED)
 * 
 * HTTP mapping: 400 Bad Request (client error - invalid operation)
 */
public class InvalidStateTransitionException extends RuntimeException {
    
    private final Long complaintId;
    private final ComplaintStatus fromState;
    private final ComplaintStatus toState;
    
    public InvalidStateTransitionException(
            Long complaintId,
            ComplaintStatus fromState,
            ComplaintStatus toState,
            String message) {
        super(message);
        this.complaintId = complaintId;
        this.fromState = fromState;
        this.toState = toState;
    }
    
    public InvalidStateTransitionException(
            Long complaintId,
            ComplaintStatus fromState,
            ComplaintStatus toState) {
        this(complaintId, fromState, toState, buildDefaultMessage(complaintId, fromState, toState));
    }
    
    private static String buildDefaultMessage(
            Long complaintId,
            ComplaintStatus fromState,
            ComplaintStatus toState) {
        return String.format(
            "Invalid state transition for complaint %d: cannot transition from %s to %s",
            complaintId, fromState, toState
        );
    }
    
    public Long getComplaintId() {
        return complaintId;
    }
    
    public ComplaintStatus getFromState() {
        return fromState;
    }
    
    public ComplaintStatus getToState() {
        return toState;
    }
}
