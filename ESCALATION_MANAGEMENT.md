# Escalation Management System

## Overview

The Escalation Management System automatically escalates overdue grievance complaints to higher authorities based on SLA breach severity. It operates **orthogonally** to the state machine - escalation level tracks WHO should handle a complaint, while state tracks WHERE the complaint is in its lifecycle.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ESCALATION ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌───────────────────┐         ┌─────────────────────────────┐    │
│   │ EscalationScheduler│────────▶│    EscalationService       │    │
│   │ (Every 6 hours)   │         │   (Orchestration Layer)     │    │
│   └───────────────────┘         └──────────────┬──────────────┘    │
│                                                │                    │
│                                                ▼                    │
│   ┌───────────────────┐         ┌─────────────────────────────┐    │
│   │ EscalationController│       │ EscalationEvaluationService │    │
│   │  (Read-only APIs)  │        │   (Pure Business Logic)     │    │
│   └───────────────────┘         └─────────────────────────────┘    │
│                                                                     │
│   ┌──────────────────────────────────────────────────────────┐     │
│   │                   DATA LAYER                              │     │
│   │  ┌─────────────────┐      ┌─────────────────────────┐    │     │
│   │  │ Complaint       │      │ EscalationEvent         │    │     │
│   │  │ (escalation_    │      │ (Audit Trail)           │    │     │
│   │  │  level field)   │      │                         │    │     │
│   │  └─────────────────┘      └─────────────────────────┘    │     │
│   └──────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

## Escalation Rules

### Levels

| Level | Role | Trigger Condition |
|-------|------|-------------------|
| L0 | Staff | Default (within SLA) |
| L1 | Department Head | SLA deadline + 1 day breached |
| L2 | Municipal Commissioner | SLA deadline + 3 days breached |

### Key Principles

1. **Escalation is ONE-WAY**: Level can only increase (L0 → L1 → L2), never decrease automatically
2. **State Independence**: Escalation does NOT change complaint status
3. **Idempotency**: Same escalation event is never recorded twice
4. **Audit Trail**: Every escalation creates an immutable `EscalationEvent` record

## Package Structure

```
com.backend.springapp/
├── enums/
│   └── EscalationLevel.java         # L0, L1, L2 enum with metadata
├── model/
│   └── EscalationEvent.java         # Audit entity for escalation events
├── repository/
│   └── EscalationEventRepository.java
├── escalation/                       # Isolated escalation package
│   ├── EscalationEvaluationService.java  # Pure logic, no side effects
│   ├── EscalationService.java            # Orchestration + persistence
│   └── EscalationScheduler.java          # Scheduled job
├── controller/
│   └── EscalationController.java     # REST endpoints
└── dto/response/
    ├── EscalationEventDTO.java
    └── OverdueComplaintDTO.java
```

## API Endpoints

### GET /api/complaints/{id}/escalations

Get escalation history for a specific complaint.

**Response:**
```json
[
  {
    "id": 1,
    "complaintId": 42,
    "escalationLevel": "L1",
    "previousLevel": "L0",
    "escalatedAt": "2026-01-20T06:00:00",
    "escalatedToRole": "DEPT_HEAD",
    "escalatedToRoleDisplayName": "Department Head",
    "reason": "SLA breached by 2 day(s). Deadline was 2026-01-18. Escalating to Department Head.",
    "daysOverdue": 2,
    "slaDeadline": "2026-01-18T17:00:00",
    "isAutomated": true
  }
]
```

### GET /api/escalations/overdue

Get all overdue complaints with escalation status.

**Response:**
```json
[
  {
    "complaintId": 42,
    "title": "Water supply issue",
    "status": "IN_PROGRESS",
    "slaDeadline": "2026-01-18T17:00:00",
    "daysOverdue": 4,
    "currentEscalationLevel": "L1",
    "requiredEscalationLevel": "L2",
    "needsEscalation": true,
    "departmentId": 3,
    "departmentName": "Water Department",
    "escalationHistory": [...]
  }
]
```

