package com.backend.springapp.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.backend.springapp.model.CitizenSignoff;

/**
 * Repository for CitizenSignoff entity.
 * 
 * KEY QUERIES:
 * - existsByComplaintIdAndIsAcceptedTrue: Used by StateTransitionService to enforce
 *   the rule that RESOLVED → CLOSED requires citizen acceptance.
 * - findByComplaintIdOrderBySignedOffAtDesc: History of signoffs for audit.
 */
@Repository
public interface CitizenSignoffRepository extends JpaRepository<CitizenSignoff, Long> {

    /**
     * Check if citizen has ACCEPTED the resolution.
     * 
     * THIS IS THE CRITICAL METHOD for enforcing the domain rule:
     * "RESOLVED → CLOSED only if citizen has signed off with isAccepted = true"
     * 
     * @param complaintId The complaint to check
     * @return true if at least one accepted signoff exists
     */
    boolean existsByComplaintIdAndIsAcceptedTrue(Long complaintId);

    /**
     * Find all signoffs for a complaint, most recent first.
     * Used for audit trail and signoff history.
     */
    List<CitizenSignoff> findByComplaintIdOrderBySignedOffAtDesc(Long complaintId);

    /**
     * Find the most recent signoff for a complaint.
     * Used to check current signoff status.
     */
    Optional<CitizenSignoff> findTopByComplaintIdOrderBySignedOffAtDesc(Long complaintId);

    /**
     * Find all signoffs by a specific citizen.
     * Used for citizen history view.
     */
    List<CitizenSignoff> findByCitizenIdOrderBySignedOffAtDesc(Long citizenId);

    /**
     * Find all disputes (rejected signoffs) for a complaint.
     * Used to understand dispute history.
     */
    List<CitizenSignoff> findByComplaintIdAndIsAcceptedFalse(Long complaintId);

    /**
     * Count disputes for a complaint.
     * High dispute count indicates problematic resolution.
     */
    long countByComplaintIdAndIsAcceptedFalse(Long complaintId);

    /**
     * Check if any signoff exists for a complaint.
     * Different from acceptance check - this tells us if citizen has responded at all.
     */
    boolean existsByComplaintId(Long complaintId);
    
    // ===== DISPUTE QUERIES =====
    
    /**
     * Find pending disputes (not yet reviewed by DEPT_HEAD).
     * A pending dispute is: isAccepted=false AND disputeApproved IS NULL
     */
    List<CitizenSignoff> findByComplaintIdAndIsAcceptedFalseAndDisputeApprovedIsNull(Long complaintId);
    
    /**
     * Find all pending disputes for a department.
     * Used by DEPT_HEAD to see disputes they need to review.
     * Eagerly fetches complaint and citizen for DTO conversion.
     */
    @Query("SELECT cs FROM CitizenSignoff cs " +
           "JOIN FETCH cs.complaint c " +
           "LEFT JOIN FETCH cs.citizen " +
           "WHERE c.departmentId = :departmentId " +
           "AND cs.isAccepted = false " +
           "AND cs.disputeApproved IS NULL " +
           "ORDER BY cs.signedOffAt ASC")
    List<CitizenSignoff> findPendingDisputesByDepartment(@Param("departmentId") Long departmentId);
    
    /**
     * Check if a complaint has any pending (unapproved) disputes.
     */
    boolean existsByComplaintIdAndIsAcceptedFalseAndDisputeApprovedIsNull(Long complaintId);
    
    /**
     * Count pending disputes for a complaint.
     */
    long countByComplaintIdAndIsAcceptedFalseAndDisputeApprovedIsNull(Long complaintId);
}
