package com.backend.springapp.controller;

import com.backend.springapp.dto.response.ComplaintResponseDTO;
import com.backend.springapp.enums.ComplaintStatus;
import com.backend.springapp.enums.Priority;
import com.backend.springapp.model.Complaint;
import com.backend.springapp.service.ComplaintService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {

    @Autowired
    private ComplaintService complaintService;

    // ==================== BASIC CRUD ====================

    /**
     * Create a new complaint (filed by citizen)
     * AI automatically analyzes and assigns: category, department, priority, SLA
     * POST /api/complaints/citizen/{citizenId}
     */
    @PostMapping("/citizen/{citizenId}")
    public ResponseEntity<ComplaintResponseDTO> createComplaint(@RequestBody Complaint complaint, @PathVariable Long citizenId) {
        ComplaintResponseDTO created = complaintService.createComplaint(complaint, citizenId);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    /**
     * Get complaint by ID with full AI analysis details
     * GET /api/complaints/{complaintId}/details
     */
    @GetMapping("/{complaintId}/details")
    public ResponseEntity<ComplaintResponseDTO> getComplaintDetails(@PathVariable Long complaintId) {
        ComplaintResponseDTO complaint = complaintService.getComplaintResponseById(complaintId);
        return ResponseEntity.ok(complaint);
    }

    /**
     * Get complaint by ID (raw entity)
     * GET /api/complaints/{complaintId}
     */
    @GetMapping("/{complaintId}")
    public ResponseEntity<Complaint> getComplaintById(@PathVariable Long complaintId) {
        Complaint complaint = complaintService.getComplaintById(complaintId);
        return ResponseEntity.ok(complaint);
    }

    /**
     * Get all complaints
     * GET /api/complaints
     */
    @GetMapping
    public ResponseEntity<List<Complaint>> getAllComplaints() {
        List<Complaint> complaints = complaintService.getAllComplaints();
        return ResponseEntity.ok(complaints);
    }

    /**
     * Update complaint (basic fields only)
     * PUT /api/complaints/{complaintId}
     */
    @PutMapping("/{complaintId}")
    public ResponseEntity<Complaint> updateComplaint(@PathVariable Long complaintId, @RequestBody Complaint updatedComplaint) {
        Complaint updated = complaintService.updateComplaint(complaintId, updatedComplaint);
        return ResponseEntity.ok(updated);
    }

    /**
     * Delete complaint
     * DELETE /api/complaints/{complaintId}
     */
    @DeleteMapping("/{complaintId}")
    public ResponseEntity<Void> deleteComplaint(@PathVariable Long complaintId) {
        complaintService.deleteComplaint(complaintId);
        return ResponseEntity.noContent().build();
    }

    // ==================== ASSIGNMENT (Dept Head) ====================

    /**
     * Assign department to complaint by department name (placeholder for AI)
     * PUT /api/complaints/{complaintId}/assign-department?departmentName=ROADS
     */
    @PutMapping("/{complaintId}/assign-department")
    public ResponseEntity<Complaint> assignDepartmentByName(@PathVariable Long complaintId, @RequestParam String departmentName) {
        Complaint updated = complaintService.assignDepartmentByName(complaintId, departmentName);
        return ResponseEntity.ok(updated);
    }

    /**
     * Assign staff to complaint (by department head)
     * PUT /api/complaints/{complaintId}/assign-staff/{staffId}
     */
    @PutMapping("/{complaintId}/assign-staff/{staffId}")
    public ResponseEntity<Complaint> assignStaff(@PathVariable Long complaintId, @PathVariable Long staffId) {
        Complaint updated = complaintService.assignStaff(complaintId, staffId);
        return ResponseEntity.ok(updated);
    }

    // ==================== AI ENDPOINTS ====================

    /**
     * AI assigns category (also sets department, priority, SLA from defaults)
     * PUT /api/complaints/{complaintId}/ai/category
     */
    @PutMapping("/{complaintId}/ai/category")
    public ResponseEntity<Complaint> assignCategory(
            @PathVariable Long complaintId,
            @RequestParam String categoryName,
            @RequestParam(required = false) String aiReasoning,
            @RequestParam(required = false) Double aiConfidence) {
        Complaint updated = complaintService.assignCategory(complaintId, categoryName, aiReasoning, aiConfidence);
        return ResponseEntity.ok(updated);
    }

    /**
     * AI assigns/overrides priority
     * PUT /api/complaints/{complaintId}/ai/priority
     */
    @PutMapping("/{complaintId}/ai/priority")
    public ResponseEntity<Complaint> assignPriority(
            @PathVariable Long complaintId,
            @RequestParam Priority priority,
            @RequestParam(required = false) String aiReasoning) {
        Complaint updated = complaintService.assignPriority(complaintId, priority, aiReasoning);
        return ResponseEntity.ok(updated);
    }

    /**
     * AI assigns/overrides SLA deadline
     * PUT /api/complaints/{complaintId}/ai/sla
     */
    @PutMapping("/{complaintId}/ai/sla")
    public ResponseEntity<Complaint> assignSlaDeadline(
            @PathVariable Long complaintId,
            @RequestParam Integer slaDays,
            @RequestParam(required = false) String aiReasoning) {
        Complaint updated = complaintService.assignSlaDeadline(complaintId, slaDays, aiReasoning);
        return ResponseEntity.ok(updated);
    }

    /**
     * AI processes complaint in one call (category + priority + SLA)
     * PUT /api/complaints/{complaintId}/ai/process
     */
    @PutMapping("/{complaintId}/ai/process")
    public ResponseEntity<Complaint> processComplaintByAI(
            @PathVariable Long complaintId,
            @RequestParam String categoryName,
            @RequestParam(required = false) Priority priority,
            @RequestParam(required = false) Integer slaDays,
            @RequestParam(required = false) String aiReasoning,
            @RequestParam(required = false) Double aiConfidence) {
        Complaint updated = complaintService.processComplaintByAI(
            complaintId, categoryName, priority, slaDays, aiReasoning, aiConfidence);
        return ResponseEntity.ok(updated);
    }

    // ==================== STATUS CHANGE ====================

    /**
     * Change complaint status
     * PUT /api/complaints/{complaintId}/status?status=IN_PROGRESS
     */
    @PutMapping("/{complaintId}/status")
    public ResponseEntity<Complaint> changeStatus(
            @PathVariable Long complaintId,
            @RequestParam ComplaintStatus status) {
        Complaint updated = complaintService.changeStatus(complaintId, status);
        return ResponseEntity.ok(updated);
    }

    /**
     * Start work on complaint (staff)
     * PUT /api/complaints/{complaintId}/start
     */
    @PutMapping("/{complaintId}/start")
    public ResponseEntity<Complaint> startWork(@PathVariable Long complaintId) {
        Complaint updated = complaintService.startWork(complaintId);
        return ResponseEntity.ok(updated);
    }

    /**
     * Resolve complaint (staff)
     * PUT /api/complaints/{complaintId}/resolve
     */
    @PutMapping("/{complaintId}/resolve")
    public ResponseEntity<Complaint> resolveComplaint(@PathVariable Long complaintId) {
        Complaint updated = complaintService.resolveComplaint(complaintId);
        return ResponseEntity.ok(updated);
    }

    /**
     * Close complaint (after citizen feedback or auto)
     * PUT /api/complaints/{complaintId}/close
     */
    @PutMapping("/{complaintId}/close")
    public ResponseEntity<Complaint> closeComplaint(@PathVariable Long complaintId) {
        Complaint updated = complaintService.closeComplaint(complaintId);
        return ResponseEntity.ok(updated);
    }

    /**
     * Hold complaint
     * PUT /api/complaints/{complaintId}/hold
     */
    @PutMapping("/{complaintId}/hold")
    public ResponseEntity<Complaint> holdComplaint(@PathVariable Long complaintId) {
        Complaint updated = complaintService.holdComplaint(complaintId);
        return ResponseEntity.ok(updated);
    }

    /**
     * Cancel complaint
     * PUT /api/complaints/{complaintId}/cancel
     */
    @PutMapping("/{complaintId}/cancel")
    public ResponseEntity<Complaint> cancelComplaint(@PathVariable Long complaintId) {
        Complaint updated = complaintService.cancelComplaint(complaintId);
        return ResponseEntity.ok(updated);
    }

    // ==================== CITIZEN FEEDBACK ====================

    /**
     * Citizen rates satisfaction (1-5)
     * PUT /api/complaints/{complaintId}/rate?rating=4
     */
    @PutMapping("/{complaintId}/rate")
    public ResponseEntity<Complaint> rateSatisfaction(
            @PathVariable Long complaintId,
            @RequestParam Integer rating) {
        Complaint updated = complaintService.rateSatisfaction(complaintId, rating);
        return ResponseEntity.ok(updated);
    }

    // ==================== MANUAL OVERRIDE (Admin/Dept Head) ====================

    /**
     * Manual priority change
     * PUT /api/complaints/{complaintId}/manual/priority?priority=HIGH
     */
    @PutMapping("/{complaintId}/manual/priority")
    public ResponseEntity<Complaint> manualPriorityChange(
            @PathVariable Long complaintId,
            @RequestParam Priority priority) {
        Complaint updated = complaintService.manualPriorityChange(complaintId, priority);
        return ResponseEntity.ok(updated);
    }

    /**
     * Manual SLA deadline change
     * PUT /api/complaints/{complaintId}/manual/sla?slaDays=3
     */
    @PutMapping("/{complaintId}/manual/sla")
    public ResponseEntity<Complaint> manualSlaChange(
            @PathVariable Long complaintId,
            @RequestParam Integer slaDays) {
        Complaint updated = complaintService.manualSlaChange(complaintId, slaDays);
        return ResponseEntity.ok(updated);
    }
}
