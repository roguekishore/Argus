/**
 * useAuth - Custom hook for authentication operations
 * 
 * Bridges authService with UserContext.
 * Components use this hook, never authService directly.
 * 
 * ARCHITECTURE:
 * - Login: Calls authService → stores user → populates context → returns user
 * - Signup: Calls authService → returns success (NO auto-login)
 * - Logout: Clears storage → clears context
 * - Initialize: Reads storage → populates context (for page refresh)
 */

import { useState, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import authService from '../services/authService';

/**
 * Hook for authentication operations
 * 
 * @returns {Object} Auth state and actions
 */
export const useAuth = () => {
  const { setUserData, clearUser, setIsLoading, isLoading } = useUser();
  const [error, setError] = useState(null);

  /**
   * Login user
   * 
   * FLOW:
   * 1. Call authService.login() → hits backend
   * 2. Backend returns { userId, role, departmentId }
   * 3. authService stores in localStorage
   * 4. We populate UserContext via setUserData()
   * 5. Return user data for redirect logic
   * 
   * @param {Object} credentials
   * @param {string} credentials.email - Email or phone
   * @param {string} credentials.password - Password
   * @returns {Promise<Object>} User data
   */
  const login = useCallback(async (credentials) => {
    setIsLoading(true);
    setError(null);

    try {
      const userData = await authService.login(credentials);
      setUserData(userData);
      return userData;
    } catch (err) {
      const errorMessage = err.message || 'Login failed. Please try again.';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setUserData, setIsLoading]);

  /**
   * Register new user
   * 
   * NOTE: Does NOT auto-login. Returns success for redirect to login page.
   * This design is intentional for JWT migration - login will return token.
   * 
   * @param {Object} userData
   * @returns {Promise<Object>} Success response
   */
  const register = useCallback(async (userData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Register only - no auto-login
      const response = await authService.register(userData);
      return { success: true, ...response };
    } catch (err) {
      const errorMessage = err.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading]);

  /**
   * Logout user
   * 
   * FLOW:
   * 1. Call authService.logout() → clears localStorage
   * 2. Clear UserContext via clearUser()
   * 3. Component handles redirect to /login
   */
  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      await authService.logout();
    } catch (err) {
      console.warn('Logout error:', err);
    } finally {
      clearUser();
      setIsLoading(false);
    }
  }, [clearUser, setIsLoading]);

  /**
   * Initialize auth from storage (call on app startup)
   * 
   * FLOW:
   * 1. Read user from localStorage
   * 2. If found, populate UserContext
   * 3. User is now "logged in" without hitting backend
   * 
   * This enables session persistence across page refreshes.
   */
  const initializeAuth = useCallback(() => {
    const user = authService.initializeAuth();
    if (user) {
      setUserData(user);
    }
    return user;
  }, [setUserData]);

  /**
   * Clear auth error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    
    // Actions
    login,
    register,
    logout,
    initializeAuth,
    clearError,
  };
};

export default useAuth;
