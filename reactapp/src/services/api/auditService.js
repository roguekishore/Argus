/**
 * Audit Service - API calls for audit log data
 * 
 * ARCHITECTURE NOTES:
 * - Read-only service - audit logs are immutable
 * - Uses centralized apiClient for HTTP calls
 * - No mutations - audit is append-only on backend
 * 
 * ENDPOINT:
 * GET /api/audit/complaint/{complaintId}
 */

import apiClient from './apiClient';

/**
 * Get audit logs for a specific complaint
 * @param {string|number} complaintId - The complaint ID
 * @returns {Promise<Array>} - Array of audit log entries
 */
const getByComplaint = async (complaintId) => {
  if (!complaintId) {
    throw new Error('Complaint ID is required');
  }
  return apiClient.get(`/audit/complaint/${complaintId}`);
};

/**
 * Audit action types (for reference)
 * These match the backend enum values
 */
export const AUDIT_ACTIONS = Object.freeze({
  STATE_CHANGE: 'STATE_CHANGE',
  ESCALATION: 'ESCALATION',
  SLA_UPDATE: 'SLA_UPDATE',
  ASSIGNMENT: 'ASSIGNMENT',
  SUSPENSION: 'SUSPENSION',
  CREATED: 'CREATED',
  UPDATED: 'UPDATED',
  COMMENT: 'COMMENT',
  RATING: 'RATING',
});

/**
 * Actor types
 */
export const ACTOR_TYPES = Object.freeze({
  USER: 'USER',
  SYSTEM: 'SYSTEM',
});

const auditService = {
  getByComplaint,
  AUDIT_ACTIONS,
  ACTOR_TYPES,
};

export default auditService;
