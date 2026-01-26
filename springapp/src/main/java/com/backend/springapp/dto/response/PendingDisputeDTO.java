package com.backend.springapp.dto.response;

import java.time.LocalDateTime;

import com.backend.springapp.model.CitizenSignoff;

import lombok.Builder;

/**
 * Response DTO for pending disputes viewed by DEPT_HEAD.
 * 
 * This DTO includes a presigned S3 URL for the counter-proof image
 * instead of the raw S3 key, allowing the frontend to directly display the image.
 * 
 * @param id                      Signoff/dispute record ID
 * @param complaintId             The complaint this dispute is for
 * @param complaintSubject        Subject of the complaint for context
 * @param citizenId               The citizen who filed the dispute
 * @param citizenName             Name of the citizen for display
 * @param disputeReason           Structured reason for the dispute
 * @param feedback                Additional feedback from citizen
 * @param disputeImageS3Key       Raw S3 key (for reference)
 * @param disputeCounterProofUrl  Presigned URL to view the counter-proof image
 * @param createdAt               When the dispute was filed
 */
@Builder
public record PendingDisputeDTO(
    Long id,
    Long complaintId,
    String complaintSubject,
    Long citizenId,
    String citizenName,
    String disputeReason,
    String feedback,
    String disputeImageS3Key,
    String disputeCounterProofUrl,
    LocalDateTime createdAt
) {
    
    /**
     * Create DTO from CitizenSignoff entity.
     * 
     * @param signoff The signoff entity
     * @param counterProofUrl Presigned S3 URL for the counter-proof image (can be null)
     * @return PendingDisputeDTO with all fields populated
     */
    public static PendingDisputeDTO fromEntity(CitizenSignoff signoff, String counterProofUrl) {
        String complaintSubject = null;
        if (signoff.getComplaint() != null) {
            complaintSubject = signoff.getComplaint().getTitle();
        }
        
        String citizenName = null;
        if (signoff.getCitizen() != null) {
            citizenName = signoff.getCitizen().getName();
        }
        
        return PendingDisputeDTO.builder()
            .id(signoff.getId())
            .complaintId(signoff.getComplaintId())
            .complaintSubject(complaintSubject)
            .citizenId(signoff.getCitizenId())
            .citizenName(citizenName)
            .disputeReason(signoff.getDisputeReason())
            .feedback(signoff.getFeedback())
            .disputeImageS3Key(signoff.getDisputeImageS3Key())
            .disputeCounterProofUrl(counterProofUrl)
            .createdAt(signoff.getSignedOffAt())
            .build();
    }
}
