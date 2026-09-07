# Direct S3 Upload Architecture

## Overview

This document describes the direct-to-S3 upload architecture that bypasses CloudFront for file uploads while maintaining CloudFront for all other API calls.

## Why This Architecture?

### The Problem
When uploading images through CloudFront → EC2 → S3:
1. **CloudFront Request Size Limits**: CloudFront has a default limit of ~50MB for viewer requests
2. **CORS Issues**: Multipart uploads through CloudFront can trigger complex CORS preflight issues
3. **EC2 Load**: All file bytes pass through EC2, consuming bandwidth and memory

### The Solution
Direct browser-to-S3 uploads using pre-signed URLs:
1. Frontend requests a pre-signed URL from backend (small JSON request via CloudFront)
2. Backend generates a time-limited PUT URL for S3 (credentials stay server-side)
3. Frontend uploads directly to S3 (bypasses CloudFront entirely)
4. Frontend creates the complaint with the S3 key (small JSON request via CloudFront)

---

## Request Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NORMAL API CALLS (JSON)                           │
│                        (Auth, Complaints, Users, etc.)                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌──────────┐    HTTPS     ┌────────────────┐    HTTP     ┌──────────┐
│  React   │ ──────────── │   CloudFront   │ ──────────► │   EC2    │
│ Frontend │              │   (CDN/HTTPS)  │             │ (Spring) │
└──────────┘              └────────────────┘             └──────────┘
     │                                                         │
     │                                                         │
     │  ┌─────────────────────────────────────────────────────┐│
     │  │           FILE UPLOADS (Images)                     ││
     │  │                                                     ││
     │  │  1. POST /api/s3/presigned-upload ──────────────────┼┤► Get upload URL
     │  │     (via CloudFront, small JSON)                    ││
     │  │                                                     ││
     │  │  2. PUT directly to S3 ◄────────────────────────────┼┘
     │  │     (bypasses CloudFront!)        ┌──────────┐      │
     │  │     ─────────────────────────────►│    S3    │      │
     │  │                                   │  Bucket  │      │
     │  │  3. POST /api/complaints/.../     └──────────┘      │
     │  │     with-s3-image ──────────────────────────────────┤► Create complaint
     │  │     (via CloudFront, small JSON)                    │
     │  └─────────────────────────────────────────────────────┘
     │
```

---

## Endpoints Using Direct S3 Upload

### 1. Complaint Creation with Image
```
POST /api/s3/presigned-upload          → Get pre-signed URL
PUT  https://bucket.s3.amazonaws.com/  → Upload directly to S3
POST /api/complaints/citizen/{id}/with-s3-image → Create complaint with S3 key
```

### 2. Resolution Proof Submission (Staff)
```
POST /api/s3/presigned-upload          → Get pre-signed URL
PUT  https://bucket.s3.amazonaws.com/  → Upload directly to S3
POST /api/complaints/{id}/resolution-proof-s3 → Submit proof with S3 key
```

### 3. Dispute Submission (Citizen)
```
POST /api/s3/presigned-upload          → Get pre-signed URL
PUT  https://bucket.s3.amazonaws.com/  → Upload directly to S3
POST /api/complaints/{id}/dispute-s3   → Submit dispute with S3 key
```

---

## Which Requests Go Where?

### Through CloudFront (JSON, small requests)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/s3/presigned-upload` | Get pre-signed URL |
| GET | `/api/s3/verify` | Verify upload succeeded |
| POST | `/api/complaints/citizen/{id}/with-s3-image` | Create complaint with S3 key |
| POST | `/api/complaints/{id}/resolution-proof-s3` | Submit resolution proof with S3 key |
| POST | `/api/complaints/{id}/dispute-s3` | Submit dispute with S3 key |
| ALL | `/api/*` (all other endpoints) | Normal API calls |

### Direct to S3 (Bypasses CloudFront)
| Method | URL Pattern | Purpose |
|--------|-------------|---------|
| PUT | `https://{bucket}.s3.{region}.amazonaws.com/...` | Upload file directly |

---

## S3 CORS Configuration

### Where to Set This
1. Go to **AWS Console → S3 → Your Bucket**
2. Click **Permissions** tab
3. Scroll to **Cross-origin resource sharing (CORS)**
4. Click **Edit** and paste the JSON below

### CORS JSON Configuration

```json
[
    {
        "AllowedHeaders": [
            "Content-Type",
            "Content-Length",
            "x-amz-acl"
        ],
        "AllowedMethods": [
            "PUT"
        ],
        "AllowedOrigins": [
            "https://your-cloudfront-domain.cloudfront.net",
            "https://your-custom-domain.com",
            "http://localhost:3000"
        ],
        "ExposeHeaders": [
            "ETag"
        ],
        "MaxAgeSeconds": 3600
    }
]
```

