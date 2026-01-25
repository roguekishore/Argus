package com.backend.springapp.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.backend.springapp.enums.EscalationLevel;
import com.backend.springapp.model.EscalationEvent;

/**
 * Repository for EscalationEvent entity.
 * 
 * Key design decisions:
 * - Optimized for WRITE-HEAVY workload (scheduler creates many events)
 * - Queries designed for idempotency checks and audit retrieval
 * - No delete operations - escalation history is immutable
 */
@Repository
public interface EscalationEventRepository extends JpaRepository<EscalationEvent, Long> {

    /**
     * Find all escalation events for a complaint, ordered chronologically.
     * Used for displaying escalation history on complaint detail view.
     */
    List<EscalationEvent> findByComplaintIdOrderByEscalatedAtAsc(Long complaintId);

    /**
     * Check if a specific escalation level was already recorded for a complaint.
     * CRITICAL for idempotency - prevents duplicate escalation events.
     * 
     * @param complaintId The complaint to check
     * @param level The escalation level to check for
     * @return true if escalation to this level already exists
     */
    boolean existsByComplaintIdAndEscalationLevel(Long complaintId, EscalationLevel level);

    /**
     * Find the most recent escalation event for a complaint.
     * Useful for determining current escalation state without querying Complaint.
     */
    Optional<EscalationEvent> findTopByComplaintIdOrderByEscalatedAtDesc(Long complaintId);

    /**
     * Find the highest escalation level recorded for a complaint.
     * Uses native query for efficiency - escalation levels are strings in DB.
     */
    @Query("""
        SELECT e FROM EscalationEvent e 
        WHERE e.complaintId = :complaintId 
        ORDER BY e.escalationLevel DESC 
        LIMIT 1
        """)
    Optional<EscalationEvent> findHighestEscalationForComplaint(@Param("complaintId") Long complaintId);

    /**
     * Find all escalation events created within a time range.
     * Used for generating escalation reports.
     */
    List<EscalationEvent> findByEscalatedAtBetweenOrderByEscalatedAtDesc(
            LocalDateTime start, LocalDateTime end);

    /**
     * Count escalations by level for reporting.
     */
    long countByEscalationLevel(EscalationLevel level);

    /**
     * Find all escalation events for multiple complaints (batch operation).
     * Optimized for dashboard views showing multiple complaints.
     */
    @Query("""
        SELECT e FROM EscalationEvent e 
        WHERE e.complaintId IN :complaintIds 
        ORDER BY e.complaintId, e.escalatedAt ASC
        """)
    List<EscalationEvent> findByComplaintIdIn(@Param("complaintIds") List<Long> complaintIds);

    /**
     * Find complaints escalated to a specific level that haven't been resolved.
     * Useful for generating "pending at L2" reports.
     */
    @Query("""
        SELECT e FROM EscalationEvent e 
        JOIN e.complaint c 
        WHERE e.escalationLevel = :level 
        AND c.status NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED') 
        ORDER BY e.escalatedAt ASC
        """)
    List<EscalationEvent> findActiveEscalationsByLevel(@Param("level") EscalationLevel level);
}
