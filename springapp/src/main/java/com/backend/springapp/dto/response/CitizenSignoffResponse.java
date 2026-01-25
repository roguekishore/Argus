package com.backend.springapp.dto.response;

import java.time.LocalDateTime;

import com.backend.springapp.enums.ComplaintStatus;
import com.backend.springapp.model.CitizenSignoff;

import lombok.Builder;

/**
 * Response DTO for citizen signoff operations.
 * 
 * @param id                 The signoff record ID
 * @param complaintId        The complaint this signoff is for
 * @param citizenId          The citizen who signed off
 * @param isAccepted         Whether resolution was accepted
 * @param rating             Satisfaction rating (if accepted)
 * @param feedback           Citizen's feedback
 * @param disputeReason      Reason for dispute (if rejected)
 * @param signedOffAt        When signoff was submitted
 * @param complaintStatus    The new complaint status after signoff
 * @param message            Human-readable status message
 */
@Builder
public record CitizenSignoffResponse(
    Long id,
    Long complaintId,
    Long citizenId,
    Boolean isAccepted,
    Integer rating,
    String feedback,
    String disputeReason,
    LocalDateTime signedOffAt,
    ComplaintStatus complaintStatus,
    String message
) {
    
    /**
     * Create response from entity for ACCEPTED signoff.
     */
    public static CitizenSignoffResponse accepted(CitizenSignoff signoff) {
        return CitizenSignoffResponse.builder()
            .id(signoff.getId())
            .complaintId(signoff.getComplaintId())
            .citizenId(signoff.getCitizenId())
            .isAccepted(true)
            .rating(signoff.getRating())
            .feedback(signoff.getFeedback())
            .disputeReason(null)
            .signedOffAt(signoff.getSignedOffAt())
            .complaintStatus(ComplaintStatus.CLOSED)
            .message("Thank you for confirming. Your complaint has been closed.")
            .build();
    }
    
    /**
     * Create response from entity for REJECTED/DISPUTED signoff.
     */
    public static CitizenSignoffResponse disputed(CitizenSignoff signoff) {
        return CitizenSignoffResponse.builder()
            .id(signoff.getId())
            .complaintId(signoff.getComplaintId())
            .citizenId(signoff.getCitizenId())
            .isAccepted(false)
            .rating(null)
            .feedback(signoff.getFeedback())
            .disputeReason(signoff.getDisputeReason())
            .signedOffAt(signoff.getSignedOffAt())
            .complaintStatus(ComplaintStatus.RESOLVED) // Stays RESOLVED
            .message("Your dispute has been recorded. The department will review and address your concerns.")
            .build();
    }
}
