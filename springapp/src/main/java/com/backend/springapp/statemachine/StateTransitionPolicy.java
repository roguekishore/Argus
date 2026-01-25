package com.backend.springapp.statemachine;

import com.backend.springapp.enums.ComplaintStatus;
import com.backend.springapp.security.UserRole;

import java.util.Collections;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * RBAC (Role-Based Access Control) policy for state transitions.
 * 
 * DESIGN PRINCIPLES:
 * - Defines WHICH ROLES can perform WHICH TRANSITIONS
 * - Completely separate from the state machine (what transitions are valid)
 * - Easy to modify permissions without touching state machine logic
 * - Immutable and thread-safe
 * 
 * RBAC MATRIX (from requirements):
 * 
 * | Transition             | CITIZEN | STAFF | DEPT_HEAD | COMMISSIONER | ADMIN | SUPER_ADMIN | SYSTEM |
 * |------------------------|---------|-------|-----------|--------------|-------|-------------|--------|
 * | FILED → IN_PROGRESS    |    ❌   |   ❌  |     ❌    |      ❌      |   ❌  |      ❌     |   ✅   |
 * | IN_PROGRESS → RESOLVED |    ❌   |   ✅  |     ✅    |      ❌      |   ❌  |      ❌     |   ❌   |
 * | RESOLVED → CLOSED      |    ✅   |   ❌  |     ❌    |      ❌      |   ❌  |      ❌     |   ✅   |
 * | → CANCELLED            |    ✅   |   ❌  |     ❌    |      ❌      |   ✅  |      ❌     |   ❌   |
 * 
 * NOTE: Commissioner and Super Admin have limited state change permissions by design.
 * They handle escalations and oversight, not operational state changes.
 */
public final class StateTransitionPolicy {
    
    /**
     * Compound key for transition permission lookups.
     * Represents a specific FROM → TO state transition.
     */
    public record TransitionKey(ComplaintStatus fromState, ComplaintStatus toState) {
        public TransitionKey {
            if (fromState == null || toState == null) {
                throw new IllegalArgumentException("States cannot be null");
            }
        }
    }
    
    /**
     * Map of transitions to the roles allowed to perform them.
     */
    private static final Map<TransitionKey, Set<UserRole>> TRANSITION_PERMISSIONS;
    
    static {
        Map<TransitionKey, Set<UserRole>> permissions = new java.util.HashMap<>();
        
        // FILED → IN_PROGRESS: SYSTEM only (AI assigns category/department)
        permissions.put(
            new TransitionKey(ComplaintStatus.FILED, ComplaintStatus.IN_PROGRESS),
            EnumSet.of(UserRole.SYSTEM)
        );
        
        // IN_PROGRESS → RESOLVED: STAFF and DEPT_HEAD (operational resolution)
        permissions.put(
            new TransitionKey(ComplaintStatus.IN_PROGRESS, ComplaintStatus.RESOLVED),
            EnumSet.of(UserRole.STAFF, UserRole.DEPT_HEAD)
        );
        
        // RESOLVED → CLOSED: CITIZEN and SYSTEM (acceptance or auto-close)
        permissions.put(
            new TransitionKey(ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED),
            EnumSet.of(UserRole.CITIZEN, UserRole.SYSTEM)
        );
        
        // FILED → CANCELLED: CITIZEN and ADMIN
        permissions.put(
            new TransitionKey(ComplaintStatus.FILED, ComplaintStatus.CANCELLED),
            EnumSet.of(UserRole.CITIZEN, UserRole.ADMIN)
        );
        
        // IN_PROGRESS → CANCELLED: CITIZEN and ADMIN
        permissions.put(
            new TransitionKey(ComplaintStatus.IN_PROGRESS, ComplaintStatus.CANCELLED),
            EnumSet.of(UserRole.CITIZEN, UserRole.ADMIN)
        );
        
        // RESOLVED → CANCELLED: CITIZEN and ADMIN
        permissions.put(
            new TransitionKey(ComplaintStatus.RESOLVED, ComplaintStatus.CANCELLED),
            EnumSet.of(UserRole.CITIZEN, UserRole.ADMIN)
        );
        
        TRANSITION_PERMISSIONS = Collections.unmodifiableMap(permissions);
    }
    
