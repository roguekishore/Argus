/**
 * Complaints Service
 * 
 * All complaint-related API calls
 * Uses ONLY endpoints defined in ENDPOINTS.md
 */

import apiClient from './apiClient';

const complaintsService = {
  // ============================================
  // CRUD Operations
  // ============================================

  /**
   * Create a new complaint for a citizen
   * POST /api/complaints/citizen/{citizenId}
   * @param {string|number} citizenId 
   * @param {Object} complaintData 
   */
  create: (citizenId, complaintData) => {
    return apiClient.post(`/complaints/citizen/${citizenId}`, complaintData);
  },

  /**
   * Get complaint details
   * GET /api/complaints/{complaintId}/details
   * @param {string|number} complaintId 
   */
  getDetails: (complaintId) => {
    return apiClient.get(`/complaints/${complaintId}/details`);
  },

  /**
   * Get complaint by ID
   * GET /api/complaints/{complaintId}
   * @param {string|number} complaintId 
   */
  getById: (complaintId) => {
    return apiClient.get(`/complaints/${complaintId}`);
  },

  /**
   * Assign complaint to a department
   * PUT /api/complaints/{complaintId}/assign-department
   * @param {string|number} complaintId 
   * @param {Object} data - { departmentId }
   */
  assignDepartment: (complaintId, departmentId) => {
    return apiClient.put(`/complaints/${complaintId}/assign-department`, { departmentId });
  },

  /**
   * Assign complaint to a staff member
   * PUT /api/complaints/{complaintId}/assign-staff/{staffId}
   * @param {string|number} complaintId 
   * @param {string|number} staffId 
   */
  assignStaff: (complaintId, staffId) => {
    return apiClient.put(`/complaints/${complaintId}/assign-staff/${staffId}`);
  },

  // ============================================
  // AI-Powered Operations
  // ============================================

  /**
   * AI: Set category
   * PUT /api/complaints/{complaintId}/ai/category
   */
  aiSetCategory: (complaintId) => {
    return apiClient.put(`/complaints/${complaintId}/ai/category`);
  },

  /**
   * AI: Set priority
   * PUT /api/complaints/{complaintId}/ai/priority
   */
  aiSetPriority: (complaintId) => {
    return apiClient.put(`/complaints/${complaintId}/ai/priority`);
  },

  /**
   * AI: Set SLA
   * PUT /api/complaints/{complaintId}/ai/sla
   */
  aiSetSla: (complaintId) => {
    return apiClient.put(`/complaints/${complaintId}/ai/sla`);
  },

  /**
   * AI: Full processing in one call
   * PUT /api/complaints/{complaintId}/ai/process
   */
  aiProcess: (complaintId) => {
    return apiClient.put(`/complaints/${complaintId}/ai/process`);
  },

  // ============================================
  // Manual Updates
  // ============================================

  /**
   * Manually set priority
   * PUT /api/complaints/{complaintId}/manual/priority
   * @param {string|number} complaintId 
   * @param {Object} data - { priority }
   */
  setPriority: (complaintId, priority) => {
    return apiClient.put(`/complaints/${complaintId}/manual/priority`, { priority });
  },

  /**
   * Manually set SLA
   * PUT /api/complaints/{complaintId}/manual/sla
   * @param {string|number} complaintId 
   * @param {Object} data - SLA data
   */
  setSla: (complaintId, slaData) => {
    return apiClient.put(`/complaints/${complaintId}/manual/sla`, slaData);
  },

  /**
   * Rate a complaint (citizen feedback)
   * PUT /api/complaints/{complaintId}/rate
   * @param {string|number} complaintId 
   * @param {Object} data - { rating, feedback }
   */
  rate: (complaintId, ratingData) => {
    return apiClient.put(`/complaints/${complaintId}/rate`, ratingData);
  },

  // ============================================
  // Dashboard Listing Endpoints (Role-Based)
  // ============================================

  /**
   * Get all complaints (Admin/SuperAdmin)
   * GET /api/complaints
   */
  getAll: () => {
    return apiClient.get('/complaints');
  },

  /**
   * Get complaints for a citizen
   * GET /api/complaints/citizen/{citizenId}
   * @param {string|number} citizenId 
   */
  getByCitizen: (citizenId) => {
    return apiClient.get(`/complaints/citizen/${citizenId}`);
  },

  /**
   * Get stats for citizen dashboard
   * GET /api/complaints/citizen/{citizenId}/stats
   * @param {string|number} citizenId 
   */
  getCitizenStats: (citizenId) => {
    return apiClient.get(`/complaints/citizen/${citizenId}/stats`);
  },

  /**
   * Get complaints assigned to a staff member
   * GET /api/complaints/staff/{staffId}
   * @param {string|number} staffId 
   */
  getByStaff: (staffId) => {
    return apiClient.get(`/complaints/staff/${staffId}`);
  },

  /**
   * Get stats for staff dashboard
   * GET /api/complaints/staff/{staffId}/stats
   * @param {string|number} staffId 
   */
  getStaffStats: (staffId) => {
    return apiClient.get(`/complaints/staff/${staffId}/stats`);
  },

  /**
   * Get complaints for a department
   * GET /api/complaints/department/{deptId}
   * @param {string|number} deptId 
   */
  getByDepartment: (deptId) => {
    return apiClient.get(`/complaints/department/${deptId}`);
  },

  /**
   * Get unassigned complaints for a department
   * GET /api/complaints/department/{deptId}/unassigned
   * @param {string|number} deptId 
   */
  getUnassignedByDepartment: (deptId) => {
    return apiClient.get(`/complaints/department/${deptId}/unassigned`);
  },

  /**
   * Get stats for department dashboard
   * GET /api/complaints/department/{deptId}/stats
   * @param {string|number} deptId 
   */
  getDepartmentStats: (deptId) => {
    return apiClient.get(`/complaints/department/${deptId}/stats`);
  },

  /**
   * Get escalated complaints (Commissioner)
   * GET /api/complaints/escalated
   */
  getEscalated: () => {
    return apiClient.get('/complaints/escalated');
  },

  /**
   * Get system-wide stats (Admin dashboard)
   * GET /api/complaints/stats
   */
  getSystemStats: () => {
    return apiClient.get('/complaints/stats');
  },

  // ============================================
  // State Management (RBAC-Protected)
  // ============================================

  /**
   * Generic state transition
   * PUT /api/complaints/{id}/state
   * @param {string|number} complaintId 
   * @param {string} targetState 
   */
  updateState: (complaintId, targetState) => {
    return apiClient.put(`/complaints/${complaintId}/state`, { targetState });
  },

  /**
   * Get allowed state transitions (for UI dropdowns)
   * GET /api/complaints/{id}/allowed-transitions
   * @param {string|number} complaintId 
   */
  getAllowedTransitions: (complaintId) => {
    return apiClient.get(`/complaints/${complaintId}/allowed-transitions`);
  },

  // Semantic state endpoints
  /**
   * Start complaint (FILED → IN_PROGRESS)
   * PUT /api/complaints/{id}/start
   */
  start: (complaintId) => {
    return apiClient.put(`/complaints/${complaintId}/start`);
  },

  /**
   * Resolve complaint (IN_PROGRESS → RESOLVED)
   * PUT /api/complaints/{id}/resolve
   * For: STAFF, DEPT_HEAD
   */
  resolve: (complaintId, resolutionData = {}) => {
    return apiClient.put(`/complaints/${complaintId}/resolve`, resolutionData);
  },

  /**
   * Close complaint (RESOLVED → CLOSED)
   * PUT /api/complaints/{id}/close
   * For: CITIZEN owner
   */
  close: (complaintId) => {
    return apiClient.put(`/complaints/${complaintId}/close`);
  },

  /**
   * Cancel complaint (Any → CANCELLED)
   * PUT /api/complaints/{id}/cancel
   * For: CITIZEN owner, ADMIN
   */
  cancel: (complaintId, reason = '') => {
    return apiClient.put(`/complaints/${complaintId}/cancel`, { reason });
  },
};

export default complaintsService;
