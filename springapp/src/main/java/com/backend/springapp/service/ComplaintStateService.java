package com.backend.springapp.service;

import com.backend.springapp.audit.AuditActorContext;
import com.backend.springapp.audit.AuditService;
import com.backend.springapp.dto.response.StateTransitionResponse;
import com.backend.springapp.enums.ComplaintStatus;
import com.backend.springapp.exception.ResourceNotFoundException;
import com.backend.springapp.model.Complaint;
import com.backend.springapp.notification.NotificationService;
import com.backend.springapp.repository.ComplaintRepository;
import com.backend.springapp.security.UserContext;
import com.backend.springapp.statemachine.ComplaintStateMachine;
import com.backend.springapp.statemachine.StateTransitionResult;
import com.backend.springapp.gamification.service.CitizenPointsService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Set;

/**
 * Application service for managing complaint state transitions.
 * 
 * DESIGN PRINCIPLES:
 * - Orchestrates the full state transition workflow
 * - Loads complaint from repository
 * - Delegates validation to StateTransitionService
 * - Applies state change and updates timestamps
 * - Persists changes
 * - Returns response DTOs
 * 
 * This is the service that controllers should call.
 * It bridges the pure domain logic (StateTransitionService)
 * with persistence and response handling.
 */
@Service
@Transactional
public class ComplaintStateService {
    
    private static final Logger log = LoggerFactory.getLogger(ComplaintStateService.class);
    
    private final ComplaintRepository complaintRepository;
    private final StateTransitionService stateTransitionService;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final CitizenPointsService citizenPointsService;
    
    public ComplaintStateService(
            ComplaintRepository complaintRepository,
            StateTransitionService stateTransitionService,
            AuditService auditService,
            NotificationService notificationService,
            CitizenPointsService citizenPointsService) {
        this.complaintRepository = complaintRepository;
        this.stateTransitionService = stateTransitionService;
        this.auditService = auditService;
        this.notificationService = notificationService;
        this.citizenPointsService = citizenPointsService;
    }
    
