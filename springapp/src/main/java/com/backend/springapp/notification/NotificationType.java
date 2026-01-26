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
    COMPLAINT_CLOSED,
    
    /**
     * Resolution progress update.
     * Sent to: Citizen who filed the complaint
     * Triggers: Staff submits resolution proof
     */
    RESOLUTION_PROGRESS,
    
    /**
     * Resolution disputed by citizen.
     * Sent to: Staff assigned to the complaint
     * Triggers: Citizen rejects resolution
     */
    RESOLUTION_DISPUTED,
    
    /**
     * Dispute received from citizen (pending review).
     * Sent to: Staff assigned to the complaint, Department Head
     * Triggers: Citizen files a dispute with counter-proof
     */
    DISPUTE_RECEIVED,
    
    /**
     * Dispute approved by department head.
     * Sent to: Citizen who filed the dispute
     * Triggers: DEPT_HEAD approves dispute, complaint reopens
     */
    DISPUTE_APPROVED,
    
    /**
     * Dispute rejected by department head.
     * Sent to: Citizen who filed the dispute
     * Triggers: DEPT_HEAD rejects dispute
     */
    DISPUTE_REJECTED,
    
    /**
     * Complaint reopened after dispute approval.
     * Sent to: Staff assigned to the complaint
     * Triggers: Complaint transitions back to IN_PROGRESS after dispute
     */
    COMPLAINT_REOPENED,
    
    /**
     * New complaint assigned to department.
     * Sent to: Department Head of the assigned department
     * Triggers: AI auto-assignment or admin manual routing to department
     */
    DEPARTMENT_ASSIGNMENT,
    
    /**
     * Complaint requires manual routing (low AI confidence).
     * Sent to: Super Admin
     * Triggers: AI confidence below threshold, complaint needs human review
     */
    MANUAL_ROUTING_REQUIRED,
    
    /**
     * Generic notification type.
     * Used for notifications that don't fit other categories.
     */
    GENERIC
}
