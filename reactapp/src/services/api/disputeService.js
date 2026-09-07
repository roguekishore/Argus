/**
 * Dispute Service
 * 
 * API calls for dispute management
 * Matches backend endpoints in DisputeController
 * 
 * UPDATED: Uses direct S3 upload for images to avoid CloudFront size limits
 */

import apiClient from './apiClient';
import s3UploadService from './s3UploadService';

const disputeService = {
  /**
   * Submit a dispute for a resolved complaint using direct S3 upload.
   * 
   * FLOW:
   * 1. Upload counter-proof image directly to S3 (if provided)
   * 2. Submit dispute with S3 key to backend (JSON via CloudFront)
   * 
   * POST /api/complaints/{id}/dispute-s3
   * @param {number} complaintId 
   * @param {Object} disputeData - { disputeReason, feedback }
   * @param {File} counterProofImage - Optional counter-proof image
   * @param {function} onProgress - Optional upload progress callback
   */
  submit: async (complaintId, disputeData, counterProofImage, onProgress = null) => {
    let imageS3Key = null;
    let imageMimeType = null;

    // Step 1: Upload counter-proof image directly to S3 if provided
    if (counterProofImage) {
      try {
        console.log('📤 Uploading counter-proof image to S3...');
        const uploadResult = await s3UploadService.uploadFile(counterProofImage, onProgress);
        imageS3Key = uploadResult.objectKey;
        imageMimeType = uploadResult.contentType;
        console.log('✅ Counter-proof uploaded:', imageS3Key);
      } catch (uploadError) {
        console.error('❌ Counter-proof upload failed:', uploadError);
        // Continue without image - dispute can still be submitted
      }
    }

    // Step 2: Submit dispute with S3 key (JSON request via CloudFront)
    return apiClient.post(`/complaints/${complaintId}/dispute-s3`, {
      disputeReason: disputeData.disputeReason,
      feedback: disputeData.feedback || null,
      counterProofImageS3Key: imageS3Key,
      imageMimeType: imageMimeType,
    });
  },

  /**
   * [LEGACY] Submit dispute with multipart form upload (through CloudFront).
   * 
   * ⚠️ WARNING: May fail in production due to CloudFront size limits!
   * Use submit() instead, which uses direct S3 upload.
   * 
   * @deprecated Use submit() instead
   */
  submitLegacy: async (complaintId, disputeData, counterProofImage) => {
    const formData = new FormData();
    formData.append('disputeReason', disputeData.disputeReason);
    
    if (disputeData.feedback) {
      formData.append('feedback', disputeData.feedback);
    }
    
    if (counterProofImage) {
      formData.append('image', counterProofImage);
    }
    
    return apiClient.postFormData(`/complaints/${complaintId}/dispute`, formData);
  },

  /**
   * Approve a pending dispute (DEPT_HEAD)
   * POST /api/complaints/{id}/dispute/{signoffId}/approve
   * @param {number} complaintId 
   * @param {number} signoffId 
   */
  approve: (complaintId, signoffId) => {
    return apiClient.post(`/complaints/${complaintId}/dispute/${signoffId}/approve`);
  },

  /**
   * Reject a pending dispute (DEPT_HEAD)
   * POST /api/complaints/{id}/dispute/{signoffId}/reject?reason=...
   * @param {number} complaintId 
   * @param {number} signoffId 
   * @param {string} reason 
   */
  reject: (complaintId, signoffId, reason) => {
    return apiClient.post(`/complaints/${complaintId}/dispute/${signoffId}/reject?reason=${encodeURIComponent(reason)}`);
  },

  /**
   * Get pending disputes for department (DEPT_HEAD)
   * GET /api/disputes/pending
   */
  getPending: () => {
    return apiClient.get('/disputes/pending');
  },
};

export default disputeService;
