package com.backend.springapp.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.backend.springapp.model.Category;
import com.backend.springapp.model.SLA;

@Repository
public interface SLARepository extends JpaRepository<SLA, Long> {
    
    Optional<SLA> findByCategory(Category category);
    
    Optional<SLA> findByCategoryId(Long categoryId);
}
