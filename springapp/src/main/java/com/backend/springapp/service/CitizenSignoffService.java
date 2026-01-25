package com.backend.springapp.service;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.backend.springapp.audit.AuditActorContext;
import com.backend.springapp.audit.AuditService;
import com.backend.springapp.dto.request.CitizenSignoffRequest;
import com.backend.springapp.dto.response.CitizenSignoffResponse;
import com.backend.springapp.enums.ComplaintStatus;
import com.backend.springapp.exception.ComplaintOwnershipException;
import com.backend.springapp.exception.InvalidStateTransitionException;
import com.backend.springapp.exception.ResourceNotFoundException;
import com.backend.springapp.exception.UnauthorizedStateTransitionException;
import com.backend.springapp.model.CitizenSignoff;
import com.backend.springapp.model.Complaint;
import com.backend.springapp.notification.NotificationService;
import com.backend.springapp.repository.CitizenSignoffRepository;
import com.backend.springapp.repository.ComplaintRepository;
import com.backend.springapp.security.UserContext;
import com.backend.springapp.security.UserRole;

/**
 * Service for managing citizen signoffs.
 * 
 * DOMAIN RULES ENFORCED:
 * 1. ONLY the CITIZEN who filed the complaint can sign off
 * 2. Complaint must be in RESOLVED state
 * 3. If isAccepted = true → Complaint transitions to CLOSED
 * 4. If isAccepted = false → Complaint stays RESOLVED (dispute recorded)
 * 
 * KEY PRINCIPLE:
 * This is the ONLY path to CLOSED state for human-initiated closures.
 * No other role can close complaints - enforcing citizen empowerment.
 * 
 * SYSTEM can also close (auto-close after timeout), but that's handled
 * separately via ComplaintStateService with SYSTEM context.
 */
@Service
@Transactional
public class CitizenSignoffService {
    
    private static final Logger log = LoggerFactory.getLogger(CitizenSignoffService.class);
    
    private final CitizenSignoffRepository citizenSignoffRepository;
    private final ComplaintRepository complaintRepository;
    private final ComplaintStateService complaintStateService;
    private final AuditService auditService;
    private final NotificationService notificationService;
    
    public CitizenSignoffService(
            CitizenSignoffRepository citizenSignoffRepository,
            ComplaintRepository complaintRepository,
            ComplaintStateService complaintStateService,
            AuditService auditService,
            NotificationService notificationService) {
        this.citizenSignoffRepository = citizenSignoffRepository;
        this.complaintRepository = complaintRepository;
        this.complaintStateService = complaintStateService;
        this.auditService = auditService;
        this.notificationService = notificationService;
    }
    
