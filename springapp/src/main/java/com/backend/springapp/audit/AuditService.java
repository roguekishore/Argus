package com.backend.springapp.audit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Centralized service for recording audit logs.
 * 
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  WHY CENTRALIZED AUDIT LOGGING?                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  1. SINGLE RESPONSIBILITY: One service owns all audit writes                 ║
 * ║     - Consistent validation and formatting                                   ║
 * ║     - Single place to add future enhancements (async, batching, events)      ║
 * ║                                                                              ║
 * ║  2. SEPARATION OF CONCERNS: Business logic stays in domain services          ║
 * ║     - ComplaintStateService focuses on state transitions                     ║
 * ║     - EscalationService focuses on escalation rules                          ║
 * ║     - AuditService focuses on audit trail integrity                          ║
 * ║                                                                              ║
 * ║  3. TESTABILITY: Easy to mock in unit tests                                  ║
 * ║     - Domain services can be tested without audit side effects               ║
 * ║     - Audit service can be tested independently                              ║
 * ║                                                                              ║
 * ║  4. EXTENSIBILITY: Future enhancements without touching business code        ║
 * ║     - Add async processing for high-volume scenarios                         ║
 * ║     - Add event publishing for real-time dashboards                          ║
 * ║     - Add compression/archival for old logs                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * USAGE PATTERN:
 * - Domain services call AuditService.record() after successful business operations
 * - NEVER call AuditService from controllers directly
 * - ALWAYS pass actor context (USER or SYSTEM)
 * - Provide meaningful reason for changes when applicable
 * 
 * TRANSACTION STRATEGY:
 * - Uses REQUIRES_NEW propagation for audit writes
 * - Ensures audit logs are persisted even if outer transaction rolls back
 * - This is intentional: we want to audit ATTEMPTS, not just successes
 * - For strict consistency (audit only on success), use Propagation.REQUIRED
 * 
 * @see AuditLog for the entity being created
 * @see AuditActorContext for actor information
 */
