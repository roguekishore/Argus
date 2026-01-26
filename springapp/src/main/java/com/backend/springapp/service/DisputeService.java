package com.backend.springapp.service;

import java.time.LocalDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.backend.springapp.audit.AuditActorContext;
import com.backend.springapp.audit.AuditService;
import com.backend.springapp.dto.request.DisputeRequest;
import com.backend.springapp.dto.response.DisputeResponse;
import com.backend.springapp.enums.ComplaintStatus;
import com.backend.springapp.enums.Priority;
import com.backend.springapp.exception.ComplaintOwnershipException;
import com.backend.springapp.exception.DepartmentMismatchException;
import com.backend.springapp.exception.DuplicateDisputeException;
import com.backend.springapp.exception.InvalidDisputeStateException;
import com.backend.springapp.exception.ResourceNotFoundException;
import com.backend.springapp.exception.UnauthorizedStateTransitionException;
import com.backend.springapp.model.CitizenSignoff;
import com.backend.springapp.model.Complaint;
import com.backend.springapp.model.SLA;
import com.backend.springapp.notification.NotificationService;
import com.backend.springapp.notification.NotificationType;
import com.backend.springapp.repository.CitizenSignoffRepository;
import com.backend.springapp.repository.ComplaintRepository;
import com.backend.springapp.repository.ResolutionProofRepository;
import com.backend.springapp.repository.SLARepository;
import com.backend.springapp.security.UserContext;
import com.backend.springapp.security.UserRole;

/**
 * Service for managing complaint disputes and reopening.
 * 
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  DISPUTE WORKFLOW                                                            ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  1. CITIZEN files dispute on RESOLVED complaint                              ║
 * ║     - Provides counter-proof image                                           ║
 * ║     - Provides dispute reason                                                ║
 * ║     - Creates CitizenSignoff with isAccepted=false                           ║
 * ║                                                                              ║
 * ║  2. DEPT_HEAD reviews dispute                                                ║
 * ║     - Can APPROVE: reopens complaint to IN_PROGRESS                          ║
 * ║       - Priority escalates (MEDIUM→HIGH, HIGH→CRITICAL)                      ║
 * ║       - SLA recalculated with stricter deadline                              ║
 * ║       - EscalationLevel resets to L0                                         ║
 * ║     - Can REJECT: complaint stays RESOLVED                                   ║
 * ║       - Rejection reason recorded                                            ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * KEY DESIGN DECISIONS:
 * - We do NOT add new states (DISPUTED). We use existing RESOLVED state
 *   with CitizenSignoff.disputeApproved to track dispute review status.
 * - Priority can only go UP on reopen (never down) - accountability principle
 * - SLA is recalculated from NOW with stricter deadline (not from original)
 */
@Service
@Transactional
public class DisputeService {
    
    private static final Logger log = LoggerFactory.getLogger(DisputeService.class);
    
    /**
     * SLA multiplier for reopened complaints.
     * Reopened complaints get tighter deadlines (e.g., 0.75 = 75% of original SLA days).
     */
    private static final double REOPEN_SLA_MULTIPLIER = 0.75;
    
    /**
     * Minimum SLA days for reopened complaints.
     * Even if calculated SLA would be less, we never go below this.
     */
    private static final int MIN_REOPEN_SLA_DAYS = 1;
    
    private final CitizenSignoffRepository citizenSignoffRepository;
    private final ComplaintRepository complaintRepository;
    private final SLARepository slaRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final ResolutionProofRepository resolutionProofRepository;
    
