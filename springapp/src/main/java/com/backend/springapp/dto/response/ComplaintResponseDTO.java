package com.backend.springapp.dto.response;

import java.time.LocalDateTime;

import com.backend.springapp.enums.ComplaintStatus;
import com.backend.springapp.enums.Priority;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO that shows complaint details + AI analysis
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ComplaintResponseDTO {

    // Basic complaint info
    private Long complaintId;
    private String title;
    private String description;
    private String location;
    private ComplaintStatus status;
    private LocalDateTime createdTime;

    // Citizen info
    private Long citizenId;

    // AI-assigned fields
    private String categoryName;
    private String departmentName;
    private Priority priority;
    private Integer slaDaysAssigned;
    private LocalDateTime slaDeadline;

    // AI transparency
    private String aiReasoning;
    private Double aiConfidence;

    // Assignment (filled later by dept head)
    private Long staffId;
    private String staffName;
}
