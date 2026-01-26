/**
 * Authentication Service
 * 
 * ARCHITECTURE NOTES:
 * - Abstracts authentication mechanism from the rest of the app
 * - Current: Simple email/password auth without JWT
 * - Future: JWT-based auth with token refresh
 * 
 * JWT MIGRATION PATH:
 * 1. Update login() to store JWT token
 * 2. Add extractUserFromToken() to decode JWT
 * 3. Add refreshToken() method
 * 4. Update logout() to invalidate token on server
 * 5. No changes needed in UserContext or components
 * 
 * CURRENT BACKEND RESPONSE FORMAT:
 * {
 *   "userId": 12,
 *   "role": "STAFF",
 *   "departmentId": 3
 * }
 */

import apiClient, { storeUser, clearAuthData, getStoredUser, AUTH_STORAGE_KEYS } from './api/apiClient';

/**
 * API endpoints for authentication
 * Adjust these to match your Spring Boot endpoints
 */
const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',       // POST - { email, password } → { userId, role, departmentId }
  REGISTER: '/auth/register', // POST - { name, email, phone, password } → { message } or user data
  LOGOUT: '/auth/logout',     // POST (optional for simple auth)
  // FUTURE JWT ENDPOINTS:
  // REFRESH: '/auth/refresh', // POST - { refreshToken } → { token, refreshToken }
  // ME: '/auth/me',           // GET → user data (validated by token)
};

const authService = {
  /**
   * Login user with email/phone and password
   * 
   * CURRENT IMPLEMENTATION (Simple Auth):
   * - Backend validates credentials
   * - Returns: { userId, role, departmentId }
   * - We store this in localStorage
   * - UserContext is populated from this data
   * 
   * FUTURE JWT IMPLEMENTATION:
   * - Backend returns: { token, refreshToken, user: {...} }
   * - We store tokens + extract user from JWT payload
   * - Same interface to components
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
       * CURRENT: Backend returns user data directly
       * {
       *   "userId": 12,
       *   "role": "STAFF",
       *   "departmentId": 3
       * }
       */
      const userData = authService.extractUserData(response);
      
      // Store in localStorage for session persistence
      storeUser(userData);
      
      /**
       * FUTURE JWT: Store tokens
       * if (response.token) {
       *   localStorage.setItem(AUTH_STORAGE_KEYS.AUTH_TOKEN, response.token);
       * }
       * if (response.refreshToken) {
       *   localStorage.setItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
       * }
       */
      
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
   * This is intentional for:
   * - Email verification flows (future)
   * - Audit/compliance requirements
   * - JWT migration (login will return token)
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
   * Clears local storage and optionally calls server
   * 
   * @returns {Promise<void>}
   */
  logout: async () => {
    try {
      // FUTURE: Invalidate token on server
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
    return !!user && !!user.userId;
    
    // FUTURE JWT: Also check token validity
    // const token = localStorage.getItem(AUTH_STORAGE_KEYS.AUTH_TOKEN);
    // return !!token && !isTokenExpired(token);
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
   * FUTURE: Refresh authentication token
   * 
   * @returns {Promise<string>} New access token
   */
  refreshToken: async () => {
    // FUTURE IMPLEMENTATION:
    // const refreshToken = localStorage.getItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
    // if (!refreshToken) throw new Error('No refresh token');
    // 
    // const response = await apiClient.post(AUTH_ENDPOINTS.REFRESH, { refreshToken });
    // localStorage.setItem(AUTH_STORAGE_KEYS.AUTH_TOKEN, response.token);
    // return response.token;
    
    throw new Error('Token refresh not implemented');
  },

  /**
   * FUTURE: Check if JWT token is expired
   * 
   * @param {string} token - JWT token
   * @returns {boolean}
   */
  isTokenExpired: (token) => {
    // FUTURE IMPLEMENTATION:
    // try {
    //   const payload = JSON.parse(atob(token.split('.')[1]));
    //   return payload.exp * 1000 < Date.now();
    // } catch {
    //   return true;
    // }
    
    return false;
  },

  /**
   * Initialize auth state from storage
   * Call this on app startup to restore session
   * 
   * @returns {Object|null} User data if authenticated
   */
  initializeAuth: () => {
    const user = getStoredUser();
    
    // FUTURE: Validate token is not expired
    // const token = localStorage.getItem(AUTH_STORAGE_KEYS.AUTH_TOKEN);
    // if (token && authService.isTokenExpired(token)) {
    //   // Try to refresh or logout
    //   clearAuthData();
    //   return null;
    // }
    
    return user;
  },
};

export default authService;
