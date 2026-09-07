package com.backend.springapp.controller;

import com.backend.springapp.dto.response.PresignedUploadResponse;
import com.backend.springapp.service.S3StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller for generating pre-signed S3 upload URLs.
 * 
 * ARCHITECTURE:
 * This enables DIRECT browser-to-S3 uploads, bypassing CloudFront for file uploads.
 * 
 * FLOW:
 * 1. Frontend requests a pre-signed URL from this endpoint (via CloudFront → EC2)
 * 2. Backend generates a time-limited PUT URL for S3
 * 3. Frontend uploads the file DIRECTLY to S3 using the pre-signed URL
 * 4. Frontend then calls the complaint creation endpoint with the S3 key
 * 
 * BENEFITS:
 * - Avoids CloudFront's request size limits (typically 50MB for viewer requests)
 * - Avoids CORS issues with multipart uploads through CloudFront
 * - Keeps AWS credentials server-side only
 * - Reduces load on EC2 (file bytes never touch the server)
 * 
 * SECURITY:
 * - Pre-signed URLs expire after 10 minutes
 * - Only authenticated users can request URLs (JWT required)
 * - Content-Type is restricted to what was requested
 */
@RestController
@RequestMapping("/api/s3")
@RequiredArgsConstructor
@Slf4j
public class S3UploadController {

    private final S3StorageService s3StorageService;

    /**
     * Generate a pre-signed PUT URL for direct S3 upload.
     * 
     * POST /api/s3/presigned-upload
     * 
     * Request Body:
     * {
     *   "filename": "photo.jpg",
     *   "contentType": "image/jpeg"
     * }
     * 
     * Response:
     * {
     *   "uploadUrl": "https://bucket.s3.region.amazonaws.com/...",
     *   "objectKey": "complaints/2026/02/pending-abc123.jpg",
     *   "expiresInSeconds": 600
     * }
     * 
     * USAGE:
     * Frontend should:
     * 1. Call this endpoint to get uploadUrl and objectKey
     * 2. PUT the file to uploadUrl with Content-Type header matching contentType
     * 3. On success, use objectKey when creating the complaint
     * 
     * @param request Contains filename and contentType
     * @return PresignedUploadResponse with URL and object key
     */
    @PostMapping("/presigned-upload")
    public ResponseEntity<?> getPresignedUploadUrl(@RequestBody Map<String, String> request) {
        String filename = request.get("filename");
        String contentType = request.get("contentType");

        // Validate input
        if (filename == null || filename.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "filename is required"
            ));
        }
        if (contentType == null || contentType.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "contentType is required"
            ));
        }

        // Validate content type (only images allowed)
        if (!isValidImageType(contentType)) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Invalid content type. Allowed: image/jpeg, image/png, image/gif, image/webp"
            ));
        }

        try {
            // Generate pre-signed URL
            PresignedUploadResponse response = s3StorageService.generatePresignedUploadUrl(
                filename, contentType
            );

            if (response == null) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "error", "S3 storage is not configured or unavailable"
                ));
            }

            log.info("✅ Generated presigned upload URL for: {} ({})", filename, contentType);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("❌ Failed to generate presigned upload URL: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Failed to generate upload URL: " + e.getMessage()
            ));
        }
    }

    /**
     * Confirm that an uploaded file exists in S3.
     * Optional endpoint for frontend to verify upload succeeded.
     * 
     * GET /api/s3/verify?objectKey=complaints/2026/02/pending-abc123.jpg
     */
    @GetMapping("/verify")
    public ResponseEntity<?> verifyUpload(@RequestParam String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "objectKey is required"
            ));
        }

        boolean exists = s3StorageService.imageExists(objectKey);
        
        return ResponseEntity.ok(Map.of(
            "objectKey", objectKey,
            "exists", exists
        ));
    }

    /**
     * Validate that content type is an allowed image type.
     */
    private boolean isValidImageType(String contentType) {
        if (contentType == null) return false;
        String lower = contentType.toLowerCase();
        return lower.equals("image/jpeg") ||
               lower.equals("image/jpg") ||
               lower.equals("image/png") ||
               lower.equals("image/gif") ||
               lower.equals("image/webp") ||
               lower.equals("image/heic");
    }
}
