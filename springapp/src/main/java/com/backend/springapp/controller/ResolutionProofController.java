package com.backend.springapp.controller;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.backend.springapp.dto.request.ResolutionProofRequest;
import com.backend.springapp.dto.response.ResolutionProofResponse;
import com.backend.springapp.enums.UserType;
import com.backend.springapp.exception.ResourceNotFoundException;
import com.backend.springapp.model.User;
import com.backend.springapp.repository.UserRepository;
import com.backend.springapp.security.UserContext;
import com.backend.springapp.security.UserRole;
import com.backend.springapp.service.ResolutionProofService;
import com.backend.springapp.service.S3StorageService;

/**
 * REST Controller for resolution proof management.
 * 
 * ENDPOINTS:
 * - POST /api/complaints/{id}/resolution-proof - Submit proof (STAFF/DEPT_HEAD only)
 * - GET  /api/complaints/{id}/resolution-proofs - Get all proofs for complaint
 * - PUT  /api/complaints/{id}/resolution-proof/{proofId}/verify - Verify proof (DEPT_HEAD only)
 * 
 * DESIGN:
 * - Thin controller - all business logic in ResolutionProofService
 * - Uses header-based auth (will migrate to JWT later)
 * - Clear separation from state transition endpoints
 * 
 * DOMAIN RULE ENFORCED:
 * Staff MUST submit at least one ResolutionProof before they can
 * transition a complaint from IN_PROGRESS to RESOLVED.
 */
@RestController
@RequestMapping("/api/complaints")
public class ResolutionProofController {
    
    private static final Logger log = LoggerFactory.getLogger(ResolutionProofController.class);
    
    private final ResolutionProofService resolutionProofService;
    private final UserRepository userRepository;
    private final S3StorageService s3StorageService;
    
    public ResolutionProofController(
            ResolutionProofService resolutionProofService,
            UserRepository userRepository,
            S3StorageService s3StorageService) {
        this.resolutionProofService = resolutionProofService;
        this.userRepository = userRepository;
        this.s3StorageService = s3StorageService;
    }
    
    /**
     * Submit resolution proof for a complaint.
     * 
     * POST /api/complaints/{complaintId}/resolution-proof
     * 
     * Accepts multipart/form-data with:
     * - image: The proof image file
     * - description: Text description of the resolution work
     * 
     * WHO CAN CALL: STAFF, DEPT_HEAD (must be from same department as complaint)
     * PRECONDITION: Complaint must be in IN_PROGRESS state
     * 
     * After successful submission, staff can call PUT /api/complaints/{id}/resolve
     */
    @PostMapping(value = "/{complaintId}/resolution-proof", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ResolutionProofResponse> submitProof(
            @PathVariable Long complaintId,
            @RequestPart(value = "image", required = false) MultipartFile imageFile,
            @RequestParam(value = "description", required = true) String description,
            @RequestHeader(value = "X-User-Id", required = true) Long userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestHeader(value = "X-User-Type", required = false) UserType userType,
            @RequestHeader(value = "X-Department-Id", required = false) Long departmentId) {
        
        log.info("Resolution proof submission: complaint={}, user={}", complaintId, userId);
        
        UserContext userContext = resolveUserContext(userId, userRole, userType, departmentId);
        
        // Upload image to S3 if provided
        String s3Key = null;
        if (imageFile != null && !imageFile.isEmpty()) {
            try {
                byte[] imageBytes = imageFile.getBytes();
                String mimeType = imageFile.getContentType() != null ? imageFile.getContentType() : "image/jpeg";
                s3Key = s3StorageService.uploadImage(imageBytes, mimeType, complaintId);
                log.info("Image uploaded to S3: {}", s3Key);
            } catch (Exception e) {
                log.error("Failed to upload image to S3: {}", e.getMessage());
                // Continue without image - not a fatal error
            }
        }
        
        // Create request with S3 key
        ResolutionProofRequest request = new ResolutionProofRequest(
            s3Key,      // proofImageS3Key
            null,       // latitude (optional, can be added later)
            null,       // longitude (optional)
            null,       // capturedAt (will default to now)
            description // remarks
        );
        
        ResolutionProofResponse response = resolutionProofService.submitProof(
            complaintId, request, userContext
        );
        
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    
    /**
     * Get all proofs for a complaint.
     * 
     * GET /api/complaints/{complaintId}/resolution-proofs
     * 
     * WHO CAN CALL: Any authenticated user (read-only)
     */
    @GetMapping("/{complaintId}/resolution-proofs")
    public ResponseEntity<List<ResolutionProofResponse>> getProofs(
            @PathVariable Long complaintId) {
        
        List<ResolutionProofResponse> proofs = resolutionProofService.getProofsForComplaint(complaintId);
        
        return ResponseEntity.ok(proofs);
    }
    
    /**
     * Verify a resolution proof (supervisor action).
     * 
     * PUT /api/complaints/{complaintId}/resolution-proof/{proofId}/verify
     * 
     * WHO CAN CALL: DEPT_HEAD only (must be from same department)
     */
    @PutMapping("/{complaintId}/resolution-proof/{proofId}/verify")
    public ResponseEntity<ResolutionProofResponse> verifyProof(
            @PathVariable Long complaintId,
            @PathVariable Long proofId,
            @RequestHeader(value = "X-User-Id", required = true) Long userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestHeader(value = "X-User-Type", required = false) UserType userType,
            @RequestHeader(value = "X-Department-Id", required = false) Long departmentId) {
        
        log.info("Resolution proof verification: proof={}, by={}", proofId, userId);
        
        UserContext userContext = resolveUserContext(userId, userRole, userType, departmentId);
        
        ResolutionProofResponse response = resolutionProofService.verifyProof(proofId, userContext);
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Check if resolution proof exists for a complaint.
     * 
     * GET /api/complaints/{complaintId}/has-proof
     * 
     * Utility endpoint for frontend to check if resolve button should be enabled.
     */
    @GetMapping("/{complaintId}/has-proof")
    public ResponseEntity<Boolean> hasProof(@PathVariable Long complaintId) {
        return ResponseEntity.ok(resolutionProofService.hasProof(complaintId));
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
