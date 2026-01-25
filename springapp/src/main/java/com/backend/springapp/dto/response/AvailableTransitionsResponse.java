package com.backend.springapp.dto.response;

import com.backend.springapp.enums.ComplaintStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;

/**
 * Response DTO containing available state transitions for a complaint.
 * 
 * Used by the UI to:
 * - Show available action buttons (Resolve, Close, Cancel, etc.)
 * - Populate dropdown menus with valid next states
 * - Disable buttons for unavailable transitions
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvailableTransitionsResponse {
    
    /**
     * The complaint ID.
     */
    private Long complaintId;
    
    /**
     * Current state of the complaint.
     */
    private ComplaintStatus currentState;
    
    /**
     * Whether the complaint is in a terminal state (CLOSED or CANCELLED).
     * If true, availableTransitions will be empty.
     */
    private boolean isTerminal;
    
    /**
     * Set of states that the current user can transition to.
     * Empty if:
     * - Complaint is in terminal state
     * - User's role doesn't allow any transitions from current state
     * - Contextual checks (ownership, department) don't pass
     */
    private Set<ComplaintStatus> availableTransitions;
    
    /**
     * Timestamp-related information for context.
     */
    private LocalDateTime startTime;
    private LocalDateTime resolvedTime;
    private LocalDateTime closedTime;
    
    /**
     * Factory method to create from ComplaintStateInfo.
     */
    public static AvailableTransitionsResponse from(
            com.backend.springapp.service.ComplaintStateService.ComplaintStateInfo info) {
        return AvailableTransitionsResponse.builder()
            .complaintId(info.complaintId())
            .currentState(info.currentState())
            .isTerminal(info.isTerminal())
            .availableTransitions(info.availableTransitions())
            .startTime(info.startTime())
            .resolvedTime(info.resolvedTime())
            .closedTime(info.closedTime())
            .build();
    }
}