@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PRIMARY API: Generic record method
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Record an audit log entry.
     * 
     * This is the SINGLE ENTRY POINT for all audit writes in the system.
     * All other methods in this service delegate to this one.
     * 
     * TRANSACTION NOTE:
     * Uses REQUIRES_NEW to ensure audit log is persisted independently.
     * If the calling transaction fails, the audit log still captures the attempt.
     * 
     * @param entityType  Type of entity being audited (e.g., COMPLAINT)
     * @param entityId    ID of the entity (as String for flexibility)
     * @param action      Type of action (e.g., STATE_CHANGE)
     * @param oldValue    Value before change (nullable for creation)
     * @param newValue    Value after change (nullable for deletion)
     * @param actor       Actor context (USER or SYSTEM)
     * @param reason      Human-readable reason (nullable)
     * @return The created AuditLog entity
     * @throws IllegalArgumentException if required fields are null
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLog record(
            AuditEntityType entityType,
            String entityId,
            AuditAction action,
            String oldValue,
            String newValue,
            AuditActorContext actor,
            String reason) {
        
        // Validate required fields
        validateRequired(entityType, "entityType");
        validateRequired(entityId, "entityId");
        validateRequired(action, "action");
        validateRequired(actor, "actor");

        // Build the audit log
        AuditLog auditLog = AuditLog.builder()
                .entityType(entityType)
                .entityId(entityId)
                .action(action)
                .oldValue(oldValue)
                .newValue(newValue)
                .actorType(actor.actorType())
                .actorId(actor.actorId())
                .reason(reason)
                .build();

        // Persist
        AuditLog saved = auditLogRepository.save(auditLog);

        // Log for debugging (structured logging for production monitoring)
        log.info("AUDIT: entity={}:{}, action={}, actor={}:{}, old={}, new={}",
                entityType, entityId, action, 
                actor.actorType(), actor.actorId(),
                truncate(oldValue, 50), truncate(newValue, 50));

        return saved;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CONVENIENCE METHODS: Semantic APIs for common audit scenarios
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Record a state change for a complaint.
     * 
     * This is the most common audit scenario.
     * Wraps the generic record() with complaint-specific semantics.
     * 
     * @param complaintId  The complaint ID
     * @param oldStatus    Previous status (e.g., "FILED")
     * @param newStatus    New status (e.g., "OPEN")
     * @param actor        Who made the change
     * @param reason       Why the change was made (optional)
     * @return The created AuditLog
     */
    public AuditLog recordComplaintStateChange(
            Long complaintId,
            String oldStatus,
            String newStatus,
            AuditActorContext actor,
            String reason) {
        
        return record(
                AuditEntityType.COMPLAINT,
                String.valueOf(complaintId),
                AuditAction.STATE_CHANGE,
                oldStatus,
                newStatus,
                actor,
                reason);
    }

    /**
     * Record an escalation event.
     * 
     * Used by EscalationService when complaints are escalated
     * (automatically due to SLA breach or manually by staff).
     * 
     * @param complaintId    The complaint being escalated
     * @param previousLevel  Previous escalation level (e.g., "NONE", "L1")
     * @param newLevel       New escalation level (e.g., "L1", "L2")
     * @param actor          Who/what triggered the escalation
     * @param reason         Why escalation occurred (e.g., "SLA breached by 2 days")
     * @return The created AuditLog
     */
    public AuditLog recordEscalation(
            Long complaintId,
            String previousLevel,
            String newLevel,
            AuditActorContext actor,
            String reason) {
        
        return record(
                AuditEntityType.COMPLAINT,
                String.valueOf(complaintId),
                AuditAction.ESCALATION,
                previousLevel,
                newLevel,
                actor,
                reason);
    }

    /**
     * Record a staff assignment change.
     * 
     * Used when a complaint is assigned or reassigned to staff.
     * 
     * @param complaintId   The complaint being assigned
     * @param oldStaffId    Previous staff ID (null if unassigned)
     * @param newStaffId    New staff ID (null if unassigning)
     * @param actor         Who made the assignment
     * @param reason        Reason for assignment change (optional)
     * @return The created AuditLog
     */
    public AuditLog recordStaffAssignment(
            Long complaintId,
            Long oldStaffId,
            Long newStaffId,
            AuditActorContext actor,
            String reason) {
        
        String oldValue = oldStaffId != null ? "staff:" + oldStaffId : "unassigned";
        String newValue = newStaffId != null ? "staff:" + newStaffId : "unassigned";
        
        return record(
                AuditEntityType.COMPLAINT,
                String.valueOf(complaintId),
                AuditAction.ASSIGNMENT,
                oldValue,
                newValue,
                actor,
                reason);
    }

    /**
     * Record a department assignment change.
     * 
     * Used when a complaint is routed to a different department.
     * 
     * @param complaintId      The complaint being re-routed
     * @param oldDepartmentId  Previous department ID
     * @param newDepartmentId  New department ID
     * @param actor            Who made the change (often SYSTEM for AI routing)
     * @param reason           Reason for re-routing (optional)
     * @return The created AuditLog
     */
    public AuditLog recordDepartmentAssignment(
            Long complaintId,
            Long oldDepartmentId,
            Long newDepartmentId,
            AuditActorContext actor,
            String reason) {
        
        String oldValue = oldDepartmentId != null ? "dept:" + oldDepartmentId : "unassigned";
        String newValue = newDepartmentId != null ? "dept:" + newDepartmentId : "unassigned";
        
        return record(
                AuditEntityType.COMPLAINT,
                String.valueOf(complaintId),
                AuditAction.ASSIGNMENT,
                oldValue,
                newValue,
                actor,
                reason);
    }

    /**
     * Record an SLA configuration update.
     * 
     * Used when SLA settings are modified.
     * Important for compliance: tracks who changed deadlines and why.
     * 
     * @param slaId     The SLA configuration ID
     * @param oldValue  Previous SLA value (e.g., "5 days")
     * @param newValue  New SLA value (e.g., "7 days")
     * @param actor     Who made the change
     * @param reason    Reason for change (required for compliance)
     * @return The created AuditLog
     */
    public AuditLog recordSLAUpdate(
            Long slaId,
            String oldValue,
            String newValue,
            AuditActorContext actor,
            String reason) {
        
        return record(
                AuditEntityType.SLA,
                String.valueOf(slaId),
                AuditAction.SLA_UPDATE,
                oldValue,
                newValue,
                actor,
                reason);
    }

    /**
     * Record a suspension event (future-proof).
     * 
     * Used when SLA clocks are paused or system suspensions occur.
     * 
     * @param entityType  What is being suspended (COMPLAINT, USER, etc.)
     * @param entityId    ID of the suspended entity
     * @param oldState    Previous suspension state
     * @param newState    New suspension state
     * @param actor       Who initiated the suspension
     * @param reason      Reason for suspension
     * @return The created AuditLog
     */
    public AuditLog recordSuspension(
            AuditEntityType entityType,
            String entityId,
            String oldState,
            String newState,
            AuditActorContext actor,
            String reason) {
        
        return record(
                entityType,
                entityId,
                AuditAction.SUSPENSION,
                oldState,
                newState,
                actor,
                reason);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Validate that a required field is not null.
     */
    private void validateRequired(Object value, String fieldName) {
        if (value == null) {
            throw new IllegalArgumentException(fieldName + " is required for audit logging");
        }
    }

    /**
     * Truncate a string for logging purposes.
     * Prevents log messages from becoming too long.
     */
    private String truncate(String value, int maxLength) {
        if (value == null) {
            return "null";
        }
        if (value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength) + "...";
    }
}