    public DisputeService(
            CitizenSignoffRepository citizenSignoffRepository,
            ComplaintRepository complaintRepository,
            SLARepository slaRepository,
            AuditService auditService,
            NotificationService notificationService,
            ResolutionProofRepository resolutionProofRepository) {
        this.citizenSignoffRepository = citizenSignoffRepository;
        this.complaintRepository = complaintRepository;
        this.slaRepository = slaRepository;
        this.auditService = auditService;
        this.notificationService = notificationService;
        this.resolutionProofRepository = resolutionProofRepository;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC API: Submit Dispute
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Submit a dispute for a resolved complaint.
     * 
     * VALIDATION:
     * 1. Complaint exists and is in RESOLVED state
     * 2. User is CITIZEN and owns the complaint
     * 3. No pending dispute already exists
     * 
     * EFFECT:
     * - Creates CitizenSignoff with isAccepted=false
     * - Stores counter-proof image S3 key
     * - Complaint stays RESOLVED (pending DEPT_HEAD review)
     * 
     * @param complaintId The resolved complaint to dispute
     * @param request     Dispute details (counter-proof, reason)
     * @param userContext The citizen filing the dispute
     * @return DisputeResponse with submission confirmation
     */
    public DisputeResponse submitDispute(
            Long complaintId,
            DisputeRequest request,
            UserContext userContext) {
        
        log.info("Dispute submission: complaint={}, citizen={}", 
            complaintId, userContext.userId());
        
        // ========== STEP 1: Load and validate complaint ==========
        Complaint complaint = loadAndValidateComplaint(complaintId, ComplaintStatus.RESOLVED);
        
        // ========== STEP 2: Validate user is CITIZEN ==========
        validateCitizenRole(userContext, complaintId);
        
        // ========== STEP 3: Validate ownership ==========
        validateOwnership(userContext, complaint);
        
        // ========== STEP 4: Check for duplicate disputes ==========
        checkNoPendingDispute(complaintId);
        
        // ========== STEP 5: Create dispute record (signoff with isAccepted=false) ==========
        CitizenSignoff signoff = CitizenSignoff.builder()
            .complaintId(complaintId)
            .citizenId(userContext.userId())
            .isAccepted(false)
            .feedback(request.feedback())
            .disputeReason(request.disputeReason())
            .disputeImageS3Key(request.counterProofImageS3Key())
            // disputeApproved = null (pending review)
            .build();
        
        CitizenSignoff savedSignoff = citizenSignoffRepository.save(signoff);
        
        log.info("Dispute created: signoffId={}, complaint={}", 
            savedSignoff.getId(), complaintId);
        
        // ========== STEP 6: Audit the dispute submission ==========
        auditService.recordGenericAction(
            "COMPLAINT",
            complaintId,
            "SIGNOFF",
            null,
            "DISPUTE_SUBMITTED",
            AuditActorContext.forUser(userContext.userId()),
            "Dispute filed: " + truncateReason(request.disputeReason(), 100)
        );
        
        // ========== STEP 7: Notify department head ==========
        notifyDepartmentOfDispute(complaint, savedSignoff);
        
        return DisputeResponse.submitted(savedSignoff);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC API: Approve Dispute (Reopen Complaint)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Approve a dispute and reopen the complaint.
     * 
     * VALIDATION:
     * 1. Signoff (dispute record) exists and is pending (disputeApproved=null)
     * 2. Complaint exists and is in RESOLVED state
     * 3. User is DEPT_HEAD
     * 4. User is in the same department as the complaint
     * 
     * EFFECT:
     * - Marks disputeApproved=true on CitizenSignoff
     * - Transitions complaint to IN_PROGRESS
     * - Escalates priority (LOW→MEDIUM, MEDIUM→HIGH, HIGH→CRITICAL)
     * - Recalculates SLA with stricter deadline
     * - Resets escalationLevel to 0 (L0)
     * 
     * @param complaintId The complaint being disputed
     * @param signoffId   The dispute (signoff) record ID
     * @param userContext The DEPT_HEAD approving
     * @return DisputeResponse with new priority and SLA
     */
    public DisputeResponse approveDispute(
            Long complaintId,
            Long signoffId,
            UserContext userContext) {
        
        log.info("Dispute approval: complaint={}, signoff={}, approver={}", 
            complaintId, signoffId, userContext.userId());
        
        // ========== STEP 1: Load and validate the dispute (signoff) ==========
        CitizenSignoff signoff = loadAndValidatePendingDispute(signoffId, complaintId);
        
        // ========== STEP 2: Load and validate complaint is still RESOLVED ==========
        Complaint complaint = loadAndValidateComplaint(complaintId, ComplaintStatus.RESOLVED);
        
        // ========== STEP 3: Validate user is DEPT_HEAD ==========
        validateDeptHeadRole(userContext, complaintId);
        
        // ========== STEP 4: Validate department membership ==========
        validateDepartmentMembership(userContext, complaint);
        
        // ========== STEP 5: Calculate new priority (escalate) ==========
        Priority oldPriority = complaint.getPriority();
        Priority newPriority = escalatePriority(oldPriority);
        
        // ========== STEP 6: Calculate new SLA deadline ==========
        LocalDateTime newSlaDeadline = calculateReopenSlaDeadline(complaint);
        int newSlaDays = calculateReopenSlaDays(complaint);
        
        // ========== STEP 7: Update signoff as approved ==========
        signoff.setDisputeApproved(true);
        signoff.setDisputeApprovedBy(userContext.userId());
        signoff.setDisputeReviewedAt(LocalDateTime.now());
        citizenSignoffRepository.save(signoff);
        
        // ========== STEP 7.5: Invalidate old resolution proofs ==========
        // When a dispute is approved, the staff must submit NEW proof.
        // Delete all existing proofs so hasProof() returns false.
        List<com.backend.springapp.model.ResolutionProof> oldProofs = 
            resolutionProofRepository.findByComplaintId(complaintId);
        if (!oldProofs.isEmpty()) {
            log.info("Deleting {} old resolution proofs for reopened complaint {}", 
                oldProofs.size(), complaintId);
            resolutionProofRepository.deleteAll(oldProofs);
        }
        
        // ========== STEP 8: Reopen the complaint ==========
        ComplaintStatus oldStatus = complaint.getStatus();
        complaint.setStatus(ComplaintStatus.IN_PROGRESS);
        complaint.setPriority(newPriority);
        complaint.setSlaDeadline(newSlaDeadline);
        complaint.setSlaDaysAssigned(newSlaDays);
        complaint.setEscalationLevel(0);  // Reset to L0
        complaint.setUpdatedTime(LocalDateTime.now());
        complaint.setResolvedTime(null);  // Clear resolved time since it's being reopened
        complaintRepository.save(complaint);
        
        log.info("Complaint reopened: id={}, oldPriority={}, newPriority={}, newSLA={}", 
            complaintId, oldPriority, newPriority, newSlaDeadline);
        
        // ========== STEP 9: Audit the reopen ==========
        auditService.recordComplaintStateChange(
            complaintId,
            oldStatus.name(),
            ComplaintStatus.IN_PROGRESS.name(),
            AuditActorContext.forUser(userContext.userId()),
            "Dispute approved. Priority escalated: " + oldPriority + " → " + newPriority
        );
        
        // ========== STEP 10: Notify relevant parties ==========
        notifyDisputeApproved(complaint, signoff, oldPriority, newPriority);
        
        return DisputeResponse.approved(
            signoff,
            userContext.userId(),
            newPriority,
            newSlaDeadline
        );
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC API: Reject Dispute
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Reject a dispute. Complaint stays RESOLVED.
     * 
     * @param complaintId     The complaint being disputed
     * @param signoffId       The dispute record ID
     * @param rejectionReason Why the dispute was rejected
     * @param userContext     The DEPT_HEAD rejecting
     * @return DisputeResponse with rejection status
     */
    public DisputeResponse rejectDispute(
            Long complaintId,
            Long signoffId,
            String rejectionReason,
            UserContext userContext) {
        
        log.info("Dispute rejection: complaint={}, signoff={}, rejector={}", 
            complaintId, signoffId, userContext.userId());
        
        // ========== STEP 1: Load and validate the dispute ==========
        CitizenSignoff signoff = loadAndValidatePendingDispute(signoffId, complaintId);
        
        // ========== STEP 2: Load and validate complaint ==========
        Complaint complaint = loadAndValidateComplaint(complaintId, ComplaintStatus.RESOLVED);
        
        // ========== STEP 3: Validate user is DEPT_HEAD ==========
        validateDeptHeadRole(userContext, complaintId);
        
        // ========== STEP 4: Validate department membership ==========
        validateDepartmentMembership(userContext, complaint);
        
        // ========== STEP 5: Update signoff as rejected ==========
        signoff.setDisputeApproved(false);
        signoff.setDisputeApprovedBy(userContext.userId());
        signoff.setDisputeReviewedAt(LocalDateTime.now());
        signoff.setDisputeRejectionReason(rejectionReason);
        citizenSignoffRepository.save(signoff);
        
        log.info("Dispute rejected: signoff={}, reason={}", signoffId, rejectionReason);
        
        // ========== STEP 6: Audit the rejection ==========
        auditService.recordGenericAction(
            "COMPLAINT",
            complaintId,
            "SIGNOFF",
            null,
            "DISPUTE_REJECTED",
            AuditActorContext.forUser(userContext.userId()),
            "Rejection reason: " + truncateReason(rejectionReason, 100)
        );
        
        // ========== STEP 7: Notify citizen of rejection ==========
        notifyDisputeRejected(complaint, signoff, rejectionReason);
        
        return DisputeResponse.rejected(signoff, rejectionReason);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC API: Get Pending Disputes (for DEPT_HEAD dashboard)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Get all pending disputes for a department.
     * 
     * @param departmentId Department to query
     * @param userContext  User context (must be DEPT_HEAD in department)
     * @return List of pending dispute signoffs
     */
    public List<CitizenSignoff> getPendingDisputesForDepartment(
            Long departmentId,
            UserContext userContext) {
        
        validateDeptHeadRoleForQuery(userContext);
        
        if (!userContext.isInDepartment(departmentId)) {
            throw new DepartmentMismatchException(
                null, userContext.departmentId(), departmentId
            );
        }
        
        return citizenSignoffRepository.findPendingDisputesByDepartment(departmentId);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PRIVATE: Validation Helpers
    // ═══════════════════════════════════════════════════════════════════════════
    
    private Complaint loadAndValidateComplaint(Long complaintId, ComplaintStatus expectedState) {
        Complaint complaint = complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Complaint not found with id: " + complaintId
            ));
        
        if (complaint.getStatus() != expectedState) {
            throw new InvalidDisputeStateException(
                complaintId,
                complaint.getStatus(),
                expectedState,
                "Dispute operations require complaint in " + expectedState + " state"
            );
        }
        
        return complaint;
    }
    
    private CitizenSignoff loadAndValidatePendingDispute(Long signoffId, Long complaintId) {
        CitizenSignoff signoff = citizenSignoffRepository.findById(signoffId)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Dispute (signoff) not found with id: " + signoffId
            ));
        
        // Validate it belongs to the right complaint
        if (!signoff.getComplaintId().equals(complaintId)) {
            throw new InvalidDisputeStateException(
                complaintId, null, null,
                "Signoff " + signoffId + " does not belong to complaint " + complaintId
            );
        }
        
        // Validate it's a dispute (isAccepted = false)
        if (signoff.getIsAccepted()) {
            throw new InvalidDisputeStateException(
                complaintId, null, null,
                "Signoff " + signoffId + " is an acceptance, not a dispute"
            );
        }
        
        // Validate it's pending (disputeApproved = null)
        if (signoff.getDisputeApproved() != null) {
            String status = signoff.getDisputeApproved() ? "already approved" : "already rejected";
            throw new InvalidDisputeStateException(
                complaintId, null, null,
                "Dispute " + signoffId + " is " + status
            );
        }
        
        return signoff;
    }
    
    private void validateCitizenRole(UserContext userContext, Long complaintId) {
        if (userContext.role() != UserRole.CITIZEN) {
            throw new UnauthorizedStateTransitionException(
                complaintId,
                ComplaintStatus.RESOLVED,
                ComplaintStatus.RESOLVED,  // Not transitioning, just disputing
                userContext.role(),
                java.util.EnumSet.of(UserRole.CITIZEN),
                "Only CITIZEN can file disputes"
            );
        }
    }
    
    private void validateOwnership(UserContext userContext, Complaint complaint) {
        if (!userContext.isComplaintOwner(complaint.getCitizenId())) {
            throw new ComplaintOwnershipException(
                complaint.getComplaintId(),
                userContext.userId(),
                complaint.getCitizenId()
            );
        }
    }
    
    private void validateDeptHeadRole(UserContext userContext, Long complaintId) {
        if (userContext.role() != UserRole.DEPT_HEAD) {
            throw new UnauthorizedStateTransitionException(
                complaintId,
                ComplaintStatus.RESOLVED,
                ComplaintStatus.IN_PROGRESS,
                userContext.role(),
                java.util.EnumSet.of(UserRole.DEPT_HEAD),
                "Only DEPT_HEAD can approve/reject disputes"
            );
        }
    }
    
    private void validateDeptHeadRoleForQuery(UserContext userContext) {
        if (userContext.role() != UserRole.DEPT_HEAD) {
            throw new UnauthorizedStateTransitionException(
                null,
                null,
                null,
                userContext.role(),
                java.util.EnumSet.of(UserRole.DEPT_HEAD),
                "Only DEPT_HEAD can view department disputes"
            );
        }
    }
    
    private void validateDepartmentMembership(UserContext userContext, Complaint complaint) {
        if (!userContext.isInDepartment(complaint.getDepartmentId())) {
            throw new DepartmentMismatchException(
                complaint.getComplaintId(),
                userContext.departmentId(),
                complaint.getDepartmentId()
            );
        }
    }
    
    private void checkNoPendingDispute(Long complaintId) {
        if (citizenSignoffRepository.existsByComplaintIdAndIsAcceptedFalseAndDisputeApprovedIsNull(complaintId)) {
            throw new DuplicateDisputeException(complaintId);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PRIVATE: Priority & SLA Calculation
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Escalate priority by one level.
     * LOW → MEDIUM → HIGH → CRITICAL
     * 
     * CRITICAL stays CRITICAL (max level).
     */
    private Priority escalatePriority(Priority current) {
        return switch (current) {
            case LOW -> Priority.MEDIUM;
            case MEDIUM -> Priority.HIGH;
            case HIGH -> Priority.CRITICAL;
            case CRITICAL -> Priority.CRITICAL;  // Already at max
        };
    }
    
    /**
     * Calculate new SLA deadline for reopened complaint.
     * 
     * Uses the category's base SLA days * REOPEN_SLA_MULTIPLIER,
     * but never less than MIN_REOPEN_SLA_DAYS.
     */
    private LocalDateTime calculateReopenSlaDeadline(Complaint complaint) {
        int slaDays = calculateReopenSlaDays(complaint);
        return LocalDateTime.now().plusDays(slaDays);
    }
    
    private int calculateReopenSlaDays(Complaint complaint) {
        // Try to get the category's SLA config
        Integer baseDays = null;
        
        if (complaint.getCategoryId() != null) {
            SLA sla = slaRepository.findByCategoryId(complaint.getCategoryId()).orElse(null);
            if (sla != null) {
                baseDays = sla.getSlaDays();
            }
        }
        
        // Fallback to what was originally assigned
        if (baseDays == null) {
            baseDays = complaint.getSlaDaysAssigned();
        }
        
        // Final fallback
        if (baseDays == null) {
            baseDays = 7;  // Default 7 days if nothing else available
        }
        
        // Apply stricter SLA for reopened complaints
        int reopenDays = (int) Math.ceil(baseDays * REOPEN_SLA_MULTIPLIER);
        return Math.max(reopenDays, MIN_REOPEN_SLA_DAYS);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PRIVATE: Notifications
    // ═══════════════════════════════════════════════════════════════════════════
    
    private void notifyDepartmentOfDispute(Complaint complaint, CitizenSignoff signoff) {
        // Notify staff assigned to the complaint
        if (complaint.getStaffId() != null) {
            notificationService.send(
                complaint.getStaffId(),
                NotificationType.DISPUTE_RECEIVED,
                "Resolution Disputed",
                "Citizen has disputed the resolution for complaint #" + complaint.getComplaintId(),
                complaint.getComplaintId(),
                "/complaints/" + complaint.getComplaintId()
            );
        }
        
        // TODO: Also notify department head (need to lookup dept head user)
    }
    
    private void notifyDisputeApproved(
            Complaint complaint, 
            CitizenSignoff signoff,
            Priority oldPriority,
            Priority newPriority) {
        
        // Notify the citizen
        notificationService.send(
            complaint.getCitizenId(),
            NotificationType.DISPUTE_APPROVED,
            "Dispute Approved",
            "Your dispute for complaint #" + complaint.getComplaintId() + 
                " has been approved. The complaint is now being re-investigated with " +
                newPriority + " priority.",
            complaint.getComplaintId(),
            "/complaints/" + complaint.getComplaintId()
        );
        
        // Notify the staff
        if (complaint.getStaffId() != null) {
            notificationService.send(
                complaint.getStaffId(),
                NotificationType.COMPLAINT_REOPENED,
                "Complaint Reopened",
                "Complaint #" + complaint.getComplaintId() + " has been reopened after citizen dispute. " +
                    "Priority: " + newPriority + ". Please re-investigate.",
                complaint.getComplaintId(),
                "/complaints/" + complaint.getComplaintId()
            );
        }
    }
    
    private void notifyDisputeRejected(
            Complaint complaint, 
            CitizenSignoff signoff,
            String rejectionReason) {
        
        notificationService.send(
            complaint.getCitizenId(),
            NotificationType.DISPUTE_REJECTED,
            "Dispute Rejected",
            "Your dispute for complaint #" + complaint.getComplaintId() + 
                " has been reviewed and rejected. Reason: " + 
                truncateReason(rejectionReason, 200),
            complaint.getComplaintId(),
            "/complaints/" + complaint.getComplaintId()
        );
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PRIVATE: Utilities
    // ═══════════════════════════════════════════════════════════════════════════
    
    private String truncateReason(String reason, int maxLen) {
        if (reason == null) return null;
        if (reason.length() <= maxLen) return reason;
        return reason.substring(0, maxLen - 3) + "...";
    }
}
