/**
 * S3 Direct Upload Service
 * 
 * Handles direct browser-to-S3 uploads using pre-signed URLs.
 * 
 * ARCHITECTURE:
 * 1. Frontend requests a pre-signed URL from backend (via CloudFront → EC2)
 * 2. Backend generates a time-limited PUT URL for S3
 * 3. Frontend uploads the file DIRECTLY to S3 (bypasses CloudFront entirely)
 * 4. Frontend uses the returned objectKey when creating complaints
 * 
 * WHY THIS APPROACH:
 * - Avoids CloudFront's request size limits (~50MB for viewer requests)
 * - Avoids CORS issues with multipart uploads through CloudFront
 * - Reduces load on EC2 (file bytes never touch the server)
 * - Keeps AWS credentials server-side only (secure)
 */

import apiClient from './apiClient';

// S3 bucket URL pattern for direct uploads (bypasses CloudFront)
// The actual URL comes from the pre-signed URL response

const s3UploadService = {
  /**
   * Request a pre-signed upload URL from the backend
   * 
   * @param {string} filename - Original filename
   * @param {string} contentType - MIME type (e.g., 'image/jpeg')
   * @returns {Promise<{uploadUrl: string, objectKey: string, expiresInSeconds: number, contentType: string}>}
   */
  getPresignedUploadUrl: async (filename, contentType) => {
    return apiClient.post('/s3/presigned-upload', {
      filename,
      contentType,
    });
  },

  /**
   * Upload a file directly to S3 using a pre-signed URL.
   * 
   * IMPORTANT: This request goes DIRECTLY to S3, NOT through CloudFront.
   * 
   * @param {string} uploadUrl - Pre-signed PUT URL from getPresignedUploadUrl
   * @param {File} file - The file to upload
   * @param {string} contentType - Must match what was used to generate the URL
   * @param {function} onProgress - Optional progress callback (0-100)
   * @returns {Promise<void>}
   */
  uploadToS3: async (uploadUrl, file, contentType, onProgress = null) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            onProgress(percentComplete);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log('✅ File uploaded directly to S3');
          resolve();
        } else {
          console.error('❌ S3 upload failed:', xhr.status, xhr.statusText);
          reject(new Error(`S3 upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        console.error('❌ S3 upload network error');
        reject(new Error('Network error during S3 upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was aborted'));
      });

      // PUT request directly to S3 (NOT through CloudFront)
      xhr.open('PUT', uploadUrl);
      
      // CRITICAL: Content-Type MUST match what was used to generate the pre-signed URL
      xhr.setRequestHeader('Content-Type', contentType);
      
      // Send the file
      xhr.send(file);
    });
  },

  /**
   * Convenience method: Get pre-signed URL and upload in one call.
   * 
   * @param {File} file - The file to upload
   * @param {function} onProgress - Optional progress callback (0-100)
   * @returns {Promise<{objectKey: string}>} - The S3 object key to use when creating complaint
   */
  uploadFile: async (file, onProgress = null) => {
    if (!file) {
      throw new Error('No file provided');
    }

    const contentType = file.type || 'image/jpeg';
    const filename = file.name || 'upload.jpg';

    console.log(`📤 Starting direct S3 upload: ${filename} (${contentType})`);

    // Step 1: Get pre-signed URL from backend (via CloudFront → EC2)
    const presignedResponse = await s3UploadService.getPresignedUploadUrl(filename, contentType);
    
    if (!presignedResponse || !presignedResponse.uploadUrl) {
      throw new Error('Failed to get pre-signed upload URL');
    }

    console.log(`📋 Got pre-signed URL for: ${presignedResponse.objectKey}`);

    // Step 2: Upload directly to S3 (bypasses CloudFront)
    await s3UploadService.uploadToS3(
      presignedResponse.uploadUrl,
      file,
      presignedResponse.contentType,
      onProgress
    );

    console.log(`✅ Upload complete: ${presignedResponse.objectKey}`);

    // Return the object key for use in complaint creation
    return {
      objectKey: presignedResponse.objectKey,
      contentType: presignedResponse.contentType,
    };
  },

  /**
   * Verify that an upload succeeded (optional)
   * 
   * @param {string} objectKey - The S3 object key to verify
   * @returns {Promise<{objectKey: string, exists: boolean}>}
   */
  verifyUpload: async (objectKey) => {
    return apiClient.get(`/s3/verify?objectKey=${encodeURIComponent(objectKey)}`);
  },
};

export default s3UploadService;
