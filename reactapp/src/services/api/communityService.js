/**
 * Community Service
 * 
 * API calls for community features:
 * - Upvoting complaints ("Me Too")
 * - Nearby complaints
 * - Trending complaints
 */

import apiClient from './apiClient';

const communityService = {
  // ==================== UPVOTING ====================

  /**
   * Upvote a complaint ("Me Too")
   * POST /api/community/complaints/{complaintId}/upvote
   */
  upvote: (complaintId, citizenId, latitude = null, longitude = null) => {
    const params = new URLSearchParams();
    params.append('citizenId', citizenId);
    if (latitude) params.append('latitude', latitude);
    if (longitude) params.append('longitude', longitude);
    
    return apiClient.post(`/community/complaints/${complaintId}/upvote?${params.toString()}`);
  },

  /**
   * Remove upvote from a complaint
   * DELETE /api/community/complaints/{complaintId}/upvote
   */
  removeUpvote: (complaintId, citizenId) => {
    return apiClient.delete(`/community/complaints/${complaintId}/upvote?citizenId=${citizenId}`);
  },

  /**
   * Check if user has upvoted a complaint
   * GET /api/community/complaints/{complaintId}/upvote/status
   */
  checkUpvoteStatus: (complaintId, citizenId) => {
    return apiClient.get(`/community/complaints/${complaintId}/upvote/status?citizenId=${citizenId}`);
  },

  /**
   * Get all complaint IDs upvoted by a citizen
   * GET /api/community/citizens/{citizenId}/upvotes
   */
  getUpvotedIds: (citizenId) => {
    return apiClient.get(`/community/citizens/${citizenId}/upvotes`);
  },

  // ==================== NEARBY/COMMUNITY ====================

  /**
   * Get nearby complaints
   * GET /api/community/complaints/nearby
   */
  getNearby: (latitude, longitude, radiusMeters = 2000, userId = null) => {
    const params = new URLSearchParams();
    params.append('latitude', latitude);
    params.append('longitude', longitude);
    params.append('radiusMeters', radiusMeters);
    if (userId) params.append('userId', userId);
    
    return apiClient.get(`/community/complaints/nearby?${params.toString()}`);
  },

  /**
   * Get trending complaints (most upvoted)
   * GET /api/community/complaints/trending
   */
  getTrending: (userId = null, limit = 10) => {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    params.append('limit', limit);
    
    return apiClient.get(`/community/complaints/trending?${params.toString()}`);
  },
};

export default communityService;
