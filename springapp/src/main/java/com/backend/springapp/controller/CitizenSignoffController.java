package com.backend.springapp.controller;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.backend.springapp.dto.request.CitizenSignoffRequest;
import com.backend.springapp.dto.response.CitizenSignoffResponse;
import com.backend.springapp.security.UserContext;
import com.backend.springapp.security.UserContextHolder;
import com.backend.springapp.service.CitizenSignoffService;

import jakarta.validation.Valid;

/**
 * REST Controller for citizen signoff management.
 * 
 * ENDPOINTS:
 * - POST /api/complaints/{id}/signoff - Submit signoff (CITIZEN only, must own complaint)
 * - GET  /api/complaints/{id}/signoffs - Get all signoffs for complaint
 * 
 * DESIGN:
 * - Thin controller - all business logic in CitizenSignoffService
 * - Uses JWT authentication via UserContextHolder
 * - This is the ONLY path for citizens to close their complaints
 * 
 * DOMAIN RULES ENFORCED:
 * 1. ONLY the citizen who filed the complaint can sign off
 * 2. Complaint must be in RESOLVED state
 * 3. If accepted → complaint transitions to CLOSED
 * 4. If rejected → complaint stays RESOLVED (staff must re-address)
 * 
 * NO OTHER ROLE CAN CLOSE COMPLAINTS.
 * This ensures citizen empowerment - they decide when a resolution is acceptable.
 */
@RestController
@RequestMapping("/api/complaints")
public class CitizenSignoffController {
    
    private static final Logger log = LoggerFactory.getLogger(CitizenSignoffController.class);
    
    private final CitizenSignoffService citizenSignoffService;
    
    public CitizenSignoffController(CitizenSignoffService citizenSignoffService) {
        this.citizenSignoffService = citizenSignoffService;
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
    
    /**
     * Submit citizen signoff for a resolved complaint.
     * 
     * POST /api/complaints/{complaintId}/signoff
     * 
     * WHO CAN CALL: CITIZEN only (must be the owner of the complaint)
     * PRECONDITION: Complaint must be in RESOLVED state
     * 
     * REQUEST BODY:
     * - isAccepted: true/false (REQUIRED)
     * - rating: 1-5 (REQUIRED if isAccepted=true)
     * - feedback: optional text
     * - disputeReason: (REQUIRED if isAccepted=false)
     * - disputeImageS3Key: optional evidence image
     * 
     * OUTCOME:
     * - If isAccepted=true: Complaint transitions to CLOSED
     * - If isAccepted=false: Complaint stays RESOLVED, dispute recorded
     */
    @PostMapping("/{complaintId}/signoff")
    public ResponseEntity<CitizenSignoffResponse> signoff(
            @PathVariable Long complaintId,
            @Valid @RequestBody CitizenSignoffRequest request) {
        
        UserContext userContext = getCurrentUserContext();
        log.info("Citizen signoff: complaint={}, citizen={}, accepted={}", 
            complaintId, userContext.userId(), request.isAccepted());
        
        CitizenSignoffResponse response = citizenSignoffService.processSignoff(
            complaintId, request, userContext
        );
        
        // 201 for both acceptance and dispute (we created a signoff record)
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    
    /**
     * Get all signoffs for a complaint.
     * 
     * GET /api/complaints/{complaintId}/signoffs
     * 
     * WHO CAN CALL: Any authenticated user (read-only)
     * 
     * Returns signoff history including disputes.
     */
    @GetMapping("/{complaintId}/signoffs")
    public ResponseEntity<List<CitizenSignoffResponse>> getSignoffs(
            @PathVariable Long complaintId) {
        
        List<CitizenSignoffResponse> signoffs = citizenSignoffService.getSignoffsForComplaint(complaintId);
        
        return ResponseEntity.ok(signoffs);
    }
    
    /**
     * Check if citizen has accepted the resolution.
     * 
     * GET /api/complaints/{complaintId}/has-signoff
     * 
     * Utility endpoint for frontend to check signoff status.
     */
    @GetMapping("/{complaintId}/has-signoff")
    public ResponseEntity<Boolean> hasSignoff(@PathVariable Long complaintId) {
        return ResponseEntity.ok(citizenSignoffService.hasAcceptedSignoff(complaintId));
    }
}
