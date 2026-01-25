/**
 * Users Service
 * 
 * All user-related API calls
 * Uses ONLY endpoints defined in ENDPOINTS.md
 */

import apiClient from './apiClient';

const usersService = {
  /**
   * Get all users (admin only)
   * GET /api/users
   */
  getAll: () => {
    return apiClient.get('/users');
  },

  /**
   * Get user by ID
   * GET /api/users/{id}
   * @param {string|number} userId
   */
  getById: (userId) => {
    return apiClient.get(`/users/${userId}`);
  },

  /**
   * Create a new user
   * POST /api/users
   * @param {Object} userData - User data { name, email, password, mobile, userType, deptId }
   */
  create: (userData) => {
    return apiClient.post('/users', userData);
  },

  /**
   * Update a user
   * PUT /api/users/{id}
   * @param {string|number} userId
   * @param {Object} userData - Updated user data
   */
  update: (userId, userData) => {
    return apiClient.put(`/users/${userId}`, userData);
  },

  /**
   * Delete a user
   * DELETE /api/users/{id}
   * @param {string|number} userId
   */
  delete: (userId) => {
    return apiClient.delete(`/users/${userId}`);
  },

  /**
   * Create a staff user
   * POST /api/users/staff?deptId={deptId}
   * @param {Object} userData - Staff user data
   * @param {string|number} deptId - Department ID
   */
  createStaff: (userData, deptId) => {
    return apiClient.post(`/users/staff?deptId=${deptId}`, userData);
  },

  /**
   * Assign a staff member as department head
   * PUT /api/users/{userId}/assign-head?deptId={deptId}
   * @param {string|number} userId 
   * @param {string|number} deptId 
   */
  assignDepartmentHead: (userId, deptId) => {
    return apiClient.put(`/users/${userId}/assign-head?deptId=${deptId}`);
  },

  /**
   * Get all staff of a department
   * GET /api/users/department/{deptId}/staff
   * @param {string|number} deptId 
   */
  getDepartmentStaff: (deptId) => {
    return apiClient.get(`/users/department/${deptId}/staff`);
  },

  /**
   * Get head of a department
   * GET /api/users/department/{deptId}/head
   * @param {string|number} deptId 
   */
  getDepartmentHead: (deptId) => {
    return apiClient.get(`/users/department/${deptId}/head`);
  },
};

export default usersService;
