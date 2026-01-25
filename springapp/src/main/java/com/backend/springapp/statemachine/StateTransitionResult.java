package com.backend.springapp.statemachine;

import com.backend.springapp.enums.ComplaintStatus;
import com.backend.springapp.security.UserContext;
import com.backend.springapp.security.UserRole;

import java.util.Set;

/**
 * Value object representing a validated state transition result.
 * 
 * Contains all information needed to apply and audit the transition.
 * Immutable - once created, the validation result cannot be changed.
 * 
 * @param complaintId     The complaint being transitioned
 * @param fromState       The current/source state
 * @param toState         The target state
 * @param userContext     The user performing the transition
 * @param validatedAt     Timestamp when validation occurred
 * @param validationNotes Any notes about the validation (e.g., auto-close reason)
 */
public record StateTransitionResult(
    Long complaintId,
    ComplaintStatus fromState,
    ComplaintStatus toState,
    UserContext userContext,
    long validatedAt,
    String validationNotes
) {
    
    /**
     * Compact constructor with validation and auto-timestamp.
     */
    public StateTransitionResult {
        if (complaintId == null) {
            throw new IllegalArgumentException("complaintId is required");
        }
        if (fromState == null) {
            throw new IllegalArgumentException("fromState is required");
        }
        if (toState == null) {
            throw new IllegalArgumentException("toState is required");
        }
        if (userContext == null) {
            throw new IllegalArgumentException("userContext is required");
        }
        if (validatedAt <= 0) {
            validatedAt = System.currentTimeMillis();
        }
    }
    
    /**
     * Factory method for creating a successful validation result.
     */
    public static StateTransitionResult success(
            Long complaintId,
            ComplaintStatus fromState,
            ComplaintStatus toState,
            UserContext userContext) {
        return new StateTransitionResult(
            complaintId,
            fromState,
            toState,
            userContext,
            System.currentTimeMillis(),
            null
        );
    }
    
    /**
     * Factory method for creating a validation result with notes.
     */
    public static StateTransitionResult successWithNotes(
            Long complaintId,
            ComplaintStatus fromState,
            ComplaintStatus toState,
            UserContext userContext,
            String notes) {
        return new StateTransitionResult(
            complaintId,
            fromState,
            toState,
            userContext,
            System.currentTimeMillis(),
            notes
        );
    }
    
    /**
     * Check if this transition results in a terminal state.
     */
    public boolean isTerminalTransition() {
        return ComplaintStateMachine.isTerminalState(toState);
    }
    
    /**
     * Get the role that performed this transition.
     */
    public UserRole performedBy() {
        return userContext.role();
    }
    
    /**
     * Create audit log message for this transition.
     */
    public String toAuditLog() {
        return String.format(
            "Complaint %d transitioned from %s to %s by %s at %d%s",
            complaintId,
            fromState,
            toState,
            userContext,
            validatedAt,
            validationNotes != null ? " (" + validationNotes + ")" : ""
        );
    }
}
