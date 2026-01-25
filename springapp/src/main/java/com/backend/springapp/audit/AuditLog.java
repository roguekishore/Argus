package com.backend.springapp.audit;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Immutable audit log entity capturing all significant system events.
 * 
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  DESIGN PHILOSOPHY: IMMUTABILITY AS A CORE PRINCIPLE                         ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  This entity is INSERT-ONLY. Audit logs are NEVER updated or deleted.        ║
 * ║  This ensures:                                                               ║
 * ║  1. LEGAL COMPLIANCE: Tamper-proof audit trail for regulatory requirements   ║
 * ║  2. FORENSICS: Complete history for incident investigation                   ║
 * ║  3. ACCOUNTABILITY: Clear chain of responsibility                            ║
 * ║  4. DATA INTEGRITY: No accidental modification of historical records         ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * WHY GENERIC (NOT COMPLAINT-SPECIFIC):
 * - Reusable across different entity types (complaints, SLA, users, escalations)
 * - Single source of truth for all audit queries
 * - Consistent audit format simplifies reporting and compliance
 * - New auditable entities can be added without schema changes
 * 
 * WHY VALUES ARE STORED AS STRINGS:
 * - Different entities have different value types (enums, dates, numbers)
 * - String storage provides flexibility without schema changes per type
 * - JSON/structured values can be stored for complex changes
 * - Enables human-readable audit log exports
 * 
 * INDEXING STRATEGY:
 * - entityType + entityId: Primary query pattern ("all logs for complaint #123")
 * - createdAt: Time-based queries ("all changes in last 24 hours")
 * - actorId: Actor-based queries ("all actions by user #456")
 * - action: Action-based queries ("all escalations today")
 * 
 * @see AuditService for the centralized service that creates these records
 * @see AuditLogRepository for query methods
 */
@Entity
@Table(name = "audit_logs", indexes = {
    @Index(name = "idx_audit_entity", columnList = "entity_type, entity_id"),
    @Index(name = "idx_audit_created_at", columnList = "created_at"),
    @Index(name = "idx_audit_actor", columnList = "actor_id"),
    @Index(name = "idx_audit_action", columnList = "action")
})
@Getter  // Only getters - no setters to enforce immutability
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuditLog {

    /**
     * Primary key, auto-generated.
     * Used internally for database operations only.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ═══════════════════════════════════════════════════════════════════════════
    // WHAT: Entity identification (what was changed?)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * The type of entity being audited.
     * Combined with entityId, uniquely identifies the audited resource.
     * 
     * Examples: COMPLAINT, ESCALATION, SLA, USER
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "entity_type", nullable = false, length = 50)
    private AuditEntityType entityType;

    /**
     * The ID of the specific entity being audited.
     * Stored as String for flexibility (supports numeric and UUID IDs).
     * 
     * Examples: "12345" (complaint ID), "abc-123" (if using UUIDs)
     */
    @Column(name = "entity_id", nullable = false, length = 100)
    private String entityId;

    // ═══════════════════════════════════════════════════════════════════════════
    // HOW: Action details (what happened to the entity?)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * The type of action performed on the entity.
     * 
     * Examples: STATE_CHANGE, ESCALATION, ASSIGNMENT, SLA_UPDATE
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, length = 50)
    private AuditAction action;

    /**
     * The value before the change (nullable for creation events).
     * Stored as String for flexibility across different data types.
     * 
     * Examples:
     * - State change: "FILED" → "OPEN"
     * - Assignment: "null" → "staff:123"
     * - SLA: "5" → "7" (days)
     * 
     * For complex changes, JSON can be stored:
     * {"departmentId": 5, "staffId": null}
     */
    @Column(name = "old_value", columnDefinition = "TEXT")
    private String oldValue;

    /**
     * The value after the change (nullable for deletion events).
     * Stored as String for flexibility across different data types.
     * 
     * See oldValue for examples.
     */
    @Column(name = "new_value", columnDefinition = "TEXT")
    private String newValue;

    // ═══════════════════════════════════════════════════════════════════════════
    // WHO: Actor identification (who made the change?)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * The type of actor who performed the action.
     * 
     * USER = Human user (citizen, staff, admin, etc.)
     * SYSTEM = Automated process (scheduler, AI, etc.)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "actor_type", nullable = false, length = 20)
    private AuditActorType actorType;

    /**
     * The ID of the user who performed the action.
     * NULL if actorType is SYSTEM (automated actions have no human actor).
     * 
     * This is the user ID, not username. Allows joining with User table
     * for detailed actor information if needed.
     */
    @Column(name = "actor_id")
    private Long actorId;

    // ═══════════════════════════════════════════════════════════════════════════
    // WHY: Contextual information (why was this change made?)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Human-readable reason for the change (optional).
     * 
     * Critical for:
     * - Escalations: "SLA breached by 2 days"
     * - Manual overrides: "Customer requested priority handling"
     * - Rejections: "Invalid complaint - out of jurisdiction"
     * 
     * This field enables meaningful audit reports and compliance documentation.
     */
    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    // ═══════════════════════════════════════════════════════════════════════════
    // WHEN: Timestamp (when did this happen?)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Timestamp when the audit log was created.
     * Automatically set by Hibernate, never modified.
     * 
     * This is the source of truth for "when did this change happen?"
     */
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // ═══════════════════════════════════════════════════════════════════════════
    // FACTORY METHODS: Semantic construction patterns
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Create an audit log for a state change event.
     * Convenience method with clear semantics.
     */
    public static AuditLog forStateChange(
            AuditEntityType entityType,
            String entityId,
            String oldState,
            String newState,
            AuditActorContext actor,
            String reason) {
        return AuditLog.builder()
                .entityType(entityType)
                .entityId(entityId)
                .action(AuditAction.STATE_CHANGE)
                .oldValue(oldState)
                .newValue(newState)
                .actorType(actor.actorType())
                .actorId(actor.actorId())
                .reason(reason)
                .build();
    }

    /**
     * Create an audit log for an escalation event.
     * Convenience method with clear semantics.
     */
    public static AuditLog forEscalation(
            String complaintId,
            String previousLevel,
            String newLevel,
            AuditActorContext actor,
            String reason) {
        return AuditLog.builder()
                .entityType(AuditEntityType.COMPLAINT)
                .entityId(complaintId)
                .action(AuditAction.ESCALATION)
                .oldValue(previousLevel)
                .newValue(newLevel)
                .actorType(actor.actorType())
                .actorId(actor.actorId())
                .reason(reason)
                .build();
    }

    /**
     * Create an audit log for an assignment change.
     * Convenience method with clear semantics.
     */
    public static AuditLog forAssignment(
            AuditEntityType entityType,
            String entityId,
            String oldAssignment,
            String newAssignment,
            AuditActorContext actor,
            String reason) {
        return AuditLog.builder()
                .entityType(entityType)
                .entityId(entityId)
                .action(AuditAction.ASSIGNMENT)
                .oldValue(oldAssignment)
                .newValue(newAssignment)
                .actorType(actor.actorType())
                .actorId(actor.actorId())
                .reason(reason)
                .build();
    }
}
