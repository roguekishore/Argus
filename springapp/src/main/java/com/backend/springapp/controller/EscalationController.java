package com.backend.springapp.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.backend.springapp.dto.response.EscalationEventDTO;
import com.backend.springapp.dto.response.OverdueComplaintDTO;
import com.backend.springapp.enums.EscalationLevel;
import com.backend.springapp.escalation.EscalationScheduler;
import com.backend.springapp.escalation.EscalationService;
import com.backend.springapp.repository.EscalationEventRepository;

import lombok.RequiredArgsConstructor;

/**
 * REST Controller for escalation-related endpoints.
 * 
 * Provides READ-ONLY access to escalation data plus a manual trigger endpoint.
 * 
 * Endpoints:
 * - GET /api/complaints/{id}/escalations - Escalation history for a complaint
 * - GET /api/escalations/overdue - All overdue complaints with escalation info
 * - GET /api/escalations/stats - Escalation statistics
 * - POST /api/escalations/trigger - Manual trigger for escalation processing (admin use)
 * 
 * Note: No authentication/authorization as per requirements (no JWT/Spring Security).
 * In production, these endpoints should be secured.
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class EscalationController {

    private final EscalationService escalationService;
    private final EscalationScheduler escalationScheduler;
    private final EscalationEventRepository escalationEventRepository;

    /**
     * Get escalation history for a specific complaint.
     * 
     * Returns all escalation events in chronological order.
     * 
     * Example response:
     * [
     *   {
     *     "id": 1,
     *     "complaintId": 42,
     *     "escalationLevel": "L1",
     *     "previousLevel": "L0",
     *     "escalatedAt": "2026-01-20T06:00:00",
     *     "escalatedToRole": "DEPT_HEAD",
     *     "reason": "SLA breached by 2 days...",
     *     "daysOverdue": 2
     *   }
     * ]
     */
    @GetMapping("/complaints/{id}/escalations")
    public ResponseEntity<List<EscalationEventDTO>> getComplaintEscalations(
            @PathVariable("id") Long complaintId) {
        
        List<EscalationEventDTO> escalations = escalationService.getEscalationHistory(complaintId);
        return ResponseEntity.ok(escalations);
    }

    /**
     * Get all overdue complaints with their escalation status.
     * 
     * Returns complaints that are:
     * - Past their SLA deadline
     * - In active status (not CLOSED/CANCELLED)
     * 
     * Includes current escalation level, required level, and whether
     * escalation is needed.
     */
    @GetMapping("/escalations/overdue")
    public ResponseEntity<List<OverdueComplaintDTO>> getOverdueComplaints() {
        List<OverdueComplaintDTO> overdueComplaints = escalationService.getOverdueComplaints();
        return ResponseEntity.ok(overdueComplaints);
    }

    /**
     * Get escalation statistics.
     * 
     * Returns counts of escalations at each level and total counts.
     * Useful for dashboards and reporting.
     */
    @GetMapping("/escalations/stats")
    public ResponseEntity<Map<String, Object>> getEscalationStats() {
        Map<String, Object> stats = new HashMap<>();
        
        // Count by level
        Map<String, Long> byLevel = new HashMap<>();
        for (EscalationLevel level : EscalationLevel.values()) {
            long count = escalationEventRepository.countByEscalationLevel(level);
            byLevel.put(level.name(), count);
        }
        stats.put("countByLevel", byLevel);
        
        // Total count
        stats.put("totalEscalations", escalationEventRepository.count());
        
        // Overdue complaints count
        stats.put("overdueComplaintsCount", escalationService.getOverdueComplaints().size());
        
        return ResponseEntity.ok(stats);
    }

    /**
     * Manually trigger escalation processing.
     * 
     * This endpoint allows admins to trigger an immediate escalation run
     * without waiting for the scheduled job.
     * 
     * USE CASE: After bulk imports, data fixes, or when immediate escalation
     * is needed.
     * 
     * NOTE: In production, this should be secured to admin-only access.
     */
    @PostMapping("/escalations/trigger")
    public ResponseEntity<Map<String, Object>> triggerEscalationRun() {
        int escalationsPerformed = escalationScheduler.triggerManualEscalationRun();
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("escalationsPerformed", escalationsPerformed);
        response.put("message", String.format("Escalation run complete. %d escalations performed.", 
                escalationsPerformed));
        
        return ResponseEntity.ok(response);
    }
}
