package com.backend.springapp.service;

import java.time.LocalDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.backend.springapp.audit.AuditActorContext;
import com.backend.springapp.audit.AuditService;
import com.backend.springapp.dto.request.ResolutionProofRequest;
import com.backend.springapp.dto.response.ResolutionProofResponse;
import com.backend.springapp.enums.ComplaintStatus;
import com.backend.springapp.exception.DepartmentMismatchException;
import com.backend.springapp.exception.InvalidStateTransitionException;
import com.backend.springapp.exception.ResourceNotFoundException;
import com.backend.springapp.exception.UnauthorizedStateTransitionException;
import com.backend.springapp.model.Complaint;
import com.backend.springapp.model.ResolutionProof;
import com.backend.springapp.notification.NotificationService;
import com.backend.springapp.repository.ComplaintRepository;
import com.backend.springapp.repository.ResolutionProofRepository;
import com.backend.springapp.security.UserContext;
import com.backend.springapp.security.UserRole;

/**
 * Service for managing resolution proofs.
 * 
 * DOMAIN RULES ENFORCED:
 * 1. ONLY STAFF (or DEPT_HEAD) can submit resolution proofs
 * 2. Staff must belong to the SAME DEPARTMENT as the complaint
 * 3. Complaint must be IN_PROGRESS (not FILED, not already RESOLVED)
 * 4. Proof is initially unverified (isVerified = false)
 * 
 * WHY this service is separate from ComplaintService:
 * - Single Responsibility: Manages proof lifecycle only
 * - Clean separation: Resolution proof != Resolution state change
 * - Future extensibility: Proof verification workflow can evolve independently
 */
@Service
@Transactional
public class ResolutionProofService {
    
    private static final Logger log = LoggerFactory.getLogger(ResolutionProofService.class);
    
    private final ResolutionProofRepository resolutionProofRepository;
    private final ComplaintRepository complaintRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final S3StorageService s3StorageService;
    
    public ResolutionProofService(
            ResolutionProofRepository resolutionProofRepository,
            ComplaintRepository complaintRepository,
            AuditService auditService,
            NotificationService notificationService,
            S3StorageService s3StorageService) {
        this.resolutionProofRepository = resolutionProofRepository;
        this.complaintRepository = complaintRepository;
        this.auditService = auditService;
        this.notificationService = notificationService;
        this.s3StorageService = s3StorageService;
    }
    
