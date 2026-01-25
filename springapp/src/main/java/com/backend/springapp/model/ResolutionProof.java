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
 * Resolution proof submitted by STAFF before resolving a complaint.
 * 
 * DOMAIN RULE ENFORCEMENT:
 * This entity is the KEY to enforcing the rule that a complaint CANNOT be moved
 * from IN_PROGRESS to RESOLVED unless a ResolutionProof record exists.
 * 
 * WHY this exists:
 * 1. PROOF OF WORK: Staff must provide evidence that work was actually done
 * 2. GEOLOCATION: GPS coordinates prove physical presence at complaint site
 * 3. ACCOUNTABILITY: Links resolution to specific staff member with timestamp
 * 4. AUDIT TRAIL: Cannot resolve without proof - prevents "ghost resolutions"
 * 
 * WORKFLOW:
 * 1. Staff visits site and takes photo of resolved issue
 * 2. Staff uploads proof via POST /api/complaints/{id}/resolution-proof
 * 3. System records GPS, timestamp, and image
 * 4. isVerified = false initially (can be verified by dept head later)
 * 5. NOW staff can call PUT /api/complaints/{id}/resolve
 * 
 * NOTE: isVerified = false does NOT block resolution.
 * The presence of proof is sufficient. Verification is a separate audit process.
 */
@Entity
@Table(name = "resolution_proofs", indexes = {
    @Index(name = "idx_resolution_proof_complaint", columnList = "complaint_id"),
    @Index(name = "idx_resolution_proof_staff", columnList = "staff_id"),
    @Index(name = "idx_resolution_proof_verified", columnList = "is_verified")
})
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ResolutionProof {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * The complaint this proof is for.
     * A complaint may have multiple proofs (e.g., updates during long resolution).
     * At minimum, ONE proof must exist before resolution.
     */
    @Column(name = "complaint_id", nullable = false)
    private Long complaintId;

    @ManyToOne
    @JoinColumn(name = "complaint_id", insertable = false, updatable = false)
    private Complaint complaint;

    /**
     * The staff member who submitted this proof.
     * Must be from the same department as the complaint.
     */
    @Column(name = "staff_id", nullable = false)
    private Long staffId;

    @ManyToOne
    @JoinColumn(name = "staff_id", insertable = false, updatable = false)
    private User staff;

    /**
     * S3 object key for the proof image (NOT public URL for security).
     * Example: "proofs/2026/01/complaint-123-proof-456.jpg"
     * 
     * WHY S3 key instead of URL:
     * - Security: No direct public access to evidence
     * - Flexibility: Can generate signed URLs with expiry
     * - Consistency: Same pattern as complaint images
     */
    @Column(name = "proof_image_s3_key")
    private String proofImageS3Key;

    /**
     * GPS latitude where proof was captured.
     * Used to verify staff was physically at complaint location.
     */
    @Column(name = "latitude")
    private Double latitude;

    /**
     * GPS longitude where proof was captured.
     * Used to verify staff was physically at complaint location.
     */
    @Column(name = "longitude")
    private Double longitude;

    /**
     * Timestamp when the proof photo was captured.
     * May differ from record creation time if photo was taken offline.
     */
    @Column(name = "captured_at")
    private LocalDateTime capturedAt;

    /**
     * Staff's remarks about the resolution.
     * E.g., "Pothole filled with asphalt. Will require 24 hrs to set."
     */
    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    /**
     * Verification status by supervisor/dept head.
     * 
     * IMPORTANT: false does NOT block resolution!
     * - false = proof submitted but not yet verified by supervisor
     * - true = supervisor has verified the proof is valid
     * 
     * This is for audit/quality control, not workflow blocking.
     */
    @Column(name = "is_verified", nullable = false)
    private Boolean isVerified = false;

    /**
     * When this record was created (not when photo was taken).
     */
    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
