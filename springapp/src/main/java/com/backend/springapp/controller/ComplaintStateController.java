package com.backend.springapp.controller;

import com.backend.springapp.dto.request.StateTransitionRequest;
import com.backend.springapp.dto.response.AvailableTransitionsResponse;
import com.backend.springapp.dto.response.StateTransitionResponse;
import com.backend.springapp.security.UserContext;
import com.backend.springapp.security.UserContextHolder;
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
 * - User context extracted from JWT via UserContextHolder
 * - Provides both generic and semantic endpoints for flexibility
 * 
 * AUTHENTICATION:
 * Uses JWT authentication. JwtAuthenticationFilter extracts user info
 * from Bearer token and populates UserContextHolder.
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
    
    public ComplaintStateController(ComplaintStateService complaintStateService) {
        this.complaintStateService = complaintStateService;
    }
    
    /**
     * Get current user context from JWT.
     */
    private UserContext getCurrentUserContext() {
        UserContext context = UserContextHolder.getContext();
        if (context == null) {
            throw new SecurityException("User not authenticated");
        }
        return context;
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
     * Authorization: Bearer token required
     * 
     * @param complaintId The complaint to transition
     * @param request     Contains the target state
     * @return State transition response with details
     */
    @PutMapping("/{complaintId}/state")
    public ResponseEntity<StateTransitionResponse> transitionState(
            @PathVariable Long complaintId,
            @Valid @RequestBody StateTransitionRequest request) {
        
        UserContext userContext = getCurrentUserContext();
        log.debug("State transition request: complaint={}, target={}, userId={}",
            complaintId, request.targetState(), userContext.userId());
        
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
     * Authorization: Bearer token required
     * 
     * @param complaintId The complaint to check
     * @return Available transitions response
     */
    @GetMapping("/{complaintId}/allowed-transitions")
    public ResponseEntity<AvailableTransitionsResponse> getAvailableTransitions(
            @PathVariable Long complaintId) {
        
        UserContext userContext = getCurrentUserContext();
        
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
    public ResponseEntity<StateTransitionResponse> startWork(@PathVariable Long complaintId) {
        
        log.debug("Start work request: complaint={}", complaintId);
        
        UserContext userContext = getCurrentUserContext();
        
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
    public ResponseEntity<StateTransitionResponse> resolveComplaint(@PathVariable Long complaintId) {
        
        UserContext userContext = getCurrentUserContext();
        log.debug("Resolve request: complaint={}, userId={}", complaintId, userContext.userId());
        
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
    public ResponseEntity<StateTransitionResponse> closeComplaint(@PathVariable Long complaintId) {
        
        UserContext userContext = getCurrentUserContext();
        log.debug("Close request: complaint={}, userId={}", complaintId, userContext.userId());
        
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
    public ResponseEntity<StateTransitionResponse> cancelComplaint(@PathVariable Long complaintId) {
        
        UserContext userContext = getCurrentUserContext();
        log.debug("Cancel request: complaint={}, userId={}", complaintId, userContext.userId());
        
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
}
