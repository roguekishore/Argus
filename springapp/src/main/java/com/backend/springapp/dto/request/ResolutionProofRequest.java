package com.backend.springapp.dto.request;

import java.time.LocalDateTime;

import jakarta.validation.constraints.NotBlank;

/**
 * Request DTO for submitting resolution proof.
 * 
 * Used by: POST /api/complaints/{id}/resolution-proof
 * 
 * @param proofImageS3Key S3 key for the proof image (if image uploaded separately)
 * @param latitude        GPS latitude where proof was captured
 * @param longitude       GPS longitude where proof was captured
 * @param capturedAt      When the proof photo was taken (optional, defaults to now)
 * @param remarks         Staff's remarks about the resolution work done
 */
public record ResolutionProofRequest(
    String proofImageS3Key,
    Double latitude,
    Double longitude,
    LocalDateTime capturedAt,
    @NotBlank(message = "Remarks are required to describe the resolution work")
    String remarks
) {}
