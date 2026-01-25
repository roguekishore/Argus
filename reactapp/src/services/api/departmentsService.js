/**
 * Departments Service
 * 
 * All department-related API calls
 * Uses ONLY endpoints defined in ENDPOINTS.md
 */

import apiClient from './apiClient';

const departmentsService = {
  /**
   * Get all departments
   * GET /api/departments/
   */
  getAll: () => {
    return apiClient.get('/departments/');
  },

  /**
   * Get department by ID
   * GET /api/departments/{id}
   * @param {string|number} id 
   */
  getById: (id) => {
    return apiClient.get(`/departments/${id}`);
  },
};

export default departmentsService;
