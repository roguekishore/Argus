/**
 * Resolution Proof Service
 * 
 * API calls for resolution proof management
 * Matches backend endpoints in ResolutionProofController
 * 
 * UPDATED: Uses direct S3 upload for images to avoid CloudFront size limits
 */

import apiClient from './apiClient';
import s3UploadService from './s3UploadService';

const resolutionProofService = {
  /**
   * Submit resolution proof for a complaint using direct S3 upload.
   * 
   * FLOW:
   * 1. Upload image directly to S3 (bypasses CloudFront)
   * 2. Submit proof with S3 key to backend (JSON via CloudFront)
   * 
   * POST /api/complaints/{id}/resolution-proof-s3
   * @param {number} complaintId 
   * @param {Object} proofData - { description }
   * @param {File} imageFile - Required proof image
   * @param {function} onProgress - Optional upload progress callback
   */
  submit: async (complaintId, proofData, imageFile, onProgress = null) => {
    if (!imageFile) {
      throw new Error('Image is required for resolution proof');
    }

    // Step 1: Upload image directly to S3
    console.log('📤 Uploading resolution proof image to S3...');
    const uploadResult = await s3UploadService.uploadFile(imageFile, onProgress);
    console.log('✅ Proof image uploaded:', uploadResult.objectKey);

    // Step 2: Submit proof with S3 key (JSON request via CloudFront)
    return apiClient.post(`/complaints/${complaintId}/resolution-proof-s3`, {
      proofImageS3Key: uploadResult.objectKey,
      imageMimeType: uploadResult.contentType,
      remarks: proofData.description,
    });
  },

  /**
   * [LEGACY] Submit proof with multipart form upload (through CloudFront).
   * 
   * ⚠️ WARNING: May fail in production due to CloudFront size limits!
   * Use submit() instead, which uses direct S3 upload.
   * 
   * @deprecated Use submit() instead
   */
  submitLegacy: async (complaintId, proofData, imageFile) => {
    const formData = new FormData();
    formData.append('description', proofData.description);
    formData.append('image', imageFile);
    
    return apiClient.postFormData(`/complaints/${complaintId}/resolution-proof`, formData);
  },

  /**
   * Get all proofs for a complaint
   * GET /api/complaints/{id}/resolution-proofs
   * @param {number} complaintId 
   */
  getForComplaint: (complaintId) => {
    return apiClient.get(`/complaints/${complaintId}/resolution-proofs`);
  },

  /**
   * Check if proof exists for a complaint
   * GET /api/complaints/{id}/has-proof
   * @param {number} complaintId 
   */
  hasProof: async (complaintId) => {
    return apiClient.get(`/complaints/${complaintId}/has-proof`);
  },

  /**
   * Verify a proof (DEPT_HEAD action)
   * PUT /api/complaints/{complaintId}/resolution-proof/{proofId}/verify
   * @param {number} complaintId 
   * @param {number} proofId 
   */
  verify: (complaintId, proofId) => {
    return apiClient.put(`/complaints/${complaintId}/resolution-proof/${proofId}/verify`);
  },
};

export default resolutionProofService;
