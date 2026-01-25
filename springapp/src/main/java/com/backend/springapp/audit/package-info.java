/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                          AUDIT SYSTEM PACKAGE                                ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  This package contains all audit trail components for the Grievance System.  ║
 * ║                                                                              ║
 * ║  DESIGN PRINCIPLES:                                                          ║
 * ║  1. CENTRALIZED: All audit logic lives in this one package                   ║
 * ║  2. GENERIC: Works with any entity type, not just complaints                 ║
 * ║  3. IMMUTABLE: Audit logs are INSERT-ONLY, never modified                    ║
 * ║  4. DECOUPLED: No business logic in this package                             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * <h2>PACKAGE CONTENTS</h2>
 * 
 * <h3>Enums:</h3>
 * <ul>
 *   <li>{@link com.backend.springapp.audit.AuditAction} - Types of auditable actions</li>
 *   <li>{@link com.backend.springapp.audit.AuditEntityType} - Types of auditable entities</li>
 *   <li>{@link com.backend.springapp.audit.AuditActorType} - Who performed the action</li>
 * </ul>
 * 
 * <h3>Core Classes:</h3>
 * <ul>
 *   <li>{@link com.backend.springapp.audit.AuditLog} - JPA entity for persistent audit records</li>
 *   <li>{@link com.backend.springapp.audit.AuditLogRepository} - Data access for audit logs</li>
 *   <li>{@link com.backend.springapp.audit.AuditService} - Centralized service for recording audit events</li>
 *   <li>{@link com.backend.springapp.audit.AuditActorContext} - Actor information wrapper</li>
 * </ul>
 * 
 * <h3>API:</h3>
 * <ul>
 *   <li>{@link com.backend.springapp.audit.AuditController} - Read-only REST endpoints for audit queries</li>
 *   <li>{@link com.backend.springapp.audit.AuditLogDTO} - Data transfer object for API responses</li>
 * </ul>
 * 
 * <h2>INTEGRATION EXAMPLES</h2>
 * 
 * <h3>Example 1: Recording a state transition in ComplaintStateService</h3>
 * <pre>{@code
 * @Service
 * public class ComplaintStateService {
 *     
 *     private final AuditService auditService;
 *     
 *     public StateTransitionResponse transitionState(
 *             Long complaintId,
 *             ComplaintStatus targetState,
 *             UserContext userContext) {
 *         
 *         // ... existing validation and state change logic ...
 *         
 *         ComplaintStatus previousState = complaint.getStatus();
 *         applyStateChange(complaint, targetState);
 *         complaintRepository.save(complaint);
 *         
 *         // AUDIT: Record the state transition
 *         auditService.recordComplaintStateChange(
 *             complaintId,
 *             previousState.name(),
 *             targetState.name(),
 *             AuditActorContext.fromUserContext(userContext),
 *             "State transition via API"
 *         );
 *         
 *         return buildResponse(complaint, previousState, targetState);
 *     }
 * }
 * }</pre>
 * 
 * <h3>Example 2: Recording an escalation in EscalationService</h3>
 * <pre>{@code
 * @Service
 * public class EscalationService {
 *     
 *     private final AuditService auditService;
 *     
 *     @Transactional
 *     public Optional<EscalationEvent> processEscalation(Complaint complaint) {
 *         
 *         // ... existing escalation evaluation logic ...
 *         
 *         if (result.escalationRequired()) {
 *             EscalationEvent event = createEscalationEvent(complaint, result);
 *             escalationEventRepository.save(event);
 *             updateComplaintEscalationLevel(complaint, result.requiredLevel());
 *             
 *             // AUDIT: Record the automatic escalation
 *             auditService.recordEscalation(
 *                 complaint.getComplaintId(),
 *                 result.currentLevel().name(),
 *                 result.requiredLevel().name(),
 *                 AuditActorContext.system(),  // SYSTEM actor for auto-escalation
 *                 result.reason()              // "SLA breached by 2 days"
 *             );
 *             
 *             return Optional.of(event);
 *         }
 *         return Optional.empty();
 *     }
 * }
 * }</pre>
 * 
 * <h2>REST API ENDPOINTS</h2>
 * <ul>
 *   <li>GET /api/audit/complaint/{id} - Full audit trail for a complaint</li>
 *   <li>GET /api/audit/complaint/{id}/escalations - Escalation history only</li>
 *   <li>GET /api/audit/entity/{type}/{id} - Audit logs for any entity type</li>
 *   <li>GET /api/audit/action/{action} - All logs for an action type</li>
 *   <li>GET /api/audit/actor/{userId} - All actions by a user</li>
 *   <li>GET /api/audit/system - All automated actions</li>
 * </ul>
 * 
 * @see com.backend.springapp.audit.AuditService
 * @see com.backend.springapp.audit.AuditController
 * @see com.backend.springapp.audit.AuditLog
 */
package com.backend.springapp.audit;
