/**
 * Citizen Signoff Service
 * 
 * API calls for citizen signoff (accept/close complaints)
 * Matches backend endpoints in CitizenSignoffController
 */

import apiClient from './apiClient';

const signoffService = {
  /**
   * Submit citizen signoff (accept resolution and close)
   * POST /api/complaints/{id}/signoff
   * @param {number} complaintId 
   * @param {Object} signoffData - { isAccepted, rating, feedback }
   */
  submit: (complaintId, signoffData) => {
    return apiClient.post(`/complaints/${complaintId}/signoff`, signoffData);
  },

  /**
   * Accept resolution and close complaint
   * POST /api/complaints/{id}/signoff
   * @param {number} complaintId 
   * @param {number} rating - 1-5
   * @param {string} feedback - Optional
   */
  accept: (complaintId, rating, feedback = '') => {
    return apiClient.post(`/complaints/${complaintId}/signoff`, {
      isAccepted: true,
      rating,
      feedback,
    });
  },

  /**
   * Get signoff history for a complaint
   * GET /api/complaints/{id}/signoffs
   * @param {number} complaintId 
   */
  getHistory: (complaintId) => {
    return apiClient.get(`/complaints/${complaintId}/signoffs`);
  },
};

export default signoffService;
