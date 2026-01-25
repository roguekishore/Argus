package com.backend.springapp.exception;

import com.backend.springapp.enums.ComplaintStatus;

/**
 * Exception thrown when a dispute operation is attempted on a complaint
 * that is not in the expected state for that operation.
 * 
 * Examples:
 * - Trying to file dispute on non-RESOLVED complaint
 * - Trying to approve an already-reviewed dispute
 */
public class InvalidDisputeStateException extends RuntimeException {
    
    private final Long complaintId;
    private final ComplaintStatus currentState;
    private final ComplaintStatus expectedState;
    
    public InvalidDisputeStateException(
            Long complaintId,
            ComplaintStatus currentState,
            ComplaintStatus expectedState,
            String message) {
        super(message);
        this.complaintId = complaintId;
        this.currentState = currentState;
        this.expectedState = expectedState;
    }
    
    public Long getComplaintId() {
        return complaintId;
    }
    
    public ComplaintStatus getCurrentState() {
        return currentState;
    }
    
    public ComplaintStatus getExpectedState() {
        return expectedState;
    }
}
