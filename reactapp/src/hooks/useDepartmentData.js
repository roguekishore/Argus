/**
 * useDepartmentData - Custom hook for department-related data
 * 
 * For: DEPT_HEAD, ADMIN, SUPER_ADMIN
 */

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { departmentsService, usersService } from '../services';
import { ROLES } from '../constants/roles';

/**
 * Hook for fetching department data
 * 
 * @param {Object} options
 * @param {number|string} options.departmentId - Specific department ID to fetch
 * @param {boolean} options.autoFetch - Auto-fetch on mount
 * @returns {Object} Department state and actions
 */
export const useDepartmentData = (options = {}) => {
  const { departmentId: optDeptId, autoFetch = true } = options;
  const { role, departmentId: userDeptId } = useUser();

  const [departments, setDepartments] = useState([]);
  const [currentDepartment, setCurrentDepartment] = useState(null);
  const [departmentStaff, setDepartmentStaff] = useState([]);
  const [departmentHead, setDepartmentHead] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Determine which department to fetch
  const targetDeptId = optDeptId || userDeptId;

  // Check if role can view all departments
  const canViewAllDepartments = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role);

  /**
   * Fetch all departments (Admin/Super Admin)
   */
  const fetchAllDepartments = useCallback(async () => {
    if (!canViewAllDepartments) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await departmentsService.getAll();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching departments:', err);
      setError(err.message);
      setDepartments([]);
    } finally {
      setIsLoading(false);
    }
  }, [canViewAllDepartments]);

  /**
   * Fetch single department
   */
  const fetchDepartment = useCallback(async (deptId) => {
    if (!deptId) return null;

    try {
      const data = await departmentsService.getById(deptId);
      return data;
    } catch (err) {
      console.error('Error fetching department:', err);
      throw err;
    }
  }, []);

  /**
   * Fetch department staff
   */
  const fetchDepartmentStaff = useCallback(async (deptId) => {
    const id = deptId || targetDeptId;
    if (!id) return;

    try {
      const data = await usersService.getDepartmentStaff(id);
      setDepartmentStaff(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      console.error('Error fetching department staff:', err);
      setDepartmentStaff([]);
      throw err;
    }
  }, [targetDeptId]);

  /**
   * Fetch department head
   */
  const fetchDepartmentHead = useCallback(async (deptId) => {
    const id = deptId || targetDeptId;
    if (!id) return;

    try {
      const data = await usersService.getDepartmentHead(id);
      setDepartmentHead(data);
      return data;
    } catch (err) {
      console.error('Error fetching department head:', err);
      setDepartmentHead(null);
      throw err;
    }
  }, [targetDeptId]);

  /**
   * Create staff member (Admin/Super Admin)
   */
  const createStaff = useCallback(async (userData, deptId) => {
    if (![ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role)) {
      throw new Error('Not authorized to create staff');
    }

    try {
      const newStaff = await usersService.createStaff(userData, deptId);
      // Refresh staff list
      await fetchDepartmentStaff(deptId);
      return newStaff;
    } catch (err) {
      console.error('Error creating staff:', err);
      throw err;
    }
  }, [role, fetchDepartmentStaff]);

  /**
   * Assign department head (Admin/Super Admin)
   */
  const assignDepartmentHead = useCallback(async (userId, deptId) => {
    if (![ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role)) {
      throw new Error('Not authorized to assign department head');
    }

    try {
      await usersService.assignDepartmentHead(userId, deptId);
      // Refresh department head
      await fetchDepartmentHead(deptId);
      return true;
    } catch (err) {
      console.error('Error assigning department head:', err);
      throw err;
    }
  }, [role, fetchDepartmentHead]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      if (canViewAllDepartments) {
        fetchAllDepartments();
      }
      if (targetDeptId) {
        fetchDepartment(targetDeptId).then(setCurrentDepartment);
        fetchDepartmentStaff(targetDeptId);
        fetchDepartmentHead(targetDeptId);
      }
    }
  }, [
    autoFetch, 
    canViewAllDepartments, 
    targetDeptId, 
    fetchAllDepartments, 
    fetchDepartment, 
    fetchDepartmentStaff, 
    fetchDepartmentHead
  ]);

  return {
    // Data
    departments,
    currentDepartment,
    departmentStaff,
    departmentHead,
    isLoading,
    error,
    canViewAllDepartments,
    
    // Actions
    fetchAllDepartments,
    fetchDepartment,
    fetchDepartmentStaff,
    fetchDepartmentHead,
    createStaff,
    assignDepartmentHead,
  };
};

export default useDepartmentData;
