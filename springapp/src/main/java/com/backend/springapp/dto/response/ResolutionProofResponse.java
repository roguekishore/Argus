package com.backend.springapp.dto.response;

import java.time.LocalDateTime;

import com.backend.springapp.model.ResolutionProof;

import lombok.Builder;

/**
 * Response DTO for resolution proof operations.
 * 
 * @param id              The proof record ID
 * @param complaintId     The complaint this proof is for
 * @param staffId         The staff member who submitted proof
 * @param proofImageS3Key S3 key for the proof image (internal use)
 * @param proofImageUrl   Presigned URL for viewing the proof image
 * @param latitude        GPS latitude
 * @param longitude       GPS longitude
 * @param capturedAt      When proof was captured
 * @param remarks         Staff's remarks
 * @param isVerified      Whether proof has been verified by supervisor
 * @param createdAt       When record was created
 * @param message         Human-readable status message
 */
@Builder
public record ResolutionProofResponse(
    Long id,
    Long complaintId,
    Long staffId,
    String proofImageS3Key,
    String proofImageUrl,
    Double latitude,
    Double longitude,
    LocalDateTime capturedAt,
    String remarks,
    Boolean isVerified,
    LocalDateTime createdAt,
    String message
) {
    
    /**
     * Create response from entity with success message.
     */
    public static ResolutionProofResponse from(ResolutionProof proof, String message) {
        return ResolutionProofResponse.builder()
            .id(proof.getId())
            .complaintId(proof.getComplaintId())
            .staffId(proof.getStaffId())
            .proofImageS3Key(proof.getProofImageS3Key())
            .proofImageUrl(null) // URL needs to be set by service with S3 presigner
            .latitude(proof.getLatitude())
            .longitude(proof.getLongitude())
            .capturedAt(proof.getCapturedAt())
            .remarks(proof.getRemarks())
            .isVerified(proof.getIsVerified())
            .createdAt(proof.getCreatedAt())
            .message(message)
            .build();
    }
    
    /**
     * Create response from entity with presigned URL.
     */
    public static ResolutionProofResponse from(ResolutionProof proof, String message, String proofImageUrl) {
        return ResolutionProofResponse.builder()
            .id(proof.getId())
            .complaintId(proof.getComplaintId())
            .staffId(proof.getStaffId())
            .proofImageS3Key(proof.getProofImageS3Key())
            .proofImageUrl(proofImageUrl)
            .latitude(proof.getLatitude())
            .longitude(proof.getLongitude())
            .capturedAt(proof.getCapturedAt())
            .remarks(proof.getRemarks())
            .isVerified(proof.getIsVerified())
            .createdAt(proof.getCreatedAt())
            .message(message)
            .build();
    }
    
    /**
     * Create response from entity with default message.
     */
    public static ResolutionProofResponse from(ResolutionProof proof) {
        return from(proof, "Resolution proof submitted successfully. You can now resolve the complaint.");
    }
}
