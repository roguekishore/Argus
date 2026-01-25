package com.backend.springapp.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Service for storing and retrieving images from AWS S3.
 * 
 * SECURITY NOTE: We store only the S3 object key (not public URL) with complaints.
 * Images are fetched via this service when needed for AI analysis or display.
 * This prevents unauthorized direct access to evidence images.
 * 
 * DESIGN DECISIONS:
 * - Object keys follow pattern: complaints/{year}/{month}/complaint-{id}-{uuid}.{ext}
 * - Images are stored with private ACL (no public access)
 * - Byte arrays are used for AI analysis (Gemini cannot fetch URLs)
 */
@Service
@Slf4j
public class S3StorageService {

    @Value("${aws.s3.access-key:}")
    private String accessKey;

    @Value("${aws.s3.secret-key:}")
    private String secretKey;

    @Value("${aws.s3.region:ap-south-1}")
    private String region;

    @Value("${aws.s3.bucket-name:grievance-evidence}")
    private String bucketName;

    @Value("${aws.s3.enabled:false}")
    private boolean enabled;

    private S3Client s3Client;
    private S3Presigner s3Presigner;

    @PostConstruct
    public void init() {
        if (enabled && !accessKey.isBlank() && !secretKey.isBlank()) {
            try {
                var credentials = StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(accessKey, secretKey)
                );
                
                s3Client = S3Client.builder()
                    .region(Region.of(region))
                    .credentialsProvider(credentials)
                    .build();
                
                s3Presigner = S3Presigner.builder()
                    .region(Region.of(region))
                    .credentialsProvider(credentials)
                    .build();
                    
                log.info("✅ AWS S3 client initialized successfully for bucket: {}", bucketName);
            } catch (Exception e) {
                log.error("❌ Failed to initialize S3 client: {}", e.getMessage());
                enabled = false;
            }
        } else {
            log.warn("⚠️ AWS S3 not configured - image storage disabled");
            log.info("   Set aws.s3.enabled=true and provide credentials in application.properties");
        }
    }

    /**
     * Check if S3 storage is configured and available
     */
    public boolean isConfigured() {
        return enabled && s3Client != null;
    }

    /**
     * Upload image bytes to S3 and return the object key.
     * 
     * @param imageBytes Raw image bytes
     * @param mimeType   MIME type (e.g., "image/jpeg", "image/png")
     * @param complaintId Optional complaint ID for organized storage (can be null for new complaints)
     * @return S3 object key (NOT the URL) - store this with the complaint
     */
    public String uploadImage(byte[] imageBytes, String mimeType, Long complaintId) {
        if (!isConfigured()) {
            log.warn("S3 not configured - cannot upload image");
            return null;
        }

        if (imageBytes == null || imageBytes.length == 0) {
            log.warn("Empty image bytes provided - skipping upload");
            return null;
        }

        try {
            // Generate organized object key
            String objectKey = generateObjectKey(mimeType, complaintId);

            // Upload with private ACL
            PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(objectKey)
                .contentType(mimeType)
                .build();

            s3Client.putObject(putRequest, RequestBody.fromBytes(imageBytes));

            log.info("✅ Image uploaded to S3: {} ({} bytes, {})", 
                     objectKey, imageBytes.length, mimeType);
            return objectKey;

        } catch (Exception e) {
            log.error("❌ Failed to upload image to S3: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Download image bytes from S3 by object key.
     * Used for AI analysis (Gemini requires byte array, cannot fetch URLs).
     * 
     * @param objectKey S3 object key stored with the complaint
     * @return Raw image bytes, or null if not found/error
     */
    public byte[] downloadImage(String objectKey) {
        if (!isConfigured()) {
            log.warn("S3 not configured - cannot download image");
            return null;
        }

        if (objectKey == null || objectKey.isBlank()) {
            log.warn("Empty object key provided - cannot download");
            return null;
        }

        try {
            GetObjectRequest getRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(objectKey)
                .build();

            byte[] imageBytes = s3Client.getObjectAsBytes(getRequest).asByteArray();
            log.info("✅ Image downloaded from S3: {} ({} bytes)", objectKey, imageBytes.length);
            return imageBytes;

        } catch (NoSuchKeyException e) {
            log.warn("Image not found in S3: {}", objectKey);
            return null;
        } catch (Exception e) {
            log.error("❌ Failed to download image from S3: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Delete image from S3 (for cleanup or when complaint is deleted)
     * 
     * @param objectKey S3 object key to delete
     * @return true if deleted successfully
     */
    public boolean deleteImage(String objectKey) {
        if (!isConfigured() || objectKey == null || objectKey.isBlank()) {
            return false;
        }

        try {
            DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                .bucket(bucketName)
                .key(objectKey)
                .build();

            s3Client.deleteObject(deleteRequest);
            log.info("✅ Image deleted from S3: {}", objectKey);
            return true;

        } catch (Exception e) {
            log.error("❌ Failed to delete image from S3: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Check if an image exists in S3
     * 
     * @param objectKey S3 object key to check
     * @return true if exists
     */
    public boolean imageExists(String objectKey) {
        if (!isConfigured() || objectKey == null || objectKey.isBlank()) {
            return false;
        }

        try {
            HeadObjectRequest headRequest = HeadObjectRequest.builder()
                .bucket(bucketName)
                .key(objectKey)
                .build();

            s3Client.headObject(headRequest);
            return true;

        } catch (NoSuchKeyException e) {
            return false;
        } catch (Exception e) {
            log.error("❌ Error checking image existence: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Generate a presigned URL for viewing an image.
     * The URL is temporary (expires after the specified duration).
     * 
     * @param objectKey S3 object key
     * @param expirationMinutes How long the URL should be valid (default: 60 minutes)
     * @return Presigned URL string, or null if not configured/error
     */
    public String getPresignedUrl(String objectKey, int expirationMinutes) {
        if (!isConfigured() || objectKey == null || objectKey.isBlank()) {
            log.warn("S3 not configured or empty key - cannot generate presigned URL");
            return null;
        }

        try {
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(objectKey)
                .build();

            GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(expirationMinutes))
                .getObjectRequest(getObjectRequest)
                .build();

            PresignedGetObjectRequest presignedRequest = s3Presigner.presignGetObject(presignRequest);
            String url = presignedRequest.url().toString();
            
            log.info("✅ Generated presigned URL for: {} (expires in {} min)", objectKey, expirationMinutes);
            return url;

        } catch (Exception e) {
            log.error("❌ Failed to generate presigned URL: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Generate a presigned URL with default expiration (60 minutes)
     */
    public String getPresignedUrl(String objectKey) {
        return getPresignedUrl(objectKey, 60);
    }

    /**
     * Generate organized S3 object key for complaint images.
     * Pattern: complaints/{year}/{month}/complaint-{id}-{uuid}.{ext}
     * 
     * Example: complaints/2026/01/complaint-142-a1b2c3d4.jpg
     */
    private String generateObjectKey(String mimeType, Long complaintId) {
        LocalDate now = LocalDate.now();
        String year = now.format(DateTimeFormatter.ofPattern("yyyy"));
        String month = now.format(DateTimeFormatter.ofPattern("MM"));
        
        String extension = getExtensionFromMimeType(mimeType);
        String uniqueId = UUID.randomUUID().toString().substring(0, 8);
        
        String filename = complaintId != null 
            ? String.format("complaint-%d-%s.%s", complaintId, uniqueId, extension)
            : String.format("pending-%s.%s", uniqueId, extension);
        
        return String.format("complaints/%s/%s/%s", year, month, filename);
    }

    /**
     * Map MIME type to file extension
     */
    private String getExtensionFromMimeType(String mimeType) {
        if (mimeType == null) return "jpg";
        
        return switch (mimeType.toLowerCase()) {
            case "image/jpeg", "image/jpg" -> "jpg";
            case "image/png" -> "png";
            case "image/gif" -> "gif";
            case "image/webp" -> "webp";
            case "image/heic" -> "heic";
            default -> "jpg";
        };
    }

    /**
     * Get bucket name for logging/debugging
     */
    public String getBucketName() {
        return bucketName;
    }
}
