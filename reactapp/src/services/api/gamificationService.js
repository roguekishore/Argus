/**
 * Gamification Service
 * API calls for leaderboards and citizen points
 */

import apiClient from './apiClient';

const gamificationService = {
  /**
   * Get public citizen leaderboard
   * @param {number} limit - Maximum entries (default 20)
   * @returns {Promise<Array>} Leaderboard entries
   */
  getCitizenLeaderboard: async (limit = 20) => {
    const response = await apiClient.get(`/gamification/citizens/leaderboard?limit=${limit}`);
    return response;
  },

  /**
   * Get a citizen's points and tier info
   * @param {number} citizenId - User ID
   * @returns {Promise<Object>} Points info
   */
  getCitizenPoints: async (citizenId) => {
    const response = await apiClient.get(`/gamification/citizens/${citizenId}/points`);
    return response;
  },

  /**
   * Get staff performance leaderboard
   * @param {number} limit - Maximum entries (default 20)
   * @param {number|null} departmentId - Optional department filter
   * @returns {Promise<Array>} Leaderboard entries
   */
  getStaffLeaderboard: async (limit = 20, departmentId = null) => {
    let url = `/gamification/staff/leaderboard?limit=${limit}`;
    if (departmentId) {
      url += `&departmentId=${departmentId}`;
    }
    const response = await apiClient.get(url);
    return response;
  },

  /**
   * Get a staff member's performance stats
   * @param {number} staffId - User ID
   * @returns {Promise<Object>} Staff stats
   */
  getStaffStats: async (staffId) => {
    const response = await apiClient.get(`/gamification/staff/${staffId}/stats`);
    return response;
  },

  /**
   * Get gamification thresholds and point values
   * @returns {Promise<Object>} Thresholds config
   */
  getThresholds: async () => {
    const response = await apiClient.get('/gamification/thresholds');
    return response;
  },
};

export default gamificationService;
