package com.backend.springapp.audit;

/**
 * Defines the types of entities that can be audited in the system.
 * 
 * DESIGN RATIONALE:
 * - Enum provides type-safety for entity categorization
 * - Combined with entityId, allows precise identification of audited resource
 * - Generic design: not hardcoded to specific domain objects
 * - Enables filtering audit logs by entity type efficiently
 * 
 * WHY THESE SPECIFIC TYPES:
 * - COMPLAINT: Core business entity - most audit events relate to complaints
 * - ESCALATION: Separate entity type for escalation-specific audit queries
 * - SLA: Configuration changes need separate tracking for compliance
 * - USER: User-related changes (role changes, assignments, deactivations)
 * - SUSPENSION: Future-proof for tracking suspension records as entities
 * 
 * QUERY PATTERNS ENABLED:
 * - "Show me all audit logs for complaint #123"
 * - "Show me all SLA changes in the last month"
 * - "Show me all escalation events for this user's complaints"
 * 
 * @see AuditAction for the actions that can be performed on these entities
 * @see AuditLog for how entity types are persisted
 */
public enum AuditEntityType {
    
    /**
     * Complaint entity.
     * The primary entity in the grievance system.
     * Audits: state changes, assignments, escalations, resolutions.
     */
    COMPLAINT,
    
    /**
     * Escalation record entity.
     * While escalations are tied to complaints, having a separate
     * entity type allows escalation-specific audit queries.
     */
    ESCALATION,
    
    /**
     * SLA configuration entity.
     * Tracks changes to service level agreement configurations.
     * Critical for compliance and accountability.
     */
    SLA,
    
    /**
     * User entity.
     * Tracks significant user-related changes:
     * - Role changes
     * - Department assignments
     * - Account status changes
     */
    USER,
    
    /**
     * Suspension entity.
     * Future-proof for tracking suspension records.
     * Suspensions may pause SLA clocks or system operations.
     */
    SUSPENSION,
    
    /**
     * Resolution proof entity.
     * Tracks proof submissions by staff before resolving complaints.
     * Critical for enforcing proof-before-resolution rule.
     */
    RESOLUTION_PROOF,
    
    /**
     * Citizen signoff entity.
     * Tracks citizen acceptance/rejection of resolutions.
     * Critical for enforcing citizen-only closure rule.
     */
    CITIZEN_SIGNOFF
}
