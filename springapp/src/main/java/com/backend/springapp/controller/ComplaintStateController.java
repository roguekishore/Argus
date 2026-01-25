package com.backend.springapp.controller;

import com.backend.springapp.dto.request.StateTransitionRequest;
import com.backend.springapp.dto.response.AvailableTransitionsResponse;
import com.backend.springapp.dto.response.StateTransitionResponse;
import com.backend.springapp.enums.ComplaintStatus;
import com.backend.springapp.enums.UserType;
import com.backend.springapp.exception.ResourceNotFoundException;
import com.backend.springapp.model.User;
import com.backend.springapp.repository.UserRepository;
import com.backend.springapp.security.UserContext;
import com.backend.springapp.security.UserRole;
import com.backend.springapp.service.ComplaintStateService;

import jakarta.validation.Valid;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller for complaint state transitions.
 * 
 * DESIGN PRINCIPLES:
 * - Controllers are THIN - no business logic
 * - All work delegated to ComplaintStateService
 * - User context resolved here (will be from JWT later)
 * - Provides both generic and semantic endpoints for flexibility
 * 
 * AUTHENTICATION NOTE (IMPORTANT):
 * Currently uses header-based mock authentication.
 * When migrating to JWT/Spring Security:
 * 1. Remove the header parsing code
 * 2. Extract UserContext from SecurityContextHolder
 * 3. NO changes needed in services or state machine
 * 
 * ENDPOINTS:
 * - PUT  /api/complaints/{id}/state              - Generic state transition
 * - GET  /api/complaints/{id}/allowed-transitions - Get available transitions for UI
 * - PUT  /api/complaints/{id}/start              - Start work (semantic)
 * - PUT  /api/complaints/{id}/resolve            - Resolve (semantic)
 * - PUT  /api/complaints/{id}/close              - Close (semantic)
 * - PUT  /api/complaints/{id}/cancel             - Cancel (semantic)
 */
@RestController
@RequestMapping("/api/complaints")
public class ComplaintStateController {
    
    private static final Logger log = LoggerFactory.getLogger(ComplaintStateController.class);
    
    private final ComplaintStateService complaintStateService;
    private final UserRepository userRepository;
    
    public ComplaintStateController(
            ComplaintStateService complaintStateService,
            UserRepository userRepository) {
        this.complaintStateService = complaintStateService;
        this.userRepository = userRepository;
    }
    
    // ==================== GENERIC STATE TRANSITION ====================
    
    /**
     * Transition complaint to a new state.
     * 
     * This is the primary endpoint for state transitions.
     * Validates the transition against state machine rules and RBAC policy.
     * 
     * PUT /api/complaints/{complaintId}/state
     * Body: { "targetState": "RESOLVED" }
     * Headers: X-User-Id, X-User-Role (or X-User-Type), X-Department-Id
     * 
     * @param complaintId The complaint to transition
     * @param request     Contains the target state
     * @param userId      Mock header for user ID (will be from JWT later)
     * @param userRole    Mock header for user role (will be from JWT later)
     * @param userType    Alternative header using UserType enum
     * @param departmentId Mock header for department ID (will be from JWT later)
     * @return State transition response with details
     */
    @PutMapping("/{complaintId}/state")
    public ResponseEntity<StateTransitionResponse> transitionState(
            @PathVariable Long complaintId,
            @Valid @RequestBody StateTransitionRequest request,
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestHeader(value = "X-User-Type", required = false) UserType userType,
            @RequestHeader(value = "X-Department-Id", required = false) Long departmentId) {
        
        log.debug("State transition request: complaint={}, target={}, userId={}",
            complaintId, request.targetState(), userId);
        
        UserContext userContext = resolveUserContext(userId, userRole, userType, departmentId);
        
        StateTransitionResponse response = complaintStateService.transitionState(
            complaintId,
            request.targetState(),
            userContext
        );
        
        return ResponseEntity.ok(response);
    }
    
    // ==================== AVAILABLE TRANSITIONS (FOR UI) ====================
    
