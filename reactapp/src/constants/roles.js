/**
 * Role Constants and Permissions
 * 
 * ARCHITECTURE NOTES:
 * - Single source of truth for all role-related constants
 * - Permissions define what each role can do
 * - Access rules define what data each role can see
 * - No role strings should be hardcoded elsewhere in the app
 */

/**
 * User Roles Enum
 * Must match backend Role enum exactly
 */
export const ROLES = Object.freeze({
  CITIZEN: 'CITIZEN',
  STAFF: 'STAFF',
  DEPT_HEAD: 'DEPT_HEAD',
  ADMIN: 'ADMIN',
  COMMISSIONER: 'MUNICIPAL_COMMISSIONER',
  SUPER_ADMIN: 'SUPER_ADMIN',
  // SYSTEM role is backend-only, not used in frontend
});

/**
 * Role display names for UI
 */
export const ROLE_DISPLAY_NAMES = Object.freeze({
  [ROLES.CITIZEN]: 'Citizen',
  [ROLES.STAFF]: 'Staff',
  [ROLES.DEPT_HEAD]: 'Department Head',
  [ROLES.ADMIN]: 'Administrator',
  [ROLES.COMMISSIONER]: 'Municipal Commissioner',
  [ROLES.SUPER_ADMIN]: 'Super Administrator',
});

/**
 * Dashboard routes for each role
 */
export const ROLE_DASHBOARD_ROUTES = Object.freeze({
  [ROLES.CITIZEN]: '/dashboard/citizen',
  [ROLES.STAFF]: '/dashboard/staff',
  [ROLES.DEPT_HEAD]: '/dashboard/dept-head',
  [ROLES.ADMIN]: '/dashboard/admin',
  [ROLES.COMMISSIONER]: '/dashboard/commissioner',
  [ROLES.SUPER_ADMIN]: '/dashboard/super-admin',
});

/**
 * Role hierarchy (higher index = more privileges)
 * Used for permission inheritance checks
 */
export const ROLE_HIERARCHY = Object.freeze([
  ROLES.CITIZEN,
  ROLES.STAFF,
  ROLES.DEPT_HEAD,
  ROLES.ADMIN,
  ROLES.COMMISSIONER,
  ROLES.SUPER_ADMIN,
]);

/**
 * Validate if a string is a valid role
 * @param {string} role - Role string to validate
 * @returns {boolean}
 */
export const isValidRole = (role) => {
  return Object.values(ROLES).includes(role);
};

/**
 * Get role hierarchy level (0-indexed)
 * @param {string} role - Role to check
 * @returns {number} - Hierarchy level (-1 if invalid)
 */
export const getRoleLevel = (role) => {
  return ROLE_HIERARCHY.indexOf(role);
};

/**
 * Check if roleA has higher or equal privilege than roleB
 * @param {string} roleA - Role to check
 * @param {string} roleB - Role to compare against
 * @returns {boolean}
 */
export const hasHigherOrEqualPrivilege = (roleA, roleB) => {
  return getRoleLevel(roleA) >= getRoleLevel(roleB);
};

/**
 * Permissions - What actions each role can perform
 * 
 * IMPORTANT: These must align with backend RBAC rules
 */
