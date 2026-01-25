package com.backend.springapp.dto.response;

import com.backend.springapp.enums.ComplaintStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response DTO for state transition operations.
 * 
 * Provides comprehensive information about the transition that occurred,
 * useful for UI updates and audit logging.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StateTransitionResponse {
    
    /**
     * The complaint that was transitioned.
     */
    private Long complaintId;
    
    /**
     * The state before the transition.
     */
    private ComplaintStatus previousState;
    
    /**
     * The current state after the transition.
     */
    private ComplaintStatus currentState;
    
    /**
     * The role that performed the transition (e.g., "STAFF", "CITIZEN", "SYSTEM").
     */
    private String transitionedBy;
    
    /**
     * When the transition occurred.
     */
    private LocalDateTime transitionedAt;
    
    /**
     * Human-readable message about the transition.
     */
    private String message;
}
