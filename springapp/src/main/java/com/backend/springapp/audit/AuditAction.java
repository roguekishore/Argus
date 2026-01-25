package com.backend.springapp.audit;

/**
 * Defines the types of actions that can be audited in the system.
 * 
 * DESIGN RATIONALE:
 * - Enum ensures type-safety and prevents invalid action types
 * - Each action represents a significant business event that requires audit trail
 * - Actions are GENERIC - not tied to specific entities, allowing reuse
 * - New audit actions can be added without modifying existing code
 * 
 * WHY THESE SPECIFIC ACTIONS:
 * - STATE_CHANGE: Complaint lifecycle tracking (FILED → OPEN → IN_PROGRESS → etc.)
 * - ESCALATION: SLA breach tracking and accountability (auto & manual escalations)
 * - ASSIGNMENT: Chain of custody tracking (who was responsible at each point)
 * - SLA_UPDATE: Configuration change audit (who changed deadlines and why)
 * - SUSPENSION: Future-proof for system pause scenarios (maintenance, holidays)
 * 
 * @see AuditEntityType for the entities these actions can apply to
 * @see AuditLog for how actions are persisted
 */
public enum AuditAction {
    
    /**
     * Entity state/status changed.
     * For complaints: FILED → OPEN, IN_PROGRESS → RESOLVED, etc.
     * For escalations: Level changes tracked via this action type.
     */
    STATE_CHANGE,
    
    /**
     * Escalation event occurred.
     * Includes both:
     * - AUTO: System-triggered due to SLA breach
     * - MANUAL: User-initiated escalation with justification
     */
    ESCALATION,
    
    /**
     * Assignment changed.
     * Tracks:
     * - Department assignment: Which department is responsible
     * - Staff assignment: Which staff member is handling
     * - Reassignments: When and why assignment changed
     */
    ASSIGNMENT,
    
    /**
     * SLA configuration updated.
     * Tracks changes to:
     * - SLA deadlines per category
     * - Priority configurations
     * - Escalation thresholds
     */
    SLA_UPDATE,
    
    /**
     * Suspension state changed.
     * Future-proof support for:
     * - SLA clock pauses (citizen clarification needed)
     * - System-wide suspensions (holidays, maintenance)
     * - Department-specific suspensions
     */
    SUSPENSION,
    
    /**
     * Generic create action.
     * Used when a new entity is created.
     */
    CREATE,
    
    /**
     * Generic accept action.
     * Used when something is accepted/approved.
     */
    ACCEPT,
    
    /**
     * Generic dispute/reject action.
     * Used when something is disputed or rejected.
     */
    DISPUTE
}
