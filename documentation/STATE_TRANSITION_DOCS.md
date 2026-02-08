# State Transition System - Technical Documentation

## 🔄 State Transition Workflow (How It Works)

### The Flow in Simple Words

When someone tries to change a complaint's status (like marking it "Resolved"), the system goes through **3 checkpoints** before allowing it:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STATE TRANSITION FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User Request (e.g., "Mark as Resolved")                                    │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────┐                                │
│  │  CHECKPOINT 1: Is it a valid move?      │                                │
│  │  ─────────────────────────────────────  │                                │
│  │  File: ComplaintStateMachine.java       │                                │
│  │                                         │                                │
│  │  Checks: Can FILED go to RESOLVED?      │                                │
│  │  Answer: NO! Must go through IN_PROGRESS│                                │
│  │          first.                         │                                │
│  └─────────────────────────────────────────┘                                │
│       │ ✅ Valid                                                            │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────┐                                │
│  │  CHECKPOINT 2: Can THIS USER do it?     │                                │
│  │  ─────────────────────────────────────  │                                │
│  │  File: StateTransitionPolicy.java       │                                │
│  │                                         │                                │
│  │  Checks: Is STAFF allowed to resolve?   │                                │
│  │  Answer: YES! Staff can resolve.        │                                │
│  └─────────────────────────────────────────┘                                │
│       │ ✅ Authorized                                                       │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────┐                                │
│  │  CHECKPOINT 3: Extra conditions?        │                                │
│  │  ─────────────────────────────────────  │                                │
│  │  File: StateTransitionService.java      │                                │
│  │                                         │                                │
│  │  Checks:                                │                                │
│  │  - Is citizen closing their OWN complaint? │                             │
│  │  - Is staff in the SAME department?     │                                │
│  └─────────────────────────────────────────┘                                │
│       │ ✅ All checks passed                                                │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────┐                                │
│  │  APPLY THE CHANGE                       │                                │
│  │  ─────────────────────────────────────  │                                │
│  │  File: ComplaintStateService.java       │                                │
│  │                                         │                                │
│  │  - Updates status in database           │                                │
│  │  - Sets timestamps (resolvedTime, etc.) │                                │
│  │  - Returns success response             │                                │
│  └─────────────────────────────────────────┘                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Package Structure

```
com.backend.springapp/
├── security/                           # Authentication abstraction layer
│   ├── UserRole.java                   # Enum mapping to UserType + SYSTEM
│   ├── UserContext.java                # Immutable user context record
│   └── UserContextHolder.java          # Thread-local context holder
│
├── statemachine/                       # Pure business logic layer
│   ├── ComplaintStateMachine.java      # Valid transition definitions
│   ├── StateTransitionPolicy.java      # RBAC matrix (who can do what)
│   └── StateTransitionResult.java      # Validation result value object
│
├── exception/                          # Domain-specific exceptions
│   ├── InvalidStateTransitionException.java
│   ├── UnauthorizedStateTransitionException.java
│   ├── ComplaintOwnershipException.java
│   └── DepartmentMismatchException.java
│
├── service/
│   ├── StateTransitionService.java     # Core validation & authorization
│   └── ComplaintStateService.java      # Orchestration & persistence
│
├── dto/
│   ├── request/
│   │   └── StateTransitionRequest.java
│   └── response/
│       ├── StateTransitionResponse.java
│       └── AvailableTransitionsResponse.java
│
├── controller/
│   └── ComplaintStateController.java   # REST endpoints
│
└── config/
    └── MockAuthenticationFilter.java   # Mock auth (JWT-ready)
```

---

## 📋 File Responsibilities (Simple Explanation)

| File | What It Does | Analogy |
|------|--------------|---------|
| `UserContext.java` | Holds who is making the request (userId, role, department) | Your ID card |
| `UserRole.java` | Defines all possible roles (CITIZEN, STAFF, ADMIN, SYSTEM, etc.) | Job titles |
| `ComplaintStateMachine.java` | Defines which status changes are allowed | The rulebook |
| `StateTransitionPolicy.java` | Defines WHO can make each change | The permission slip |
| `StateTransitionService.java` | Runs all validations, throws specific errors | The security guard |
| `ComplaintStateService.java` | Actually changes the status and saves to database | The executor |
| `ComplaintStateController.java` | Receives HTTP requests and returns responses | The front desk |

