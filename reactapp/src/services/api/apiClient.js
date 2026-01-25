/**
 * API Client - Base HTTP client for all API calls
 * 
 * ARCHITECTURE NOTES:
 * - Centralized HTTP client with interceptors
 * - Auth token handling abstracted (ready for JWT)
 * - Error handling standardized
 * - Request/response logging in development
 * 
 * JWT MIGRATION PATH:
 * 1. Update getAuthHeaders() to read JWT from storage
 * 2. Add token refresh logic in response interceptor
 * 3. No changes needed in service files
 */

// Base API URL - should come from environment variable
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

/**
 * Storage keys for auth data
 * When JWT is implemented, token will be stored here
 */
export const AUTH_STORAGE_KEYS = {
  USER_DATA: 'grievance_user',
  AUTH_TOKEN: 'grievance_token', // Reserved for JWT
  REFRESH_TOKEN: 'grievance_refresh', // Reserved for JWT refresh
};

/**
 * Get stored user data
 * @returns {Object|null}
 */
export const getStoredUser = () => {
  try {
    const data = localStorage.getItem(AUTH_STORAGE_KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

/**
 * Store user data
 * @param {Object} userData 
 */
export const storeUser = (userData) => {
  localStorage.setItem(AUTH_STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
};

/**
 * Clear all auth data
 */
export const clearAuthData = () => {
  localStorage.removeItem(AUTH_STORAGE_KEYS.USER_DATA);
  localStorage.removeItem(AUTH_STORAGE_KEYS.AUTH_TOKEN);
  localStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
};

/**
 * Get auth headers for requests
 * 
 * CURRENT: Returns user ID for simple auth
 * FUTURE (JWT): Will return Bearer token
 * 
 * @returns {Object} Headers object
 */
const getAuthHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };

  // FUTURE JWT IMPLEMENTATION:
  // const token = localStorage.getItem(AUTH_STORAGE_KEYS.AUTH_TOKEN);
  // if (token) {
  //   headers['Authorization'] = `Bearer ${token}`;
  // }

  // CURRENT: Simple auth - include user context in header if needed
  const user = getStoredUser();
  if (user) {
    // Custom header for backend to identify user (temporary until JWT)
    headers['X-User-Id'] = user.userId;
    headers['X-User-Role'] = user.role;
    if (user.departmentId) {
      headers['X-Department-Id'] = user.departmentId;
    }
  }

  return headers;
};

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Handle API response
 * @param {Response} response - Fetch response object
 * @returns {Promise<any>} Parsed response data
 * @throws {ApiError} On non-2xx responses
 */
const handleResponse = async (response) => {
  // Handle no-content responses
  if (response.status === 204) {
    return null;
  }

  let data;
  const contentType = response.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    // Extract error message from backend response
    const errorMessage = data?.message || data?.error || `HTTP Error: ${response.status}`;
    throw new ApiError(errorMessage, response.status, data);
  }

  return data;
};

/**
 * Log request in development
 */
const logRequest = (method, url, body) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API] ${method} ${url}`, body || '');
  }
};

/**
 * Log response in development
 */
const logResponse = (method, url, data) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API] ${method} ${url} Response:`, data);
  }
};

/**
 * Log error in development
 */
const logError = (method, url, error) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[API] ${method} ${url} Error:`, error);
  }
};

/**
 * Core request function
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {Object} options - Fetch options
 * @returns {Promise<any>}
 */
const request = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  };

  logRequest(config.method || 'GET', url, config.body);

  try {
    const response = await fetch(url, config);
    const data = await handleResponse(response);
    logResponse(config.method || 'GET', url, data);
    return data;
  } catch (error) {
    logError(config.method || 'GET', url, error);
    
    // Handle network errors
    if (!(error instanceof ApiError)) {
      throw new ApiError('Network error. Please check your connection.', 0);
    }
    
    // Handle 401 - Unauthorized (future JWT: trigger refresh)
    if (error.status === 401) {
      // FUTURE: Attempt token refresh here
      // For now, clear auth and redirect to login
      clearAuthData();
      window.location.href = '/login';
    }
    
    throw error;
  }
};

/**
 * API Client object with HTTP methods
 */
const apiClient = {
  /**
   * GET request
   * @param {string} endpoint 
   * @param {Object} params - Query parameters
   * @returns {Promise<any>}
   */
  get: (endpoint, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return request(url, { method: 'GET' });
  },

  /**
   * POST request
   * @param {string} endpoint 
   * @param {Object} data - Request body
   * @returns {Promise<any>}
   */
  post: (endpoint, data = {}) => {
    return request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * PUT request
   * @param {string} endpoint 
   * @param {Object} data - Request body
   * @returns {Promise<any>}
   */
  put: (endpoint, data = {}) => {
    return request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * DELETE request
   * @param {string} endpoint 
   * @returns {Promise<any>}
   */
  delete: (endpoint) => {
    return request(endpoint, { method: 'DELETE' });
  },

  /**
   * PATCH request
   * @param {string} endpoint 
   * @param {Object} data - Request body
   * @returns {Promise<any>}
   */
  patch: (endpoint, data = {}) => {
    return request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * POST request with FormData (multipart/form-data)
   * Used for file uploads
   * @param {string} endpoint 
   * @param {FormData} formData - FormData object
   * @returns {Promise<any>}
   */
  postFormData: async (endpoint, formData) => {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Get auth headers but remove Content-Type (browser sets it for FormData)
    const user = getStoredUser();
    const headers = {};
    if (user) {
      headers['X-User-Id'] = user.userId;
      headers['X-User-Role'] = user.role;
      if (user.departmentId) {
        headers['X-Department-Id'] = user.departmentId;
      }
    }

    logRequest('POST (FormData)', url, '[FormData]');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });
      const data = await handleResponse(response);
      logResponse('POST (FormData)', url, data);
      return data;
    } catch (error) {
      logError('POST (FormData)', url, error);
      
      if (!(error instanceof ApiError)) {
        throw new ApiError('Network error. Please check your connection.', 0);
      }
      
      if (error.status === 401) {
        clearAuthData();
        window.location.href = '/login';
      }
      
      throw error;
    }
  },
};

export default apiClient;
