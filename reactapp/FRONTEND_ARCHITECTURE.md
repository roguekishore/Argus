# Frontend Architecture Documentation

## Overview

This document describes the frontend architecture for the Public Grievance Redressal System. The architecture is designed for:
- **Modularity**: Easy to add/remove roles and features
- **Maintainability**: Clear separation of concerns
- **Scalability**: Ready for enterprise-level growth
- **JWT Future-Proofing**: Auth abstraction allows easy JWT migration

---

## Folder Structure

```
src/
├── components/
│   ├── auth/                    # Authentication-related components
│   │   ├── ProtectedRoute.jsx   # Route guard for authentication
│   │   ├── RoleBasedRedirect.jsx # Redirects to role-appropriate dashboard
│   │   └── index.js
│   ├── common/                  # Shared, reusable components
│   │   ├── ComplaintCard.jsx    # Universal complaint display card
│   │   ├── ComplaintList.jsx    # List wrapper for complaints
│   │   └── index.js
│   ├── ui/                      # UI primitives (Button, Card, Input, etc.)
│   └── layout/                  # Layout components
│
├── constants/
│   ├── roles.js                 # ROLES enum, PERMISSIONS, state configs
│   └── index.js
│
├── context/
│   ├── UserContext.jsx          # Global user state (userId, role, departmentId)
│   └── index.js
│
├── hooks/
│   ├── useAuth.js               # Authentication operations hook
│   ├── useComplaints.js         # Complaint data fetching hook
│   ├── useEscalations.js        # Escalation data hook
│   ├── useDepartmentData.js     # Department & staff data hook
│   └── index.js
│
├── layouts/
│   └── DashboardLayout.jsx      # Common dashboard shell
│
├── pages/
│   ├── Login.jsx                # Login page
│   ├── Signup.jsx               # Registration page
│   └── dashboards/              # Role-specific dashboard pages
│       ├── CitizenDashboard.jsx
│       ├── StaffDashboard.jsx
│       ├── DepartmentHeadDashboard.jsx
│       ├── AdminDashboard.jsx
│       ├── MunicipalCommissionerDashboard.jsx
│       ├── SuperAdminDashboard.jsx
│       └── index.js
│
├── router/
│   ├── AppRouter.jsx            # Centralized routing configuration
│   └── index.js
│
├── services/
│   ├── authService.js           # Authentication operations
│   └── api/
│       ├── apiClient.js         # Base HTTP client
│       ├── complaintsService.js # Complaint API calls
│       ├── usersService.js      # User API calls
│       ├── departmentsService.js
│       ├── categoriesService.js
│       ├── slaService.js
│       ├── escalationService.js
│       ├── chatService.js
│       └── index.js
│
├── lib/
│   └── utils.js                 # Utility functions (cn, etc.)
│
└── App.js                       # Application root
```

---

## Core Components

### 1. UserContext (`context/UserContext.jsx`)

Central user state management. All components access user data through this context.

```javascript
// Usage in any component
import { useUser } from '../context/UserContext';

const MyComponent = () => {
  const { 
    user,           // Full user object
    userId,         // Convenience getter
    role,           // User's role
    departmentId,   // Department ID (for staff)
    isAuthenticated,
    hasRole,        // Check role: hasRole('ADMIN') or hasRole(['ADMIN', 'SUPER_ADMIN'])
    isCitizen,      // Quick check
    isAdminLevel,   // Check admin privileges
  } = useUser();
  
  // Conditional rendering based on role
  if (hasRole(['ADMIN', 'SUPER_ADMIN'])) {
    return <AdminView />;
  }
};
```

**JWT Migration**: UserContext does NOT depend on JWT. When JWT is implemented:
1. `authService.login()` will decode JWT and extract user data
2. UserContext interface remains unchanged
3. No component changes needed

### 2. Role Constants (`constants/roles.js`)

Single source of truth for all role-related logic.

