package com.backend.springapp.escalation;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

import org.springframework.stereotype.Service;

import com.backend.springapp.enums.EscalationLevel;
import com.backend.springapp.model.Complaint;

/**
 * PURE EVALUATION SERVICE - Contains ONLY escalation level calculation logic.
 * 
 * Design Principles:
 * 1. NO SIDE EFFECTS: This service never modifies database state
 * 2. NO SCHEDULING: No awareness of when/how often it's called
 * 3. DETERMINISTIC: Same input always produces same output
 * 4. TESTABLE: Can be unit tested without mocking repositories
 * 
 * Escalation Rules:
 * - L0 (Staff): Default, within SLA or ≤1 day overdue
 * - L1 (Dept Head): SLA deadline + 1 day breached (>1 day overdue)
 * - L2 (Commissioner): SLA deadline + 3 days breached (>3 days overdue)
 * 
 * WHY these thresholds?
 * - L0→L1 at +1 day: Gives staff a grace period, then alerts department head
 * - L1→L2 at +3 days: Allows dept head 2 days to act before commissioner escalation
 */
@Service
public class EscalationEvaluationService {

    // Configuration constants - could be externalized to application.properties
    private static final int L1_THRESHOLD_DAYS = 1;  // Days after SLA for L1 escalation
    private static final int L2_THRESHOLD_DAYS = 3;  // Days after SLA for L2 escalation

    /**
     * Determines the appropriate escalation level based on SLA breach severity.
     * 
     * @param complaint The complaint to evaluate
     * @param evaluationDate The date to evaluate against (usually today)
     * @return EscalationResult containing the determined level and metadata
     */
    public EscalationResult evaluate(Complaint complaint, LocalDate evaluationDate) {
        // Validation: Cannot evaluate without SLA deadline
        if (complaint.getSlaDeadline() == null) {
            return EscalationResult.noEscalationNeeded(
                EscalationLevel.L0, 
                "No SLA deadline set for complaint"
            );
        }

        LocalDate slaDeadlineDate = complaint.getSlaDeadline().toLocalDate();
        long daysOverdue = ChronoUnit.DAYS.between(slaDeadlineDate, evaluationDate);
        
        // Not overdue yet - stay at L0
        if (daysOverdue <= 0) {
            return EscalationResult.noEscalationNeeded(
                EscalationLevel.L0, 
                "Complaint is within SLA (due in " + Math.abs(daysOverdue) + " days)"
            );
        }

        // Determine required escalation level based on days overdue
        EscalationLevel requiredLevel = determineRequiredLevel(daysOverdue);
        EscalationLevel currentLevel = getCurrentEscalationLevel(complaint);

        // Check if escalation is needed
        if (requiredLevel.isHigherThan(currentLevel)) {
            return EscalationResult.escalationRequired(
                currentLevel,
                requiredLevel,
                (int) daysOverdue,
                complaint.getSlaDeadline(),
                buildReason(daysOverdue, slaDeadlineDate, requiredLevel)
            );
        }

        // Already at or above required level
        return EscalationResult.noEscalationNeeded(
            currentLevel,
            "Already escalated to " + currentLevel.getDisplayName() + 
            " (required: " + requiredLevel.getDisplayName() + ")"
        );
    }

    /**
     * Convenience method using current date.
     */
    public EscalationResult evaluate(Complaint complaint) {
        return evaluate(complaint, LocalDate.now());
    }

    /**
     * Determines required escalation level based solely on days overdue.
     * 
     * Logic is deliberately simple and linear:
     * - >3 days overdue → L2
     * - >1 day overdue → L1
     * - Otherwise → L0
     */
    private EscalationLevel determineRequiredLevel(long daysOverdue) {
        if (daysOverdue > L2_THRESHOLD_DAYS) {
            return EscalationLevel.L2;
        } else if (daysOverdue > L1_THRESHOLD_DAYS) {
            return EscalationLevel.L1;
        }
        return EscalationLevel.L0;
    }

    /**
     * Gets current escalation level from complaint.
     * Handles null/missing escalationLevel field gracefully.
     */
    private EscalationLevel getCurrentEscalationLevel(Complaint complaint) {
        Integer level = complaint.getEscalationLevel();
        if (level == null || level < 0) {
            return EscalationLevel.L0;
        }
        try {
            return EscalationLevel.fromLevel(level);
        } catch (IllegalArgumentException e) {
            // Unknown level - treat as L0
            return EscalationLevel.L0;
        }
    }

    /**
     * Builds human-readable escalation reason.
     */
    private String buildReason(long daysOverdue, LocalDate slaDeadline, EscalationLevel newLevel) {
        return String.format(
            "SLA breached by %d day(s). Deadline was %s. Escalating to %s.",
            daysOverdue, slaDeadline, newLevel.getDisplayName()
        );
    }

    /**
     * Result object encapsulating escalation evaluation outcome.
     * Immutable - created via factory methods.
     */
    public record EscalationResult(
        boolean escalationRequired,
        EscalationLevel currentLevel,
        EscalationLevel requiredLevel,
        int daysOverdue,
        LocalDateTime slaDeadline,
        String reason
    ) {
        /**
         * Factory for when escalation IS needed.
         */
        public static EscalationResult escalationRequired(
                EscalationLevel currentLevel,
                EscalationLevel requiredLevel,
                int daysOverdue,
                LocalDateTime slaDeadline,
                String reason) {
            return new EscalationResult(true, currentLevel, requiredLevel, daysOverdue, slaDeadline, reason);
        }

        /**
         * Factory for when escalation is NOT needed.
         */
        public static EscalationResult noEscalationNeeded(EscalationLevel currentLevel, String reason) {
            return new EscalationResult(false, currentLevel, currentLevel, 0, null, reason);
        }
    }
}