    /**
     * Process citizen signoff for a resolved complaint.
     * 
     * VALIDATION ORDER:
     * 1. Complaint exists
     * 2. User is CITIZEN
     * 3. User is the OWNER of the complaint
     * 4. Complaint is in RESOLVED state
     * 5. Validate request (rating required if accepted, disputeReason if rejected)
     * 
     * OUTCOME:
     * - If accepted: Create signoff record, transition to CLOSED
     * - If rejected: Create signoff record, stay RESOLVED, notify department
     * 
     * @param complaintId The complaint to sign off
     * @param request     The signoff details
     * @param userContext The citizen signing off
     * @return Response with signoff result and new complaint status
     */
    public CitizenSignoffResponse processSignoff(
            Long complaintId,
            CitizenSignoffRequest request,
            UserContext userContext) {
        
        log.info("Citizen signoff: complaint={}, citizen={}, accepted={}", 
            complaintId, userContext.userId(), request.isAccepted());
        
        // ========== STEP 1: Load and validate complaint exists ==========
        Complaint complaint = complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Complaint not found with id: " + complaintId
            ));
        
        // ========== STEP 2: Validate user role (CITIZEN only) ==========
        // WHY: Only citizens can sign off on resolutions
        // Staff/Admin cannot close complaints on behalf of citizens
        if (userContext.role() != UserRole.CITIZEN) {
            log.warn("Non-citizen attempting signoff: role={}", userContext.role());
            throw new UnauthorizedStateTransitionException(
                complaintId,
                ComplaintStatus.RESOLVED,
                ComplaintStatus.CLOSED,
                userContext.role(),
                java.util.EnumSet.of(UserRole.CITIZEN),
                "Only CITIZEN can sign off on complaint resolutions"
            );
        }
        
        // ========== STEP 3: Validate ownership ==========
        // WHY: Citizens can ONLY sign off on THEIR OWN complaints
        // This is a core domain rule - no proxy signoffs allowed
        if (!userContext.isComplaintOwner(complaint.getCitizenId())) {
            log.warn("Ownership check failed: user={}, owner={}", 
                userContext.userId(), complaint.getCitizenId());
            throw new ComplaintOwnershipException(
                complaintId,
                userContext.userId(),
                complaint.getCitizenId()
            );
        }
        
        // ========== STEP 4: Validate complaint is RESOLVED ==========
        // WHY: Signoff only makes sense for resolved complaints
        // Cannot sign off on FILED (not started), IN_PROGRESS (not done), or CLOSED (already done)
        if (complaint.getStatus() != ComplaintStatus.RESOLVED) {
            log.warn("Invalid state for signoff: {}", complaint.getStatus());
            throw new InvalidStateTransitionException(
                complaintId,
                complaint.getStatus(),
                ComplaintStatus.CLOSED,
                "Signoff can only be provided for complaints in RESOLVED state. " +
                "Current state: " + complaint.getStatus()
            );
        }
        
        // ========== STEP 5: Validate request data ==========
        validateSignoffRequest(request);
        
        // ========== STEP 6: Create the signoff record ==========
        CitizenSignoff signoff = CitizenSignoff.builder()
            .complaintId(complaintId)
            .citizenId(userContext.userId())
            .isAccepted(request.isAccepted())
            .rating(request.rating())
            .feedback(request.feedback())
            .disputeImageS3Key(request.disputeImageS3Key())
            .disputeReason(request.disputeReason())
            .build();
        
        CitizenSignoff saved = citizenSignoffRepository.save(signoff);
        
        log.info("Citizen signoff saved: id={}, complaint={}, accepted={}", 
            saved.getId(), complaintId, request.isAccepted());
        
        // ========== STEP 7: Process based on acceptance ==========
        if (request.isAccepted()) {
            return processAcceptedSignoff(saved, complaint, userContext);
        } else {
            return processDisputedSignoff(saved, complaint, userContext);
        }
    }
    
    /**
     * Validate signoff request data based on acceptance status.
     */
    private void validateSignoffRequest(CitizenSignoffRequest request) {
        if (request.isAccepted()) {
            // Rating is required for acceptance (validates service quality)
            if (request.rating() == null) {
                throw new IllegalArgumentException(
                    "Rating is required when accepting the resolution (1-5)"
                );
            }
        } else {
            // Dispute reason is required for rejection (explains why)
            if (request.disputeReason() == null || request.disputeReason().isBlank()) {
                throw new IllegalArgumentException(
                    "Dispute reason is required when rejecting the resolution"
                );
            }
        }
    }
    
    /**
     * Process ACCEPTED signoff: close the complaint.
     */
    private CitizenSignoffResponse processAcceptedSignoff(
            CitizenSignoff signoff,
            Complaint complaint,
            UserContext userContext) {
        
        Long complaintId = complaint.getComplaintId();
        
        // Update complaint satisfaction rating
        complaint.setCitizenSatisfaction(signoff.getRating());
        complaintRepository.save(complaint);
        
        // Transition to CLOSED via ComplaintStateService
        // This ensures all state transition logic is centralized
        complaintStateService.close(complaintId, userContext);
        
        // Audit the acceptance
        auditService.recordGenericAction(
            "CITIZEN_SIGNOFF",
            signoff.getId(),
            "ACCEPT",
            null,
            String.format("Citizen accepted resolution with rating %d/5", signoff.getRating()),
            AuditActorContext.fromUserContext(userContext),
            "Complaint closed via citizen acceptance"
        );
        
        log.info("Complaint closed via citizen acceptance: complaint={}", complaintId);
        
        return CitizenSignoffResponse.accepted(signoff);
    }
    
    /**
     * Process DISPUTED signoff: record dispute, notify department, stay RESOLVED.
     */
    private CitizenSignoffResponse processDisputedSignoff(
            CitizenSignoff signoff,
            Complaint complaint,
            UserContext userContext) {
        
        Long complaintId = complaint.getComplaintId();
        
        // Audit the dispute
        auditService.recordGenericAction(
            "CITIZEN_SIGNOFF",
            signoff.getId(),
            "DISPUTE",
            null,
            String.format("Citizen disputed resolution: %s", signoff.getDisputeReason()),
            AuditActorContext.fromUserContext(userContext),
            "Resolution disputed by citizen"
        );
        
        // Notify staff/department about the dispute
        if (complaint.getStaffId() != null) {
            notificationService.notifyGeneric(
                complaint.getStaffId(),
                complaintId,
                "RESOLUTION_DISPUTED",
                "Resolution Disputed: Complaint #" + complaintId,
                "Citizen has disputed your resolution. Reason: " + signoff.getDisputeReason()
            );
        }
        
        // Get dispute count for escalation consideration
        long disputeCount = citizenSignoffRepository.countByComplaintIdAndIsAcceptedFalse(complaintId);
        
        log.warn("Resolution disputed: complaint={}, disputeCount={}", complaintId, disputeCount);
        
        // Note: Complaint stays in RESOLVED state
        // Staff must address the dispute and citizen can sign off again
        
        return CitizenSignoffResponse.disputed(signoff);
    }
    
    /**
     * Check if citizen has accepted the resolution.
     * 
     * THIS IS THE KEY METHOD used by StateTransitionService guard logic.
     * 
     * @param complaintId The complaint to check
     * @return true if citizen has signed off with isAccepted = true
     */
    @Transactional(readOnly = true)
    public boolean hasAcceptedSignoff(Long complaintId) {
        return citizenSignoffRepository.existsByComplaintIdAndIsAcceptedTrue(complaintId);
    }
    
    /**
     * Get all signoffs for a complaint.
     */
    @Transactional(readOnly = true)
    public List<CitizenSignoffResponse> getSignoffsForComplaint(Long complaintId) {
        if (!complaintRepository.existsById(complaintId)) {
            throw new ResourceNotFoundException("Complaint not found with id: " + complaintId);
        }
        
        return citizenSignoffRepository.findByComplaintIdOrderBySignedOffAtDesc(complaintId).stream()
            .map(signoff -> signoff.getIsAccepted() 
                ? CitizenSignoffResponse.accepted(signoff)
                : CitizenSignoffResponse.disputed(signoff))
            .toList();
    }
}
