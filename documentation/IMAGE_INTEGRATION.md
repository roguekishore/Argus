# Image Integration Guide

## Overview

This document describes the image handling features added to the Grievance Redressal System. Images can be submitted as evidence with complaints via both the **Frontend** and **WhatsApp** channels.

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Spring Boot   │────▶│   AWS S3        │
│   (Multipart)   │     │   (Backend)     │     │   (Storage)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │                        │
┌─────────────────┐            │                        │
│   WhatsApp      │────────────┤                        │
│   (Twilio)      │            │                        │
└─────────────────┘            │                        │
                               ▼                        ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │   Gemini 3 Pro  │◀────│   Image Bytes   │
                        │   (Multimodal)  │     │   (from S3)     │
                        └─────────────────┘     └─────────────────┘
```

---

## New Components

### 1. S3StorageService
**Location:** `service/S3StorageService.java`

Handles all S3 operations:
- `uploadImage(byte[], mimeType, complaintId)` → Returns S3 object key
- `downloadImage(s3Key)` → Returns image bytes
- `deleteImage(s3Key)` → Deletes from S3
- `imageExists(s3Key)` → Checks existence

**Key Design Decisions:**
- Stores only S3 object key in database (NOT public URL) for security
- Object key pattern: `complaints/{year}/{month}/complaint-{id}-{uuid}.{ext}`
- Images are stored with private ACL (no public access)

### 2. ImageAnalysisService
**Location:** `service/ImageAnalysisService.java`

Handles multimodal AI analysis:
- `analyzeImage(bytes, mimeType, complaintText, location)` → Returns `ImageAnalysisResult`
- `analyzeImageByS3Key(s3Key, ...)` → Fetches from S3 then analyzes
- `analyzeImageAsync(...)` → Non-blocking CompletableFuture

**Analysis Capabilities:**
- Issue verification (does image match description?)
- Safety risk detection (exposed wires, open manholes)
- Severity assessment (MINOR → CRITICAL)
- Priority recommendation (UPGRADE/MAINTAIN/DOWNGRADE)
- Authenticity check (stock photos vs real evidence)

### 3. TwilioMediaService
**Location:** `whatsapp/service/TwilioMediaService.java`

Fetches media from Twilio webhooks:
- `fetchMediaBytes(mediaUrl)` → Downloads using Basic Auth
- `normalizeContentType(contentType)` → Standardizes MIME types
- `isSupportedImageType(contentType)` → Validates image types

---

## Updated Components

### ComplaintController
**New Endpoints:**

```
POST /api/complaints/citizen/{citizenId}/with-image
Content-Type: multipart/form-data

Parameters:
- title: Complaint title
- description: Detailed description
- location: Issue location
- image: (file) Evidence image (optional)

Response: ComplaintResponseDTO with image analysis
```

```
POST /api/complaints/{complaintId}/image
Content-Type: multipart/form-data

Parameters:
- image: (file) Evidence image

Response: Updated ComplaintResponseDTO
```

```
GET /api/complaints/{complaintId}/image-analysis

Response: {
  "hasImage": true,
  "imageS3Key": "complaints/2026/01/complaint-142-abc.jpg",
  "hasAnalysis": true,
  "analysis": "...",
  "analyzedAt": "2026-01-23T10:30:00"
}
```

### AIService
**Enhanced with Multimodal Support:**

```java
// Text-only analysis (existing)
AIDecision analyzeComplaint(Complaint complaint);

// Multimodal analysis (new)
AIDecision analyzeComplaint(Complaint complaint, byte[] imageBytes, String mimeType);
```

When image is provided:
- Uses Gemini 3 Pro multimodal endpoint
- Sends image as base64 inline data
- Returns `imageFindings` in AIDecision

### ComplaintService
**New Methods:**

```java
// Create complaint with optional image
ComplaintResponseDTO createComplaintWithImage(
    Complaint complaint, Long citizenId, 
    byte[] imageBytes, String mimeType);

// Attach image to existing complaint
ComplaintResponseDTO attachImageToComplaint(
    Long complaintId, byte[] imageBytes, String mimeType);

