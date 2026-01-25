package com.backend.springapp.audit;

import com.backend.springapp.security.UserContext;

/**
 * Encapsulates actor information for audit logging.
 * 
 * WHY THIS RECORD EXISTS:
 * - Provides a clean abstraction between UserContext and audit system
 * - Allows creation of SYSTEM actors without needing a UserContext
 * - Single responsibility: represents "who did this" for audit purposes
 * - Immutable by design (Java record) - actor context should never change
 * 
 * DESIGN DECISIONS:
 * 1. Uses record for immutability and conciseness
 * 2. actorId is nullable (null for SYSTEM actors)
 * 3. Factory methods for common scenarios (user-based, system)
 * 4. Does NOT include role or department - that's UserContext's job
 *    The audit log stores the actor ID; detailed info is looked up if needed
 * 
 * USAGE PATTERNS:
 * - From controller/service with UserContext:
 *   AuditActorContext.fromUserContext(userContext)
 * 
 * - From scheduled job or AI process:
 *   AuditActorContext.system()
 * 
 * @param actorType The type of actor (USER or SYSTEM)
 * @param actorId   The user ID if USER, null if SYSTEM
 */
public record AuditActorContext(
    AuditActorType actorType,
    Long actorId
) {
    
    /**
     * Compact constructor with validation.
     * Ensures USER actors always have an ID, SYSTEM actors never have one.
     */
    public AuditActorContext {
        if (actorType == AuditActorType.USER && actorId == null) {
            throw new IllegalArgumentException("USER actor must have an actorId");
        }
        if (actorType == AuditActorType.SYSTEM && actorId != null) {
            throw new IllegalArgumentException("SYSTEM actor must not have an actorId");
        }
    }
    
    /**
     * Create actor context from an existing UserContext.
     * 
     * This is the primary way to create actor context in request-handling code.
     * Handles the SYSTEM role specially (no user ID for system actions).
     * 
     * @param userContext The current user's context
     * @return AuditActorContext representing this user
     */
    public static AuditActorContext fromUserContext(UserContext userContext) {
        if (userContext == null) {
            throw new IllegalArgumentException("UserContext cannot be null");
        }
        
        // SYSTEM role in UserContext maps to SYSTEM actor type
        if (userContext.role() == com.backend.springapp.security.UserRole.SYSTEM) {
            return system();
        }
        
        return new AuditActorContext(AuditActorType.USER, userContext.userId());
    }
    
    /**
     * Create actor context for system/automated actions.
     * 
     * Use this when:
     * - Scheduled jobs trigger state changes
     * - AI categorization assigns complaints
     * - Automatic SLA breach escalations occur
     * - Any action without human initiation
     * 
     * @return AuditActorContext for SYSTEM actor
     */
    public static AuditActorContext system() {
        return new AuditActorContext(AuditActorType.SYSTEM, null);
    }
    
    /**
     * Create actor context for a specific user.
     * 
     * Use this when you have a user ID but not a full UserContext,
     * such as in batch processing where users are looked up by ID.
     * 
     * @param userId The user's ID
     * @return AuditActorContext for this user
     */
    public static AuditActorContext forUser(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId cannot be null for USER actor");
        }
        return new AuditActorContext(AuditActorType.USER, userId);
    }
    
    /**
     * Check if this is a system action.
     * Convenience method for conditional logic.
     */
    public boolean isSystemAction() {
        return actorType == AuditActorType.SYSTEM;
    }
    
    /**
     * Check if this is a user action.
     * Convenience method for conditional logic.
     */
    public boolean isUserAction() {
        return actorType == AuditActorType.USER;
    }
}
