package com.backend.springapp.escalation;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.backend.springapp.dto.response.EscalationEventDTO;
import com.backend.springapp.dto.response.OverdueComplaintDTO;
import com.backend.springapp.enums.ComplaintStatus;
import com.backend.springapp.enums.EscalationLevel;
import com.backend.springapp.escalation.EscalationEvaluationService.EscalationResult;
import com.backend.springapp.model.Complaint;
import com.backend.springapp.model.EscalationEvent;
import com.backend.springapp.repository.ComplaintRepository;
import com.backend.springapp.repository.EscalationEventRepository;

import lombok.RequiredArgsConstructor;

/**
 * Orchestration service for escalation operations.
 * 
 * Responsibilities:
 * 1. Coordinates between EscalationEvaluationService and persistence
 * 2. Ensures idempotency - no duplicate escalation events
 * 3. Updates complaint.escalation_level
 * 4. Provides query methods for escalation data
 * 
 * Design Decisions:
 * - Uses @Transactional for atomicity (event creation + complaint update)
 * - Delegates all business logic to EscalationEvaluationService
 * - Logs all escalation actions for debugging/audit
 */
@Service
@RequiredArgsConstructor
public class EscalationService {

    private static final Logger log = LoggerFactory.getLogger(EscalationService.class);

    private final EscalationEvaluationService evaluationService;
    private final EscalationEventRepository escalationEventRepository;
    private final ComplaintRepository complaintRepository;

    /**
     * Process potential escalation for a single complaint.
     * 
     * This is the main entry point for escalation processing.
     * Called by the scheduler for each active complaint.
     * 
     * @param complaint The complaint to process
     * @return Optional containing the created event if escalation occurred, empty otherwise
     */
    @Transactional
    public Optional<EscalationEvent> processEscalation(Complaint complaint) {
        return processEscalation(complaint, LocalDate.now());
    }

    /**
     * Process escalation with explicit evaluation date.
     * Useful for testing with specific dates.
     */
    @Transactional
    public Optional<EscalationEvent> processEscalation(Complaint complaint, LocalDate evaluationDate) {
        log.debug("Processing escalation for complaint ID: {}", complaint.getComplaintId());

        // Step 1: Evaluate if escalation is needed
        EscalationResult result = evaluationService.evaluate(complaint, evaluationDate);

        if (!result.escalationRequired()) {
            log.debug("No escalation needed for complaint {}: {}", 
                    complaint.getComplaintId(), result.reason());
            return Optional.empty();
        }

        // Step 2: Idempotency check - has this escalation already been recorded?
        if (escalationAlreadyExists(complaint.getComplaintId(), result.requiredLevel())) {
            log.debug("Escalation to {} already exists for complaint {}", 
                    result.requiredLevel(), complaint.getComplaintId());
            return Optional.empty();
        }

        // Step 3: Create and persist escalation event
        EscalationEvent event = createEscalationEvent(complaint, result);
        escalationEventRepository.save(event);

        // Step 4: Update complaint's escalation level
        updateComplaintEscalationLevel(complaint, result.requiredLevel());

        log.info("Escalated complaint {} from {} to {} - Reason: {}", 
                complaint.getComplaintId(), 
                result.currentLevel(), 
                result.requiredLevel(), 
                result.reason());

        return Optional.of(event);
    }

    /**
     * Process escalations for multiple complaints in batch.
     * Returns count of escalations performed.
     */
    @Transactional
    public int processEscalationBatch(List<Complaint> complaints) {
        return processEscalationBatch(complaints, LocalDate.now());
    }

    @Transactional
    public int processEscalationBatch(List<Complaint> complaints, LocalDate evaluationDate) {
        int escalationCount = 0;
        
        for (Complaint complaint : complaints) {
            try {
                Optional<EscalationEvent> event = processEscalation(complaint, evaluationDate);
                if (event.isPresent()) {
                    escalationCount++;
                }
            } catch (Exception e) {
                // Log error but continue processing other complaints
                log.error("Failed to process escalation for complaint {}: {}", 
                        complaint.getComplaintId(), e.getMessage(), e);
            }
        }
        
        return escalationCount;
    }

