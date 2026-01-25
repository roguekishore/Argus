/**
 * Escalation Service
 * 
 * All escalation-related API calls
 * Uses ONLY endpoints defined in ENDPOINTS.md
 */

import apiClient from './apiClient';

const escalationService = {
  /**
   * Get escalation history for a complaint
   * GET /api/complaints/{id}/escalations
   * @param {string|number} complaintId 
   */
  getComplaintEscalations: (complaintId) => {
    return apiClient.get(`/complaints/${complaintId}/escalations`);
  },

  /**
   * Get all overdue complaints with escalation status
   * GET /api/escalations/overdue
   */
  getOverdue: () => {
    return apiClient.get('/escalations/overdue');
  },

  /**
   * Get escalation statistics (counts by level)
   * GET /api/escalations/stats
   */
  getStats: () => {
    return apiClient.get('/escalations/stats');
  },

  /**
   * Manually trigger escalation scheduler run
   * POST /api/escalations/trigger
   * For: ADMIN, SUPER_ADMIN
   */
  trigger: () => {
    return apiClient.post('/escalations/trigger');
  },
};

export default escalationService;
