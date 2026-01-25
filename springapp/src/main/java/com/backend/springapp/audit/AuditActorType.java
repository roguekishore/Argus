package com.backend.springapp.audit;

/**
 * Defines who or what performed the audited action.
 * 
 * DESIGN RATIONALE:
 * - Distinguishes between human-initiated and automated actions
 * - Critical for accountability: "Was this a system decision or human decision?"
 * - Enables filtering: "Show me all automated escalations" vs "Show me manual actions"
 * - Supports investigation: When issues arise, knowing the actor type guides resolution
 * 
 * WHY ONLY TWO TYPES:
 * - USER: Any authenticated human user (citizen, staff, admin, etc.)
 *   The specific role is captured in UserContext, not here.
 *   Actor ID references the user record for detailed lookup.
 * 
 * - SYSTEM: Automated/scheduled processes
 *   Examples: SLA breach escalation, AI categorization, scheduled jobs
 *   Actor ID is NULL for system actions (no human responsible)
 * 
 * DESIGN DECISION - WHY NOT SEPARATE AI/SCHEDULER/etc.?
 * - Simplicity: All automated actions share the same accountability model
 * - The "reason" field in AuditLog captures specifics (e.g., "AI categorization", "SLA breach")
 * - Adding more actor types adds complexity without clear benefit
 * - If needed, actor types can be extended without breaking existing data
 * 
 * @see AuditLog for how actor information is persisted
 * @see AuditActorContext for the wrapper that combines type and ID
 */
public enum AuditActorType {
    
    /**
     * Action performed by an authenticated human user.
     * 
     * The actorId in AuditLog will contain the user's ID.
     * Use this for:
     * - All authenticated user actions
     * - Admin overrides
     * - Manual escalations
     * - State transitions by staff/citizens
     */
    USER,
    
    /**
     * Action performed by an automated system process.
     * 
     * The actorId in AuditLog will be NULL.
     * Use this for:
     * - Scheduled escalation checks (SLA breach detection)
     * - AI-driven categorization and routing
     * - Automated notifications
     * - System maintenance operations
     */
    SYSTEM
}
