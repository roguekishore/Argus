/**
 * Dispute Service
 * 
 * API calls for dispute management
 * Matches backend endpoints in DisputeController
 */

import apiClient from './apiClient';

const disputeService = {
  /**
   * Submit a dispute for a resolved complaint
   * POST /api/complaints/{id}/dispute (multipart/form-data)
   * @param {number} complaintId 
   * @param {Object} disputeData - { disputeReason, feedback }
   * @param {File} counterProofImage - Optional counter-proof image
   */
  submit: async (complaintId, disputeData, counterProofImage) => {
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
   * Submit dispute with inline image upload
   * POST /api/complaints/{id}/dispute
   * Alternative: directly send with S3 key if already uploaded
   */
  submitWithS3Key: (complaintId, disputeData) => {
    return apiClient.post(`/complaints/${complaintId}/dispute`, disputeData);
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
