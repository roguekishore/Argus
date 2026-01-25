package com.backend.springapp.controller;

import com.backend.springapp.dto.request.UpdateFiledDateRequest;
import com.backend.springapp.dto.response.ComplaintResponseDTO;
import com.backend.springapp.enums.ComplaintStatus;
import com.backend.springapp.enums.Priority;
import com.backend.springapp.model.Complaint;
import com.backend.springapp.service.ComplaintService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;

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
    // 
    // NOTE: State transition endpoints have been moved to ComplaintStateController
    // which provides proper RBAC enforcement and state machine validation.
    // 
    // Use these endpoints instead:
    //   PUT /api/complaints/{id}/state           - Generic state transition
    //   PUT /api/complaints/{id}/start           - FILED → IN_PROGRESS (SYSTEM only)
    //   PUT /api/complaints/{id}/resolve         - IN_PROGRESS → RESOLVED (STAFF, DEPT_HEAD)
    //   PUT /api/complaints/{id}/close           - RESOLVED → CLOSED (CITIZEN, SYSTEM)
    //   PUT /api/complaints/{id}/cancel          - Any → CANCELLED (CITIZEN, ADMIN)
    //   GET /api/complaints/{id}/allowed-transitions - Get valid next states for UI
    //
    // System endpoints (no auth required):
    //   PUT /api/complaints/{id}/system/start    - AI starts work on complaint
    //   PUT /api/complaints/{id}/system/close    - Auto-close after timeout
    //

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

    // ============================================================
    // ⚠️  TEST-ONLY ENDPOINTS - NOT FOR PRODUCTION USE  ⚠️
    // ============================================================

    /**
     * ============================================================
     * ⚠️  TEST-ONLY: Override complaint filed date  ⚠️
     * ============================================================
     * 
     * PATCH /api/complaints/{complaintId}/test/filed-date
     * 
     * PURPOSE:
     * Allows backdating a complaint's createdTime for testing escalation logic.
     * Since @CreationTimestamp sets createdTime automatically on insert,
     * this endpoint provides a way to simulate overdue complaints.
     * 
     * TEST SCENARIO EXAMPLE:
     * 1. Create complaint → createdTime = today, slaDeadline = today + 5 days
     * 2. PATCH filed-date to 10 days ago
     * 3. Now: createdTime = 10 days ago, slaDeadline = 5 days ago
     * 4. Trigger escalation → should escalate to L1 or L2
     * 
     * REQUEST BODY:
     * {
     *   "filedDate": "2026-01-10T10:00:00",
     *   "recalculateSlaDeadline": true  // optional, default true
     * }
     * 
     * SECURITY WARNING:
     * This endpoint should be DISABLED or SECURED in production.
     * Consider restricting to dev/test profiles only.
     * 
     * @param complaintId The complaint to modify
     * @param request Contains filedDate and optional recalculation flag
     * @return Summary of changes made
     */
    @PatchMapping("/{complaintId}/test/filed-date")
    public ResponseEntity<Map<String, Object>> updateFiledDateForTesting(
            @PathVariable Long complaintId,
            @Valid @RequestBody UpdateFiledDateRequest request) {
        
        Map<String, Object> result = complaintService.updateFiledDateForTesting(
                complaintId, 
                request.getFiledDate(),
                request.getRecalculateSlaDeadline()
        );
        
        return ResponseEntity.ok(result);
    }
}
