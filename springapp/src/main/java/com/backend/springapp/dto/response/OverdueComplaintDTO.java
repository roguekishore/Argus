package com.backend.springapp.dto.response;

import java.time.LocalDateTime;
import java.util.List;

import com.backend.springapp.enums.ComplaintStatus;
import com.backend.springapp.enums.EscalationLevel;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for overdue complaints summary.
 * Used by the GET /api/escalations/overdue endpoint.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OverdueComplaintDTO {
    
    private Long complaintId;
    private String title;
    private ComplaintStatus status;
    private LocalDateTime slaDeadline;
    private Integer daysOverdue;
    private EscalationLevel currentEscalationLevel;
    private EscalationLevel requiredEscalationLevel;
    private Boolean needsEscalation;
    private String departmentName;
    private Long departmentId;
    private List<EscalationEventDTO> escalationHistory;
}