---

## 🔀 The State Machine (What Moves Are Allowed)

```
    FILED ─────────────────────────────┐
      │                                 │
      │ (AI assigns department)         │
      ▼                                 │
    IN_PROGRESS ───────────────────────┼──► CANCELLED
      │                                 │
      │ (Staff resolves)                │
      ▼                                 │
    RESOLVED ──────────────────────────┘
      │
      │ (Citizen accepts OR auto-close)
      ▼
    CLOSED
```

### Valid Transitions:
- `FILED → IN_PROGRESS` (when AI assigns department)
- `IN_PROGRESS → RESOLVED` (staff marks as done)
- `RESOLVED → CLOSED` (citizen accepts or auto-close)
- `FILED / IN_PROGRESS / RESOLVED → CANCELLED` (withdrawal or invalid)

### Terminal States (no way out):
- `CLOSED`
- `CANCELLED`

---

## 👥 Who Can Do What (RBAC Matrix)

| Action | CITIZEN | STAFF | DEPT_HEAD | COMMISSIONER | ADMIN | SUPER_ADMIN | SYSTEM (AI) |
|--------|---------|-------|-----------|--------------|-------|-------------|-------------|
| Start Work (FILED → IN_PROGRESS) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Resolve (IN_PROGRESS → RESOLVED) | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Close (RESOLVED → CLOSED) | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Cancel (Any → CANCELLED) | ✅* | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |

*Citizens can only operate on their **own** complaints

### Additional Checks:
- **Ownership Check**: Citizens can only close/cancel complaints they filed
- **Department Check**: Staff/Dept Heads can only resolve complaints assigned to their department

---

## 🔐 JWT Migration - Feasibility & Plan

### How Easy Is JWT Migration?

**Very Easy!** The system was designed for this. Here's what changes:

#### Backend Changes (Minimal)

| What | Current (Mock) | After JWT |
|------|----------------|-----------|
| Auth Filter | `MockAuthenticationFilter.java` | `JwtAuthenticationFilter.java` |
| User Context Source | HTTP Headers | JWT Token Claims |
| Services | No changes needed | No changes needed |
| State Machine | No changes needed | No changes needed |
| RBAC Policy | No changes needed | No changes needed |

**Only ONE file needs to change** - the filter that creates `UserContext`:

```java
// BEFORE (Mock - reads from headers)
UserContext context = new UserContext(
    request.getHeader("X-User-Id"),
    request.getHeader("X-User-Role"),
    request.getHeader("X-Department-Id")
);

// AFTER (JWT - reads from token)
Claims claims = jwtService.parseToken(token);
UserContext context = new UserContext(
    claims.get("userId", Long.class),
    UserRole.valueOf(claims.get("role", String.class)),
    claims.get("departmentId", Long.class)
);
```

---

## 🖥️ Frontend RBAC Enforcement

### 1. Store User Info After Login
```javascript
// After successful login, store in context/state
const user = {
  userId: 123,
  role: "STAFF",
  departmentId: 1,
  token: "eyJhbG..."
};
localStorage.setItem("user", JSON.stringify(user));
```

### 2. Use the `/allowed-transitions` Endpoint
```javascript
// Fetch what buttons to show for a complaint
const response = await fetch(`/api/complaints/${complaintId}/allowed-transitions`, {
  headers: { Authorization: `Bearer ${token}` }
});

const data = await response.json();
// data = {
//   currentState: "IN_PROGRESS",
//   availableTransitions: ["RESOLVED", "CANCELLED"],
//   isTerminal: false
// }

// Only show buttons for allowed transitions
{data.availableTransitions.includes("RESOLVED") && (
  <button onClick={() => resolve(complaintId)}>Mark Resolved</button>
)}
```

