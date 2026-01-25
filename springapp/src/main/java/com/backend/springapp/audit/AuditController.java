package com.backend.springapp.audit;

import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Read-only REST API for accessing audit logs.
 * 
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  CRITICAL: THIS CONTROLLER IS READ-ONLY                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Audit logs are immutable. This controller only exposes GET endpoints.       ║
 * ║  There are NO POST, PUT, PATCH, or DELETE endpoints.                         ║
 * ║                                                                              ║
 * ║  AUDIT WRITES happen through AuditService, called by domain services.        ║
 * ║  Controllers should NEVER write audit logs directly.                         ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * SECURITY CONSIDERATIONS (for future implementation):
 * - These endpoints should be protected by authentication
 * - Consider role-based access:
 *   - Citizens: Only audit logs for their own complaints
 *   - Staff: Audit logs for complaints in their department
 *   - Admins: Full audit log access
 * - Consider rate limiting to prevent abuse
 * 
 * API DESIGN:
 * - Returns chronological order (oldest first) by default
 * - Uses DTOs to decouple from JPA entities
 * - Pagination should be added for production use
 */
@RestController
@RequestMapping("/api/audit")
public class AuditController {

    private static final Logger log = LoggerFactory.getLogger(AuditController.class);

    private final AuditLogRepository auditLogRepository;

    public AuditController(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // COMPLAINT-CENTRIC ENDPOINTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get all audit logs for a specific complaint.
     * 
     * Returns the complete audit trail for a complaint, ordered chronologically
     * (oldest first) so the timeline reads naturally from top to bottom.
     * 
     * Example: GET /api/audit/complaint/12345
     * 
     * Response: Array of audit log entries showing:
     * - When complaint was filed
     * - State changes (FILED → OPEN → IN_PROGRESS → RESOLVED)
     * - Assignment changes
     * - Escalation events
     * 
     * @param complaintId The complaint ID
     * @return List of audit logs for this complaint
     */
    @GetMapping("/complaint/{complaintId}")
    public ResponseEntity<List<AuditLogDTO>> getComplaintAuditLogs(
            @PathVariable Long complaintId) {
        
        log.debug("Fetching audit logs for complaint: {}", complaintId);

        List<AuditLog> logs = auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtAsc(
                AuditEntityType.COMPLAINT,
                String.valueOf(complaintId));

        List<AuditLogDTO> dtos = logs.stream()
                .map(AuditLogDTO::fromEntity)
                .collect(Collectors.toList());

        log.debug("Found {} audit logs for complaint {}", dtos.size(), complaintId);

        return ResponseEntity.ok(dtos);
    }

    /**
     * Get escalation history for a specific complaint.
     * 
     * Convenience endpoint that filters to only escalation events.
     * Useful for SLA compliance reports and escalation tracking dashboards.
     * 
     * Example: GET /api/audit/complaint/12345/escalations
     * 
     * @param complaintId The complaint ID
     * @return List of escalation audit logs for this complaint
     */
    @GetMapping("/complaint/{complaintId}/escalations")
    public ResponseEntity<List<AuditLogDTO>> getComplaintEscalations(
            @PathVariable Long complaintId) {
        
        log.debug("Fetching escalation audit logs for complaint: {}", complaintId);

        List<AuditLog> logs = auditLogRepository.findEscalationsByComplaintId(
                String.valueOf(complaintId));

        List<AuditLogDTO> dtos = logs.stream()
                .map(AuditLogDTO::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ENTITY-CENTRIC ENDPOINTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get all audit logs for a specific entity.
     * 
     * Generic endpoint for querying any entity type.
     * 
     * Example: GET /api/audit/entity/SLA/42
     * 
     * @param entityType The entity type (COMPLAINT, SLA, USER, etc.)
     * @param entityId   The entity ID
     * @return List of audit logs for this entity
     */
    @GetMapping("/entity/{entityType}/{entityId}")
    public ResponseEntity<List<AuditLogDTO>> getEntityAuditLogs(
            @PathVariable String entityType,
            @PathVariable String entityId) {
        
        log.debug("Fetching audit logs for entity: {}:{}", entityType, entityId);

        AuditEntityType type;
        try {
            type = AuditEntityType.valueOf(entityType.toUpperCase());
        } catch (IllegalArgumentException e) {
            log.warn("Invalid entity type requested: {}", entityType);
            return ResponseEntity.badRequest().build();
        }

        List<AuditLog> logs = auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtAsc(
                type, entityId);

        List<AuditLogDTO> dtos = logs.stream()
                .map(AuditLogDTO::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTION-CENTRIC ENDPOINTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get all audit logs for a specific action type.
     * 
     * Useful for monitoring dashboards and reporting.
     * Returns most recent first (for dashboards showing latest activity).
     * 
     * Example: GET /api/audit/action/ESCALATION
     * 
     * @param action The action type (STATE_CHANGE, ESCALATION, etc.)
     * @return List of audit logs for this action type
     */
    @GetMapping("/action/{action}")
    public ResponseEntity<List<AuditLogDTO>> getAuditLogsByAction(
            @PathVariable String action) {
        
        log.debug("Fetching audit logs for action: {}", action);

        AuditAction auditAction;
        try {
            auditAction = AuditAction.valueOf(action.toUpperCase());
        } catch (IllegalArgumentException e) {
            log.warn("Invalid action type requested: {}", action);
            return ResponseEntity.badRequest().build();
        }

        List<AuditLog> logs = auditLogRepository.findByActionOrderByCreatedAtDesc(auditAction);

        List<AuditLogDTO> dtos = logs.stream()
                .map(AuditLogDTO::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTOR-CENTRIC ENDPOINTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get all audit logs created by a specific user.
     * 
     * Useful for user activity investigation and accountability tracking.
     * Returns most recent first.
     * 
     * Example: GET /api/audit/actor/456
     * 
     * @param actorId The user ID
     * @return List of audit logs created by this user
     */
    @GetMapping("/actor/{actorId}")
    public ResponseEntity<List<AuditLogDTO>> getAuditLogsByActor(
            @PathVariable Long actorId) {
        
        log.debug("Fetching audit logs for actor: {}", actorId);

        List<AuditLog> logs = auditLogRepository.findByActorIdOrderByCreatedAtDesc(actorId);

        List<AuditLogDTO> dtos = logs.stream()
                .map(AuditLogDTO::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    /**
     * Get all audit logs created by system (automated) processes.
     * 
     * Useful for monitoring automated operations.
     * 
     * Example: GET /api/audit/system
     * 
     * @return List of system-generated audit logs
     */
    @GetMapping("/system")
    public ResponseEntity<List<AuditLogDTO>> getSystemAuditLogs() {
        
        log.debug("Fetching system audit logs");

        List<AuditLog> logs = auditLogRepository.findByActorTypeOrderByCreatedAtDesc(
                AuditActorType.SYSTEM);

        List<AuditLogDTO> dtos = logs.stream()
                .map(AuditLogDTO::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }
}
