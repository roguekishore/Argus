package com.backend.springapp.audit;

import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Getter;

/**
 * Data Transfer Object for audit log API responses.
 * 
 * WHY A SEPARATE DTO:
 * - Decouples API contract from JPA entity
 * - Allows API-specific field naming and formatting
 * - Entity can evolve without breaking API clients
 * - Excludes internal fields (like JPA @Version) from API
 * 
 * IMMUTABLE BY DESIGN:
 * - Uses @Getter only (no setters)
 * - Uses @Builder for construction
 * - Matches the immutability principle of audit logs
 */
@Getter
@Builder
public class AuditLogDTO {

    /**
     * Unique identifier for this audit log entry.
     */
    private final Long id;
    
    /**
     * Type of entity that was audited (e.g., "COMPLAINT", "SLA").
     */
    private final String entityType;
    
    /**
     * ID of the audited entity.
     */
    private final String entityId;
    
    /**
     * Type of action performed (e.g., "STATE_CHANGE", "ESCALATION").
     */
    private final String action;
    
    /**
     * Value before the change (may be null for creation events).
     */
    private final String oldValue;
    
    /**
     * Value after the change (may be null for deletion events).
     */
    private final String newValue;
    
    /**
     * Type of actor who performed the action ("USER" or "SYSTEM").
     */
    private final String actorType;
    
    /**
     * ID of the user who performed the action (null for SYSTEM actions).
     */
    private final Long actorId;
    
    /**
     * Human-readable reason for the change (may be null).
     */
    private final String reason;
    
    /**
     * Timestamp when the audit log was created (ISO 8601 format recommended for API).
     */
    private final LocalDateTime createdAt;

    /**
     * Convert an AuditLog entity to a DTO.
     * 
     * @param entity The AuditLog JPA entity
     * @return AuditLogDTO for API response
     */
    public static AuditLogDTO fromEntity(AuditLog entity) {
        if (entity == null) {
            return null;
        }
        
        return AuditLogDTO.builder()
                .id(entity.getId())
                .entityType(entity.getEntityType() != null ? entity.getEntityType().name() : null)
                .entityId(entity.getEntityId())
                .action(entity.getAction() != null ? entity.getAction().name() : null)
                .oldValue(entity.getOldValue())
                .newValue(entity.getNewValue())
                .actorType(entity.getActorType() != null ? entity.getActorType().name() : null)
                .actorId(entity.getActorId())
                .reason(entity.getReason())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
