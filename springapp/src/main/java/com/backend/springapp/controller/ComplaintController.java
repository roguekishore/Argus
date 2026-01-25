package com.backend.springapp.controller;

import com.backend.springapp.dto.request.UpdateFiledDateRequest;
import com.backend.springapp.dto.response.ComplaintResponseDTO;
import com.backend.springapp.enums.ComplaintStatus;
import com.backend.springapp.enums.Priority;
import com.backend.springapp.model.Complaint;
import com.backend.springapp.service.ComplaintService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import java.io.IOException;
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
     * Create a new complaint WITH image evidence (filed by citizen via frontend).
     * 
     * IMAGE HANDLING:
     * - Image is uploaded to AWS S3 (not stored in database)
     * - Only the S3 object key is stored with the complaint
     * - Image is analyzed by Gemini 3 Pro for verification
     * - Analysis results affect priority/urgency if applicable
     * 
     * POST /api/complaints/citizen/{citizenId}/with-image
     * Content-Type: multipart/form-data
     * 
     * @param citizenId The citizen filing the complaint
     * @param title Complaint title
     * @param description Detailed description
     * @param location Where the issue is located
     * @param image Optional evidence image (JPEG, PNG, max 10MB recommended)
     * @return ComplaintResponseDTO with AI analysis and image analysis results
     */
    @PostMapping(value = "/citizen/{citizenId}/with-image", 
                 consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ComplaintResponseDTO> createComplaintWithImage(
            @PathVariable Long citizenId,
            @RequestParam("title") String title,
            @RequestParam("description") String description,
            @RequestParam("location") String location,
            @RequestParam(value = "image", required = false) MultipartFile image) {
        
        try {
            // Build complaint from form data
            Complaint complaint = new Complaint();
            complaint.setTitle(title);
            complaint.setDescription(description);
            complaint.setLocation(location);
            
            // Extract image data if present
            byte[] imageBytes = null;
            String mimeType = null;
            
            if (image != null && !image.isEmpty()) {
                imageBytes = image.getBytes();
                mimeType = image.getContentType();
            }
            
            // Create complaint with optional image
            ComplaintResponseDTO created = complaintService.createComplaintWithImage(
                complaint, citizenId, imageBytes, mimeType
            );
            
            return new ResponseEntity<>(created, HttpStatus.CREATED);
            
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(null);
        }
    }

    /**
     * Upload/attach image to an EXISTING complaint.
     * Use this when citizen wants to add evidence after initial filing.
     * 
     * POST /api/complaints/{complaintId}/image
     * Content-Type: multipart/form-data
     * 
     * @param complaintId The complaint to attach image to
     * @param image Evidence image file
     * @return Updated complaint with image analysis
     */
    @PostMapping(value = "/{complaintId}/image", 
                 consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ComplaintResponseDTO> attachImageToComplaint(
            @PathVariable Long complaintId,
            @RequestParam("image") MultipartFile image) {
        
        try {
            if (image == null || image.isEmpty()) {
                return ResponseEntity.badRequest().build();
            }
            
            byte[] imageBytes = image.getBytes();
            String mimeType = image.getContentType();
            
            ComplaintResponseDTO updated = complaintService.attachImageToComplaint(
                complaintId, imageBytes, mimeType
            );
            
            return ResponseEntity.ok(updated);
            
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    /**
     * Get image analysis results for a complaint.
     * GET /api/complaints/{complaintId}/image-analysis
     * 
     * @param complaintId The complaint ID
     * @return Image analysis results (cached) or null if no image
     */
    @GetMapping("/{complaintId}/image-analysis")
    public ResponseEntity<Map<String, Object>> getImageAnalysis(@PathVariable Long complaintId) {
        Map<String, Object> analysis = complaintService.getImageAnalysisForComplaint(complaintId);
        if (analysis == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(analysis);
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

    // ==================== DASHBOARD LISTING ENDPOINTS ====================

    /**
     * Get all complaints for a citizen
     * GET /api/complaints/citizen/{citizenId}
     */
    @GetMapping("/citizen/{citizenId}")
    public ResponseEntity<List<Complaint>> getComplaintsByCitizen(@PathVariable Long citizenId) {
        List<Complaint> complaints = complaintService.getComplaintsByCitizen(citizenId);
        return ResponseEntity.ok(complaints);
    }

    /**
     * Get complaint stats for a citizen (for dashboard cards)
     * GET /api/complaints/citizen/{citizenId}/stats
     */
    @GetMapping("/citizen/{citizenId}/stats")
    public ResponseEntity<Map<String, Object>> getCitizenStats(@PathVariable Long citizenId) {
        Map<String, Object> stats = complaintService.getCitizenStats(citizenId);
        return ResponseEntity.ok(stats);
    }

    /**
     * Get all complaints assigned to a staff member
     * GET /api/complaints/staff/{staffId}
     */
    @GetMapping("/staff/{staffId}")
    public ResponseEntity<List<Complaint>> getComplaintsByStaff(@PathVariable Long staffId) {
        List<Complaint> complaints = complaintService.getComplaintsByStaff(staffId);
        return ResponseEntity.ok(complaints);
    }

    /**
     * Get complaint stats for a staff member (for dashboard cards)
     * GET /api/complaints/staff/{staffId}/stats
     */
    @GetMapping("/staff/{staffId}/stats")
    public ResponseEntity<Map<String, Object>> getStaffStats(@PathVariable Long staffId) {
        Map<String, Object> stats = complaintService.getStaffStats(staffId);
        return ResponseEntity.ok(stats);
    }

    /**
     * Get all complaints for a department
     * GET /api/complaints/department/{deptId}
     */
    @GetMapping("/department/{deptId}")
    public ResponseEntity<List<Complaint>> getComplaintsByDepartment(@PathVariable Long deptId) {
        List<Complaint> complaints = complaintService.getComplaintsByDepartment(deptId);
        return ResponseEntity.ok(complaints);
    }

    /**
     * Get unassigned complaints for a department (for dept head to assign)
     * GET /api/complaints/department/{deptId}/unassigned
     */
    @GetMapping("/department/{deptId}/unassigned")
    public ResponseEntity<List<Complaint>> getUnassignedComplaintsByDepartment(@PathVariable Long deptId) {
        List<Complaint> complaints = complaintService.getUnassignedComplaintsByDepartment(deptId);
        return ResponseEntity.ok(complaints);
    }

    /**
     * Get complaint stats for a department (for dashboard cards)
     * GET /api/complaints/department/{deptId}/stats
     */
    @GetMapping("/department/{deptId}/stats")
    public ResponseEntity<Map<String, Object>> getDepartmentStats(@PathVariable Long deptId) {
        Map<String, Object> stats = complaintService.getDepartmentStats(deptId);
        return ResponseEntity.ok(stats);
    }

    /**
     * Get escalated complaints (for commissioner)
     * GET /api/complaints/escalated
     */
    @GetMapping("/escalated")
    public ResponseEntity<List<Complaint>> getEscalatedComplaints() {
        List<Complaint> complaints = complaintService.getEscalatedComplaints();
        return ResponseEntity.ok(complaints);
    }

    /**
     * Get system-wide stats (for admin dashboard)
     * GET /api/complaints/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getSystemStats() {
        Map<String, Object> stats = complaintService.getSystemStats();
        return ResponseEntity.ok(stats);
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
    
    // ==================== ADMIN MANUAL ROUTING ====================
    
    /**
     * Get all complaints pending manual routing.
     * These are complaints where AI confidence was below 0.7 threshold.
     * 
     * GET /api/complaints/admin/pending-routing
     * 
     * @return List of complaints needing admin review and manual department assignment
     */
    @GetMapping("/admin/pending-routing")
    public ResponseEntity<List<ComplaintResponseDTO>> getComplaintsPendingManualRouting() {
        List<ComplaintResponseDTO> pendingComplaints = complaintService.getComplaintsPendingManualRouting();
        return ResponseEntity.ok(pendingComplaints);
    }
    
    /**
     * Get count of complaints pending manual routing.
     * Useful for admin dashboard badges.
     * 
     * GET /api/complaints/admin/pending-routing/count
     * 
     * @return Count of complaints needing manual routing
     */
    @GetMapping("/admin/pending-routing/count")
    public ResponseEntity<Map<String, Long>> getPendingRoutingCount() {
        long count = complaintService.countPendingManualRouting();
        return ResponseEntity.ok(Map.of("pendingCount", count));
    }
    
    /**
     * Admin manually routes a complaint to a department.
     * Clears the low-confidence flag and assigns to specified department.
     * 
     * PUT /api/complaints/{complaintId}/admin/route
     * 
     * REQUEST BODY:
     * {
     *   "departmentId": 3,
     *   "adminId": 100,
     *   "reason": "Complaint clearly belongs to ROADS department based on description"
     * }
     * 
     * @param complaintId The complaint to route
     * @param request Contains departmentId, adminId, and optional reason
     * @return Updated complaint with new department assignment
     */
    @PutMapping("/{complaintId}/admin/route")
    public ResponseEntity<ComplaintResponseDTO> manualRouteComplaint(
            @PathVariable Long complaintId,
            @RequestBody Map<String, Object> request) {
        
        Long departmentId = Long.valueOf(request.get("departmentId").toString());
        Long adminId = Long.valueOf(request.get("adminId").toString());
        String reason = request.get("reason") != null ? request.get("reason").toString() : null;
        
        ComplaintResponseDTO routed = complaintService.manualRouteComplaint(
                complaintId, departmentId, adminId, reason);
        
        return ResponseEntity.ok(routed);
    }
}
