package com.backend.springapp.controller;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.backend.springapp.dto.request.DisputeRequest;
import com.backend.springapp.dto.response.DisputeResponse;
import com.backend.springapp.enums.UserType;
import com.backend.springapp.exception.ResourceNotFoundException;
import com.backend.springapp.model.CitizenSignoff;
import com.backend.springapp.model.User;
import com.backend.springapp.repository.UserRepository;
import com.backend.springapp.security.UserContext;
import com.backend.springapp.security.UserRole;
import com.backend.springapp.service.DisputeService;
import com.backend.springapp.service.S3StorageService;

import jakarta.validation.Valid;

/**
 * REST Controller for dispute operations.
 * 
 * ENDPOINTS:
 * - POST /api/complaints/{id}/dispute         - Submit a dispute (CITIZEN only)
 * - POST /api/complaints/{id}/dispute/{signoffId}/approve - Approve dispute (DEPT_HEAD only)
 * - POST /api/complaints/{id}/dispute/{signoffId}/reject  - Reject dispute (DEPT_HEAD only)
 * - GET  /api/disputes/pending                - Get pending disputes for department (DEPT_HEAD only)
 * 
 * WORKFLOW:
 * 1. Citizen is unhappy with resolution → calls POST /dispute
 * 2. Dept head sees pending disputes → calls GET /disputes/pending
 * 3. Dept head reviews → calls POST /{signoffId}/approve or /reject
 * 4. If approved → complaint reopens with escalated priority and stricter SLA
 */
@RestController
@RequestMapping("/api")
@Validated
public class DisputeController {
    
    private static final Logger log = LoggerFactory.getLogger(DisputeController.class);
    
    private final DisputeService disputeService;
    private final UserRepository userRepository;
    private final S3StorageService s3StorageService;
    
