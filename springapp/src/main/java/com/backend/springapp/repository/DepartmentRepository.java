package com.backend.springapp.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.backend.springapp.model.Department;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
    
    boolean existsByName(String name);
}
