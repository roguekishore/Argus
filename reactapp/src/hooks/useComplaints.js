/**
 * useComplaints - Custom hook for complaint data fetching
 * 
 * ARCHITECTURE NOTES:
 * - Role-aware data fetching using proper backend endpoints
 * - Uses API services, not direct fetch calls
 * - Handles loading, error, and refresh states
 * - Provides action methods for state transitions
 */

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { complaintsService, escalationService } from '../services';
import { ROLES, COMPLAINT_STATES } from '../constants/roles';

/**
 * Hook for fetching and managing complaints
 * Automatically fetches based on user role
 * 
 * @param {Object} options
 * @param {string} options.filterState - Filter by complaint state
 * @param {boolean} options.autoFetch - Auto-fetch on mount (default: true)
 * @returns {Object} Complaints state and actions
 */
export const useComplaints = (options = {}) => {
  const { filterState, autoFetch = true } = options;
  const { userId, role, departmentId } = useUser();

  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    filed: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    cancelled: 0,
    escalated: 0,
    unassigned: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch complaints based on user role
   * This is the key role-based data fetching logic
   */
  const fetchComplaints = useCallback(async () => {
    if (!userId || !role) return;

    setIsLoading(true);
    setError(null);

    try {
      let data = [];
      let statsData = {};

      switch (role) {
        case ROLES.CITIZEN:
          // Citizens see only their own complaints
          // GET /api/complaints/citizen/{citizenId}
          data = await complaintsService.getByCitizen(userId);
          statsData = await complaintsService.getCitizenStats(userId);
          break;

        case ROLES.STAFF:
          // Staff sees assigned complaints
          // GET /api/complaints/staff/{staffId}
          data = await complaintsService.getByStaff(userId);
          statsData = await complaintsService.getStaffStats(userId);
          break;

        case ROLES.DEPT_HEAD:
          // Dept head sees all department complaints
          // GET /api/complaints/department/{deptId}
          if (departmentId) {
            data = await complaintsService.getByDepartment(departmentId);
            statsData = await complaintsService.getDepartmentStats(departmentId);
          }
          break;

        case ROLES.ADMIN:
        case ROLES.SUPER_ADMIN:
          // Admin/Super Admin sees all complaints
          // GET /api/complaints
          data = await complaintsService.getAll();
          statsData = await complaintsService.getSystemStats();
          break;

        case ROLES.COMMISSIONER:
          // Commissioner sees only escalated complaints
          // GET /api/complaints/escalated
          data = await complaintsService.getEscalated();
          statsData = await complaintsService.getSystemStats();
          break;

        default:
          data = [];
          statsData = {};
      }

      // Normalize to array
      if (!Array.isArray(data)) {
        data = data ? [data] : [];
      }

      // Apply state filter if specified
      if (filterState) {
        data = data.filter(c => c.status === filterState || c.state === filterState);
      }

      setComplaints(data);
      setStats(prev => ({ ...prev, ...statsData }));
    } catch (err) {
      console.error('Error fetching complaints:', err);
      setError(err.message || 'Failed to fetch complaints');
      setComplaints([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId, role, departmentId, filterState]);

  // Auto-fetch on mount and when role/userId changes
  useEffect(() => {
    if (autoFetch && userId && role) {
      fetchComplaints();
    }
  }, [autoFetch, userId, role, fetchComplaints]);

  /**
   * Get a single complaint by ID
   */
  const getComplaint = useCallback(async (complaintId) => {
    try {
      return await complaintsService.getDetails(complaintId);
    } catch (err) {
      console.error('Error fetching complaint:', err);
      throw err;
    }
  }, []);

  /**
   * Close a complaint (Citizen action)
   */
  const closeComplaint = useCallback(async (complaintId) => {
    try {
      await complaintsService.close(complaintId);
      // Update local state
      setComplaints(prev => 
        prev.map(c => 
          (c.complaintId === complaintId || c.id === complaintId)
            ? { ...c, status: 'CLOSED', state: COMPLAINT_STATES.CLOSED }
            : c
        )
      );
      // Refresh stats
      await fetchComplaints();
      return true;
    } catch (err) {
      console.error('Error closing complaint:', err);
      throw err;
    }
  }, [fetchComplaints]);

  /**
   * Cancel a complaint (Citizen/Admin action)
   */
  const cancelComplaint = useCallback(async (complaintId, reason = '') => {
    try {
      await complaintsService.cancel(complaintId, reason);
      setComplaints(prev => 
        prev.map(c => 
          (c.complaintId === complaintId || c.id === complaintId)
            ? { ...c, status: 'CANCELLED', state: COMPLAINT_STATES.CANCELLED }
            : c
        )
      );
      await fetchComplaints();
      return true;
    } catch (err) {
      console.error('Error cancelling complaint:', err);
      throw err;
    }
  }, [fetchComplaints]);

  /**
   * Resolve a complaint (Staff/Dept Head action)
   */
  const resolveComplaint = useCallback(async (complaintId, resolutionData = {}) => {
    try {
      await complaintsService.resolve(complaintId, resolutionData);
      setComplaints(prev => 
        prev.map(c => 
          (c.complaintId === complaintId || c.id === complaintId)
            ? { ...c, status: 'RESOLVED', state: COMPLAINT_STATES.RESOLVED }
            : c
        )
      );
      await fetchComplaints();
      return true;
    } catch (err) {
      console.error('Error resolving complaint:', err);
      throw err;
    }
  }, [fetchComplaints]);

  /**
   * Rate a complaint (Citizen action)
   */
  const rateComplaint = useCallback(async (complaintId, rating) => {
    try {
      await complaintsService.rate(complaintId, { rating });
      setComplaints(prev => 
        prev.map(c => 
          (c.complaintId === complaintId || c.id === complaintId)
            ? { ...c, citizenSatisfaction: rating }
            : c
        )
      );
      return true;
    } catch (err) {
      console.error('Error rating complaint:', err);
      throw err;
    }
  }, []);

  /**
   * Assign staff to complaint (Dept Head action)
   */
  const assignStaff = useCallback(async (complaintId, staffId) => {
    try {
      await complaintsService.assignStaff(complaintId, staffId);
      await fetchComplaints();
      return true;
    } catch (err) {
      console.error('Error assigning staff:', err);
      throw err;
    }
  }, [fetchComplaints]);

  /**
   * Get allowed state transitions for a complaint
   */
  const getAllowedTransitions = useCallback(async (complaintId) => {
    try {
      return await complaintsService.getAllowedTransitions(complaintId);
    } catch (err) {
      console.error('Error getting transitions:', err);
      throw err;
    }
  }, []);

  /**
   * Get unassigned complaints (Dept Head only)
   */
  const getUnassigned = useCallback(async () => {
    if (!departmentId) return [];
    try {
      return await complaintsService.getUnassignedByDepartment(departmentId);
    } catch (err) {
      console.error('Error fetching unassigned:', err);
      throw err;
    }
  }, [departmentId]);

  return {
    // Data
    complaints,
    stats,
    isLoading,
    error,
    
    // Actions
    refresh: fetchComplaints,
    getComplaint,
    closeComplaint,
    cancelComplaint,
    resolveComplaint,
    rateComplaint,
    assignStaff,
    getAllowedTransitions,
    getUnassigned,
  };
};

export default useComplaints;
