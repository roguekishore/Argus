# Audit Trail & Notification System Guide

This document provides a comprehensive guide to the **Audit Trail** and **Notification** systems implemented in the Public Grievance Redressal backend.

---

## Table of Contents

1. [Overview](#overview)
2. [Design Philosophy](#design-philosophy)
3. [Audit Trail System](#audit-trail-system)
4. [Notification System](#notification-system)
5. [Integration Points](#integration-points)
6. [API Reference](#api-reference)
7. [Usage Examples](#usage-examples)
8. [Configuration](#configuration)
9. [Best Practices](#best-practices)

---

## Overview

The system implements two distinct but complementary mechanisms:

| Feature | Audit Trail | Notification |
|---------|-------------|--------------|
| **Purpose** | Compliance & debugging | User experience |
| **Audience** | Admins, auditors, developers | End users (citizens, staff) |
| **Failure Mode** | Must never fail silently | Best-effort, may be skipped |
| **Retention** | Long-term, immutable | User-controlled (read/delete) |
| **Transaction** | Same transaction | REQUIRES_NEW (independent) |

---

## Design Philosophy

### Separation of Concerns

**Audit** and **Notification** are fundamentally different:

- **Audit**: "What happened?" - A factual, immutable record for compliance, debugging, and accountability.
- **Notification**: "Who should know?" - A user-facing alert that can be read, dismissed, or ignored.

### Key Principles

1. **Audit logs are sacred**: Never fail silently, never delete, always record.
2. **Notifications are best-effort**: Don't block business logic if notification fails.
3. **Single source of truth**: Each event is audited once, notifications may be derived from audit events.
4. **Centralized services**: Both systems have a single service entry point.

---

## Audit Trail System

### Package Structure

```
com.backend.springapp.audit/
├── AuditAction.java          # Enum: What happened
├── AuditEntityType.java      # Enum: What entity was affected
├── AuditActorType.java       # Enum: Who did it (USER or SYSTEM)
├── AuditActorContext.java    # Actor information wrapper
├── AuditLog.java             # JPA Entity
├── AuditLogRepository.java   # Data access
├── AuditService.java         # Centralized audit recording
├── AuditController.java      # REST API (read-only)
└── AuditLogDTO.java          # API response format
```

### Enums

#### AuditAction
Defines what type of action occurred:

| Action | Description |
|--------|-------------|
| `STATE_CHANGE` | Complaint state transition |
| `ESCALATION` | Complaint escalation level change |
| `ASSIGNMENT` | Complaint assigned to staff |
| `SLA_UPDATE` | SLA configuration modified |
| `SUSPENSION` | Complaint suspended or resumed |

#### AuditEntityType
Identifies the entity type affected:

| Entity Type | Description |
|-------------|-------------|
| `COMPLAINT` | A citizen complaint |
| `ESCALATION` | Escalation record |
| `SLA` | SLA configuration |
| `USER` | User account |
| `SUSPENSION` | Suspension record |

#### AuditActorType
Identifies who performed the action:

| Actor Type | Description |
|------------|-------------|
| `USER` | Human user (citizen, staff, admin) |
| `SYSTEM` | Automated process (scheduler, bot) |

### AuditLog Entity

```java
@Entity
@Table(name = "audit_logs")
public class AuditLog {
    private Long id;
    private AuditEntityType entityType;  // COMPLAINT, USER, etc.
    private Long entityId;               // ID of the affected entity
    private AuditAction action;          // STATE_CHANGE, ESCALATION, etc.
    private String oldValue;             // Previous state/value (nullable)
    private String newValue;             // New state/value (nullable)
    private AuditActorType actorType;    // USER or SYSTEM
    private Long actorId;                // User ID or null for SYSTEM
    private String reason;               // Optional explanation
    private LocalDateTime createdAt;     // Immutable timestamp
}
```

### AuditService API

```java
@Service
public class AuditService {
    
    // Core method - records any audit event
    public AuditLog record(
        AuditEntityType entityType,
        Long entityId,
        AuditAction action,
        String oldValue,
        String newValue,
        AuditActorContext actor,
        String reason
    );
    
    // Convenience: Complaint state change
    public AuditLog recordComplaintStateChange(
        Long complaintId,
        String fromState,
        String toState,
        AuditActorContext actor,
        String reason
    );
    
    // Convenience: Escalation
    public AuditLog recordEscalation(
        Long complaintId,
        Long escalationId,
        String fromLevel,
        String toLevel,
        AuditActorContext actor,
        String reason
    );
    
    // Convenience: Assignment
    public AuditLog recordAssignment(
        Long complaintId,
        Long previousAssignee,
        Long newAssignee,
        AuditActorContext actor,
        String reason
    );
    
    // Convenience: SLA update
    public AuditLog recordSLAUpdate(
        Long slaConfigId,
        String oldConfig,
        String newConfig,
        AuditActorContext actor,
        String reason
    );
}
```

### AuditActorContext

A wrapper for identifying who performed an action:

```java
// From authenticated user context
AuditActorContext.fromUserContext(userContext);

// For automated/system actions
AuditActorContext.system();

// Manual specification
AuditActorContext.forUser(userId);
```

---

## Notification System

### Package Structure

```
com.backend.springapp.notification/
├── NotificationType.java         # Enum: Type of notification
├── Notification.java             # JPA Entity
├── NotificationRepository.java   # Data access
├── NotificationService.java      # Notification creation & delivery
├── NotificationController.java   # REST API
└── NotificationDTO.java          # API response format
```

### NotificationType Enum

| Type | Description | Typical Recipient |
|------|-------------|-------------------|
| `COMPLAINT_STATUS_CHANGED` | State transition | Citizen |
| `COMPLAINT_ASSIGNED` | Staff assignment | Assigned staff |
| `ESCALATION_ALERT` | Escalation occurred | Higher authority |
| `COMPLAINT_RESOLVED` | Resolution complete | Citizen |
| `RATING_REQUEST` | Request for feedback | Citizen |
| `SLA_WARNING` | SLA deadline approaching | Staff, Dept Head |
| `COMPLAINT_CLOSED` | Complaint closed | Citizen |

### Notification Entity

```java
@Entity
@Table(name = "notifications")
public class Notification {
    private Long id;
    private Long userId;              // Recipient
    private NotificationType type;    // ESCALATION_ALERT, etc.
    private String title;             // Short summary
    private String message;           // Full message
    private Long complaintId;         // Related complaint (nullable)
    private String link;              // Deep link (nullable)
    private Boolean isRead;           // Read status
    private LocalDateTime readAt;     // When marked as read
    private LocalDateTime createdAt;  // Creation timestamp
}
```

### NotificationService API

```java
@Service
public class NotificationService {
    
    // Core method - create notification
    public Optional<Notification> send(
        Long userId,
        NotificationType type,
        String title,
        String message,
        Long complaintId,
        String link
    );
    
    // Convenience: State change notification
    public void notifyStateChange(
        Long userId,
        Long complaintId,
        String title,
        String oldState,
        String newState
    );
    
    // Convenience: Escalation alert
    public void notifyEscalation(
        Long userId,
        Long complaintId,
        String title,
        String fromLevel,
        String toLevel
    );
    
    // Read operations
    List<Notification> getUnreadForUser(Long userId);
    List<Notification> getAllForUser(Long userId);
    long getUnreadCount(Long userId);
    
    // State mutations
    boolean markAsRead(Long notificationId, Long userId);
    int markAllAsRead(Long userId);
}
```

### Transaction Isolation

The `send()` method uses `@Transactional(propagation = Propagation.REQUIRES_NEW)`:

```java
@Transactional(propagation = Propagation.REQUIRES_NEW)
public Optional<Notification> send(...) {
    // Runs in separate transaction
    // If this fails, parent transaction continues
}
```

This ensures:
- Notification failures don't roll back business logic
- Business transaction isn't held open during notification
- Best-effort semantics for user experience features

---

## Integration Points

### ComplaintStateService

Audit and notification are triggered after state transitions:

```java
@Transactional
public Complaint processStateTransition(Long complaintId, ComplaintState targetState, 
                                        UserContext context, String reason) {
    // 1. Validate and execute transition
    ComplaintState fromState = complaint.getCurrentState();
    complaint.setCurrentState(targetState);
    
    // 2. AUDIT (same transaction, must succeed)
    auditService.recordComplaintStateChange(
        complaintId,
        fromState.name(),
        targetState.name(),
        AuditActorContext.fromUserContext(context),
        reason
    );
    
    // 3. NOTIFY (separate transaction, best-effort)
    sendStateChangeNotifications(complaint, fromState, targetState);
    
    return complaintRepository.save(complaint);
}
```

### EscalationService

Escalation checks trigger both audit and notification:

```java
@Transactional
public void checkAndEscalate(Long complaintId) {
    // 1. Evaluate escalation
    EscalationResult result = evaluateEscalation(complaint);
    
    // 2. AUDIT the escalation
    auditService.recordEscalation(
        complaintId,
        escalation.getEscalationId(),
        result.currentLevel().name(),
        result.requiredLevel().name(),
        AuditActorContext.system(),
        result.reason()
    );
    
    // 3. NOTIFY the appropriate authority
    sendEscalationNotifications(complaint, result);
}
```

### Escalation Recipient Resolution

Recipients are determined by escalation level:

| Level | Recipient | Lookup Method |
|-------|-----------|---------------|
| L0 | None | No notification |
| L1 | Department Head | `userRepository.findFirstByDeptIdAndUserType(deptId, DEPT_HEAD)` |
| L2 | Municipal Commissioner | `userRepository.findByUserType(MUNICIPAL_COMMISSIONER)` |

---

## API Reference

### Audit Endpoints

All audit endpoints are **read-only** (`GET` only).

| Endpoint | Description |
|----------|-------------|
| `GET /api/audit/entity/{type}/{id}` | Get audit trail for entity |
| `GET /api/audit/entity/{type}/{id}/action/{action}` | Filter by action type |
| `GET /api/audit/actor/user/{actorId}` | Get actions by user |
| `GET /api/audit/action/{action}` | Get all actions of type |
| `GET /api/audit/action/{action}/recent?hours=24` | Recent actions |
| `GET /api/audit/entity/{type}/{id}/between` | Time range query |

**Example Request:**
```http
GET /api/audit/entity/COMPLAINT/123
```

**Example Response:**
```json
[
    {
        "id": 456,
        "entityType": "COMPLAINT",
        "entityId": 123,
        "action": "STATE_CHANGE",
        "oldValue": "PENDING",
        "newValue": "IN_PROGRESS",
        "actorType": "USER",
        "actorId": 42,
        "reason": "Staff started investigation",
        "createdAt": "2024-01-15T10:30:00"
    }
]
```

### Notification Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notifications` | GET | Get all for user |
| `/api/notifications/unread` | GET | Get unread only |
| `/api/notifications/unread/count` | GET | Get unread count |
| `/api/notifications/{id}/read` | PUT | Mark as read |
| `/api/notifications/read-all` | PUT | Mark all as read |
| `/api/notifications/complaint/{id}` | GET | Get by complaint |

**Example: Get Unread Count**
```http
GET /api/notifications/unread/count
Authorization: Bearer {token}

Response: 5
```

**Example: Mark as Read**
```http
PUT /api/notifications/42/read
Authorization: Bearer {token}

Response: true
```

---

## Usage Examples

### Recording a Custom Audit Event

```java
@Service
public class MyService {
    
    private final AuditService auditService;
    
    public void performSomeAction(Long entityId, UserContext context) {
        String oldValue = getOldValue();
        String newValue = performBusinessLogic();
        
        auditService.record(
            AuditEntityType.COMPLAINT,
            entityId,
            AuditAction.ASSIGNMENT,
            oldValue,
            newValue,
            AuditActorContext.fromUserContext(context),
            "Custom reason for this action"
        );
    }
}
```

### Sending a Custom Notification

```java
@Service
public class MyService {
    
    private final NotificationService notificationService;
    
    public void notifyUser(Long userId, Long complaintId) {
        notificationService.send(
            userId,
            NotificationType.SLA_WARNING,
            "SLA Deadline Approaching",
            "Complaint #" + complaintId + " is nearing its SLA deadline.",
            complaintId,
            "/complaints/" + complaintId
        );
    }
}
```

### Querying Audit History

```java
@Service
public class ReportingService {
    
    private final AuditLogRepository auditRepo;
    
    public List<AuditLog> getComplaintHistory(Long complaintId) {
        return auditRepo.findByEntityTypeAndEntityId(
            AuditEntityType.COMPLAINT, 
            complaintId
        );
    }
    
    public List<AuditLog> getRecentEscalations(int hours) {
        LocalDateTime since = LocalDateTime.now().minusHours(hours);
        return auditRepo.findByActionAndCreatedAtAfter(
            AuditAction.ESCALATION, 
            since
        );
    }
}
```

---

## Configuration

### Database Tables

The system creates two tables:

```sql
-- Audit logs (immutable, append-only)
CREATE TABLE audit_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    actor_type VARCHAR(20) NOT NULL,
    actor_id BIGINT,
    reason TEXT,
    created_at TIMESTAMP NOT NULL,
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_action (action),
    INDEX idx_created (created_at)
);

-- Notifications (user-manageable)
CREATE TABLE notifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    complaint_id BIGINT,
    link VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    INDEX idx_user (user_id),
    INDEX idx_user_unread (user_id, is_read)
);
```

### Retention Policy Considerations

**Audit Logs:**
- Should be retained indefinitely or per compliance requirements
- Consider archiving to cold storage after 1-2 years
- Never delete - only archive

**Notifications:**
- Can be cleaned up after user acknowledgment
- Consider auto-delete after 90 days for read notifications
- Implement a scheduled cleanup job if needed

---

## Best Practices

### Do's

✅ **Always audit state changes** - Every significant change should have an audit trail  
✅ **Use convenience methods** - `recordComplaintStateChange()`, `recordEscalation()`, etc.  
✅ **Provide context** - Include meaningful `reason` values  
✅ **Use AuditActorContext** - Never pass raw user IDs; use the wrapper  
✅ **Notify relevant users** - Send notifications to those who need to act  

### Don'ts

❌ **Don't swallow audit exceptions** - If audit fails, the operation should fail  
❌ **Don't block on notifications** - Use REQUIRES_NEW, don't wait for delivery  
❌ **Don't duplicate audit events** - One audit per atomic action  
❌ **Don't expose raw audit to users** - Use DTOs, filter sensitive data  
❌ **Don't modify audit logs** - They are immutable by design  

### Testing Considerations

```java
@Test
void whenStateChanges_thenAuditIsRecorded() {
    // Given
    Long complaintId = createTestComplaint();
    
    // When
    complaintStateService.processStateTransition(
        complaintId, 
        ComplaintState.IN_PROGRESS, 
        testUserContext,
        "Test reason"
    );
    
    // Then
    List<AuditLog> logs = auditRepo.findByEntityTypeAndEntityId(
        AuditEntityType.COMPLAINT, 
        complaintId
    );
    assertThat(logs).hasSize(1);
    assertThat(logs.get(0).getAction()).isEqualTo(AuditAction.STATE_CHANGE);
}
```

---

## Summary

| System | Purpose | Transaction | Failure Handling |
|--------|---------|-------------|------------------|
| **Audit** | Compliance, debugging, accountability | Same as parent | Must succeed |
| **Notification** | User experience, alerts | REQUIRES_NEW | Best effort |

Both systems work together to provide:
1. **Complete traceability** of all system actions
2. **User awareness** of relevant events
3. **Separation of concerns** between compliance and UX
4. **Resilient architecture** where notification failures don't affect business logic

---

*Last updated: 2024*