    /**
     * Submit resolution proof for a complaint.
     * 
     * VALIDATION ORDER:
     * 1. Complaint exists
     * 2. User is STAFF or DEPT_HEAD (role check)
     * 3. User belongs to same department as complaint
     * 4. Complaint is in IN_PROGRESS state
     * 
     * @param complaintId The complaint to submit proof for
     * @param request     The proof details
     * @param userContext The staff member submitting proof
     * @return Response with created proof details
     */
    public ResolutionProofResponse submitProof(
            Long complaintId,
            ResolutionProofRequest request,
            UserContext userContext) {
        
        log.info("Resolution proof submission: complaint={}, staff={}", 
            complaintId, userContext.userId());
        
        // ========== STEP 1: Load and validate complaint exists ==========
        Complaint complaint = complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Complaint not found with id: " + complaintId
            ));
        
        // ========== STEP 2: Validate user role (STAFF or DEPT_HEAD only) ==========
        // WHY: Only operational staff who work on complaints can submit proof
        UserRole role = userContext.role();
        if (role != UserRole.STAFF && role != UserRole.DEPT_HEAD) {
            log.warn("Unauthorized proof submission attempt by role: {}", role);
            throw new UnauthorizedStateTransitionException(
                complaintId,
                complaint.getStatus(),
                ComplaintStatus.RESOLVED, // Target state they're trying to enable
                role,
                java.util.EnumSet.of(UserRole.STAFF, UserRole.DEPT_HEAD),
                "Only STAFF or DEPT_HEAD can submit resolution proofs"
            );
        }
        
        // ========== STEP 3: Validate department membership ==========
        // WHY: Staff can only submit proof for complaints in their department
        // This prevents cross-department interference
        if (!userContext.isInDepartment(complaint.getDepartmentId())) {
            log.warn("Department mismatch: staff dept={}, complaint dept={}", 
                userContext.departmentId(), complaint.getDepartmentId());
            throw new DepartmentMismatchException(
                complaintId,
                userContext.departmentId(),
                complaint.getDepartmentId()
            );
        }
        
        // ========== STEP 4: Validate complaint is IN_PROGRESS ==========
        // WHY: Proof only makes sense for active complaints being worked on
        // Cannot submit proof for FILED (not started) or RESOLVED (already done)
        if (complaint.getStatus() != ComplaintStatus.IN_PROGRESS) {
            log.warn("Invalid state for proof submission: {}", complaint.getStatus());
            throw new InvalidStateTransitionException(
                complaintId,
                complaint.getStatus(),
                ComplaintStatus.RESOLVED,
                "Resolution proof can only be submitted for complaints in IN_PROGRESS state. " +
                "Current state: " + complaint.getStatus()
            );
        }
        
        // ========== STEP 5: Create the proof record ==========
        ResolutionProof proof = ResolutionProof.builder()
            .complaintId(complaintId)
            .staffId(userContext.userId())
            .proofImageS3Key(request.proofImageS3Key())
            .latitude(request.latitude())
            .longitude(request.longitude())
            .capturedAt(request.capturedAt() != null ? request.capturedAt() : LocalDateTime.now())
            .remarks(request.remarks())
            .isVerified(false) // Always start unverified - supervisor can verify later
            .build();
        
        ResolutionProof saved = resolutionProofRepository.save(proof);
        
        log.info("Resolution proof saved: id={}, complaint={}", saved.getId(), complaintId);
        
        // ========== STEP 6: Audit the proof submission ==========
        auditService.recordGenericAction(
            "RESOLUTION_PROOF",
            saved.getId(),
            "CREATE",
            null,
            String.format("Proof submitted for complaint #%d: %s", complaintId, request.remarks()),
            AuditActorContext.fromUserContext(userContext),
            "Resolution proof submitted by staff"
        );
        
        // ========== STEP 7: Notify citizen that work has been done ==========
        notificationService.notifyGeneric(
            complaint.getCitizenId(),
            complaintId,
            "RESOLUTION_PROGRESS",
            "Update on Complaint #" + complaintId,
            "Work has been completed on your complaint. Staff has submitted proof of resolution."
        );
        
        return ResolutionProofResponse.from(saved);
    }
    
    /**
     * Get all proofs for a complaint.
     * Read-only operation, no authorization checks (anyone can view proofs).
     * Generates presigned URLs for proof images.
     */
    @Transactional(readOnly = true)
    public List<ResolutionProofResponse> getProofsForComplaint(Long complaintId) {
        if (!complaintRepository.existsById(complaintId)) {
            throw new ResourceNotFoundException("Complaint not found with id: " + complaintId);
        }
        
        return resolutionProofRepository.findByComplaintId(complaintId).stream()
            .map(proof -> {
                String proofImageUrl = null;
                if (proof.getProofImageS3Key() != null && !proof.getProofImageS3Key().isEmpty()) {
                    proofImageUrl = s3StorageService.getPresignedUrl(proof.getProofImageS3Key());
                }
                return ResolutionProofResponse.from(proof, null, proofImageUrl);
            })
            .toList();
    }
    
    /**
     * Check if resolution proof exists for a complaint.
     * 
     * THIS IS THE KEY METHOD used by StateTransitionService guard logic.
     * 
     * @param complaintId The complaint to check
     * @return true if at least one proof exists
     */
    @Transactional(readOnly = true)
    public boolean hasProof(Long complaintId) {
        return resolutionProofRepository.existsByComplaintId(complaintId);
    }
    
    /**
     * Verify a resolution proof (supervisor action).
     * Only DEPT_HEAD can verify proofs from their department.
     */
    public ResolutionProofResponse verifyProof(Long proofId, UserContext userContext) {
        ResolutionProof proof = resolutionProofRepository.findById(proofId)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Resolution proof not found with id: " + proofId
            ));
        
        // Only DEPT_HEAD can verify
        if (userContext.role() != UserRole.DEPT_HEAD) {
            throw new UnauthorizedStateTransitionException(
                proof.getComplaintId(),
                ComplaintStatus.IN_PROGRESS,
                ComplaintStatus.RESOLVED,
                userContext.role(),
                java.util.EnumSet.of(UserRole.DEPT_HEAD),
                "Only DEPT_HEAD can verify resolution proofs"
            );
        }
        
        // Must be same department
        Complaint complaint = complaintRepository.findById(proof.getComplaintId())
            .orElseThrow(() -> new ResourceNotFoundException(
                "Complaint not found with id: " + proof.getComplaintId()
            ));
        
        if (!userContext.isInDepartment(complaint.getDepartmentId())) {
            throw new DepartmentMismatchException(
                proof.getComplaintId(),
                userContext.departmentId(),
                complaint.getDepartmentId()
            );
        }
        
        proof.setIsVerified(true);
        ResolutionProof saved = resolutionProofRepository.save(proof);
        
        log.info("Resolution proof verified: id={}, by={}", proofId, userContext.userId());
        
        return ResolutionProofResponse.from(saved, "Proof verified successfully");
    }
}
