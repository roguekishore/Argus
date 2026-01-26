/**
 * Categories Service
 * 
 * All category-related API calls
 * Uses ONLY endpoints defined in ENDPOINTS.md
 */

import apiClient from './apiClient';

const categoriesService = {
  /**
   * Get all categories
   * GET /api/categories
   */
  getAll: () => {
    return apiClient.get('/categories');
  },

  /**
   * Create a new category
   * POST /api/categories
   * @param {Object} categoryData - { name, description, keywords }
   */
  create: (categoryData) => {
    return apiClient.post('/categories', categoryData);
  },

  /**
   * Get category by ID
   * GET /api/categories/{id}
   * @param {string|number} id 
   */
  getById: (id) => {
    return apiClient.get(`/categories/${id}`);
  },

  /**
   * Get category by name
   * GET /api/categories/name/{name}
   * @param {string} name 
   */
  getByName: (name) => {
    return apiClient.get(`/categories/name/${encodeURIComponent(name)}`);
  },

  /**
   * Update a category
   * PUT /api/categories/{id}
   * @param {string|number} id
   * @param {Object} categoryData - Updated category data
   */
  update: (id, categoryData) => {
    return apiClient.put(`/categories/${id}`, categoryData);
  },

  /**
   * Delete a category
   * DELETE /api/categories/{id}
   * @param {string|number} id
   */
  delete: (id) => {
    return apiClient.delete(`/categories/${id}`);
  },
};

export default categoriesService;
