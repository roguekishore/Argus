package com.backend.springapp.notification;

/**
 * Defines the types of notifications that can be sent to users.
 * 
 * DESIGN RATIONALE:
 * - Each type maps to a specific user-facing event
 * - Types determine the notification template/format
 * - Enables filtering notifications by type in queries
 * 
 * NOTIFICATION vs AUDIT:
 * - Audit records WHAT happened (system-facing, immutable)
 * - Notifications tell users WHY it matters (user-facing, dismissible)
 * 
 * Example mapping:
 * - STATE_CHANGE audit → COMPLAINT_STATUS_CHANGED notification to citizen
 * - ESCALATION audit → ESCALATION_ALERT notification to department head
 */
public enum NotificationType {
    
    /**
     * Complaint status has changed.
     * Sent to: Citizen who filed the complaint
     * Triggers: Any state transition (FILED→OPEN, IN_PROGRESS→RESOLVED, etc.)
     */
    COMPLAINT_STATUS_CHANGED,
    
    /**
     * Complaint has been assigned to staff.
     * Sent to: Staff member who received the assignment
     * Triggers: Staff assignment by department head
     */
    COMPLAINT_ASSIGNED,
    
    /**
     * Complaint has been escalated.
     * Sent to: Department head (L1), Commissioner (L2), etc.
     * Triggers: Auto or manual escalation events
     */
    ESCALATION_ALERT,
    
    /**
     * Complaint has been resolved.
     * Sent to: Citizen who filed the complaint
     * Triggers: State change to RESOLVED
     */
    COMPLAINT_RESOLVED,
    
    /**
     * Request for citizen to rate the resolution.
     * Sent to: Citizen who filed the complaint
     * Triggers: After RESOLVED state, prompts for feedback
     */
    RATING_REQUEST,
    
    /**
     * SLA deadline is approaching.
     * Sent to: Assigned staff, department head
     * Triggers: Scheduled job when deadline is near
     */
    SLA_WARNING,
    
    /**
     * Complaint has been closed.
     * Sent to: Citizen who filed the complaint
     * Triggers: State change to CLOSED
     */
    COMPLAINT_CLOSED
}
