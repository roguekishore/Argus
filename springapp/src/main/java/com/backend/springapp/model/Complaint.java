package com.backend.springapp.model;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import com.backend.springapp.enums.ComplaintStatus;
import com.backend.springapp.enums.Priority;
import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "complaints")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Complaint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long complaintId;

    private String title;
    private String description;
    private String location;

    // ===== CATEGORY & ROUTING (AI decides, SLA provides defaults) =====
    
    @Column(name = "category_id")
    private Long categoryId;

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "category_id", insertable = false, updatable = false)
    private Category category;

    @Column(name = "department_id")
    private Long departmentId;

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "department_id", insertable = false, updatable = false)
    private Department department;

    // ===== PRIORITY & SLA (AI has FULL control) =====
    
    @Enumerated(EnumType.STRING)
    private Priority priority;
    private LocalDateTime slaDeadline;  // AI can shorten this for urgency!
    private Integer slaDaysAssigned;  // What AI actually assigned (may differ from SLA default)

    @Column(columnDefinition = "INT DEFAULT 0")
    private Integer escalationLevel = 0;
    
    @Enumerated(EnumType.STRING)
    private ComplaintStatus status;

    @CreationTimestamp
    private LocalDateTime createdTime;

    private LocalDateTime startTime;
    private LocalDateTime updatedTime;
    private LocalDateTime resolvedTime;
    private LocalDateTime closedTime;

    // ===== ASSIGNMENT =====
    
    @Column(name = "citizen_id")
    private Long citizenId;

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "citizen_id", insertable = false, updatable = false)
    private User citizen;

    @Column(name = "staff_id")
    private Long staffId;

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "staff_id", insertable = false, updatable = false)
    private User staff;

    // ===== AI TRANSPARENCY =====
    
    @Column(columnDefinition = "TEXT")
    private String aiReasoning;

    @Column(columnDefinition = "DECIMAL(3,2)")
    private Double aiConfidence;
    
    /**
     * Flag indicating AI confidence was below threshold (0.7)
     * and complaint needs manual routing by admin.
     * When true: departmentId is NULL (no department assigned yet).
     * Admin must manually assign the correct department via routing interface.
     */
    @Column(name = "needs_manual_routing", columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean needsManualRouting = false;
    
    private Integer citizenSatisfaction;

    // ===== IMAGE EVIDENCE (S3 Storage) =====
    
    /**
     * S3 object key for complaint evidence image (NOT public URL for security)
     * Example: "complaints/2026/01/complaint-123-evidence.jpg"
     */
    @Column(name = "image_s3_key")
    private String imageS3Key;
    
    /**
     * MIME type of uploaded image (image/jpeg, image/png, etc.)
     * Required for proper multimodal AI analysis
     */
    @Column(name = "image_mime_type")
    private String imageMimeType;
    
    /**
     * Cached AI image analysis result to avoid repeated Gemini calls
     * Contains: detected issue, safety risks, verification status
     * JSON format for structured parsing
     */
    @Column(name = "image_analysis", columnDefinition = "TEXT")
    private String imageAnalysis;
    
    /**
     * Timestamp when image was analyzed by AI
     * Used to determine if re-analysis is needed
     */
    @Column(name = "image_analyzed_at")
    private LocalDateTime imageAnalyzedAt;
}
