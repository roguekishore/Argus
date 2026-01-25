package com.backend.springapp.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.backend.springapp.model.ResolutionProof;

/**
 * Repository for ResolutionProof entity.
 * 
 * KEY QUERY:
 * - existsByComplaintId: Used by StateTransitionService to enforce
 *   the rule that IN_PROGRESS → RESOLVED requires at least one proof.
 */
@Repository
public interface ResolutionProofRepository extends JpaRepository<ResolutionProof, Long> {

    /**
     * Check if ANY resolution proof exists for a complaint.
     * 
     * THIS IS THE CRITICAL METHOD for enforcing the domain rule:
     * "STAFF can move IN_PROGRESS → RESOLVED ONLY IF a ResolutionProof exists"
     * 
     * @param complaintId The complaint to check
     * @return true if at least one proof exists
     */
    boolean existsByComplaintId(Long complaintId);

    /**
     * Find all proofs for a complaint.
     * Used for audit trail and proof history.
     */
    List<ResolutionProof> findByComplaintId(Long complaintId);

    /**
     * Find all proofs submitted by a specific staff member.
     * Used for staff performance reports.
     */
    List<ResolutionProof> findByStaffId(Long staffId);

    /**
     * Find the most recent proof for a complaint.
     * Used when displaying resolution details.
     */
    Optional<ResolutionProof> findTopByComplaintIdOrderByCreatedAtDesc(Long complaintId);

    /**
     * Find all unverified proofs (for supervisor review queue).
     */
    List<ResolutionProof> findByIsVerifiedFalse();

    /**
     * Find all unverified proofs for a specific department.
     * Used by dept heads to review their team's work.
     */
    @Query("SELECT rp FROM ResolutionProof rp " +
           "JOIN rp.complaint c " +
           "WHERE c.departmentId = :departmentId AND rp.isVerified = false")
    List<ResolutionProof> findUnverifiedByDepartment(@Param("departmentId") Long departmentId);

    /**
     * Count proofs for a complaint.
     * Useful for metrics and validation.
     */
    long countByComplaintId(Long complaintId);
}