```javascript
import { ROLES, PERMISSIONS, hasPermission, ROLE_DASHBOARD_ROUTES } from '../constants/roles';

// Check permission
if (hasPermission(role, 'CREATE_COMPLAINT')) {
  // Show create button
}

// Get dashboard route
const dashboardPath = ROLE_DASHBOARD_ROUTES[ROLES.CITIZEN]; // '/dashboard/citizen'
```

### 3. API Services (`services/api/`)

All API calls go through dedicated service files. NO direct fetch in components.

```javascript
import { complaintsService, escalationService } from '../services';

// Fetch complaint
const complaint = await complaintsService.getDetails(complaintId);

// Update state
await complaintsService.resolve(complaintId, { notes: 'Issue fixed' });
```

### 4. Authentication Service (`services/authService.js`)

Abstracted authentication ready for JWT.

```javascript
import authService from '../services/authService';

// Current: Simple auth
const userData = await authService.login({ email, password });

// Future JWT: Same interface, backend returns token
// authService.login() will store token and return user data
```

---

## Role-Based Features

### Dashboard Routes

| Role | Route | Dashboard |
|------|-------|-----------|
| CITIZEN | `/dashboard/citizen` | CitizenDashboard |
| STAFF | `/dashboard/staff` | StaffDashboard |
| DEPT_HEAD | `/dashboard/dept-head` | DepartmentHeadDashboard |
| ADMIN | `/dashboard/admin` | AdminDashboard |
| COMMISSIONER | `/dashboard/commissioner` | MunicipalCommissionerDashboard |
| SUPER_ADMIN | `/dashboard/super-admin` | SuperAdminDashboard |

### Data Access Rules

| Role | Complaints | Escalations | Users | Departments |
|------|------------|-------------|-------|-------------|
| CITIZEN | Own only | ❌ | ❌ | ❌ |
| STAFF | Assigned | Read-only logs | ❌ | Own dept |
| DEPT_HEAD | Department | Department | Dept staff | Own dept |
| ADMIN | All | All + trigger | All | All |
| COMMISSIONER | Escalated only | Read-only | ❌ | ❌ |
| SUPER_ADMIN | All | All + trigger | All | All |

### Actions by Role

| Action | CITIZEN | STAFF | DEPT_HEAD | ADMIN | COMMISSIONER | SUPER_ADMIN |
|--------|---------|-------|-----------|-------|--------------|-------------|
| Create Complaint | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Close Own | ✅ (resolved) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Cancel | ✅ (own) | ❌ | ❌ | ✅ | ❌ | ❌ |
| Resolve | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manual Escalate | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Manage Staff | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |

---

## How to Add a New Role

1. **Add to ROLES enum** (`constants/roles.js`):
   ```javascript
   export const ROLES = Object.freeze({
     // ... existing
     NEW_ROLE: 'NEW_ROLE',
   });
   ```

2. **Add dashboard route** (`constants/roles.js`):
   ```javascript
   export const ROLE_DASHBOARD_ROUTES = Object.freeze({
     // ... existing
     [ROLES.NEW_ROLE]: '/dashboard/new-role',
   });
   ```

3. **Add permissions** (`constants/roles.js`):
   ```javascript
   export const PERMISSIONS = Object.freeze({
     VIEW_SOMETHING: [ROLES.NEW_ROLE, ROLES.ADMIN],
     // ...
   });
   ```

4. **Create dashboard page** (`pages/dashboards/NewRoleDashboard.jsx`)

5. **Add route** (`router/AppRouter.jsx`):
   ```javascript
   const NewRoleDashboard = lazy(() => import('../pages/dashboards/NewRoleDashboard'));
   
   // In DASHBOARD_ROUTES array
   {
     path: ROLE_DASHBOARD_ROUTES[ROLES.NEW_ROLE],
     element: <NewRoleDashboard />,
     allowedRoles: [ROLES.NEW_ROLE],
   },
   ```

6. **Export from index** (`pages/dashboards/index.js`)

---

## Universal ComplaintCard

The `ComplaintCard` component displays complaints consistently across all dashboards while showing role-appropriate data and actions.

