package com.backend.springapp.audit;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Repository for accessing audit logs.
 * 
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  READ-ONLY BY DESIGN                                                         ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Although JpaRepository provides save/delete methods, they should ONLY be    ║
 * ║  used by AuditService for insertions. Direct modifications or deletions      ║
 * ║  violate the immutability principle of audit logs.                           ║
 * ║                                                                              ║
 * ║  In production, consider:                                                    ║
 * ║  1. Database-level triggers to prevent UPDATE/DELETE                         ║
 * ║  2. Read-only database user for API endpoints                                ║
 * ║  3. Code review policies to prevent misuse                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * QUERY DESIGN PRINCIPLES:
 * - All queries return results ordered by createdAt (oldest first) by default
 *   This provides chronological audit trail for investigation
 * - Entity-centric queries are prioritized (most common use case)
 * - Pagination should be added for production use with large datasets
 * 
 * @see AuditService for the write interface
 * @see AuditController for the read-only API
 */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    // ═══════════════════════════════════════════════════════════════════════════
    // ENTITY-CENTRIC QUERIES: "Show me everything about entity X"
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Find all audit logs for a specific entity, ordered chronologically.
     * 
     * Primary query pattern: "Show me the complete history of complaint #123"
     * Returns oldest first so the timeline reads top-to-bottom.
     * 
     * @param entityType The type of entity (e.g., COMPLAINT)
     * @param entityId   The entity's ID as string
     * @return List of audit logs, oldest first
     */
    List<AuditLog> findByEntityTypeAndEntityIdOrderByCreatedAtAsc(
            AuditEntityType entityType, 
            String entityId);
    
    /**
     * Find all audit logs for a specific entity type.
     * 
     * Use case: "Show me all complaint-related audit events"
     * 
     * @param entityType The type of entity
     * @return List of audit logs, oldest first
     */
    List<AuditLog> findByEntityTypeOrderByCreatedAtAsc(AuditEntityType entityType);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ACTION-CENTRIC QUERIES: "Show me all X type of events"
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Find all audit logs for a specific action type.
     * 
     * Use case: "Show me all escalation events system-wide"
     * 
     * @param action The action type (e.g., ESCALATION)
     * @return List of audit logs, most recent first (for monitoring dashboards)
     */
    List<AuditLog> findByActionOrderByCreatedAtDesc(AuditAction action);
    
    /**
     * Find audit logs for a specific action on a specific entity type.
     * 
     * Use case: "Show me all state changes for complaints"
     * 
     * @param entityType The entity type
     * @param action     The action type
     * @return List of audit logs, most recent first
     */
    List<AuditLog> findByEntityTypeAndActionOrderByCreatedAtDesc(
            AuditEntityType entityType, 
            AuditAction action);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ACTOR-CENTRIC QUERIES: "Show me what user X did"
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Find all audit logs created by a specific user.
     * 
     * Use case: "Show me all actions performed by staff member #456"
     * Critical for user activity investigation.
     * 
     * @param actorId The user's ID
     * @return List of audit logs, most recent first
     */
    List<AuditLog> findByActorIdOrderByCreatedAtDesc(Long actorId);
    
    /**
     * Find all audit logs created by SYSTEM actors.
     * 
     * Use case: "Show me all automated actions"
     * Useful for debugging automated processes.
     * 
     * @return List of audit logs, most recent first
     */
    List<AuditLog> findByActorTypeOrderByCreatedAtDesc(AuditActorType actorType);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // TIME-BASED QUERIES: "Show me what happened in time range"
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Find audit logs within a time range.
     * 
     * Use case: "Show me all activity in the last 24 hours"
     * 
     * @param start Start of time range (inclusive)
     * @param end   End of time range (inclusive)
     * @return List of audit logs, oldest first
     */
    List<AuditLog> findByCreatedAtBetweenOrderByCreatedAtAsc(
            LocalDateTime start, 
            LocalDateTime end);
    
    /**
     * Find audit logs for an entity within a time range.
     * 
     * Use case: "Show me complaint #123 activity yesterday"
     * 
     * @param entityType The entity type
     * @param entityId   The entity ID
     * @param start      Start of time range
     * @param end        End of time range
     * @return List of audit logs, oldest first
     */
    List<AuditLog> findByEntityTypeAndEntityIdAndCreatedAtBetweenOrderByCreatedAtAsc(
            AuditEntityType entityType,
            String entityId,
            LocalDateTime start,
            LocalDateTime end);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // COMPLAINT-SPECIFIC CONVENIENCE QUERIES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Find all audit logs for a complaint by ID.
     * Convenience method that wraps the generic entity query.
     * 
     * This is the most common query pattern, so it deserves a dedicated method.
     * 
     * @param complaintId The complaint ID
     * @return List of audit logs for this complaint, oldest first
     */
    @Query("SELECT a FROM AuditLog a WHERE a.entityType = 'COMPLAINT' AND a.entityId = :complaintId ORDER BY a.createdAt ASC")
    List<AuditLog> findByComplaintId(@Param("complaintId") String complaintId);
    
    /**
     * Find escalation audit logs for a complaint.
     * 
     * Use case: "Show me the escalation history for complaint #123"
     * 
     * @param complaintId The complaint ID
     * @return List of escalation audit logs, oldest first
     */
    @Query("SELECT a FROM AuditLog a WHERE a.entityType = 'COMPLAINT' AND a.entityId = :complaintId AND a.action = 'ESCALATION' ORDER BY a.createdAt ASC")
    List<AuditLog> findEscalationsByComplaintId(@Param("complaintId") String complaintId);
    
    /**
     * Count audit logs for a specific entity.
     * 
     * Use case: Quick check of activity level for an entity.
     * 
     * @param entityType The entity type
     * @param entityId   The entity ID
     * @return Count of audit logs
     */
    long countByEntityTypeAndEntityId(AuditEntityType entityType, String entityId);
}
