/**
 * SLA Service
 * 
 * All SLA-related API calls
 * Uses ONLY endpoints defined in ENDPOINTS.md
 */

import apiClient from './apiClient';

const slaService = {
  /**
   * Get all SLA configs
   * GET /api/sla
   */
  getAll: () => {
    return apiClient.get('/sla');
  },

  /**
   * Create a new SLA
   * POST /api/sla?categoryId={categoryId}&departmentId={departmentId}
   * @param {Object} slaData - { slaDays, basePriority }
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
   * Update SLA config
   * PUT /api/sla/{id}
   * @param {string|number} id
   * @param {Object} slaData - { slaDays, basePriority }
   */
  update: (id, slaData) => {
    return apiClient.put(`/sla/${id}`, slaData);
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

  /**
   * Delete SLA config
   * DELETE /api/sla/{id}
   * @param {string|number} id
   */
  delete: (id) => {
    return apiClient.delete(`/sla/${id}`);
  },
};

export default slaService;
