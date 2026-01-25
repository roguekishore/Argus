/**
 * UserContext - Central user state management
 * 
 * ARCHITECTURE NOTES:
 * - Stores user identity and role information after login
 * - Does NOT depend on JWT - abstracted for easy JWT migration
 * - All components must access user data through this context
 * - Login response format abstracted via AuthService
 * 
 * JWT MIGRATION PATH:
 * 1. AuthService will decode JWT and extract user data
 * 2. UserContext remains unchanged - same interface
 * 3. Only AuthService needs modification
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { ROLES, isValidRole } from '../constants/roles';

// Initial state - represents unauthenticated user
const INITIAL_USER_STATE = {
  userId: null,
  role: null,
  departmentId: null,
  email: null,
  name: null,
  phone: null,
  isAuthenticated: false,
};

// Create context with undefined default (forces provider usage)
const UserContext = createContext(undefined);

/**
 * UserProvider - Wraps application with user context
 * 
 * Usage:
 * <UserProvider>
 *   <App />
 * </UserProvider>
 */
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(INITIAL_USER_STATE);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Set user data after successful login
   * Called by AuthService.login() - abstracted from auth mechanism
   * 
   * @param {Object} userData - User data from login response
   * @param {number|string} userData.userId - Unique user identifier
   * @param {string} userData.role - User role (must match ROLES enum)
   * @param {number|string|null} userData.departmentId - Department ID (null for citizens)
   * @param {string} userData.email - User email
   * @param {string} userData.name - Display name
   * @param {string} userData.phone - Phone number
   */
  const setUserData = useCallback((userData) => {
    if (!userData) {
      console.error('UserContext: setUserData called with null/undefined');
      return;
    }

    if (!isValidRole(userData.role)) {
      console.error(`UserContext: Invalid role "${userData.role}"`);
      return;
    }

    setUser({
      userId: userData.userId,
      role: userData.role,
      departmentId: userData.departmentId || null,
      email: userData.email || null,
      name: userData.name || null,
      phone: userData.phone || null,
      isAuthenticated: true,
    });
  }, []);

  /**
   * Clear user data on logout
   * Resets to initial unauthenticated state
   */
  const clearUser = useCallback(() => {
    setUser(INITIAL_USER_STATE);
  }, []);

  /**
   * Check if user has a specific role
   * @param {string|string[]} allowedRoles - Single role or array of roles
   * @returns {boolean}
   */
  const hasRole = useCallback((allowedRoles) => {
    if (!user.isAuthenticated) return false;
    
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return roles.includes(user.role);
  }, [user.role, user.isAuthenticated]);

  /**
   * Check if user belongs to a specific department
   * @param {number|string} deptId - Department ID to check
   * @returns {boolean}
   */
  const belongsToDepartment = useCallback((deptId) => {
    if (!user.isAuthenticated || !user.departmentId) return false;
    return String(user.departmentId) === String(deptId);
  }, [user.departmentId, user.isAuthenticated]);

  /**
   * Check if user is a citizen
   * @returns {boolean}
   */
  const isCitizen = useMemo(() => user.role === ROLES.CITIZEN, [user.role]);

  /**
   * Check if user is staff (Staff, Dept Head, or Admin level)
   * @returns {boolean}
   */
  const isInternalUser = useMemo(() => {
    return [
      ROLES.STAFF,
      ROLES.DEPT_HEAD,
      ROLES.ADMIN,
      ROLES.COMMISSIONER,
      ROLES.SUPER_ADMIN,
    ].includes(user.role);
  }, [user.role]);

  /**
   * Check if user has admin-level access
   * @returns {boolean}
   */
  const isAdminLevel = useMemo(() => {
    return [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(user.role);
  }, [user.role]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    // User state
    user,
    isLoading,
    
    // State setters
    setUserData,
    clearUser,
    setIsLoading,
    
    // Role helpers
    hasRole,
    belongsToDepartment,
    isCitizen,
    isInternalUser,
    isAdminLevel,
    
    // Convenience getters
    userId: user.userId,
    role: user.role,
    departmentId: user.departmentId,
    isAuthenticated: user.isAuthenticated,
  }), [
    user,
    isLoading,
    setUserData,
    clearUser,
    hasRole,
    belongsToDepartment,
    isCitizen,
    isInternalUser,
    isAdminLevel,
  ]);

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

/**
 * Custom hook to access user context
 * Throws error if used outside UserProvider
 * 
 * Usage:
 * const { user, hasRole, userId } = useUser();
 */
export const useUser = () => {
  const context = useContext(UserContext);
  
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  
  return context;
};

// Export context for advanced use cases (testing, etc.)
export { UserContext };

export default UserProvider;
