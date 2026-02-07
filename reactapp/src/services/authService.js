/**
 * Authentication Service
 * 
 * ARCHITECTURE NOTES:
 * - JWT-based authentication
 * - Uses standard Authorization: Bearer header (CloudFront compatible)
 * - Automatic token refresh
 * - Token stored in localStorage
 */

import apiClient, { storeUser, storeTokens, clearAuthData, getStoredUser, getStoredRefreshToken, AUTH_STORAGE_KEYS } from './api/apiClient';

/**
 * API endpoints for authentication
 */
const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',       // POST - { email, password } → { token, refreshToken, user }
  REGISTER: '/auth/register', // POST - { name, email, phone, password } → { message }
  LOGOUT: '/auth/logout',     // POST (optional)
  REFRESH: '/auth/refresh',   // POST - { refreshToken } → { token, refreshToken }
  ME: '/auth/me',             // GET → user data (validated by token)
};

const authService = {
  /**
   * Login user with email/phone and password
   * 
   * Backend returns: { token, refreshToken, userId, role, departmentId, ... }
   * We store tokens and user data in localStorage
   * 
   * @param {Object} credentials
   * @param {string} credentials.email - Email or phone
   * @param {string} credentials.password - Password
   * @returns {Promise<Object>} User data { userId, role, departmentId, ... }
   */
  login: async (credentials) => {
    try {
      // Call backend login endpoint
      const response = await apiClient.post(AUTH_ENDPOINTS.LOGIN, credentials);
      
      /**
       * Backend returns:
       * {
       *   "token": "eyJ...",
       *   "refreshToken": "eyJ...",
       *   "userId": 12,
       *   "role": "STAFF",
       *   "departmentId": 3
       * }
       */
      const userData = authService.extractUserData(response);
      
      // Store JWT tokens
      storeTokens(response.token, response.refreshToken);
      
      // Store user data in localStorage for session persistence
      storeUser(userData);
      
      return userData;
    } catch (error) {
      // Re-throw with user-friendly message if needed
      if (error.status === 401) {
        throw new Error('Invalid email or password');
      }
      if (error.status === 404) {
        throw new Error('User not found');
      }
      throw error;
    }
  },

  /**
   * Register a new citizen user
   * 
   * NOTE: Signup does NOT auto-login. User must login after registration.
   * 
   * @param {Object} userData
   * @param {string} userData.name
   * @param {string} userData.email
   * @param {string} userData.phone
   * @param {string} userData.password
   * @returns {Promise<Object>} Success response (NOT user data for auto-login)
   */
  register: async (userData) => {
    try {
      // Map frontend field names to backend DTO
      const payload = {
        name: userData.name,
        email: userData.email,
        mobile: userData.phone, // Backend expects 'mobile', frontend uses 'phone'
        password: userData.password,
        userType: 'CITIZEN', // Default to CITIZEN for self-registration
      };
      
      const response = await apiClient.post(AUTH_ENDPOINTS.REGISTER, payload);
      
      // Return response for success handling
      // DO NOT store user or auto-login
      return response;
    } catch (error) {
      if (error.status === 409) {
        throw new Error('Email or phone already registered');
      }
      throw error;
    }
  },

  /**
   * Logout current user
   * Clears local storage tokens
   * 
   * @returns {Promise<void>}
   */
  logout: async () => {
    try {
      // Optional: Invalidate token on server (not required for stateless JWT)
      // await apiClient.post(AUTH_ENDPOINTS.LOGOUT);
    } catch (error) {
      // Continue with local logout even if server call fails
      console.warn('Server logout failed:', error);
    } finally {
      // Always clear local auth data
      clearAuthData();
    }
  },

  /**
   * Check if user is currently authenticated
   * 
   * @returns {boolean}
   */
  isAuthenticated: () => {
    const user = getStoredUser();
    const token = localStorage.getItem(AUTH_STORAGE_KEYS.AUTH_TOKEN);
    
    // Check both user data and valid token exist
    if (!user || !user.userId || !token) {
      return false;
    }
    
    // Check if token is expired
    if (authService.isTokenExpired(token)) {
      return false;
    }
    
    return true;
  },

  /**
   * Get current authenticated user data
   * 
   * @returns {Object|null}
   */
  getCurrentUser: () => {
    return getStoredUser();
  },

  /**
   * Extract standardized user data from API response
   * Normalizes response format for consistent usage
   * 
   * @param {Object} response - API response
   * @returns {Object} Normalized user data
   */
  extractUserData: (response) => {
    // Handle different response formats
    const data = response.user || response;
    
    return {
      userId: data.userId || data.id,
      name: data.name || data.fullName || '',
      email: data.email || '',
      phone: data.phone || data.mobile || data.phoneNumber || '',
      role: data.role,
      departmentId: data.departmentId || data.department?.id || null,
    };
  },

  /**
   * Refresh authentication token using refresh token
   * 
   * @returns {Promise<string>} New access token
   */
  refreshToken: async () => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    try {
      // Direct fetch to avoid circular dependency with apiClient
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8080/api'}${AUTH_ENDPOINTS.REFRESH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      
      if (!response.ok) {
        throw new Error('Token refresh failed');
      }
      
      const data = await response.json();
      storeTokens(data.token, data.refreshToken);
      return data.token;
    } catch (error) {
      // Clear auth data if refresh fails
      clearAuthData();
      throw error;
    }
  },

  /**
   * Check if JWT token is expired
   * 
   * @param {string} token - JWT token
   * @returns {boolean}
   */
  isTokenExpired: (token) => {
    if (!token) return true;
    
    try {
      // Decode JWT payload (base64)
      const payload = JSON.parse(atob(token.split('.')[1]));
      // exp is in seconds, Date.now() is in milliseconds
      // Add 30 second buffer to refresh before actual expiry
      return (payload.exp * 1000) < (Date.now() + 30000);
    } catch {
      return true;
    }
  },

  /**
   * Initialize auth state from storage
   * Call this on app startup to restore session
   * 
   * @returns {Object|null} User data if authenticated
   */
  initializeAuth: () => {
    const user = getStoredUser();
    const token = localStorage.getItem(AUTH_STORAGE_KEYS.AUTH_TOKEN);
    
    // Validate token is not expired
    if (token && authService.isTokenExpired(token)) {
      // Token expired - try to refresh or clear
      const refreshToken = getStoredRefreshToken();
      if (!refreshToken) {
        clearAuthData();
        return null;
      }
      // Let the app handle refresh on first API call
    }
    
    return user;
  },
};

export default authService;
