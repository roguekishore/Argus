/**
 * Notification Service - API calls for user notifications
 * 
 * ARCHITECTURE NOTES:
 * - Read-only fetching of notifications
 * - Single mutation: marking as read
 * - User-specific - backend filters by authenticated user
 * - No creation from frontend (backend-driven)
 * 
 * ENDPOINTS:
 * GET  /api/notifications           - Get all notifications for current user
 * PUT  /api/notifications/{id}/read - Mark a notification as read
 * 
 * DESIGN PHILOSOPHY:
 * - Notifications = awareness (transient alerts)
 * - Audit logs = accountability (permanent record)
 * - These are separate concerns, separate APIs
 */

import apiClient from './apiClient';

/**
 * Notification types (for reference)
 * These match the backend enum values
 */
export const NOTIFICATION_TYPES = Object.freeze({
  ESCALATION: 'ESCALATION',
  STATUS_CHANGE: 'STATUS_CHANGE',
  ASSIGNMENT: 'ASSIGNMENT',
  SLA_WARNING: 'SLA_WARNING',
  SLA_BREACH: 'SLA_BREACH',
  COMMENT: 'COMMENT',
  RESOLUTION: 'RESOLUTION',
  GENERAL: 'GENERAL',
});

/**
 * Get all notifications for the current user
 * @returns {Promise<Array>} - Array of notification objects
 * 
 * Notification object shape:
 * {
 *   id: number,
 *   title: string,
 *   message: string,
 *   complaintId: number | null,
 *   type: NOTIFICATION_TYPES,
 *   read: boolean,
 *   createdAt: string (ISO date)
 * }
 */
const getAll = async () => {
  return apiClient.get('/notifications');
};

/**
 * Mark a notification as read
 * @param {string|number} notificationId - The notification ID
 * @returns {Promise<Object>} - Updated notification object
 */
const markAsRead = async (notificationId) => {
  if (!notificationId) {
    throw new Error('Notification ID is required');
  }
  return apiClient.put(`/notifications/${notificationId}/read`);
};

/**
 * Mark ALL notifications as read for the current user
 * Uses the dedicated bulk endpoint for efficiency
 * 
 * @returns {Promise<Object>} - { count: number } of notifications marked as read
 */
const markAllAsRead = async () => {
  return apiClient.put('/notifications/read-all');
};

/**
 * Mark multiple notifications as read (convenience method)
 * Uses Promise.allSettled to handle partial failures gracefully
 * 
 * @param {Array<string|number>} notificationIds - Array of notification IDs
 * @returns {Promise<Array>} - Results array with success/failure for each
 */
const markMultipleAsRead = async (notificationIds) => {
  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    return [];
  }
  return Promise.allSettled(
    notificationIds.map((id) => markAsRead(id))
  );
};

const notificationService = {
  getAll,
  markAsRead,
  markAllAsRead,
  markMultipleAsRead,
  NOTIFICATION_TYPES,
};

export default notificationService;
