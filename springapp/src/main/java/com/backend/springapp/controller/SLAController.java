package com.backend.springapp.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.backend.springapp.dto.response.SLAResponseDTO;
import com.backend.springapp.model.SLA;
import com.backend.springapp.service.SLAService;

@RestController
@RequestMapping("/api/sla")
public class SLAController {

    @Autowired
    private SLAService slaService;

    /**
     * Create SLA config for a category (Admin only)
     * POST /api/sla?categoryId=1&departmentId=1
     * Body: { "slaDays": 7, "basePriority": "MEDIUM" }
     */
    @PostMapping
    public ResponseEntity<SLAResponseDTO> createSLAConfig(
            @RequestParam Long categoryId,
            @RequestParam Long departmentId,
            @RequestBody SLA slaConfig) {
        SLA created = slaService.createSLAConfig(categoryId, departmentId, slaConfig);
        return new ResponseEntity<>(SLAResponseDTO.fromEntity(created), HttpStatus.CREATED);
    }

    /**
     * Get SLA config by ID
     * GET /api/sla/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<SLAResponseDTO> getSLAById(@PathVariable Long id) {
        SLA sla = slaService.getSLAById(id);
        return ResponseEntity.ok(SLAResponseDTO.fromEntity(sla));
    }

    /**
     * Get SLA config by category ID
     * GET /api/sla/category/{categoryId}
     */
    @GetMapping("/category/{categoryId}")
    public ResponseEntity<SLAResponseDTO> getSLAByCategoryId(@PathVariable Long categoryId) {
        SLA sla = slaService.getSLAByCategoryId(categoryId);
        return ResponseEntity.ok(SLAResponseDTO.fromEntity(sla));
    }

    /**
     * Get SLA config by category name
     * GET /api/sla/category/name/{categoryName}
     */
    @GetMapping("/category/name/{categoryName}")
    public ResponseEntity<SLAResponseDTO> getSLAByCategoryName(@PathVariable String categoryName) {
        SLA sla = slaService.getSLAByCategoryName(categoryName);
        return ResponseEntity.ok(SLAResponseDTO.fromEntity(sla));
    }

    /**
     * Get all SLA configs
     * GET /api/sla
     */
    @GetMapping
    public ResponseEntity<List<SLAResponseDTO>> getAllSLAConfigs() {
        List<SLA> slaConfigs = slaService.getAllSLAConfigs();
        List<SLAResponseDTO> response = slaConfigs.stream()
            .map(SLAResponseDTO::fromEntity)
            .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    /**
     * Update SLA config (Admin only)
     * PUT /api/sla/{id}
     * Body: { "slaDays": 5, "basePriority": "HIGH" }
     */
    @PutMapping("/{id}")
    public ResponseEntity<SLAResponseDTO> updateSLAConfig(@PathVariable Long id, @RequestBody SLA slaConfig) {
        SLA updated = slaService.updateSLAConfig(id, slaConfig);
        return ResponseEntity.ok(SLAResponseDTO.fromEntity(updated));
    }

    /**
     * Update SLA config's department (Admin only)
     * PUT /api/sla/{id}/department/{departmentId}
     */
    @PutMapping("/{id}/department/{departmentId}")
    public ResponseEntity<SLAResponseDTO> updateSLADepartment(@PathVariable Long id, @PathVariable Long departmentId) {
        SLA updated = slaService.updateSLADepartment(id, departmentId);
        return ResponseEntity.ok(SLAResponseDTO.fromEntity(updated));
    }

    /**
     * Delete SLA config (Admin only)
     * DELETE /api/sla/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSLAConfig(@PathVariable Long id) {
        slaService.deleteSLAConfig(id);
        return ResponseEntity.noContent().build();
    }
}
