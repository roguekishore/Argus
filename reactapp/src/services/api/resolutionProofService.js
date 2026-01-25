/**
 * Resolution Proof Service
 * 
 * API calls for resolution proof management
 * Matches backend endpoints in ResolutionProofController
 */

import apiClient from './apiClient';

const resolutionProofService = {
  /**
   * Submit resolution proof for a complaint
   * POST /api/complaints/{id}/resolution-proof
   * @param {number} complaintId 
   * @param {Object} proofData - { description }
   * @param {File} imageFile 
   */
  submit: async (complaintId, proofData, imageFile) => {
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