### GET /api/escalations/stats

Get escalation statistics for dashboard.

**Response:**
```json
{
  "countByLevel": {
    "L0": 0,
    "L1": 15,
    "L2": 3
  },
  "totalEscalations": 18,
  "overdueComplaintsCount": 7
}
```

### POST /api/escalations/trigger

Manually trigger escalation processing (admin use).

**Response:**
```json
{
  "success": true,
  "escalationsPerformed": 5,
  "message": "Escalation run complete. 5 escalations performed."
}
```

## Database Schema

### escalation_events Table

```sql
CREATE TABLE escalation_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    complaint_id BIGINT NOT NULL,
    escalation_level VARCHAR(10) NOT NULL,
    previous_level VARCHAR(10) NOT NULL,
    escalated_at DATETIME NOT NULL,
    escalated_to_role VARCHAR(30) NOT NULL,
    reason VARCHAR(500) NOT NULL,
    days_overdue INT NOT NULL,
    sla_deadline_snapshot DATETIME NOT NULL,
    is_automated BOOLEAN NOT NULL DEFAULT TRUE,
    
    INDEX idx_escalation_complaint (complaint_id),
    INDEX idx_escalation_level (escalation_level),
    INDEX idx_escalation_time (escalated_at),
    
    FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id)
);
```

### complaints Table (existing, updated field)

```sql
-- Existing field in complaints table
escalation_level INT DEFAULT 0  -- 0=L0, 1=L1, 2=L2
```

## Configuration

Add to `application.properties`:

```properties
# Escalation scheduler cron expression (default: every 6 hours)
escalation.scheduler.cron=0 0 0/6 * * *
```

Alternative schedules:
- Every hour: `0 0 * * * *`
- Every 30 minutes: `0 */30 * * * *`
- Once daily at midnight: `0 0 0 * * *`

## Testing with Postman/Thunder Client

### Test Scenario 1: View Escalation History
```
GET http://localhost:8080/api/complaints/1/escalations
```

### Test Scenario 2: View Overdue Complaints
```
GET http://localhost:8080/api/escalations/overdue
```

### Test Scenario 3: Trigger Manual Escalation
```
POST http://localhost:8080/api/escalations/trigger
```

### Test Scenario 4: Get Statistics
```
GET http://localhost:8080/api/escalations/stats
```

## Design Decisions

### Why Separate EscalationEvaluationService?

1. **Testability**: Pure functions with no side effects are easy to unit test
2. **Single Responsibility**: Evaluation logic is isolated from persistence
3. **Reusability**: Can be used for "what-if" analysis without creating events

### Why Immutable EscalationEvent?

1. **Audit Compliance**: Events are never modified after creation
2. **Debugging**: Complete history is always available
3. **Idempotency**: Existence check prevents duplicates

### Why Store slaDeadlineSnapshot?

If the SLA deadline is later modified on the complaint, we still have the original deadline that triggered the escalation for audit purposes.

## Future Extensions

1. **Notification Integration**: Send emails/SMS when escalation occurs
2. **Manual Escalation**: Allow admins to manually escalate with custom reason
3. **Escalation Policies**: Configurable thresholds per department/category
4. **De-escalation**: Manual de-escalation with approval workflow
5. **Suspension**: Pause escalation clock for specific complaints

## Component Interactions

```
Scheduler triggers
       │
       ▼
┌─────────────────────┐
│  Fetch Active       │
│  Complaints         │
└──────────┬──────────┘
           │
           ▼ (for each complaint)
┌─────────────────────┐
│ EvaluationService   │◀─── Pure logic, no DB access
│ .evaluate()         │
└──────────┬──────────┘
           │
           ▼ (if escalation needed)
┌─────────────────────┐
│ Check Idempotency   │
│ (event exists?)     │
└──────────┬──────────┘
           │ (if not exists)
           ▼
┌─────────────────────┐
│ Create Event        │
│ Update Complaint    │
│ (in transaction)    │
└─────────────────────┘
```
