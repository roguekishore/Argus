package com.backend.springapp.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.backend.springapp.exception.ResourceNotFoundException;
import com.backend.springapp.model.Department;
import com.backend.springapp.repository.DepartmentRepository;

/**
 * Simple controller to list pre-populated departments.
 * Departments are read-only and seeded on startup.
 */
@RestController
@RequestMapping("/api/departments")
@CrossOrigin(origins = "*")
public class DepartmentController {

    @Autowired
    private DepartmentRepository departmentRepository;

    /**
     * Get all departments.
     * GET /api/departments
     */
    @GetMapping
    public ResponseEntity<List<DepartmentDTO>> getAllDepartments() {
        List<DepartmentDTO> departments = departmentRepository.findAll().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
        return ResponseEntity.ok(departments);
    }

    /**
     * Get department by ID.
     * GET /api/departments/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<DepartmentDTO> getDepartmentById(@PathVariable Long id) {
        Department dept = departmentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + id));
        return ResponseEntity.ok(toDTO(dept));
    }

    private DepartmentDTO toDTO(Department dept) {
        return new DepartmentDTO(dept.getId(), dept.getName());
    }

    // Simple inner DTO to avoid exposing entity relationships
    public record DepartmentDTO(Long id, String name) {}
}