export const PERMISSIONS = Object.freeze({
  // Complaint actions
  CREATE_COMPLAINT: [ROLES.CITIZEN],
  VIEW_OWN_COMPLAINTS: [ROLES.CITIZEN],
  VIEW_ASSIGNED_COMPLAINTS: [ROLES.STAFF],
  VIEW_DEPARTMENT_COMPLAINTS: [ROLES.STAFF, ROLES.DEPT_HEAD],
  VIEW_ALL_COMPLAINTS: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  VIEW_ESCALATED_COMPLAINTS: [ROLES.COMMISSIONER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  
  // State transitions
  RESOLVE_COMPLAINT: [ROLES.STAFF, ROLES.DEPT_HEAD],
  CLOSE_COMPLAINT: [ROLES.CITIZEN], // Citizen can close their own resolved complaints
  CANCEL_COMPLAINT: [ROLES.CITIZEN, ROLES.ADMIN],
  UPDATE_COMPLAINT_STATE: [ROLES.STAFF, ROLES.DEPT_HEAD],
  
  // Escalation
  VIEW_ESCALATIONS: [ROLES.DEPT_HEAD, ROLES.ADMIN, ROLES.COMMISSIONER, ROLES.SUPER_ADMIN],
  TRIGGER_ESCALATION: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  
  // User management
  VIEW_ALL_USERS: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  CREATE_STAFF: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  ASSIGN_DEPT_HEAD: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  VIEW_DEPARTMENT_STAFF: [ROLES.DEPT_HEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  
  // Department management
  VIEW_ALL_DEPARTMENTS: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  
  // Category & SLA management
  VIEW_CATEGORIES: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  MANAGE_SLA: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  
  // Suspension logs
  VIEW_SUSPENSION_LOGS: [ROLES.STAFF, ROLES.DEPT_HEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  
  // System-wide access
  FULL_SYSTEM_ACCESS: [ROLES.SUPER_ADMIN],
});

/**
 * Check if a role has a specific permission
 * @param {string} role - User's role
 * @param {string} permission - Permission key from PERMISSIONS
 * @returns {boolean}
 */
export const hasPermission = (role, permission) => {
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) {
    console.warn(`Unknown permission: ${permission}`);
    return false;
  }
  return allowedRoles.includes(role);
};

/**
 * Get all permissions for a role
 * @param {string} role - User's role
 * @returns {string[]} - Array of permission keys
 */
export const getPermissionsForRole = (role) => {
  return Object.entries(PERMISSIONS)
    .filter(([_, allowedRoles]) => allowedRoles.includes(role))
    .map(([permissionKey]) => permissionKey);
};

/**
 * Complaint State Enum
 * Must match backend ComplaintState enum
 */
export const COMPLAINT_STATES = Object.freeze({
  FILED: 'FILED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
});

/**
 * Complaint Priority Enum
 */
export const COMPLAINT_PRIORITY = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
});

/**
 * Priority display configuration
 */
export const PRIORITY_CONFIG = Object.freeze({
  [COMPLAINT_PRIORITY.LOW]: { label: 'Low', color: 'bg-gray-100 text-gray-800', darkColor: 'dark:bg-gray-800 dark:text-gray-200' },
  [COMPLAINT_PRIORITY.MEDIUM]: { label: 'Medium', color: 'bg-blue-100 text-blue-800', darkColor: 'dark:bg-blue-900 dark:text-blue-200' },
  [COMPLAINT_PRIORITY.HIGH]: { label: 'High', color: 'bg-orange-100 text-orange-800', darkColor: 'dark:bg-orange-900 dark:text-orange-200' },
  [COMPLAINT_PRIORITY.CRITICAL]: { label: 'Critical', color: 'bg-red-100 text-red-800', darkColor: 'dark:bg-red-900 dark:text-red-200' },
});

/**
 * Complaint state display configuration
 */
export const STATE_CONFIG = Object.freeze({
  [COMPLAINT_STATES.FILED]: { label: 'Filed', color: 'bg-blue-100 text-blue-800', darkColor: 'dark:bg-blue-900 dark:text-blue-200' },
  [COMPLAINT_STATES.IN_PROGRESS]: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800', darkColor: 'dark:bg-yellow-900 dark:text-yellow-200' },
  [COMPLAINT_STATES.RESOLVED]: { label: 'Resolved', color: 'bg-green-100 text-green-800', darkColor: 'dark:bg-green-900 dark:text-green-200' },
  [COMPLAINT_STATES.CLOSED]: { label: 'Closed', color: 'bg-gray-100 text-gray-800', darkColor: 'dark:bg-gray-800 dark:text-gray-200' },
  [COMPLAINT_STATES.CANCELLED]: { label: 'Cancelled', color: 'bg-red-100 text-red-800', darkColor: 'dark:bg-red-900 dark:text-red-200' },
});

/**
 * Escalation levels
 */
export const ESCALATION_LEVELS = Object.freeze({
  NONE: 0,
  LEVEL_1: 1, // To Department Head
  LEVEL_2: 2, // To Admin
  LEVEL_3: 3, // To Commissioner
});

export default {
  ROLES,
  ROLE_DISPLAY_NAMES,
  ROLE_DASHBOARD_ROUTES,
  PERMISSIONS,
  COMPLAINT_STATES,
  COMPLAINT_PRIORITY,
  ESCALATION_LEVELS,
  isValidRole,
  hasPermission,
  getPermissionsForRole,
};
