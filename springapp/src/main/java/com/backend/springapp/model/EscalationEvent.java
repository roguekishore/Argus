package com.backend.springapp.model;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import com.backend.springapp.enums.EscalationLevel;
import com.backend.springapp.enums.UserType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Immutable audit record for escalation events.
 * 
 * WHY this is separate from Complaint:
 * 1. AUDIT TRAIL: Every escalation is recorded with timestamp and reason
 * 2. SEPARATION OF CONCERNS: Complaint tracks current state; EscalationEvent tracks history
 * 3. IDEMPOTENCY CHECK: We can query if escalation to a level already happened
 * 4. ANALYTICS: Enables SLA breach reports, escalation frequency analysis
 * 
 * This entity is INSERT-ONLY. Once created, escalation events are never modified.
 */
@Entity
@Table(name = "escalation_events", indexes = {
    @Index(name = "idx_escalation_complaint", columnList = "complaint_id"),
    @Index(name = "idx_escalation_level", columnList = "escalation_level"),
    @Index(name = "idx_escalation_time", columnList = "escalated_at")
})
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class EscalationEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Reference to the complaint being escalated.
     * Indexed for efficient lookups.
     */
    @Column(name = "complaint_id", nullable = false)
    private Long complaintId;

    @ManyToOne
    @JoinColumn(name = "complaint_id", insertable = false, updatable = false)
    private Complaint complaint;

    /**
     * The escalation level this event represents.
     * NOT the previous level - this is the NEW level being escalated TO.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "escalation_level", nullable = false)
    private EscalationLevel escalationLevel;

    /**
     * The previous escalation level before this escalation.
     * Useful for tracking escalation progression in audit.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "previous_level", nullable = false)
    private EscalationLevel previousLevel;

    /**
     * Timestamp when escalation occurred.
     * Auto-populated on insert.
     */
    @CreationTimestamp
    @Column(name = "escalated_at", nullable = false)
    private LocalDateTime escalatedAt;

    /**
     * The role now responsible for this complaint.
     * Denormalized from EscalationLevel for query convenience.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "escalated_to_role", nullable = false)
    private UserType escalatedToRole;

    /**
     * Human-readable reason for escalation.
     * Example: "SLA breached by 2 days (deadline was 2026-01-20)"
     */
    @Column(nullable = false, length = 500)
    private String reason;

    /**
     * Days overdue at time of escalation.
     * Useful for metrics and reporting.
     */
    @Column(name = "days_overdue", nullable = false)
    private Integer daysOverdue;

    /**
     * The SLA deadline that was breached.
     * Stored for audit purposes - allows verification even if complaint is later modified.
     */
    @Column(name = "sla_deadline_snapshot", nullable = false)
    private LocalDateTime slaDeadlineSnapshot;

    /**
     * Whether this escalation was triggered automatically (scheduler) or manually.
     * Default: true (automated). Manual escalations would set this to false.
     */
    @Column(name = "is_automated", nullable = false)
    @Builder.Default
    private Boolean isAutomated = true;
}
