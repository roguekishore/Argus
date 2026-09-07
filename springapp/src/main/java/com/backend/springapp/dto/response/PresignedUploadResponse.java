package com.backend.springapp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO for pre-signed S3 upload URL generation.
 * 
 * Used by S3UploadController to return upload details to frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PresignedUploadResponse {
    
    /**
     * The pre-signed URL for PUT upload.
     * Frontend should PUT the file directly to this URL.
     */
    private String uploadUrl;
    
    /**
     * The S3 object key that will be created.
     * Frontend should store this and send it when creating the complaint.
     */
    private String objectKey;
    
    /**
     * How long the URL is valid, in seconds.
     * Default: 600 (10 minutes)
     */
    private int expiresInSeconds;
    
    /**
     * The content type that must be used when uploading.
     */
    private String contentType;
}
