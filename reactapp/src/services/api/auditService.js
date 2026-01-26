/**
 * Audit Service - API calls for audit log data
 * 
 * ARCHITECTURE NOTES:
 * - Read-only service - audit logs are immutable
 * - Uses centralized apiClient for HTTP calls
 * - No mutations - audit is append-only on backend
 * 
 * ENDPOINTS:
 * GET /api/audit/complaint/{complaintId} - Logs for a specific complaint
 * GET /api/audit/recent?limit=100        - Recent system-wide logs
 * GET /api/audit/stats                   - Audit statistics
 * GET /api/audit/action/{action}         - Logs by action type
 * GET /api/audit/actor/{actorId}         - Logs by user
 * GET /api/audit/system                  - System-generated logs
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
 * Get recent audit logs system-wide
 * @param {number} limit - Maximum number of logs to return (default 100, max 500)
 * @returns {Promise<Array>} - Array of recent audit log entries
 */
const getRecent = async (limit = 100) => {
  return apiClient.get(`/audit/recent?limit=${limit}`);
};

/**
 * Get audit statistics
 * @returns {Promise<Object>} - Stats object with counts
 */
const getStats = async () => {
  return apiClient.get('/audit/stats');
};

/**
 * Get audit logs by action type
 * @param {string} action - The action type (STATE_CHANGE, ESCALATION, etc.)
 * @returns {Promise<Array>} - Array of audit log entries
 */
const getByAction = async (action) => {
  if (!action) {
    throw new Error('Action type is required');
  }
  return apiClient.get(`/audit/action/${action}`);
};

/**
 * Get audit logs by actor (user)
 * @param {string|number} actorId - The user ID
 * @returns {Promise<Array>} - Array of audit log entries
 */
const getByActor = async (actorId) => {
  if (!actorId) {
    throw new Error('Actor ID is required');
  }
  return apiClient.get(`/audit/actor/${actorId}`);
};

/**
 * Get system-generated audit logs
 * @returns {Promise<Array>} - Array of system audit log entries
 */
const getSystemLogs = async () => {
  return apiClient.get('/audit/system');
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
  getRecent,
  getStats,
  getByAction,
  getByActor,
  getSystemLogs,
  AUDIT_ACTIONS,
  ACTOR_TYPES,
};

export default auditService;