    public DisputeController(
            DisputeService disputeService,
            UserRepository userRepository,
            S3StorageService s3StorageService) {
        this.disputeService = disputeService;
        this.userRepository = userRepository;
        this.s3StorageService = s3StorageService;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // POST /api/complaints/{id}/dispute - Submit Dispute (CITIZEN)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Submit a dispute for a resolved complaint.
     * 
     * Accepts multipart/form-data with:
     * - image: Optional counter-proof image file
     * - disputeReason: Reason for dispute
     * - feedback: Optional additional feedback
     * 
     * AUTHORIZATION: CITIZEN who owns the complaint
     * PRECONDITION: Complaint must be in RESOLVED state
     * 
     * @param complaintId The complaint to dispute
     * @return DisputeResponse confirming submission
     */
    @PostMapping(value = "/complaints/{id}/dispute", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DisputeResponse> submitDispute(
            @PathVariable("id") Long complaintId,
            @RequestPart(value = "image", required = false) MultipartFile imageFile,
            @RequestParam(value = "disputeReason", required = true) String disputeReason,
            @RequestParam(value = "feedback", required = false) String feedback,
            @RequestHeader(value = "X-User-Id", required = true) Long userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestHeader(value = "X-User-Type", required = false) UserType userType,
            @RequestHeader(value = "X-Department-Id", required = false) Long departmentId) {
        
        log.info("Dispute submission request: complaint={}, user={}", complaintId, userId);
        
        UserContext userContext = resolveUserContext(userId, userRole, userType, departmentId);
        
        // Upload image to S3 if provided
        String s3Key = null;
        if (imageFile != null && !imageFile.isEmpty()) {
            try {
                byte[] imageBytes = imageFile.getBytes();
                String mimeType = imageFile.getContentType() != null ? imageFile.getContentType() : "image/jpeg";
                s3Key = s3StorageService.uploadImage(imageBytes, mimeType, complaintId);
                log.info("Dispute image uploaded to S3: {}", s3Key);
            } catch (Exception e) {
                log.error("Failed to upload dispute image to S3: {}", e.getMessage());
                // Continue without image - not a fatal error
            }
        }
        
        // Create request with S3 key
        DisputeRequest request = new DisputeRequest(
            s3Key,         // counterProofImageS3Key
            disputeReason, // disputeReason
            feedback       // feedback
        );
        
        DisputeResponse response = disputeService.submitDispute(
            complaintId, 
            request, 
            userContext
        );
        
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // POST /api/complaints/{id}/dispute/{signoffId}/approve - Approve Dispute (DEPT_HEAD)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Approve a pending dispute and reopen the complaint.
     * 
     * When approved:
     * - Complaint transitions to IN_PROGRESS
     * - Priority escalates (LOW→MEDIUM, MEDIUM→HIGH, etc.)
     * - SLA is recalculated with stricter deadline
     * - Escalation level resets to L0
     * 
     * AUTHORIZATION: DEPT_HEAD in the complaint's department
     * PRECONDITION: Dispute must be pending (not yet reviewed)
     * 
     * @param complaintId The complaint being disputed
     * @param signoffId   The dispute (signoff) record ID
     * @return DisputeResponse with new priority and SLA
     */
    @PostMapping("/complaints/{id}/dispute/{signoffId}/approve")
    public ResponseEntity<DisputeResponse> approveDispute(
            @PathVariable("id") Long complaintId,
            @PathVariable("signoffId") Long signoffId,
            @RequestHeader(value = "X-User-Id", required = true) Long userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestHeader(value = "X-User-Type", required = false) UserType userType,
            @RequestHeader(value = "X-Department-Id", required = false) Long departmentId) {
        
        log.info("Dispute approval request: complaint={}, signoff={}, user={}", 
            complaintId, signoffId, userId);
        
        UserContext userContext = resolveUserContext(userId, userRole, userType, departmentId);
        
        DisputeResponse response = disputeService.approveDispute(
            complaintId, 
            signoffId, 
            userContext
        );
        
        // log.info("Dispute approved: complaint={}, newPriority={}, newSLA={}", 
        //     complaintId, response.newPriority(), response.newSlaDeadline());
        
        return ResponseEntity.ok(response);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // POST /api/complaints/{id}/dispute/{signoffId}/reject - Reject Dispute (DEPT_HEAD)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Reject a pending dispute. Complaint stays RESOLVED.
     * 
     * The dept head must provide a rejection reason explaining why
     * the dispute was not accepted.
     * 
     * AUTHORIZATION: DEPT_HEAD in the complaint's department
     * 
     * @param complaintId     The complaint being disputed
     * @param signoffId       The dispute record ID
     * @param rejectionReason Why the dispute is being rejected
     * @return DisputeResponse with rejection details
     */
    @PostMapping("/complaints/{id}/dispute/{signoffId}/reject")
    public ResponseEntity<DisputeResponse> rejectDispute(
            @PathVariable("id") Long complaintId,
            @PathVariable("signoffId") Long signoffId,
            @RequestParam("reason") String rejectionReason,
            @RequestHeader(value = "X-User-Id", required = true) Long userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestHeader(value = "X-User-Type", required = false) UserType userType,
            @RequestHeader(value = "X-Department-Id", required = false) Long departmentId) {
        
        log.info("Dispute rejection request: complaint={}, signoff={}, user={}", 
            complaintId, signoffId, userId);
        
        UserContext userContext = resolveUserContext(userId, userRole, userType, departmentId);
        
        DisputeResponse response = disputeService.rejectDispute(
            complaintId, 
            signoffId, 
            rejectionReason,
            userContext
        );
        
        log.info("Dispute rejected: complaint={}, reason={}", 
            complaintId, rejectionReason);
        
        return ResponseEntity.ok(response);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // GET /api/disputes/pending - Get Pending Disputes (DEPT_HEAD)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Get all pending disputes for the DEPT_HEAD's department.
     * 
     * Returns disputes that are awaiting review (disputeApproved=null).
     * Sorted by submission time (oldest first - FIFO).
     * 
     * AUTHORIZATION: DEPT_HEAD only
     * 
     * @return List of pending dispute signoffs
     */
    @GetMapping("/disputes/pending")
    public ResponseEntity<List<CitizenSignoff>> getPendingDisputes(
            @RequestHeader(value = "X-User-Id", required = true) Long userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestHeader(value = "X-User-Type", required = false) UserType userType,
            @RequestHeader(value = "X-Department-Id", required = false) Long departmentId) {
        
        log.info("Pending disputes request: user={}", userId);
        
        UserContext userContext = resolveUserContext(userId, userRole, userType, departmentId);
        
        List<CitizenSignoff> disputes = disputeService.getPendingDisputesForDepartment(
            userContext.departmentId(),
            userContext
        );
        
        log.info("Found {} pending disputes for department {}", 
            disputes.size(), userContext.departmentId());
        
        return ResponseEntity.ok(disputes);
    }
    
    // ==================== HELPER METHODS ====================
    
    /**
     * Resolve UserContext from request headers or database.
     */
    private UserContext resolveUserContext(
            Long userId, 
            String userRole, 
            UserType userType,
            Long departmentId) {
        
        // If we have a user ID, fetch from database for accurate role/dept
        if (userId != null) {
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
            
            UserRole role = UserRole.fromUserType(user.getUserType());
            return new UserContext(userId, role, user.getDeptId());
        }
        
        // Fallback to headers
        UserRole role = resolveRole(userRole, userType);
        return new UserContext(userId, role, departmentId);
    }
    
    private UserRole resolveRole(String userRole, UserType userType) {
        if (userRole != null && !userRole.isEmpty()) {
            try {
                return UserRole.valueOf(userRole.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid user role from header: {}", userRole);
            }
        }
        
        if (userType != null) {
            return UserRole.fromUserType(userType);
        }
        
        log.warn("No user role provided, defaulting to CITIZEN");
        return UserRole.CITIZEN;
    }
}
