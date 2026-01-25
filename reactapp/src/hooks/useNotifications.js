/**
 * useNotifications - Hook for managing user notifications
 * 
 * ARCHITECTURE NOTES:
 * - Fetches notifications for current authenticated user
 * - Tracks unread count for badge display
 * - Handles marking notifications as read
 * - Returns newest first (reverse chronological)
 * - Optimistic UI updates for better UX
 * 
 * USAGE:
 * const { 
 *   notifications, 
 *   unreadCount, 
 *   isLoading, 
 *   error, 
 *   markAsRead, 
 *   refresh 
 * } = useNotifications();
 * 
 * DESIGN PHILOSOPHY:
 * - Notifications are transient awareness alerts
 * - Different from audit logs (permanent accountability)
 * - This hook is user-centric, not complaint-centric
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import notificationService from '../services/api/notificationService';

/**
 * Hook for managing notifications
 * 
 * @param {Object} options - Optional configuration
 * @param {boolean} options.autoFetch - Auto-fetch on mount (default: true)
 * @param {number} options.pollInterval - Polling interval in ms (0 = disabled, default: 0)
 * @returns {Object} - Notification state and actions
 */
export const useNotifications = (options = {}) => {
  const { autoFetch = true, pollInterval = 0 } = options;

  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Calculate unread count from notifications
   */
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  /**
   * Get only unread notifications
   */
  const unreadNotifications = useMemo(() => {
    return notifications.filter((n) => !n.read);
  }, [notifications]);

  /**
   * Fetch all notifications from API
   * Orders by createdAt descending (newest first)
   */
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await notificationService.getAll();
      
      // Normalize to array and sort by newest first
      const notificationsArray = Array.isArray(data) ? data : [];
      const sortedNotifications = notificationsArray.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      
      setNotifications(sortedNotifications);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError(err.message || 'Failed to fetch notifications');
      // Don't clear existing notifications on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Mark a single notification as read
   * Uses optimistic update for better UX
   * 
   * @param {string|number} notificationId - The notification ID
   * @returns {Promise<boolean>} - Success status
   */
  const markAsRead = useCallback(async (notificationId) => {
    if (!notificationId) return false;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );

    try {
      await notificationService.markAsRead(notificationId);
      return true;
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      
      // Revert optimistic update on failure
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: false } : n
        )
      );
      return false;
    }
  }, []);

  /**
   * Mark all unread notifications as read
   * @returns {Promise<void>}
   */
  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications
      .filter((n) => !n.read)
      .map((n) => n.id);

    if (unreadIds.length === 0) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    );

    try {
      await notificationService.markMultipleAsRead(unreadIds);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      // Refresh to get actual state from backend
      await fetchNotifications();
    }
  }, [notifications, fetchNotifications]);

  /**
   * Find a notification by complaint ID
   * Useful for navigating from notification to complaint
   * 
   * @param {string|number} complaintId 
   * @returns {Object|null}
   */
  const getByComplaintId = useCallback((complaintId) => {
    return notifications.find((n) => n.complaintId === complaintId) || null;
  }, [notifications]);

  /**
   * Auto-fetch on mount
   */
  useEffect(() => {
    if (autoFetch) {
      fetchNotifications();
    }
  }, [autoFetch, fetchNotifications]);

  /**
   * Optional polling for real-time updates
   * Only enabled if pollInterval > 0
   */
  useEffect(() => {
    if (pollInterval <= 0) return;

    const interval = setInterval(() => {
      fetchNotifications();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [pollInterval, fetchNotifications]);

  return {
    // State
    notifications,
    unreadNotifications,
    unreadCount,
    isLoading,
    error,
    isEmpty: notifications.length === 0,
    
    // Actions
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
    
    // Utilities
    getByComplaintId,
  };
};

export default useNotifications;
