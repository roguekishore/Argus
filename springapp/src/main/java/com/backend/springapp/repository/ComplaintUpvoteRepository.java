package com.backend.springapp.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.backend.springapp.model.ComplaintUpvote;

@Repository
public interface ComplaintUpvoteRepository extends JpaRepository<ComplaintUpvote, Long> {
    
    /**
     * Check if a citizen has already upvoted a complaint
     */
    boolean existsByComplaintIdAndCitizenId(Long complaintId, Long citizenId);
    
    /**
     * Find upvote by complaint and citizen (for delete operation)
     */
    Optional<ComplaintUpvote> findByComplaintIdAndCitizenId(Long complaintId, Long citizenId);
    
    /**
     * Count upvotes for a complaint
     */
    long countByComplaintId(Long complaintId);
    
    /**
     * Get all upvotes for a complaint (to show supporters)
     */
    List<ComplaintUpvote> findByComplaintIdOrderByCreatedAtDesc(Long complaintId);
    
    /**
     * Get all complaints upvoted by a citizen
     */
    List<ComplaintUpvote> findByCitizenIdOrderByCreatedAtDesc(Long citizenId);
    
    /**
     * Delete upvote (for un-upvote operation)
     */
    void deleteByComplaintIdAndCitizenId(Long complaintId, Long citizenId);
    
    /**
     * Get complaint IDs upvoted by a citizen (for filtering in UI)
     */
    @Query("SELECT u.complaintId FROM ComplaintUpvote u WHERE u.citizenId = :citizenId")
    List<Long> findComplaintIdsByCitizenId(@Param("citizenId") Long citizenId);
}