### 3. Create a Permission Hook (React Example)
```javascript
// hooks/usePermissions.js
export function usePermissions() {
  const { user } = useAuth();
  
  const canResolve = (complaint) => {
    return ["STAFF", "DEPT_HEAD"].includes(user.role) &&
           user.departmentId === complaint.departmentId &&
           complaint.status === "IN_PROGRESS";
  };
  
  const canClose = (complaint) => {
    return (user.role === "CITIZEN" && user.userId === complaint.citizenId) ||
           user.role === "SYSTEM";
  };
  
  const canCancel = (complaint) => {
    return (user.role === "CITIZEN" && user.userId === complaint.citizenId) ||
           user.role === "ADMIN";
  };
  
  return { canResolve, canClose, canCancel };
}

// Usage in component
const { canResolve } = usePermissions();
{canResolve(complaint) && <ResolveButton />}
```

### 4. Handle Errors Gracefully
```javascript
try {
  await transitionState(complaintId, "RESOLVED");
} catch (error) {
  if (error.status === 400) {
    toast.error("Invalid transition: " + error.message);
  } else if (error.status === 403) {
    toast.error("You don't have permission to do this");
  }
}
```

---

## 🛡️ Security Principle: Trust but Verify

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND                                    │
│  • Hide buttons user can't click (UX)                          │
│  • Disable actions based on role (UX)                          │
│  • Pre-validate before API call (UX)                           │
│  • This is for BETTER USER EXPERIENCE, not security            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (Source of Truth)                   │
│  • Validates JWT token                                          │
│  • Checks state machine rules                                   │
│  • Enforces RBAC policy                                         │
│  • Verifies ownership/department                                │
│  • THIS IS THE REAL SECURITY                                    │
└─────────────────────────────────────────────────────────────────┘
```

**Golden Rule:** Frontend restrictions improve UX. Backend restrictions enforce security. **Never trust the frontend alone.**

---

## 📋 Error Responses

| HTTP Code | Error Type | When It Happens |
|-----------|------------|-----------------|
| 400 | Invalid State Transition | Trying to skip states (e.g., FILED → CLOSED) |
| 403 | Unauthorized Transition | Role can't perform this action |
| 403 | Ownership Required | Citizen trying to close someone else's complaint |
| 403 | Department Mismatch | Staff trying to resolve complaint from another dept |
| 404 | Resource Not Found | Complaint or user doesn't exist |

### Example Error Response:
```json
{
  "timestamp": "2026-01-22T16:30:00",
  "status": 403,
  "error": "Unauthorized State Transition",
  "message": "User with role CITIZEN is not authorized to transition complaint 123 from IN_PROGRESS to RESOLVED. Allowed roles: [STAFF, DEPT_HEAD]",
  "path": "/api/complaints/123/state",
  "errors": [
    "Your role: CITIZEN",
    "Allowed roles: [STAFF, DEPT_HEAD]"
  ]
}
```

---

## 🧪 Testing the Endpoints

### Using Headers (Mock Auth)
```bash
# System starts work on complaint
curl -X PUT http://localhost:8080/api/complaints/1/system/start

# Staff resolves complaint
curl -X PUT http://localhost:8080/api/complaints/1/resolve \
  -H "X-User-Id: 5" \
  -H "X-User-Role: STAFF" \
  -H "X-Department-Id: 1"

# Citizen closes their complaint
curl -X PUT http://localhost:8080/api/complaints/1/close \
  -H "X-User-Id: 2" \
  -H "X-User-Role: CITIZEN"

# Get available transitions for UI
curl -X GET http://localhost:8080/api/complaints/1/allowed-transitions \
  -H "X-User-Id: 5" \
  -H "X-User-Role: STAFF" \
  -H "X-Department-Id: 1"
```

### Generic State Transition
```bash
curl -X PUT http://localhost:8080/api/complaints/1/state \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 5" \
  -H "X-User-Role: STAFF" \
  -H "X-Department-Id: 1" \
  -d '{"targetState": "RESOLVED"}'
```
