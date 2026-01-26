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
   * Create a new complaint with image for a citizen
   * POST /api/complaints/citizen/{citizenId}/with-image
   * @param {string|number} citizenId 
   * @param {Object} complaintData - { subject, description, location, latitude, longitude }
   * @param {File|null} imageFile - Optional image file
   */
  createWithImage: (citizenId, complaintData, imageFile = null) => {
    const formData = new FormData();
    
    // Add complaint data as individual form fields (backend expects @RequestParam)
    formData.append('title', complaintData.subject || '');
    formData.append('description', complaintData.description || '');
    formData.append('location', complaintData.location || '');
    
    // Add coordinates if provided (from map pin)
    if (complaintData.latitude != null) {
      formData.append('latitude', complaintData.latitude);
    }
    if (complaintData.longitude != null) {
      formData.append('longitude', complaintData.longitude);
    }
    
    // Add image if provided
    if (imageFile) {
      formData.append('image', imageFile);
    }
    
    return apiClient.postFormData(`/complaints/citizen/${citizenId}/with-image`, formData);
  },

  /**
   * Validate complaint text BEFORE submission to prevent vague complaints
   * POST /api/complaints/validate-text
   * @param {string} title - Complaint title/subject
   * @param {string} description - Complaint description
   * @param {string} location - Optional location string
   * @returns {Promise<{isValid: boolean, message: string, suggestion: string|null, confidence: number, detectedCategory: string|null}>}
   */
  validateText: (title, description, location = '') => {
    const params = new URLSearchParams();
    params.append('title', title);
    params.append('description', description);
    if (location) {
      params.append('location', location);
    }
    return apiClient.post(`/complaints/validate-text?${params.toString()}`);
  },

  /**
   * Check for potential duplicate complaints based on location + description
   * POST /api/complaints/check-duplicates
   * @param {string} description - Complaint description
   * @param {number} latitude - Location latitude
   * @param {number} longitude - Location longitude
   * @param {number} radiusMeters - Optional search radius (default 500m)
   */
  checkDuplicates: (description, latitude, longitude, radiusMeters = 500) => {
    const params = new URLSearchParams();
    params.append('description', description);
    params.append('latitude', latitude);
    params.append('longitude', longitude);
    if (radiusMeters) {
      params.append('radiusMeters', radiusMeters);
    }
    return apiClient.post(`/complaints/check-duplicates?${params.toString()}`);
  },

  /**
   * Attach image to existing complaint
   * POST /api/complaints/{complaintId}/image
   * @param {string|number} complaintId
   * @param {File} imageFile
   */
  attachImage: (complaintId, imageFile) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    return apiClient.postFormData(`/complaints/${complaintId}/image`, formData);
  },

  /**
   * Get image analysis for a complaint
   * GET /api/complaints/{complaintId}/image-analysis
   * @param {string|number} complaintId
   */
  getImageAnalysis: (complaintId) => {
    return apiClient.get(`/complaints/${complaintId}/image-analysis`);
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

  // ============================================
  // Admin Manual Routing (Low AI Confidence)
  // ============================================

  /**
   * Get complaints pending manual routing (AI confidence < 0.7)
   * GET /api/complaints/admin/pending-routing
   * For: ADMIN, SUPER_ADMIN
   */
  getPendingRouting: () => {
    return apiClient.get('/complaints/admin/pending-routing');
  },

  /**
   * Get count of complaints pending manual routing
   * GET /api/complaints/admin/pending-routing/count
   * For: ADMIN, SUPER_ADMIN
   */
  getPendingRoutingCount: () => {
    return apiClient.get('/complaints/admin/pending-routing/count');
  },

  /**
   * Manually route a complaint to a department
   * PUT /api/complaints/{complaintId}/admin/route
   * For: ADMIN, SUPER_ADMIN
   * @param {string|number} complaintId 
   * @param {Object} routingData - { departmentId, adminId, reason }
   */
  manualRoute: (complaintId, routingData) => {
    return apiClient.put(`/complaints/${complaintId}/admin/route`, routingData);
  },
};

export default complaintsService;
