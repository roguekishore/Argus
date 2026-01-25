package com.backend.springapp.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.backend.springapp.exception.DuplicateResourceException;
import com.backend.springapp.exception.ResourceNotFoundException;
import com.backend.springapp.model.Category;
import com.backend.springapp.model.Department;
import com.backend.springapp.model.SLA;
import com.backend.springapp.repository.CategoryRepository;
import com.backend.springapp.repository.DepartmentRepository;
import com.backend.springapp.repository.SLARepository;

@Service
@Transactional
public class SLAService {

    @Autowired
    private SLARepository slaRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    /**
     * Create SLA config for a category (Admin only)
     * Links Category → Department with SLA days and base priority
     */
    public SLA createSLAConfig(Long categoryId, Long departmentId, SLA slaConfig) {
        Category category = categoryRepository.findById(categoryId)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + categoryId));

        // Check if SLA already exists for this category
        if (slaRepository.findByCategoryId(categoryId).isPresent()) {
            throw new DuplicateResourceException("SLA config already exists for category: " + category.getName());
        }

        Department department = departmentRepository.findById(departmentId)
            .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + departmentId));

        slaConfig.setCategory(category);
        slaConfig.setDepartment(department);

        return slaRepository.save(slaConfig);
    }

    @Transactional(readOnly = true)
    public SLA getSLAById(Long id) {
        return slaRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("SLA config not found with id: " + id));
    }

    @Transactional(readOnly = true)
    public SLA getSLAByCategoryId(Long categoryId) {
        return slaRepository.findByCategoryId(categoryId)
            .orElseThrow(() -> new ResourceNotFoundException("SLA config not found for category id: " + categoryId));
    }

    @Transactional(readOnly = true)
    public SLA getSLAByCategoryName(String categoryName) {
        Category category = categoryRepository.findByName(categoryName)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found with name: " + categoryName));
        return slaRepository.findByCategory(category)
            .orElseThrow(() -> new ResourceNotFoundException("SLA config not found for category: " + categoryName));
    }

    @Transactional(readOnly = true)
    public List<SLA> getAllSLAConfigs() {
        return slaRepository.findAll();
    }

    /**
     * Update SLA config (Admin only)
     * Can change: slaDays, basePriority, department
     */
    public SLA updateSLAConfig(Long id, SLA updatedSLA) {
        SLA existing = slaRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("SLA config not found with id: " + id));

        if (updatedSLA.getSlaDays() != null) {
            existing.setSlaDays(updatedSLA.getSlaDays());
        }
        if (updatedSLA.getBasePriority() != null) {
            existing.setBasePriority(updatedSLA.getBasePriority());
        }

        return slaRepository.save(existing);
    }

    /**
     * Update SLA config's department (Admin only)
     */
    public SLA updateSLADepartment(Long slaId, Long departmentId) {
        SLA existing = slaRepository.findById(slaId)
            .orElseThrow(() -> new ResourceNotFoundException("SLA config not found with id: " + slaId));

        Department department = departmentRepository.findById(departmentId)
            .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + departmentId));

        existing.setDepartment(department);
        return slaRepository.save(existing);
    }

    /**
     * Delete SLA config (Admin only)
     */
    public void deleteSLAConfig(Long id) {
        if (!slaRepository.existsById(id)) {
            throw new ResourceNotFoundException("SLA config not found with id: " + id);
        }
        slaRepository.deleteById(id);
    }
}