    private StateTransitionPolicy() {
        // Utility class - prevent instantiation
    }
    
    /**
     * Check if a role is allowed to perform a specific state transition.
     * 
     * @param fromState Current state of the complaint
     * @param toState   Target state
     * @param role      Role attempting the transition
     * @return true if the role is allowed to perform this transition
     */
    public static boolean isAllowed(ComplaintStatus fromState, ComplaintStatus toState, UserRole role) {
        if (fromState == null || toState == null || role == null) {
            return false;
        }
        
        TransitionKey key = new TransitionKey(fromState, toState);
        Set<UserRole> allowedRoles = TRANSITION_PERMISSIONS.get(key);
        
        return allowedRoles != null && allowedRoles.contains(role);
    }
    
    /**
     * Get all roles that are allowed to perform a specific transition.
     * 
     * @param fromState Current state
     * @param toState   Target state
     * @return Set of allowed roles (empty if transition not defined in policy)
     */
    public static Set<UserRole> getAllowedRoles(ComplaintStatus fromState, ComplaintStatus toState) {
        if (fromState == null || toState == null) {
            return EnumSet.noneOf(UserRole.class);
        }
        
        TransitionKey key = new TransitionKey(fromState, toState);
        Set<UserRole> allowedRoles = TRANSITION_PERMISSIONS.get(key);
        
        return allowedRoles != null ? EnumSet.copyOf(allowedRoles) : EnumSet.noneOf(UserRole.class);
    }
    
    /**
     * Get all transitions that a specific role can perform from a given state.
     * Useful for UI to show available actions.
     * 
     * @param fromState Current state
     * @param role      User's role
     * @return Set of states that can be reached by this role from the current state
     */
    public static Set<ComplaintStatus> getAllowedTransitionsForRole(ComplaintStatus fromState, UserRole role) {
        if (fromState == null || role == null) {
            return EnumSet.noneOf(ComplaintStatus.class);
        }
        
        // First, get all technically valid transitions from the state machine
        Set<ComplaintStatus> validMachineTransitions = ComplaintStateMachine.getAllowedTransitions(fromState);
        
        // Then filter by RBAC policy
        Set<ComplaintStatus> allowedForRole = EnumSet.noneOf(ComplaintStatus.class);
        
        for (ComplaintStatus toState : validMachineTransitions) {
            if (isAllowed(fromState, toState, role)) {
                allowedForRole.add(toState);
            }
        }
        
        return allowedForRole;
    }
    
    /**
     * Get a human-readable reason why a transition is not allowed for a role.
     * Useful for error messages.
     * 
     * @param fromState Current state
     * @param toState   Target state
     * @param role      Role attempting the transition
     * @return Description of why the transition is denied
     */
    public static String getDenialReason(ComplaintStatus fromState, ComplaintStatus toState, UserRole role) {
        if (role == null) {
            return "User role is not specified";
        }
        
        Set<UserRole> allowedRoles = getAllowedRoles(fromState, toState);
        
        if (allowedRoles.isEmpty()) {
            return String.format(
                "Transition from %s to %s is not permitted by policy for any role",
                fromState, toState
            );
        }
        
        return String.format(
            "Role %s is not authorized for transition from %s to %s. Authorized roles: %s",
            role, fromState, toState, allowedRoles
        );
    }
    
    /**
     * Check if the transition requires ownership verification.
     * Citizens can only operate on their own complaints.
     * 
     * @param toState The target state
     * @param role    The user's role
     * @return true if ownership should be verified
     */
    public static boolean requiresOwnershipCheck(ComplaintStatus toState, UserRole role) {
        // Citizens can only close/cancel their OWN complaints
        return role == UserRole.CITIZEN && 
               (toState == ComplaintStatus.CLOSED || toState == ComplaintStatus.CANCELLED);
    }
    
    /**
     * Check if the transition requires department membership verification.
     * Staff and Dept Heads can only operate on complaints in their department.
     * 
     * @param toState The target state
     * @param role    The user's role
     * @return true if department membership should be verified
     */
    public static boolean requiresDepartmentCheck(ComplaintStatus toState, UserRole role) {
        // Staff and Dept Heads can only resolve complaints in their department
        return (role == UserRole.STAFF || role == UserRole.DEPT_HEAD) && 
               toState == ComplaintStatus.RESOLVED;
    }
}
