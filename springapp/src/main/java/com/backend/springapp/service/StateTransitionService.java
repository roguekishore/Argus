package com.backend.springapp.service;

import com.backend.springapp.enums.ComplaintStatus;
import com.backend.springapp.exception.ComplaintOwnershipException;
import com.backend.springapp.exception.DepartmentMismatchException;
import com.backend.springapp.exception.InvalidStateTransitionException;
import com.backend.springapp.exception.ResolutionProofRequiredException;
import com.backend.springapp.exception.SignoffRequiredException;
import com.backend.springapp.exception.UnauthorizedStateTransitionException;
import com.backend.springapp.repository.CitizenSignoffRepository;
import com.backend.springapp.repository.ResolutionProofRepository;
import com.backend.springapp.security.UserContext;
import com.backend.springapp.security.UserRole;
import com.backend.springapp.statemachine.ComplaintStateMachine;
import com.backend.springapp.statemachine.StateTransitionPolicy;
import com.backend.springapp.statemachine.StateTransitionResult;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Set;

/**
 * Core service for validating and authorizing state transitions.
 * 
 * DESIGN PRINCIPLES:
 * - Single Responsibility: ONLY handles transition validation and authorization
 * - Does NOT persist changes - that's ComplaintStateService's job
 * - Does NOT load complaints - receives state as parameter
 * - Pure validation logic - easy to unit test
 * - Throws domain-specific exceptions for different failure modes
 * 
 * VALIDATION ORDER:
 * 1. State machine validation (is the transition technically valid?)
 * 2. RBAC validation (does the user's role allow this transition?)
 * 3. Contextual validation (ownership check, department check)
 * 
 * This layered approach allows precise error messages and
 * separates business rules from authorization rules.
 */
@Service
public class StateTransitionService {
    
    private static final Logger log = LoggerFactory.getLogger(StateTransitionService.class);
    
    /**
     * Repository for checking resolution proof existence.
     * Used to enforce: IN_PROGRESS → RESOLVED requires proof.
     */
    private final ResolutionProofRepository resolutionProofRepository;
    
    /**
     * Repository for checking citizen signoff existence.
     * Used to enforce: RESOLVED → CLOSED requires citizen acceptance.
     */
    private final CitizenSignoffRepository citizenSignoffRepository;
    
    public StateTransitionService(
            ResolutionProofRepository resolutionProofRepository,
            CitizenSignoffRepository citizenSignoffRepository) {
        this.resolutionProofRepository = resolutionProofRepository;
        this.citizenSignoffRepository = citizenSignoffRepository;
    }
    
    /**
     * Validate and authorize a state transition.
     * 
     * This is the SINGLE ENTRY POINT for all state transition requests.
     * All validation rules are enforced here.
     * 
     * @param complaintId           The complaint being transitioned
     * @param currentState          Current state of the complaint
     * @param targetState           Desired target state
     * @param userContext           The user requesting the transition
     * @param complaintCitizenId    The citizen who filed the complaint (for ownership check)
     * @param complaintDepartmentId The department the complaint is assigned to (for dept check)
     * @return StateTransitionResult containing validated transition details
     * @throws InvalidStateTransitionException     if the transition violates state machine rules
     * @throws UnauthorizedStateTransitionException if the user's role is not authorized
     * @throws ComplaintOwnershipException         if citizen ownership check fails
     * @throws DepartmentMismatchException         if department membership check fails
     */
    public StateTransitionResult validateAndAuthorize(
            Long complaintId,
            ComplaintStatus currentState,
            ComplaintStatus targetState,
            UserContext userContext,
            Long complaintCitizenId,
            Long complaintDepartmentId) {
        
        log.debug("Validating transition for complaint {}: {} -> {} by {}",
            complaintId, currentState, targetState, userContext);
        
        // ========== STEP 1: State Machine Validation ==========
        // Is this transition technically valid regardless of who's doing it?
        
        if (!ComplaintStateMachine.isValidTransition(currentState, targetState)) {
            String reason = ComplaintStateMachine.getInvalidTransitionReason(currentState, targetState);
            log.warn("Invalid state transition attempted for complaint {}: {}", complaintId, reason);
            throw new InvalidStateTransitionException(complaintId, currentState, targetState, reason);
        }
        
        // ========== STEP 2: RBAC Validation ==========
        // Does this user's role have permission for this transition?
        
        UserRole role = userContext.role();
        
        if (!StateTransitionPolicy.isAllowed(currentState, targetState, role)) {
            Set<UserRole> allowedRoles = StateTransitionPolicy.getAllowedRoles(currentState, targetState);
            String reason = StateTransitionPolicy.getDenialReason(currentState, targetState, role);
            log.warn("Unauthorized state transition for complaint {}: {}", complaintId, reason);
            throw new UnauthorizedStateTransitionException(
                complaintId, currentState, targetState, role, allowedRoles, reason
            );
        }
        
        // ========== STEP 3: Contextual Validation ==========
        // Additional checks based on role and operation type
        
        // 3a. Ownership check for citizens
        if (StateTransitionPolicy.requiresOwnershipCheck(targetState, role)) {
            if (!userContext.isComplaintOwner(complaintCitizenId)) {
                log.warn("Ownership check failed for complaint {}: user {} is not owner {}",
                    complaintId, userContext.userId(), complaintCitizenId);
                throw new ComplaintOwnershipException(
                    complaintId, userContext.userId(), complaintCitizenId
                );
            }
        }
        
        // 3b. Department check for staff/dept_head
        if (StateTransitionPolicy.requiresDepartmentCheck(targetState, role)) {
            if (!userContext.isInDepartment(complaintDepartmentId)) {
                log.warn("Department check failed for complaint {}: user dept {} != complaint dept {}",
                    complaintId, userContext.departmentId(), complaintDepartmentId);
                throw new DepartmentMismatchException(
                    complaintId, userContext.departmentId(), complaintDepartmentId
                );
            }
        }
        
        // ========== STEP 4: Domain Rule Guards ==========
        // Business rules that require specific prerequisites before transition
        
        // 4a. RESOLUTION PROOF GUARD: IN_PROGRESS → RESOLVED
        // WHY: Staff cannot claim resolution without providing proof of work done.
        // This prevents "ghost resolutions" where complaints are closed without action.
        if (currentState == ComplaintStatus.IN_PROGRESS && targetState == ComplaintStatus.RESOLVED) {
            if (!resolutionProofRepository.existsByComplaintId(complaintId)) {
                log.warn("Resolution proof required for complaint {}: no proof exists", complaintId);
                throw new ResolutionProofRequiredException(complaintId);
            }
            log.debug("Resolution proof exists for complaint {}, transition allowed", complaintId);
        }
        
        // 4b. CITIZEN SIGNOFF GUARD: RESOLVED → CLOSED (for non-SYSTEM roles)
        // WHY: Only the citizen who filed the complaint can close it.
        // This ensures citizen empowerment - resolution isn't complete until they accept.
        // NOTE: SYSTEM role bypasses this for auto-close after timeout period.
        if (currentState == ComplaintStatus.RESOLVED && targetState == ComplaintStatus.CLOSED) {
            if (role != UserRole.SYSTEM) {
                if (!citizenSignoffRepository.existsByComplaintIdAndIsAcceptedTrue(complaintId)) {
                    log.warn("Citizen signoff required for complaint {}: no accepted signoff exists", complaintId);
                    throw new SignoffRequiredException(complaintId);
                }
                log.debug("Citizen signoff exists for complaint {}, transition allowed", complaintId);
            } else {
                log.info("SYSTEM role closing complaint {} - signoff check bypassed (auto-close)", complaintId);
            }
        }
        
        // ========== All validations passed ==========
        log.info("State transition validated for complaint {}: {} -> {} by {}",
            complaintId, currentState, targetState, userContext);
        
        return StateTransitionResult.success(complaintId, currentState, targetState, userContext);
    }
    
