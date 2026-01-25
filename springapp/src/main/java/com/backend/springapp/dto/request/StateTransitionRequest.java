package com.backend.springapp.dto.request;

import com.backend.springapp.enums.ComplaintStatus;

import jakarta.validation.constraints.NotNull;

/**
 * Request DTO for state transition endpoint.
 * 
 * Simple and focused - only contains the target state.
 * The complaint ID comes from the URL path.
 * The user context comes from the authentication layer.
 */
public record StateTransitionRequest(
    
    @NotNull(message = "Target state is required")
    ComplaintStatus targetState
    
) {
    
    /**
     * Factory method for creating request.
     */
    public static StateTransitionRequest of(ComplaintStatus targetState) {
        return new StateTransitionRequest(targetState);
    }
}
