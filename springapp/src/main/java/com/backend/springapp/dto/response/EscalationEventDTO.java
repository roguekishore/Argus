package com.backend.springapp.dto.response;

import java.time.LocalDateTime;

import com.backend.springapp.enums.EscalationLevel;
import com.backend.springapp.enums.UserType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for returning escalation event information via API.
 * Excludes internal fields and entity relationships.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class EscalationEventDTO {
    
    private Long id;
    private Long complaintId;
    private EscalationLevel escalationLevel;
    private EscalationLevel previousLevel;
    private LocalDateTime escalatedAt;
    private UserType escalatedToRole;
    private String escalatedToRoleDisplayName;
    private String reason;
    private Integer daysOverdue;
    private LocalDateTime slaDeadline;
    private Boolean isAutomated;
}
