package com.backend.springapp.dto.response;

import java.time.LocalDateTime;

import com.backend.springapp.enums.ComplaintStatus;
import com.backend.springapp.enums.Priority;
import com.backend.springapp.model.CitizenSignoff;

import lombok.Builder;

/**
 * Response DTO for dispute operations.
 * 
 * Used by:
 * - POST /api/complaints/{id}/dispute (dispute submission)
 * - POST /api/complaints/{id}/dispute/{signoffId}/approve (dispute approval)
 * 
 * @param signoffId          The dispute record ID
 * @param complaintId        The disputed complaint
 * @param disputeReason      Reason for dispute
 * @param counterProofS3Key  S3 key of counter-evidence image
 * @param isApproved         Whether dispute has been approved
 * @param approvedBy         Who approved (null if pending)
 * @param approvedAt         When approved (null if pending)
 * @param complaintStatus    Current complaint status after operation
 * @param newPriority        New priority (if reopened)
 * @param newSlaDeadline     New SLA deadline (if reopened)
 * @param message            Human-readable status message
 */
@Builder
public record DisputeResponse(
    Long signoffId,
    Long complaintId,
    String disputeReason,
    String counterProofS3Key,
    Boolean isApproved,
    Long approvedBy,
    LocalDateTime approvedAt,
    ComplaintStatus complaintStatus,
    Priority newPriority,
    LocalDateTime newSlaDeadline,
    String message
) {
    
    /**
     * Create response for submitted (pending) dispute.
     */
    public static DisputeResponse submitted(CitizenSignoff signoff) {
        return DisputeResponse.builder()
            .signoffId(signoff.getId())
            .complaintId(signoff.getComplaintId())
            .disputeReason(signoff.getDisputeReason())
            .counterProofS3Key(signoff.getDisputeImageS3Key())
            .isApproved(false)
            .approvedBy(null)
            .approvedAt(null)
            .complaintStatus(ComplaintStatus.RESOLVED) // Stays RESOLVED until approved
            .newPriority(null)
            .newSlaDeadline(null)
            .message("Dispute submitted successfully. Awaiting department head review.")
            .build();
    }
    
    /**
     * Create response for approved dispute with reopen details.
     */
    public static DisputeResponse approved(
            CitizenSignoff signoff,
            Long approvedBy,
            Priority newPriority,
            LocalDateTime newSlaDeadline) {
        return DisputeResponse.builder()
            .signoffId(signoff.getId())
            .complaintId(signoff.getComplaintId())
            .disputeReason(signoff.getDisputeReason())
            .counterProofS3Key(signoff.getDisputeImageS3Key())
            .isApproved(true)
            .approvedBy(approvedBy)
            .approvedAt(LocalDateTime.now())
            .complaintStatus(ComplaintStatus.IN_PROGRESS) // Reopened
            .newPriority(newPriority)
            .newSlaDeadline(newSlaDeadline)
            .message(String.format(
                "Dispute approved. Complaint reopened with priority %s. New deadline: %s",
                newPriority, newSlaDeadline.toLocalDate()))
            .build();
    }
    
    /**
     * Create response for rejected dispute.
     */
    public static DisputeResponse rejected(CitizenSignoff signoff, String reason) {
        return DisputeResponse.builder()
            .signoffId(signoff.getId())
            .complaintId(signoff.getComplaintId())
            .disputeReason(signoff.getDisputeReason())
            .counterProofS3Key(signoff.getDisputeImageS3Key())
            .isApproved(false)
            .approvedBy(null)
            .approvedAt(null)
            .complaintStatus(ComplaintStatus.RESOLVED) // Stays RESOLVED
            .newPriority(null)
            .newSlaDeadline(null)
            .message("Dispute rejected: " + reason)
            .build();
    }
}
