/**
 * SLA Service
 * 
 * All SLA-related API calls
 * Uses ONLY endpoints defined in ENDPOINTS.md
 */

import apiClient from './apiClient';

const slaService = {
  /**
   * Create a new SLA
   * POST /api/sla?categoryId={categoryId}&departmentId={departmentId}
   * @param {Object} slaData 
   * @param {string|number} categoryId 
   * @param {string|number} departmentId 
   */
  create: (slaData, categoryId, departmentId) => {
    return apiClient.post(`/sla?categoryId=${categoryId}&departmentId=${departmentId}`, slaData);
  },

  /**
   * Get SLA by ID
   * GET /api/sla/{id}
   * @param {string|number} id 
   */
  getById: (id) => {
    return apiClient.get(`/sla/${id}`);
  },

  /**
   * Get SLA by category ID
   * GET /api/sla/category/{categoryId}
   * @param {string|number} categoryId 
   */
  getByCategoryId: (categoryId) => {
    return apiClient.get(`/sla/category/${categoryId}`);
  },

  /**
   * Get SLA by category name
   * GET /api/sla/category/name/{categoryName}
   * @param {string} categoryName 
   */
  getByCategoryName: (categoryName) => {
    return apiClient.get(`/sla/category/name/${encodeURIComponent(categoryName)}`);
  },

  /**
   * Update SLA department
   * PUT /api/sla/{id}/department/{departmentId}
   * @param {string|number} slaId 
   * @param {string|number} departmentId 
   */
  updateDepartment: (slaId, departmentId) => {
    return apiClient.put(`/sla/${slaId}/department/${departmentId}`);
  },
};

export default slaService;
