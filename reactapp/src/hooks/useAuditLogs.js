/**
 * useAuditLogs - Hook for fetching audit logs
 * 
 * ARCHITECTURE NOTES:
 * - Fetches audit logs for a specific complaint
 * - Handles loading, error, and empty states
 * - Returns logs ordered oldest → newest (chronological)
 * - No caching - always fetches fresh data
 * 
 * USAGE:
 * const { logs, isLoading, error, refresh } = useAuditLogs(complaintId);
 */

import { useState, useEffect, useCallback } from 'react';
import { auditService } from '../services/api';

/**
 * Hook for fetching and managing audit logs
 * 
 * @param {string|number} complaintId - The complaint ID to fetch logs for
 * @param {Object} options - Optional configuration
 * @param {boolean} options.autoFetch - Auto-fetch on mount (default: true)
 * @returns {Object} - { logs, isLoading, error, refresh, isEmpty }
 */
export const useAuditLogs = (complaintId, options = {}) => {
  const { autoFetch = true } = options;

  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch audit logs from API
   * Orders logs chronologically (oldest first for timeline display)
   */
  const fetchLogs = useCallback(async () => {
    if (!complaintId) {
      setLogs([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await auditService.getByComplaint(complaintId);
      
      // Normalize to array and sort chronologically (oldest first)
      const logsArray = Array.isArray(data) ? data : [];
      const sortedLogs = logsArray.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );
      
      setLogs(sortedLogs);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setError(err.message || 'Failed to fetch audit history');
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [complaintId]);

  // Auto-fetch on mount and when complaintId changes
  useEffect(() => {
    if (autoFetch && complaintId) {
      fetchLogs();
    }
  }, [autoFetch, complaintId, fetchLogs]);

  return {
    logs,
    isLoading,
    error,
    refresh: fetchLogs,
    isEmpty: !isLoading && logs.length === 0,
  };
};

export default useAuditLogs;
