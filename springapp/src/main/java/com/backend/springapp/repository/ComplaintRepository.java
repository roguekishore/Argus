package com.backend.springapp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.backend.springapp.model.Complaint;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, Long> {
    
}
