package com.backend.springapp.whatsapp.model;

/**
 * Conversation states for WhatsApp session management
 */
public enum SessionState {
    
    // Initial state - no active conversation
    IDLE,
    
    // New user needs to register (provide name)
    ONBOARDING_AWAITING_NAME,
    
    // Collecting complaint information
    COLLECTING_AWAITING_ISSUE,        // User hasn't described the problem yet
    COLLECTING_AWAITING_LOCATION,     // Problem described, need location
    COLLECTING_AWAITING_DETAILS,      // Have basics, collecting more details
    COLLECTING_CONFIRMING,            // All info collected, awaiting confirmation
    
    // Complaint submitted, might need follow-up
    COMPLAINT_SUBMITTED,
    
    // User checking status
    STATUS_CHECKING,
    STATUS_VIEWING_DETAILS,
    
    // Rating/feedback
    FEEDBACK_AWAITING_RATING,
    FEEDBACK_AWAITING_COMMENTS,
    
    // User wants to escalate
    ESCALATING,
    
    // Error/unclear state
    AWAITING_CLARIFICATION
}
