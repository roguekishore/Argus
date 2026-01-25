/**
 * AppRouter - Centralized Role-Based Routing Configuration
 * 
 * ARCHITECTURE NOTES:
 * - All routes defined in one place for easy management
 * - Role-based protection applied consistently
 * - Lazy loading ready for code splitting
 * - Easy to add/remove roles and routes
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { ROLES, ROLE_DASHBOARD_ROUTES } from '../constants/roles';
import ProtectedRoute, { PublicRoute } from '../components/auth/ProtectedRoute';
import RoleBasedRedirect from '../components/auth/RoleBasedRedirect';

// Lazy load pages for code splitting
const Login = lazy(() => import('../pages/Login'));
const Signup = lazy(() => import('../pages/Signup'));

// Dashboard imports - can be lazy loaded for larger apps
const CitizenDashboard = lazy(() => import('../pages/dashboards/CitizenDashboard'));
const StaffDashboard = lazy(() => import('../pages/dashboards/StaffDashboard'));
const DepartmentHeadDashboard = lazy(() => import('../pages/dashboards/DepartmentHeadDashboard'));
const AdminDashboard = lazy(() => import('../pages/dashboards/AdminDashboard'));
const MunicipalCommissionerDashboard = lazy(() => import('../pages/dashboards/MunicipalCommissionerDashboard'));
const SuperAdminDashboard = lazy(() => import('../pages/dashboards/SuperAdminDashboard'));

/**
 * Loading fallback component
 */
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

/**
 * Route configuration for each role
 * Centralized for easy management
 */
const DASHBOARD_ROUTES = [
  {
    path: ROLE_DASHBOARD_ROUTES[ROLES.CITIZEN],
    element: <CitizenDashboard />,
    allowedRoles: [ROLES.CITIZEN],
  },
  {
    path: ROLE_DASHBOARD_ROUTES[ROLES.STAFF],
    element: <StaffDashboard />,
    allowedRoles: [ROLES.STAFF],
  },
  {
    path: ROLE_DASHBOARD_ROUTES[ROLES.DEPT_HEAD],
    element: <DepartmentHeadDashboard />,
    allowedRoles: [ROLES.DEPT_HEAD],
  },
  {
    path: ROLE_DASHBOARD_ROUTES[ROLES.ADMIN],
    element: <AdminDashboard />,
    allowedRoles: [ROLES.ADMIN],
  },
  {
    path: ROLE_DASHBOARD_ROUTES[ROLES.COMMISSIONER],
    element: <MunicipalCommissionerDashboard />,
    allowedRoles: [ROLES.COMMISSIONER],
  },
  {
    path: ROLE_DASHBOARD_ROUTES[ROLES.SUPER_ADMIN],
    element: <SuperAdminDashboard />,
    allowedRoles: [ROLES.SUPER_ADMIN],
  },
];

/**
 * AppRouter Component
 */
const AppRouter = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <Signup />
              </PublicRoute>
            }
          />

          {/* Role-based dashboard redirector */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <RoleBasedRedirect />
              </ProtectedRoute>
            }
          />

          {/* Dashboard routes - dynamically generated from config */}
          {DASHBOARD_ROUTES.map(({ path, element, allowedRoles }) => (
            <Route
              key={path}
              path={path}
              element={
                <ProtectedRoute allowedRoles={allowedRoles}>
                  {element}
                </ProtectedRoute>
              }
            />
          ))}

          {/* Nested dashboard routes (e.g., /dashboard/citizen/complaints/:id) */}
          <Route
            path="/dashboard/citizen/*"
            element={
              <ProtectedRoute allowedRoles={[ROLES.CITIZEN]}>
                <CitizenDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/staff/*"
            element={
              <ProtectedRoute allowedRoles={[ROLES.STAFF]}>
                <StaffDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/dept-head/*"
            element={
              <ProtectedRoute allowedRoles={[ROLES.DEPT_HEAD]}>
                <DepartmentHeadDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/admin/*"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/commissioner/*"
            element={
              <ProtectedRoute allowedRoles={[ROLES.COMMISSIONER]}>
                <MunicipalCommissionerDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/super-admin/*"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* 404 - Redirect to role-based dashboard or login */}
          <Route path="*" element={<NotFoundRedirect />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

/**
 * NotFoundRedirect - Handles 404 routes
 */
const NotFoundRedirect = () => {
  const { isAuthenticated, role } = useUser();

  if (isAuthenticated) {
    const dashboardRoute = ROLE_DASHBOARD_ROUTES[role] || '/';
    return <Navigate to={dashboardRoute} replace />;
  }

  return <Navigate to="/login" replace />;
};

export default AppRouter;