// Get cached image analysis
Map<String, Object> getImageAnalysisForComplaint(Long complaintId);
```

### Complaint Entity
**New Fields:**

```java
// S3 object key (NOT public URL for security)
@Column(name = "image_s3_key")
private String imageS3Key;

// MIME type for proper AI analysis
@Column(name = "image_mime_type")
private String imageMimeType;

// Cached AI analysis result (JSON)
@Column(name = "image_analysis", columnDefinition = "TEXT")
private String imageAnalysis;

// Analysis timestamp (for cache invalidation)
@Column(name = "image_analyzed_at")
private LocalDateTime imageAnalyzedAt;
```

### WhatsApp Webhook
**Enhanced Media Handling:**

When `NumMedia > 0`:
1. Fetches image bytes from Twilio MediaUrl (authenticated)
2. Validates image type (JPEG, PNG, etc.)
3. Uploads to S3 immediately
4. Stores S3 key in message for agent processing
5. Passes image bytes to agent for AI analysis

### WhatsAppAgentService
**Image-Aware Complaint Creation:**

- Detects pending image from session
- Analyzes image using ImageAnalysisService
- Includes image findings in complaint
- Acknowledges image in response

---

## Configuration

### application.properties

```properties
# AWS S3 (disable in dev, enable in production)
aws.s3.enabled=${AWS_S3_ENABLED:false}
aws.s3.access-key=${AWS_ACCESS_KEY_ID:}
aws.s3.secret-key=${AWS_SECRET_ACCESS_KEY:}
aws.s3.bucket-name=${AWS_S3_BUCKET:grievance-evidence}
aws.s3.region=${AWS_REGION:ap-south-1}

# Multipart upload limits
spring.servlet.multipart.max-file-size=10MB
spring.servlet.multipart.max-request-size=15MB
```

### Environment Variables (Production)

```bash
export AWS_S3_ENABLED=true
export AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXX
export AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxx
export AWS_S3_BUCKET=my-grievance-bucket
export AWS_REGION=ap-south-1
```

---

## Testing

### Frontend Image Upload (Postman)

```
POST http://localhost:8080/api/complaints/citizen/1/with-image
Content-Type: multipart/form-data

title: Pothole on MG Road
description: Large pothole causing accidents near bus stop
location: MG Road, Sector 15, Near SBI Bank
image: [select file]
```

### WhatsApp Image (via Twilio Sandbox)

1. Join sandbox: Send `join <code>` to +14155238886
2. Send a text describing the issue
3. Send a photo of the issue
4. The agent will acknowledge the image and create complaint

### Test Without S3 (Dev Mode)

Set `aws.s3.enabled=false` in application.properties:
- S3 operations will log warnings but not fail
- Complaint creation continues without image storage
- Useful for local development

---

## Error Handling

| Error | Handling |
|-------|----------|
| S3 not configured | Logs warning, continues without image |
| Image upload fails | Non-blocking, logs error, continues |
| Image analysis fails | Non-blocking, logs error, uses text-only analysis |
| Twilio media fetch fails | Logs error, continues with text message |
| Unsupported image type | Logs warning, skips image processing |

---

## Security Considerations

1. **S3 Object Keys Only**: Never store or expose public URLs
2. **Authenticated Twilio Fetch**: Uses Basic Auth with Account SID/Token
3. **Private ACL**: S3 images are not publicly accessible
4. **Size Limits**: Max 10MB per image to prevent abuse
5. **Type Validation**: Only JPEG, PNG, GIF, WebP, HEIC accepted

---

## Performance

1. **Cached Analysis**: Image analysis results stored with complaint
2. **Non-blocking**: Image operations don't block complaint creation
3. **Async Support**: `analyzeImageAsync()` for background processing
4. **Immediate Twilio Fetch**: Prevents URL expiration issues

---

## Future Enhancements

- [ ] Multiple images per complaint
- [ ] Video evidence support
- [ ] OCR for document extraction
- [ ] Image compression before S3 upload
- [ ] Pre-signed URLs for secure frontend display
- [ ] Image re-analysis on demand
