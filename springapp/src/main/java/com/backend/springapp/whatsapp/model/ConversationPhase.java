package com.backend.springapp.whatsapp.model;

/**
 * Explicit conversation phases for agentic discipline.
 * 
 * IMPORTANT: The AI must respect these phases and NOT skip ahead.
 * Phase transitions are managed by the WhatsAppAgentService, not by Gemini.
 * 
 * PHASE FLOW:
 * 
 *   GREETING (new user)
 *       │
 *       ▼
 *   AWAITING_REGISTRATION ──► (user provides name)
 *       │
 *       ▼
 *   REGISTERED_IDLE ◄───────── (returning registered user)
 *       │
 *       ├──► "report/complaint" ──► AWAITING_ISSUE_DESCRIPTION
 *       │                                   │
 *       │                                   ▼
 *       │                          AWAITING_LOCATION
 *       │                                   │
 *       │                                   ▼
 *       │                          AWAITING_IMAGE_OPTIONAL
 *       │                                   │
 *       │                                   ▼
 *       │                          READY_TO_FILE ──► COMPLAINT_FILED
 *       │                                                   │
 *       ├──► "status/my complaints" ──► VIEWING_COMPLAINTS ◄┘
 *       │
 *       └──► "help" ──► SHOWING_HELP
 */
public enum ConversationPhase {
    
    /**
     * Brand new conversation - check registration status
     */
    GREETING,
    
    /**
     * User is not registered, waiting for them to provide their name.
     * ONLY the register_user function is allowed in this phase.
     */
    AWAITING_REGISTRATION,
    
    /**
     * User is registered and idle - can start new complaint or check status.
     * This is the "home" phase for registered users.
     */
    REGISTERED_IDLE,
    
    /**
     * User wants to file a complaint but hasn't described the issue yet.
     * Waiting for issue/problem description.
     */
    AWAITING_ISSUE_DESCRIPTION,
    
    /**
     * Issue described, now waiting for location.
     */
    AWAITING_LOCATION,
    
    /**
     * Issue + location provided, optionally asking for image.
     * Can proceed without image after one prompt.
     */
    AWAITING_IMAGE_OPTIONAL,
    
    /**
     * All required info collected (issue + location), ready to file.
     * The create_complaint function is allowed here.
     */
    READY_TO_FILE,
    
    /**
     * Complaint was just filed - show confirmation, then return to REGISTERED_IDLE.
     */
    COMPLAINT_FILED,
    
    /**
     * User is viewing their complaints list or a specific complaint.
     */
    VIEWING_COMPLAINTS,
    
    /**
     * Error or unclear state - ask for clarification before proceeding.
     */
    AWAITING_CLARIFICATION;
    
    /**
     * Check if complaint creation is allowed in this phase.
     */
    public boolean canCreateComplaint() {
        return this == READY_TO_FILE;
    }
    
    /**
     * Check if registration is allowed in this phase.
     */
    public boolean canRegister() {
        return this == AWAITING_REGISTRATION || this == GREETING;
    }
    
    /**
     * Check if this is an active complaint-filing flow.
     */
    public boolean isInComplaintFlow() {
        return this == AWAITING_ISSUE_DESCRIPTION 
            || this == AWAITING_LOCATION 
            || this == AWAITING_IMAGE_OPTIONAL
            || this == READY_TO_FILE;
    }
}