    /**
     * Get available state transitions for a complaint.
     * 
     * Used by the UI to determine which buttons/actions to show.
     * Returns only transitions the current user is authorized to perform.
     * 
     * GET /api/complaints/{complaintId}/allowed-transitions
     * Headers: X-User-Id, X-User-Role (or X-User-Type), X-Department-Id
     * 
     * @param complaintId The complaint to check
     * @return Available transitions response
     */
    @GetMapping("/{complaintId}/allowed-transitions")
    public ResponseEntity<AvailableTransitionsResponse> getAvailableTransitions(
            @PathVariable Long complaintId,
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestHeader(value = "X-User-Type", required = false) UserType userType,
            @RequestHeader(value = "X-Department-Id", required = false) Long departmentId) {
        
        UserContext userContext = resolveUserContext(userId, userRole, userType, departmentId);
        
        var stateInfo = complaintStateService.getComplaintStateInfo(complaintId, userContext);
        
        return ResponseEntity.ok(AvailableTransitionsResponse.from(stateInfo));
    }
    
    // ==================== SEMANTIC ENDPOINTS ====================
    // These provide meaningful names for common transitions.
    // They delegate to the same underlying service.
    // UI can use either the generic endpoint or these specific ones.
    
    /**
     * Start work on a complaint (FILED → IN_PROGRESS).
     * 
     * Only SYSTEM (AI/workflow) can perform this transition.
     * This is typically called by the AI service after analyzing the complaint.
     * 
     * PUT /api/complaints/{complaintId}/start
     */
    @PutMapping("/{complaintId}/start")
    public ResponseEntity<StateTransitionResponse> startWork(
            @PathVariable Long complaintId,
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestHeader(value = "X-User-Type", required = false) UserType userType,
            @RequestHeader(value = "X-Department-Id", required = false) Long departmentId) {
        
        log.debug("Start work request: complaint={}", complaintId);
        
        UserContext userContext = resolveUserContext(userId, userRole, userType, departmentId);
        
        StateTransitionResponse response = complaintStateService.startWork(complaintId, userContext);
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Resolve a complaint (IN_PROGRESS → RESOLVED).
     * 
     * Only STAFF and DEPT_HEAD can perform this transition.
     * The user must belong to the same department as the complaint.
     * 
     * PUT /api/complaints/{complaintId}/resolve
     */
    @PutMapping("/{complaintId}/resolve")
    public ResponseEntity<StateTransitionResponse> resolveComplaint(
            @PathVariable Long complaintId,
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestHeader(value = "X-User-Type", required = false) UserType userType,
            @RequestHeader(value = "X-Department-Id", required = false) Long departmentId) {
        
        log.debug("Resolve request: complaint={}, userId={}", complaintId, userId);
        
        UserContext userContext = resolveUserContext(userId, userRole, userType, departmentId);
        
        StateTransitionResponse response = complaintStateService.resolve(complaintId, userContext);
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Close a complaint (RESOLVED → CLOSED).
     * 
     * Only CITIZEN (owner) and SYSTEM (auto-close) can perform this transition.
     * Citizens can only close their own complaints.
     * 
     * PUT /api/complaints/{complaintId}/close
     */
    @PutMapping("/{complaintId}/close")
    public ResponseEntity<StateTransitionResponse> closeComplaint(
            @PathVariable Long complaintId,
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestHeader(value = "X-User-Type", required = false) UserType userType,
            @RequestHeader(value = "X-Department-Id", required = false) Long departmentId) {
        
        log.debug("Close request: complaint={}, userId={}", complaintId, userId);
        
        UserContext userContext = resolveUserContext(userId, userRole, userType, departmentId);
        
        StateTransitionResponse response = complaintStateService.close(complaintId, userContext);
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Cancel a complaint (any non-terminal state → CANCELLED).
     * 
     * Only CITIZEN (owner) and ADMIN can perform this transition.
     * Citizens can only cancel their own complaints.
     * 
     * PUT /api/complaints/{complaintId}/cancel
     */
    @PutMapping("/{complaintId}/cancel")
    public ResponseEntity<StateTransitionResponse> cancelComplaint(
            @PathVariable Long complaintId,
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestHeader(value = "X-User-Type", required = false) UserType userType,
            @RequestHeader(value = "X-Department-Id", required = false) Long departmentId) {
        
        log.debug("Cancel request: complaint={}, userId={}", complaintId, userId);
        
        UserContext userContext = resolveUserContext(userId, userRole, userType, departmentId);
        
        StateTransitionResponse response = complaintStateService.cancel(complaintId, userContext);
        
        return ResponseEntity.ok(response);
    }
    
    // ==================== SYSTEM ENDPOINT FOR AI ====================
    
    /**
     * Start work endpoint specifically for AI/System calls.
     * 
     * This endpoint doesn't require user headers - it creates a SYSTEM context.
     * Use this when the AI service processes a complaint and needs to transition
     * it from FILED to IN_PROGRESS.
     * 
     * PUT /api/complaints/{complaintId}/system/start
     */
    @PutMapping("/{complaintId}/system/start")
    public ResponseEntity<StateTransitionResponse> systemStartWork(@PathVariable Long complaintId) {
        
        log.info("System start work request: complaint={}", complaintId);
        
        // SYSTEM context - no user authentication needed
        UserContext systemContext = UserContext.system();
        
        StateTransitionResponse response = complaintStateService.startWork(complaintId, systemContext);
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Auto-close endpoint for scheduled jobs or system processes.
     * 
     * Used to auto-close complaints after timeout period.
     * 
     * PUT /api/complaints/{complaintId}/system/close
     */
    @PutMapping("/{complaintId}/system/close")
    public ResponseEntity<StateTransitionResponse> systemClose(@PathVariable Long complaintId) {
        
        log.info("System auto-close request: complaint={}", complaintId);
        
        // SYSTEM context - no user authentication needed
        UserContext systemContext = UserContext.system();
        
        StateTransitionResponse response = complaintStateService.close(complaintId, systemContext);
        
        return ResponseEntity.ok(response);
    }
    
    // ==================== HELPER METHODS ====================
    
    /**
     * Resolve UserContext from request headers or database.
     * 
     * MIGRATION NOTE:
     * When switching to JWT/Spring Security, replace this method with:
     * 
     *   Authentication auth = SecurityContextHolder.getContext().getAuthentication();
     *   // Extract UserContext from JWT claims or Principal
     * 
     * This is the ONLY place that needs to change for auth migration.
     * 
     * @param userId       From X-User-Id header
     * @param userRole     From X-User-Role header (string like "STAFF", "CITIZEN")
     * @param userType     From X-User-Type header (UserType enum)
     * @param departmentId From X-Department-Id header
     * @return UserContext for the current request
     */
    private UserContext resolveUserContext(
            Long userId, 
            String userRole, 
            UserType userType,
            Long departmentId) {
        
        // Priority 1: If X-User-Role is "SYSTEM", create system context
        if ("SYSTEM".equalsIgnoreCase(userRole)) {
            return UserContext.system();
        }
        
        // Priority 2: If we have a user ID, fetch from database
        if (userId != null) {
            return resolveFromDatabase(userId);
        }
        
        // Priority 3: Use headers directly
        UserRole role = resolveRole(userRole, userType);
        
        return new UserContext(userId, role, departmentId);
    }
    
    /**
     * Resolve UserContext by fetching user from database.
     * This ensures we get accurate role and department information.
     */
    private UserContext resolveFromDatabase(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        
        UserRole role = UserRole.fromUserType(user.getUserType());
        
        return new UserContext(userId, role, user.getDeptId());
    }
    
    /**
     * Resolve UserRole from header values.
     */
    private UserRole resolveRole(String userRole, UserType userType) {
        // Try string role first
        if (userRole != null && !userRole.isEmpty()) {
            try {
                return UserRole.valueOf(userRole.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid user role from header: {}", userRole);
            }
        }
        
        // Try UserType enum
        if (userType != null) {
            return UserRole.fromUserType(userType);
        }
        
        // Default - should not happen in production
        log.warn("No user role provided in request headers, defaulting to CITIZEN");
        return UserRole.CITIZEN;
    }
}
