package com.backend.springapp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.backend.springapp.model.Complaint;

import java.util.List;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, Long> {
    
    // Find complaints by citizen ID, ordered by most recent first
    List<Complaint> findByCitizenUserIdOrderByCreatedTimeDesc(Long citizenId);
    
    // Find complaints by citizen phone number
    List<Complaint> findByCitizenMobileOrderByCreatedTimeDesc(String mobile);
}
