/**
 * useEscalations - Custom hook for escalation data
 * 
 * For: DEPT_HEAD, ADMIN, COMMISSIONER, SUPER_ADMIN
 */

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { escalationService } from '../services';
import { ROLES } from '../constants/roles';

/**
 * Hook for fetching and managing escalations
 * 
 * @param {Object} options
 * @param {boolean} options.autoFetch - Auto-fetch on mount
 * @returns {Object} Escalation state and actions
 */
export const useEscalations = (options = {}) => {
  const { autoFetch = true } = options;
  const { role } = useUser();

  const [escalations, setEscalations] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if role has access to escalations
  const hasAccess = [
    ROLES.DEPT_HEAD,
    ROLES.ADMIN,
    ROLES.COMMISSIONER,
    ROLES.SUPER_ADMIN,
  ].includes(role);

  /**
   * Fetch overdue/escalated complaints
   */
  const fetchEscalations = useCallback(async () => {
    if (!hasAccess) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await escalationService.getOverdue();
      setEscalations(Array.isArray(data) ? data : data?.complaints || []);
    } catch (err) {
      console.error('Error fetching escalations:', err);
      setError(err.message);
      setEscalations([]);
    } finally {
      setIsLoading(false);
    }
  }, [hasAccess]);

  /**
   * Fetch escalation statistics
   */
  const fetchStats = useCallback(async () => {
    if (!hasAccess) return;

    try {
      const data = await escalationService.getStats();
      setStats(data);
    } catch (err) {
      console.error('Error fetching escalation stats:', err);
    }
  }, [hasAccess]);

  /**
   * Get escalation history for a specific complaint
   */
  const getComplaintEscalations = useCallback(async (complaintId) => {
    try {
      return await escalationService.getComplaintEscalations(complaintId);
    } catch (err) {
      console.error('Error fetching complaint escalations:', err);
      throw err;
    }
  }, []);

  /**
   * Manually trigger escalation process (Admin/Super Admin)
   */
  const triggerEscalation = useCallback(async () => {
    if (![ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role)) {
      throw new Error('Not authorized to trigger escalations');
    }

    try {
      await escalationService.trigger();
      // Refresh data after trigger
      await fetchEscalations();
      await fetchStats();
      return true;
    } catch (err) {
      console.error('Error triggering escalation:', err);
      throw err;
    }
  }, [role, fetchEscalations, fetchStats]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && hasAccess) {
      fetchEscalations();
      fetchStats();
    }
  }, [autoFetch, hasAccess, fetchEscalations, fetchStats]);

  return {
    // Data
    escalations,
    stats,
    isLoading,
    error,
    hasAccess,
    
    // Actions
    refresh: fetchEscalations,
    refreshStats: fetchStats,
    getComplaintEscalations,
    triggerEscalation,
  };
};

export default useEscalations;