    /**
     * Get all states that the given user can transition to from the current state.
     * 
     * Used by UI to show available actions (dropdown of valid next states).
     * 
     * @param currentState          Current state of the complaint
     * @param userContext           The user viewing available transitions
     * @param complaintCitizenId    Citizen who filed the complaint (for ownership check)
     * @param complaintDepartmentId Department the complaint is assigned to
     * @return Set of states the user can transition to (may be empty)
     */
    public Set<ComplaintStatus> getAvailableTransitions(
            ComplaintStatus currentState,
            UserContext userContext,
            Long complaintCitizenId,
            Long complaintDepartmentId) {
        
        UserRole role = userContext.role();
        
        // Get transitions allowed by RBAC policy
        Set<ComplaintStatus> allowedByPolicy = 
            StateTransitionPolicy.getAllowedTransitionsForRole(currentState, role);
        
        // Filter further based on contextual checks
        allowedByPolicy.removeIf(targetState -> {
            // Remove transitions that would fail ownership check
            if (StateTransitionPolicy.requiresOwnershipCheck(targetState, role)) {
                if (!userContext.isComplaintOwner(complaintCitizenId)) {
                    return true;
                }
            }
            
            // Remove transitions that would fail department check
            if (StateTransitionPolicy.requiresDepartmentCheck(targetState, role)) {
                if (!userContext.isInDepartment(complaintDepartmentId)) {
                    return true;
                }
            }
            
            return false;
        });
        
        return allowedByPolicy;
    }
    
    /**
     * Check if a specific transition is possible (dry run).
     * Does not throw exceptions - returns boolean.
     * 
     * NOTE: This method requires a real complaintId to check proof/signoff guards.
     * When using dummy ID (0L), guard checks will fail for transitions requiring
     * ResolutionProof or CitizenSignoff. Use with caution.
     * 
     * @param complaintId           The complaint ID (needed for guard checks)
     * @param currentState          Current state
     * @param targetState           Target state
     * @param userContext           User context
     * @param complaintCitizenId    Complaint owner
     * @param complaintDepartmentId Complaint department
     * @return true if the transition would succeed
     */
    public boolean canTransition(
            Long complaintId,
            ComplaintStatus currentState,
            ComplaintStatus targetState,
            UserContext userContext,
            Long complaintCitizenId,
            Long complaintDepartmentId) {
        
        try {
            // Attempt validation but don't need the result
            validateAndAuthorize(
                complaintId,
                currentState,
                targetState,
                userContext,
                complaintCitizenId,
                complaintDepartmentId
            );
            return true;
        } catch (InvalidStateTransitionException | 
                 UnauthorizedStateTransitionException |
                 ComplaintOwnershipException |
                 DepartmentMismatchException |
                 ResolutionProofRequiredException |
                 SignoffRequiredException e) {
            return false;
        }
    }
}