    /**
     * Get escalation history for a complaint.
     */
    public List<EscalationEventDTO> getEscalationHistory(Long complaintId) {
        List<EscalationEvent> events = escalationEventRepository
                .findByComplaintIdOrderByEscalatedAtAsc(complaintId);
        
        return events.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get all overdue complaints with their escalation status.
     */
    public List<OverdueComplaintDTO> getOverdueComplaints() {
        return getOverdueComplaints(LocalDate.now());
    }

    public List<OverdueComplaintDTO> getOverdueComplaints(LocalDate evaluationDate) {
        // Fetch active complaints (FILED, IN_PROGRESS, RESOLVED but not closed)
        List<Complaint> activeComplaints = complaintRepository.findAll().stream()
                .filter(c -> isActiveStatus(c.getStatus()))
                .filter(c -> c.getSlaDeadline() != null)
                .filter(c -> c.getSlaDeadline().toLocalDate().isBefore(evaluationDate))
                .collect(Collectors.toList());

        return activeComplaints.stream()
                .map(c -> buildOverdueDTO(c, evaluationDate))
                .collect(Collectors.toList());
    }

    /**
     * Check if an escalation event already exists for this complaint and level.
     * This is the idempotency guard.
     */
    private boolean escalationAlreadyExists(Long complaintId, EscalationLevel level) {
        return escalationEventRepository.existsByComplaintIdAndEscalationLevel(complaintId, level);
    }

    /**
     * Creates the EscalationEvent entity from evaluation result.
     */
    private EscalationEvent createEscalationEvent(Complaint complaint, EscalationResult result) {
        return EscalationEvent.builder()
                .complaintId(complaint.getComplaintId())
                .previousLevel(result.currentLevel())
                .escalationLevel(result.requiredLevel())
                .escalatedToRole(result.requiredLevel().getResponsibleRole())
                .reason(result.reason())
                .daysOverdue(result.daysOverdue())
                .slaDeadlineSnapshot(result.slaDeadline())
                .isAutomated(true)
                .build();
    }

    /**
     * Updates the complaint's escalation level.
     * Only increases, never decreases.
     */
    private void updateComplaintEscalationLevel(Complaint complaint, EscalationLevel newLevel) {
        Integer currentLevel = complaint.getEscalationLevel();
        if (currentLevel == null || newLevel.getLevel() > currentLevel) {
            complaint.setEscalationLevel(newLevel.getLevel());
            complaintRepository.save(complaint);
        }
    }

    /**
     * Checks if complaint status is "active" (should be checked for escalation).
     * Excludes CLOSED and CANCELLED as they are terminal states.
     */
    private boolean isActiveStatus(ComplaintStatus status) {
        return status != null && 
               status != ComplaintStatus.CLOSED && 
               status != ComplaintStatus.CANCELLED;
    }

    /**
     * Builds the OverdueComplaintDTO with escalation information.
     */
    private OverdueComplaintDTO buildOverdueDTO(Complaint complaint, LocalDate evaluationDate) {
        EscalationResult result = evaluationService.evaluate(complaint, evaluationDate);
        List<EscalationEventDTO> history = getEscalationHistory(complaint.getComplaintId());
        
        int daysOverdue = (int) java.time.temporal.ChronoUnit.DAYS.between(
                complaint.getSlaDeadline().toLocalDate(), evaluationDate);

        EscalationLevel currentLevel = complaint.getEscalationLevel() != null 
                ? EscalationLevel.fromLevel(complaint.getEscalationLevel())
                : EscalationLevel.L0;

        return OverdueComplaintDTO.builder()
                .complaintId(complaint.getComplaintId())
                .title(complaint.getTitle())
                .status(complaint.getStatus())
                .slaDeadline(complaint.getSlaDeadline())
                .daysOverdue(daysOverdue)
                .currentEscalationLevel(currentLevel)
                .requiredEscalationLevel(result.requiredLevel())
                .needsEscalation(result.escalationRequired())
                .departmentId(complaint.getDepartmentId())
                .departmentName(complaint.getDepartment() != null 
                        ? complaint.getDepartment().getName() 
                        : null)
                .escalationHistory(history)
                .build();
    }

    /**
     * Converts EscalationEvent entity to DTO.
     */
    private EscalationEventDTO toDTO(EscalationEvent event) {
        return EscalationEventDTO.builder()
                .id(event.getId())
                .complaintId(event.getComplaintId())
                .escalationLevel(event.getEscalationLevel())
                .previousLevel(event.getPreviousLevel())
                .escalatedAt(event.getEscalatedAt())
                .escalatedToRole(event.getEscalatedToRole())
                .escalatedToRoleDisplayName(event.getEscalationLevel().getDisplayName())
                .reason(event.getReason())
                .daysOverdue(event.getDaysOverdue())
                .slaDeadline(event.getSlaDeadlineSnapshot())
                .isAutomated(event.getIsAutomated())
                .build();
    }
}