### Important Notes:
1. **AllowedOrigins**: Replace with your actual frontend domains
   - Production: Your CloudFront distribution URL or custom domain
   - Development: `http://localhost:3000` (remove in production if not needed)
2. **AllowedMethods**: Only `PUT` is needed for pre-signed uploads
3. **AllowedHeaders**: `Content-Type` is required for uploads to work
4. **MaxAgeSeconds**: 3600 (1 hour) caches preflight responses

---

## IAM Policy for EC2/Backend

The EC2 instance (or the IAM user whose credentials are in `application.properties`) needs these permissions:

### Minimal IAM Policy

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "S3ImageStorage",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:HeadObject"
            ],
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/complaints/*"
        },
        {
            "Sid": "S3ListBucket",
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME",
            "Condition": {
                "StringLike": {
                    "s3:prefix": "complaints/*"
                }
            }
        }
    ]
}
```

### Where to Attach This Policy
1. **Option A (Recommended for EC2)**: Create an IAM Role, attach this policy, assign role to EC2 instance
2. **Option B (Using credentials)**: Attach to the IAM User whose credentials are in `application.properties`

---

## Backend Configuration

### application.properties
```properties
# AWS S3 Configuration
aws.s3.enabled=true
aws.s3.access-key=${AWS_ACCESS_KEY_ID}
aws.s3.secret-key=${AWS_SECRET_ACCESS_KEY}
aws.s3.bucket-name=${AWS_S3_BUCKET}
aws.s3.region=${AWS_REGION}
```

### Environment Variables (Production)
```bash
export AWS_S3_ENABLED=true
export AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXX
export AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
export AWS_S3_BUCKET=your-grievance-bucket
export AWS_REGION=ap-south-1
```

---

## Frontend Usage

### Basic Usage (Automatic)
The `complaintsService.createWithImage()` method handles everything automatically:

```javascript
import { complaintsService } from './services/api';

// This automatically:
// 1. Uploads image directly to S3 (if provided)
// 2. Creates complaint with S3 key
const complaint = await complaintsService.createWithImage(
  userId,
  {
    subject: 'Pothole on Main Street',
    description: 'Large pothole causing accidents',
    location: 'Main Street, Block 5',
    latitude: 12.9716,
    longitude: 77.5946,
  },
  imageFile  // File from <input type="file">
);
```

### With Progress Tracking
```javascript
const complaint = await complaintsService.createWithImage(
  userId,
  complaintData,
  imageFile,
  (progress) => {
    console.log(`Upload progress: ${progress}%`);
    setUploadProgress(progress);
  }
);
```

### Manual Upload (Advanced)
```javascript
import { s3UploadService } from './services/api';

// Step 1: Upload to S3
const { objectKey, contentType } = await s3UploadService.uploadFile(imageFile);

// Step 2: Use objectKey in your request
const response = await apiClient.post(`/complaints/citizen/${userId}/with-s3-image`, {
  title: 'My Complaint',
  description: '...',
  location: '...',
  latitude: 12.97,
  longitude: 77.59,
  imageS3Key: objectKey,
  imageMimeType: contentType,
});
```

---

## Why This Avoids CORS and Size Issues

### CORS Issue Resolution
- **Before**: Browser → CloudFront → EC2 (multipart upload triggers complex CORS preflight)
- **After**: Browser → S3 directly (simple PUT with proper CORS configured on S3 bucket)

### Size Limit Resolution
- **Before**: CloudFront has ~50MB limit on viewer requests
- **After**: S3 has 5GB limit per PUT request (5TB with multipart)

### Security Maintained
- AWS credentials **never** leave the server
- Pre-signed URLs expire after 10 minutes
- Only authenticated users can request upload URLs
- S3 bucket remains private (no public access)

---

## Troubleshooting

### "CORS error" on upload
1. Verify S3 CORS configuration includes your frontend origin
2. Check browser console for the exact origin being blocked
3. Ensure `Content-Type` header is being sent with the PUT request

### "403 Forbidden" on upload
1. Pre-signed URL may have expired (10 minute limit)
2. Content-Type header must match what was used to generate the URL
3. Check IAM permissions for `s3:PutObject`

### "S3 not configured" error from backend
1. Verify `aws.s3.enabled=true` in application.properties
2. Check that AWS credentials are valid
3. Verify bucket exists and is in the correct region

---

## Free-Tier Considerations

This architecture is **free-tier friendly**:
- S3 free tier: 5GB storage, 20,000 GET, 2,000 PUT requests/month
- No Lambda required
- No API Gateway required
- CloudFront free tier: 1TB data transfer, 10M requests/month

For a typical grievance portal with moderate image uploads, this should stay well within free tier limits.
