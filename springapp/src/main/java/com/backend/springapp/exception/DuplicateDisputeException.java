package com.backend.springapp.exception;

/**
 * Exception thrown when a citizen attempts to file a dispute
 * when they already have a pending (un-reviewed) dispute for the same complaint.
 * 
 * Only one dispute can be pending at a time per complaint.
 */
public class DuplicateDisputeException extends RuntimeException {
    
    private final Long complaintId;
    
    public DuplicateDisputeException(Long complaintId) {
        super("A pending dispute already exists for complaint " + complaintId + 
              ". Please wait for the department to review the existing dispute.");
        this.complaintId = complaintId;
    }
    
    public Long getComplaintId() {
        return complaintId;
    }
}
