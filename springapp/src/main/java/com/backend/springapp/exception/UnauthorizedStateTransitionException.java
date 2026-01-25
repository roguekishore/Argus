package com.backend.springapp.exception;

import com.backend.springapp.enums.ComplaintStatus;
import com.backend.springapp.security.UserRole;

import java.util.Set;

/**
 * Exception thrown when a user attempts a state transition they're not authorized for.
 * 
 * This is an AUTHORIZATION exception - the transition is valid per the state machine,
 * but the current user's role does not permit them to perform it.
 * 
 * Examples:
 * - CITIZEN trying to move complaint from FILED to IN_PROGRESS (only SYSTEM can)
 * - STAFF trying to close a complaint (only CITIZEN or SYSTEM can)
 * 
 * HTTP mapping: 403 Forbidden (authenticated but not authorized)
 */
public class UnauthorizedStateTransitionException extends RuntimeException {
    
    private final Long complaintId;
    private final ComplaintStatus fromState;
    private final ComplaintStatus toState;
    private final UserRole attemptedRole;
    private final Set<UserRole> allowedRoles;
    
    public UnauthorizedStateTransitionException(
            Long complaintId,
            ComplaintStatus fromState,
            ComplaintStatus toState,
            UserRole attemptedRole,
            Set<UserRole> allowedRoles,
            String message) {
        super(message);
        this.complaintId = complaintId;
        this.fromState = fromState;
        this.toState = toState;
        this.attemptedRole = attemptedRole;
        this.allowedRoles = allowedRoles;
    }
    
    public UnauthorizedStateTransitionException(
            Long complaintId,
            ComplaintStatus fromState,
            ComplaintStatus toState,
            UserRole attemptedRole,
            Set<UserRole> allowedRoles) {
        this(
            complaintId,
            fromState,
            toState,
            attemptedRole,
            allowedRoles,
            buildDefaultMessage(complaintId, fromState, toState, attemptedRole, allowedRoles)
        );
    }
    
    private static String buildDefaultMessage(
            Long complaintId,
            ComplaintStatus fromState,
            ComplaintStatus toState,
            UserRole attemptedRole,
            Set<UserRole> allowedRoles) {
        return String.format(
            "User with role %s is not authorized to transition complaint %d from %s to %s. Allowed roles: %s",
            attemptedRole, complaintId, fromState, toState, allowedRoles
        );
    }
    
    public Long getComplaintId() {
        return complaintId;
    }
    
    public ComplaintStatus getFromState() {
        return fromState;
    }
    
    public ComplaintStatus getToState() {
        return toState;
    }
    
    public UserRole getAttemptedRole() {
        return attemptedRole;
    }
    
    public Set<UserRole> getAllowedRoles() {
        return allowedRoles;
    }
}