```javascript
import { ComplaintCard, ComplaintList } from '../components/common';

// In any dashboard
<ComplaintList
  complaints={complaints}
  isLoading={isLoading}
  emptyMessage="No complaints"
  onClose={handleClose}       // Citizen action
  onResolve={handleResolve}   // Staff/DeptHead action
  onEscalate={handleEscalate} // Admin action
  onViewDetails={handleView}  // All roles
/>
```

The card automatically:
- Shows/hides fields based on user's role
- Enables/disables actions based on role + complaint state
- Uses consistent styling across dashboards

---

## JWT Migration Guide

When implementing JWT:

### 1. Update `authService.js`

```javascript
// In login()
const response = await apiClient.post('/auth/login', credentials);

// Store tokens
localStorage.setItem(AUTH_STORAGE_KEYS.AUTH_TOKEN, response.token);
localStorage.setItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);

// Decode and return user data
const userData = decodeJWT(response.token);
storeUser(userData);
return userData;
```

### 2. Update `apiClient.js`

```javascript
// In getAuthHeaders()
const token = localStorage.getItem(AUTH_STORAGE_KEYS.AUTH_TOKEN);
if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}

// Add token refresh in response interceptor
if (error.status === 401) {
  const newToken = await authService.refreshToken();
  // Retry request with new token
}
```

### 3. No Changes Needed In:
- UserContext
- Components using useUser()
- Dashboard pages
- ComplaintCard/ComplaintList
- Route guards

---

## Dependencies to Install

```bash
npm install react-router-dom
```

---

## Environment Variables

Create `.env` file:

```
REACT_APP_API_URL=http://localhost:8080/api
```

---

## Example: Dashboard Data Fetching

```javascript
// In CitizenDashboard.jsx
import { useComplaints } from '../../hooks/useComplaints';

const CitizenDashboard = () => {
  const { 
    complaints, 
    stats, 
    isLoading, 
    closeComplaint, 
    cancelComplaint,
    refresh 
  } = useComplaints();

  const handleClose = async (id) => {
    await closeComplaint(id);
    // UI updates automatically via state
  };

  return (
    <ComplaintList
      complaints={complaints}
      isLoading={isLoading}
      onClose={handleClose}
    />
  );
};
```

The hook:
1. Reads user's role from UserContext
2. Calls appropriate API endpoint based on role
3. Returns data and action functions
4. Components never make API calls directly

---

## Best Practices

1. **Never hardcode role strings** - Use `ROLES.CITIZEN`, not `'CITIZEN'`
2. **Never make API calls in components** - Use hooks that use services
3. **Use hasPermission()** for feature checks, not role comparisons
4. **Keep business logic in hooks/services**, not components
5. **Add new roles through constants**, not scattered code changes
6. **Test with all roles** before deploying

---

## Files Created/Modified

### New Files Created:
- `src/context/UserContext.jsx`
- `src/context/index.js`
- `src/constants/roles.js`
- `src/constants/index.js`
- `src/services/authService.js`
- `src/services/api/apiClient.js`
- `src/services/api/complaintsService.js`
- `src/services/api/usersService.js`
- `src/services/api/departmentsService.js`
- `src/services/api/categoriesService.js`
- `src/services/api/slaService.js`
- `src/services/api/escalationService.js`
- `src/services/api/chatService.js`
- `src/services/api/index.js`
- `src/services/index.js`
- `src/components/auth/ProtectedRoute.jsx`
- `src/components/auth/RoleBasedRedirect.jsx`
- `src/components/auth/index.js`
- `src/components/common/ComplaintCard.jsx`
- `src/components/common/ComplaintList.jsx`
- `src/components/common/index.js`
- `src/hooks/useAuth.js`
- `src/hooks/useComplaints.js`
- `src/hooks/useEscalations.js`
- `src/hooks/useDepartmentData.js`
- `src/hooks/index.js`
- `src/router/AppRouter.jsx`
- `src/router/index.js`

### Modified Files:
- `src/App.js` - Added providers and router
- `src/pages/Login.jsx` - Connected to auth service
- `src/pages/Signup.jsx` - Connected to auth service
- `src/pages/dashboards/CitizenDashboard.jsx` - Example implementation
