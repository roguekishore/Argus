package com.backend.springapp.statemachine;

import com.backend.springapp.enums.ComplaintStatus;

import java.util.Collections;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Pure state machine defining allowed complaint state transitions.
 * 
 * DESIGN PRINCIPLES:
 * - This is a PURE business logic class - no dependencies on users, roles, or persistence
 * - Contains ONLY the rules about which states can transition to which other states
 * - Does NOT enforce WHO can perform transitions (that's StateTransitionPolicy's job)
 * - Immutable and thread-safe - all data is initialized at class load time
 * 
 * STATE MACHINE DEFINITION (from requirements):
 * 
 *   FILED ──────────────────────────────┐
 *     │                                  │
 *     ▼                                  ▼
 *   IN_PROGRESS ──────────────────► CANCELLED
 *     │                                  ▲
 *     ▼                                  │
 *   RESOLVED ────────────────────────────┤
 *     │                                  │
 *     ▼                                  │
 *   CLOSED ◄─────────────────────────────┘
 * 
 * VALID TRANSITIONS:
 * - FILED → IN_PROGRESS (system assigns department/category)
 * - IN_PROGRESS → RESOLVED (staff resolves)
 * - RESOLVED → CLOSED (citizen accepts or auto-close)
 * - FILED/IN_PROGRESS/RESOLVED → CANCELLED (withdrawal or invalid)
 * 
 * NOTE: Escalation does NOT change state (handled separately)
 */
public final class ComplaintStateMachine {
    
    /**
     * Map of valid transitions: FROM_STATE → Set of allowed TO_STATES
     */
    private static final Map<ComplaintStatus, Set<ComplaintStatus>> VALID_TRANSITIONS;
    
    /**
     * Terminal states - no transitions allowed from these states
     */
    private static final Set<ComplaintStatus> TERMINAL_STATES = EnumSet.of(
        ComplaintStatus.CLOSED,
        ComplaintStatus.CANCELLED
    );
    
    static {
        Map<ComplaintStatus, Set<ComplaintStatus>> transitions = new EnumMap<>(ComplaintStatus.class);
        
        // FILED → IN_PROGRESS or CANCELLED
        transitions.put(ComplaintStatus.FILED, EnumSet.of(
            ComplaintStatus.IN_PROGRESS,
            ComplaintStatus.CANCELLED
        ));
        
        // IN_PROGRESS → RESOLVED or CANCELLED
        transitions.put(ComplaintStatus.IN_PROGRESS, EnumSet.of(
            ComplaintStatus.RESOLVED,
            ComplaintStatus.CANCELLED
        ));
        
        // RESOLVED → CLOSED, CANCELLED, or IN_PROGRESS (reopen on dispute approval)
        // WHY IN_PROGRESS: When a dispute is approved by DEPT_HEAD, the complaint
        // must be reopened for re-work. This is NOT a normal workflow path -
        // it requires dispute approval guard logic in StateTransitionService.
        transitions.put(ComplaintStatus.RESOLVED, EnumSet.of(
            ComplaintStatus.CLOSED,
            ComplaintStatus.CANCELLED,
            ComplaintStatus.IN_PROGRESS  // Dispute reopen path
        ));
        
        // CLOSED and CANCELLED are terminal states - no outgoing transitions
        transitions.put(ComplaintStatus.CLOSED, EnumSet.noneOf(ComplaintStatus.class));
        transitions.put(ComplaintStatus.CANCELLED, EnumSet.noneOf(ComplaintStatus.class));
        
        // Note: OPEN and HOLD are in the enum but not part of our state machine
        // They may be legacy or for future use - exclude them from valid transitions
        transitions.put(ComplaintStatus.OPEN, EnumSet.noneOf(ComplaintStatus.class));
        transitions.put(ComplaintStatus.HOLD, EnumSet.noneOf(ComplaintStatus.class));
        
        VALID_TRANSITIONS = Collections.unmodifiableMap(transitions);
    }
    
    private ComplaintStateMachine() {
        // Utility class - prevent instantiation
    }
    
    /**
     * Check if a state transition is valid according to the state machine rules.
     * 
     * @param fromState Current state of the complaint
     * @param toState   Desired target state
     * @return true if the transition is allowed by the state machine
     */
    public static boolean isValidTransition(ComplaintStatus fromState, ComplaintStatus toState) {
        if (fromState == null || toState == null) {
            return false;
        }
        
        Set<ComplaintStatus> allowedTargets = VALID_TRANSITIONS.get(fromState);
        return allowedTargets != null && allowedTargets.contains(toState);
    }
    
    /**
     * Get all states that can be reached from the given state.
     * Returns empty set for terminal states.
     * 
     * @param fromState The current state
     * @return Immutable set of reachable states (never null)
     */
    public static Set<ComplaintStatus> getAllowedTransitions(ComplaintStatus fromState) {
        if (fromState == null) {
            return EnumSet.noneOf(ComplaintStatus.class);
        }
        
        Set<ComplaintStatus> allowed = VALID_TRANSITIONS.get(fromState);
        return allowed != null ? EnumSet.copyOf(allowed) : EnumSet.noneOf(ComplaintStatus.class);
    }
    
    /**
     * Check if the given state is a terminal state (no outgoing transitions).
     * 
     * @param state The state to check
     * @return true if this is a terminal state (CLOSED or CANCELLED)
     */
    public static boolean isTerminalState(ComplaintStatus state) {
        return state != null && TERMINAL_STATES.contains(state);
    }
    
    /**
     * Check if the given state is a valid starting state for new complaints.
     * New complaints should always start in FILED state.
     * 
     * @param state The state to check
     * @return true if this is a valid initial state
     */
    public static boolean isInitialState(ComplaintStatus state) {
        return state == ComplaintStatus.FILED;
    }
    
    /**
     * Get all terminal states in the state machine.
     * 
     * @return Immutable set of terminal states
     */
    public static Set<ComplaintStatus> getTerminalStates() {
        return EnumSet.copyOf(TERMINAL_STATES);
    }
    
    /**
     * Get a human-readable description of why a transition is invalid.
     * Useful for error messages.
     * 
     * @param fromState Current state
     * @param toState   Attempted target state
     * @return Description of why the transition is invalid
     */
    public static String getInvalidTransitionReason(ComplaintStatus fromState, ComplaintStatus toState) {
        if (fromState == null) {
            return "Current state is unknown (null)";
        }
        if (toState == null) {
            return "Target state is not specified (null)";
        }
        if (fromState == toState) {
            return String.format("Complaint is already in %s state", fromState);
        }
        if (isTerminalState(fromState)) {
            return String.format("Cannot transition from terminal state %s", fromState);
        }
        
        Set<ComplaintStatus> allowed = getAllowedTransitions(fromState);
        if (allowed.isEmpty()) {
            return String.format("No transitions are allowed from state %s", fromState);
        }
        
        return String.format(
            "Transition from %s to %s is not allowed. Valid transitions from %s: %s",
            fromState, toState, fromState, allowed
        );
    }
}
