package com.backend.springapp.model;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Tracks citizen upvotes on complaints ("Me Too" / "This affects me").
 * 
 * PURPOSE:
 * - Prevents duplicate complaints by allowing citizens to upvote existing ones
 * - Shows community impact (how many people affected)
 * - Helps prioritize issues based on citizen interest
 * 
 * UNIQUE CONSTRAINT: One citizen can only upvote a complaint once.
 */
@Entity
@Table(name = "complaint_upvotes", 
       uniqueConstraints = @UniqueConstraint(
           columnNames = {"complaint_id", "citizen_id"},
           name = "uk_complaint_citizen_upvote"
       ))
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ComplaintUpvote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "complaint_id", nullable = false)
    private Long complaintId;

    @ManyToOne
    @JoinColumn(name = "complaint_id", insertable = false, updatable = false)
    private Complaint complaint;

    @Column(name = "citizen_id", nullable = false)
    private Long citizenId;

    @ManyToOne
    @JoinColumn(name = "citizen_id", insertable = false, updatable = false)
    private User citizen;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    /**
     * Optional: Location where citizen experienced the same issue
     * (for heatmap visualization in future)
     */
    @Column(name = "latitude")
    private Double latitude;
    
    @Column(name = "longitude")
    private Double longitude;
    
    // Convenience constructor
    public ComplaintUpvote(Long complaintId, Long citizenId) {
        this.complaintId = complaintId;
        this.citizenId = citizenId;
    }
    
    public ComplaintUpvote(Long complaintId, Long citizenId, Double latitude, Double longitude) {
        this.complaintId = complaintId;
        this.citizenId = citizenId;
        this.latitude = latitude;
        this.longitude = longitude;
    }
}
