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
    private Double latitude;
    private Double longitude;
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
    
    // Manual routing flag (when AI confidence < 0.7)
    private Boolean needsManualRouting;

    // Assignment (filled later by dept head)
    private Long staffId;
    private String staffName;
    
    // Image evidence (NEW)
    private String imageUrl;        // Presigned S3 URL for viewing (temporary, expires)
    private String imageMimeType;   // MIME type of the image
    private String imageAnalysis;   // AI analysis of the image
    private LocalDateTime imageAnalyzedAt;
    
    // Community engagement (upvotes)
    private Integer upvoteCount;        // Number of "Me Too" upvotes
    private Boolean hasUserUpvoted;     // Whether current user has upvoted (for UI)
    
    // Dispute/Signoff info (when complaint has pending or resolved dispute)
    private Boolean hasDispute;             // Whether a dispute exists
    private Boolean disputePending;         // Whether dispute is pending review
    private Boolean disputeApproved;        // Whether dispute was approved (null = pending)
    private String disputeReason;           // Citizen's dispute reason
    private String disputeCounterProofUrl;  // Presigned S3 URL for dispute counter-proof image
    private LocalDateTime disputeCreatedAt; // When dispute was filed
    private String disputeFeedback;         // Additional feedback from citizen
}