    /**
     * Transition a complaint to a new state.
     * 
     * This is the main entry point for state transitions.
     * Validates, applies, and persists the state change.
     * 
     * @param complaintId The complaint to transition
     * @param targetState The desired target state
     * @param userContext The user performing the transition
     * @return Response with transition details
     * @throws ResourceNotFoundException if complaint not found
     * @throws InvalidStateTransitionException if transition is invalid
     * @throws UnauthorizedStateTransitionException if user not authorized
     * @throws ComplaintOwnershipException if citizen doesn't own complaint
     * @throws DepartmentMismatchException if staff not in complaint's department
     */
    public StateTransitionResponse transitionState(
            Long complaintId,
            ComplaintStatus targetState,
            UserContext userContext) {
        
        log.info("State transition requested: complaint={}, target={}, user={}",
            complaintId, targetState, userContext);
        
        // Load the complaint
        Complaint complaint = complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Complaint not found with id: " + complaintId
            ));
        
        ComplaintStatus currentState = complaint.getStatus();
        
        // Validate and authorize the transition
        StateTransitionResult result = stateTransitionService.validateAndAuthorize(
            complaintId,
            currentState,
            targetState,
            userContext,
            complaint.getCitizenId(),
            complaint.getDepartmentId()
        );
        
        // Apply the state change
        applyStateChange(complaint, targetState);
        
        // Persist
        Complaint saved = complaintRepository.save(complaint);
        
        // AUDIT: Record the state transition
        auditService.recordComplaintStateChange(
            complaintId,
            currentState.name(),
            targetState.name(),
            AuditActorContext.fromUserContext(userContext),
            buildSuccessMessage(currentState, targetState)
        );
        
        // NOTIFICATION: Send user notifications AFTER audit (best-effort)
        sendStateChangeNotifications(saved, currentState, targetState);
        
        // GAMIFICATION: Award points when complaint is closed
        if (targetState == ComplaintStatus.CLOSED) {
            citizenPointsService.awardPointsForResolution(saved.getCitizenId());
        }
        
        log.info("State transition completed: complaint={}, {} -> {}",
            complaintId, currentState, targetState);
        
        // Build response
        return StateTransitionResponse.builder()
            .complaintId(saved.getComplaintId())
            .previousState(currentState)
            .currentState(saved.getStatus())
            .transitionedBy(userContext.role().name())
            .transitionedAt(LocalDateTime.now())
            .message(buildSuccessMessage(currentState, targetState))
            .build();
    }
    
    /**
     * Apply the state change and update relevant timestamps.
     * 
     * Different states require different timestamp updates:
     * - IN_PROGRESS: Set startTime if not already set
     * - RESOLVED: Set resolvedTime
     * - CLOSED: Set closedTime
     * - CANCELLED: No special timestamp (updatedTime is always set)
     */
    private void applyStateChange(Complaint complaint, ComplaintStatus targetState) {
        LocalDateTime now = LocalDateTime.now();
        
        complaint.setStatus(targetState);
        complaint.setUpdatedTime(now);
        
        switch (targetState) {
            case IN_PROGRESS:
                if (complaint.getStartTime() == null) {
                    complaint.setStartTime(now);
                }
                break;
            case RESOLVED:
                complaint.setResolvedTime(now);
                break;
            case CLOSED:
                complaint.setClosedTime(now);
                break;
            case CANCELLED:
                // CANCELLED doesn't need special timestamps
                // closedTime could be set here if we want to track when it was cancelled
                break;
            default:
                // Other states don't need special handling
                break;
        }
    }
    
    /**
     * Get all states the user can transition the complaint to.
     * 
     * Used by UI to show available actions (buttons, dropdown, etc.)
     * 
     * @param complaintId The complaint
     * @param userContext The current user
     * @return Set of available target states (may be empty)
     */
    @Transactional(readOnly = true)
    public Set<ComplaintStatus> getAvailableTransitions(Long complaintId, UserContext userContext) {
        Complaint complaint = complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Complaint not found with id: " + complaintId
            ));
        
        return stateTransitionService.getAvailableTransitions(
            complaint.getStatus(),
            userContext,
            complaint.getCitizenId(),
            complaint.getDepartmentId()
        );
    }
    
    /**
     * Get detailed information about the complaint's current state.
     * 
     * Includes current state, available transitions, and whether it's terminal.
     */
    @Transactional(readOnly = true)
    public ComplaintStateInfo getComplaintStateInfo(Long complaintId, UserContext userContext) {
        Complaint complaint = complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Complaint not found with id: " + complaintId
            ));
        
        Set<ComplaintStatus> availableTransitions = stateTransitionService.getAvailableTransitions(
            complaint.getStatus(),
            userContext,
            complaint.getCitizenId(),
            complaint.getDepartmentId()
        );
        
        return new ComplaintStateInfo(
            complaintId,
            complaint.getStatus(),
            ComplaintStateMachine.isTerminalState(complaint.getStatus()),
            availableTransitions,
            complaint.getStartTime(),
            complaint.getResolvedTime(),
            complaint.getClosedTime()
        );
    }
    
    // ==================== Semantic Helper Methods ====================
    // These methods provide meaningful names for common transitions
    // They all delegate to transitionState() for consistency
    
    /**
     * Start work on a complaint (FILED → IN_PROGRESS).
     * Only SYSTEM (AI) can perform this transition.
     */
    public StateTransitionResponse startWork(Long complaintId, UserContext userContext) {
        return transitionState(complaintId, ComplaintStatus.IN_PROGRESS, userContext);
    }
    
    /**
     * Resolve a complaint (IN_PROGRESS → RESOLVED).
     * Only STAFF and DEPT_HEAD can perform this transition.
     */
    public StateTransitionResponse resolve(Long complaintId, UserContext userContext) {
        return transitionState(complaintId, ComplaintStatus.RESOLVED, userContext);
    }
    
    /**
     * Close a complaint (RESOLVED → CLOSED).
     * Only CITIZEN and SYSTEM can perform this transition.
     */
    public StateTransitionResponse close(Long complaintId, UserContext userContext) {
        return transitionState(complaintId, ComplaintStatus.CLOSED, userContext);
    }
    
    /**
     * Cancel a complaint (any non-terminal state → CANCELLED).
     * Only CITIZEN and ADMIN can perform this transition.
     */
    public StateTransitionResponse cancel(Long complaintId, UserContext userContext) {
        return transitionState(complaintId, ComplaintStatus.CANCELLED, userContext);
    }
    
    // ==================== Helper Methods ====================
    
    private String buildSuccessMessage(ComplaintStatus from, ComplaintStatus to) {
        return switch (to) {
            case IN_PROGRESS -> "Complaint has been assigned and is now in progress";
            case RESOLVED -> "Complaint has been resolved and is awaiting citizen confirmation";
            case CLOSED -> "Complaint has been closed";
            case CANCELLED -> "Complaint has been cancelled";
            default -> String.format("State changed from %s to %s", from, to);
        };
    }
    
    /**
     * Send notifications based on state change.
     * 
     * IMPORTANT: This is called AFTER audit logging.
     * Notification failures are logged but don't affect the transaction.
     * 
     * @param complaint   The complaint that changed
     * @param oldStatus   Previous status
     * @param newStatus   New status
     */
    private void sendStateChangeNotifications(Complaint complaint, ComplaintStatus oldStatus, ComplaintStatus newStatus) {
        Long citizenId = complaint.getCitizenId();
        Long complaintId = complaint.getComplaintId();
        String title = complaint.getTitle();
        
        // Always notify citizen about status changes
        notificationService.notifyStatusChange(
            citizenId,
            complaintId,
            title,
            oldStatus != null ? oldStatus.name() : "NEW",
            newStatus.name()
        );
        
        // Special notifications based on target state
        switch (newStatus) {
            case RESOLVED:
                // Citizen gets resolution notification
                notificationService.notifyResolution(citizenId, complaintId, title);
                // Also request rating after a short delay (could be async)
                notificationService.requestRating(citizenId, complaintId, title);
                break;
                
            case IN_PROGRESS:
                // Notify assigned staff if any
                if (complaint.getStaffId() != null) {
                    notificationService.notifyAssignment(complaint.getStaffId(), complaintId, title);
                }
                break;
                
            default:
                // Other states only get the generic status change notification
                break;
        }
    }
    
    /**
     * Inner record to hold complaint state information.
     * Used by getComplaintStateInfo method.
     */
    public record ComplaintStateInfo(
        Long complaintId,
        ComplaintStatus currentState,
        boolean isTerminal,
        Set<ComplaintStatus> availableTransitions,
        LocalDateTime startTime,
        LocalDateTime resolvedTime,
        LocalDateTime closedTime
    ) {}
}
