package com.backend.springapp.model;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Citizen signoff record for complaint closure.
 * 
 * DOMAIN RULE ENFORCEMENT:
 * This entity is the KEY to enforcing the rule that ONLY the citizen who filed
 * the complaint can close it, and ONLY after explicitly accepting the resolution.
 * 
 * WHY this exists:
 * 1. CITIZEN EMPOWERMENT: Resolution isn't complete until citizen confirms
 * 2. FEEDBACK CAPTURE: Rating and feedback for service quality metrics
 * 3. DISPUTE MECHANISM: Citizen can reject and explain why (with evidence)
 * 4. AUDIT TRAIL: Records exactly when and how citizen responded
 * 
 * WORKFLOW:
 * 1. Staff resolves complaint (requires ResolutionProof)
 * 2. Citizen is notified that complaint is RESOLVED
 * 3. Citizen reviews resolution and calls POST /api/complaints/{id}/signoff
 * 4. If isAccepted = true:
 *    - CitizenSignoff is created with rating/feedback
 *    - System transitions complaint to CLOSED
 * 5. If isAccepted = false:
 *    - CitizenSignoff is created with dispute reason
 *    - Complaint remains RESOLVED (staff must address)
 *    - Triggers notification to staff/supervisor
 * 
 * NOTE: A citizen can submit multiple signoffs (e.g., reject then accept later).
 * Only the last isAccepted=true signoff triggers closure.
 */
@Entity
@Table(name = "citizen_signoffs", indexes = {
    @Index(name = "idx_signoff_complaint", columnList = "complaint_id"),
    @Index(name = "idx_signoff_citizen", columnList = "citizen_id"),
    @Index(name = "idx_signoff_accepted", columnList = "is_accepted")
})
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CitizenSignoff {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * The complaint being signed off.
     * Multiple signoffs can exist for same complaint (reject then accept).
     */
    @Column(name = "complaint_id", nullable = false)
    private Long complaintId;

    @ManyToOne
    @JoinColumn(name = "complaint_id", insertable = false, updatable = false)
    private Complaint complaint;

    /**
     * The citizen providing the signoff.
     * MUST match complaint.citizenId - enforced at service layer.
     */
    @Column(name = "citizen_id", nullable = false)
    private Long citizenId;

    @ManyToOne
    @JoinColumn(name = "citizen_id", insertable = false, updatable = false)
    private User citizen;

    /**
     * Whether citizen accepts the resolution.
     * 
     * TRUE = Citizen is satisfied, triggers RESOLVED → CLOSED transition
     * FALSE = Citizen disputes, complaint stays RESOLVED for re-work
     */
    @Column(name = "is_accepted", nullable = false)
    private Boolean isAccepted;

    /**
     * Citizen's satisfaction rating (1-5).
     * Required when isAccepted = true for quality metrics.
     */
    @Column(name = "rating")
    private Integer rating;

    /**
     * Citizen's feedback about the resolution.
     * Optional for acceptance, encouraged for disputes.
     */
    @Column(name = "feedback", columnDefinition = "TEXT")
    private String feedback;

    /**
     * S3 key for dispute evidence image.
     * Used when citizen claims issue is NOT resolved.
     * Example: "disputes/2026/01/complaint-123-dispute.jpg"
     */
    @Column(name = "dispute_image_s3_key")
    private String disputeImageS3Key;

    /**
     * Structured reason for dispute.
     * Required when isAccepted = false.
     * E.g., "Issue not fixed", "Partial resolution", "Different issue"
     */
    @Column(name = "dispute_reason")
    private String disputeReason;

    /**
     * Timestamp when citizen provided this signoff.
     */
    @CreationTimestamp
    @Column(name = "signed_off_at")
    private LocalDateTime signedOffAt;
    
    // ===== DISPUTE APPROVAL TRACKING =====
    // These fields track the dispute review process by DEPT_HEAD
    
    /**
     * Whether this dispute has been approved by DEPT_HEAD for reopen.
     * 
     * NULL = Not yet reviewed (pending)
     * TRUE = Approved, complaint was reopened
     * FALSE = Rejected, complaint stays RESOLVED
     */
    @Column(name = "dispute_approved")
    private Boolean disputeApproved;
    
    /**
     * The DEPT_HEAD user ID who reviewed this dispute.
     * Null if not yet reviewed.
     */
    @Column(name = "dispute_approved_by")
    private Long disputeApprovedBy;
    
    /**
     * Timestamp when dispute was reviewed.
     */
    @Column(name = "dispute_reviewed_at")
    private LocalDateTime disputeReviewedAt;
    
    /**
     * Rejection reason if dispute was not approved.
     * Required when disputeApproved = false.
     */
    @Column(name = "dispute_rejection_reason")
    private String disputeRejectionReason;
}
