/**
 * Categories Service
 * 
 * All category-related API calls
 * Uses ONLY endpoints defined in ENDPOINTS.md
 */

import apiClient from './apiClient';

const categoriesService = {
  /**
   * Create a new category
   * POST /api/categories/
   * @param {Object} categoryData 
   */
  create: (categoryData) => {
    return apiClient.post('/categories/', categoryData);
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
};

export default categoriesService;
