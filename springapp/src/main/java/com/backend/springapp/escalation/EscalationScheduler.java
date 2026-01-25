package com.backend.springapp.escalation;

import java.time.LocalDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.backend.springapp.enums.ComplaintStatus;
import com.backend.springapp.model.Complaint;
import com.backend.springapp.repository.ComplaintRepository;

import lombok.RequiredArgsConstructor;

/**
 * Scheduled job for automatic escalation processing.
 * 
 * WHY a separate scheduler component?
 * 1. SEPARATION OF CONCERNS: Scheduling logic is isolated from business logic
 * 2. TESTABILITY: EscalationService can be tested without scheduler
 * 3. FLEXIBILITY: Can easily change schedule without touching business logic
 * 4. MONITORING: Clear entry point for logging/metrics
 * 
 * Schedule: Runs every 6 hours by default
 * - 00:00, 06:00, 12:00, 18:00
 * - Configurable via application.properties
 * 
 * Design Decisions:
 * - Fetches ALL active complaints each run (simple, reliable)
 * - Batch processing delegated to EscalationService
 * - Errors in individual complaints don't stop entire batch
 * - Comprehensive logging for operational visibility
 */
@Component
@RequiredArgsConstructor
public class EscalationScheduler {

    private static final Logger log = LoggerFactory.getLogger(EscalationScheduler.class);

    private final EscalationService escalationService;
    private final ComplaintRepository complaintRepository;

    /**
     * Main scheduled method - runs every 6 hours.
     * 
     * Cron expression: 0 0 0/6 * * *
     * - Second: 0
     * - Minute: 0
     * - Hour: every 6 hours starting at 0 (0, 6, 12, 18)
     * - Day of month: every day
     * - Month: every month
     * - Day of week: every day
     * 
     * Can be overridden in application.properties:
     * escalation.scheduler.cron=0 0 0/6 * * *
     */
    @Scheduled(cron = "${escalation.scheduler.cron:0 0 0/6 * * *}")
    public void processScheduledEscalations() {
        LocalDateTime startTime = LocalDateTime.now();
        log.info("=== ESCALATION SCHEDULER STARTED at {} ===", startTime);

        try {
            // Step 1: Fetch all active complaints that need escalation check
            List<Complaint> activeComplaints = fetchActiveComplaints();
            log.info("Found {} active complaints to check for escalation", activeComplaints.size());

            if (activeComplaints.isEmpty()) {
                log.info("No active complaints to process. Scheduler complete.");
                return;
            }

            // Step 2: Process escalations in batch
            int escalationCount = escalationService.processEscalationBatch(activeComplaints);

            // Step 3: Log summary
            LocalDateTime endTime = LocalDateTime.now();
            long durationMs = java.time.Duration.between(startTime, endTime).toMillis();
            
            log.info("=== ESCALATION SCHEDULER COMPLETED ===");
            log.info("  Complaints processed: {}", activeComplaints.size());
            log.info("  Escalations performed: {}", escalationCount);
            log.info("  Duration: {} ms", durationMs);

        } catch (Exception e) {
            log.error("ESCALATION SCHEDULER FAILED: {}", e.getMessage(), e);
            // Don't rethrow - scheduler should continue on next cycle
        }
    }

    /**
     * Manual trigger for escalation processing.
     * Useful for testing or admin-initiated escalation runs.
     * 
     * @return Number of escalations performed
     */
    public int triggerManualEscalationRun() {
        log.info("Manual escalation run triggered");
        List<Complaint> activeComplaints = fetchActiveComplaints();
        return escalationService.processEscalationBatch(activeComplaints);
    }

    /**
     * Fetches all complaints in active states.
     * 
     * Active states for escalation purposes:
     * - FILED: Newly filed, not yet picked up
     * - OPEN: Opened but not in progress
     * - IN_PROGRESS: Being worked on
     * - HOLD: Temporarily on hold (still needs monitoring)
     * - RESOLVED: Resolved but not closed (pending citizen confirmation)
     * 
     * Excluded states:
     * - CLOSED: Terminal state, no escalation needed
     * - CANCELLED: Terminal state, no escalation needed
     */
    private List<Complaint> fetchActiveComplaints() {
        return complaintRepository.findAll().stream()
                .filter(c -> isActiveForEscalation(c.getStatus()))
                .filter(c -> c.getSlaDeadline() != null) // Must have SLA to escalate
                .toList();
    }

    /**
     * Determines if a complaint status is active for escalation purposes.
     */
    private boolean isActiveForEscalation(ComplaintStatus status) {
        if (status == null) {
            return false;
        }
        return switch (status) {
            case FILED, OPEN, IN_PROGRESS, HOLD, RESOLVED -> true;
            case CLOSED, CANCELLED -> false;
        };
    }
}
