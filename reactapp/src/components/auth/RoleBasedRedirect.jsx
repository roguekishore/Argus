/**
 * RoleBasedRedirect Component
 * 
 * Redirects user to their appropriate dashboard based on role.
 * Used as the default authenticated route.
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { ROLE_DASHBOARD_ROUTES } from '../../constants/roles';

/**
 * RoleBasedRedirect - Redirects to role-appropriate dashboard
 * 
 * Usage: Place at root authenticated route
 * <Route path="/" element={<RoleBasedRedirect />} />
 */
const RoleBasedRedirect = () => {
  const { isAuthenticated, role } = useUser();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Get dashboard route for user's role
  const dashboardRoute = ROLE_DASHBOARD_ROUTES[role];

  if (!dashboardRoute) {
    console.error(`No dashboard route defined for role: ${role}`);
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={dashboardRoute} replace />;
};

export default RoleBasedRedirect;
