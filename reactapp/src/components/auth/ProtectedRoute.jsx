/**
 * ProtectedRoute Component
 * 
 * Guards routes based on authentication and role requirements.
 * Redirects to login if not authenticated.
 * Redirects to appropriate dashboard if role doesn't match.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { ROLE_DASHBOARD_ROUTES } from '../../constants/roles';

/**
 * ProtectedRoute - Wraps routes that require authentication
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render
 * @param {string|string[]} props.allowedRoles - Roles that can access this route (optional)
 * @param {string} props.redirectTo - Custom redirect path (optional)
 */
const ProtectedRoute = ({ 
  children, 
  allowedRoles = null, 
  redirectTo = '/login' 
}) => {
  const { isAuthenticated, role, hasRole } = useUser();
  const location = useLocation();

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    // Save the attempted URL for redirect after login
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // Check role if allowedRoles specified
  if (allowedRoles && !hasRole(allowedRoles)) {
    // Redirect to user's appropriate dashboard
    const userDashboard = ROLE_DASHBOARD_ROUTES[role] || '/';
    return <Navigate to={userDashboard} replace />;
  }

  // Authorized - render children
  return children;
};

/**
 * PublicRoute - Wraps routes that should redirect authenticated users
 * E.g., Login page should redirect to dashboard if already logged in
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render
 * @param {string} props.redirectTo - Path to redirect authenticated users to (optional)
 */
export const PublicRoute = ({ children, redirectTo = null }) => {
  const { isAuthenticated, role } = useUser();
  const location = useLocation();

  if (isAuthenticated) {
    // Redirect to saved location or user's dashboard
    const from = location.state?.from;
    const userDashboard = ROLE_DASHBOARD_ROUTES[role] || '/';
    return <Navigate to={redirectTo || from || userDashboard} replace />;
  }

  return children;
};

export default ProtectedRoute;
