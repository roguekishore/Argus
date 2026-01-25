Category Controller:
POST - /api/categories/
GET - /api/categories/{id}
GET - /api/categories/name/{name}

Chat Controller:
POST - /api/chat/message
POST - /api/chat/reset

Complaint Controller:
    CRUD Methods:
        POST - /api/complaints/citizen/{citizenId} (create complaint for citizen - AI)
        GET - /api/complaints/{complaintId}/details
        GET - /api/complaints/{complaintId}
        PUT - /api/complaints/{complaintId}/assign-department
        PUT - /api/complaints/{complaintId}/assign-staff/{staffId}

    Ai Methods:
        PUT - /api/complaints/{complaintId}/ai/category
        PUT - /api/complaints/{complaintId}/ai/priority
        PUT - /api/complaints/{complaintId}/ai/sla
        PUT - /api/complaints/{complaintId}/ai/process (finish in one call)

    Manual Updation:
        PUT - /api/complaints/{complaintId}/manual/priority
        PUT - /api/complaints/{complaintId}/manual/sla

    PUT - /api/complaints/{complaintId}/rate

Complaint State Controller (RBAC-Protected):
    Generic:
        PUT - /api/complaints/{id}/state (body: {"targetState": "RESOLVED"})
        GET - /api/complaints/{id}/allowed-transitions (for UI dropdowns)

    Semantic Endpoints:
        PUT - /api/complaints/{id}/start (FILED → IN_PROGRESS, SYSTEM only)
        PUT - /api/complaints/{id}/resolve (IN_PROGRESS → RESOLVED, STAFF/DEPT_HEAD)
        PUT - /api/complaints/{id}/close (RESOLVED → CLOSED, CITIZEN owner/SYSTEM)
        PUT - /api/complaints/{id}/cancel (Any → CANCELLED, CITIZEN owner/ADMIN)

    System Endpoints (no auth headers):
        PUT - /api/complaints/{id}/system/start (AI starts work)
        PUT - /api/complaints/{id}/system/close (auto-close after timeout)

Department Controller:
    GET - /api/departments/
    GET - /api/departments/{id}

SLA Controller:
    POST - /api/sla?categoryId=1&departmentId=1
    GET - /api/sla/{id}
    GET - /api/sla/category/{categoryId}
    GET - /api/sla/category/name/{categoryName}
    PUT - /api/sla/{id}/department/{departmentId} - (update SLA department)

User Controller:
    POST - /api/users/staff?deptId=1 (create staff user by admin)
    PUT - /api/users/{userId}/assign-head?deptId=1 (assign staff as head of department)
    GET - /api/users/department/{deptId}/staff (get all staff of a department)
    GET - /api/users/department/{deptId}/head (get head of a department)

Escalation Controller:
    POST - /api/escalation/{complaintId}?level=1&userid=123 (manually escalate a complaint)
    POST - /api/de-escalate/{complaintId}?level=0 (deescalate a complaint - admin only)
    POST - /api/escalation/check (trigger escalation check manually)

    GET /api/escalation/transitions/{complaintId}?userId=123 (get valid next state transitions for curr state and user)
    GET /api/escalation/transitions?currentStatus=OPEN&userType=STAFF
    (get valid state transition for user lvl - for ui dropdowns)
    GET /api/escalation/stats/department/{deptId}
    GET /api/escalation/stats/overall

    PUT - /api/escalation/{escalationId}/resolve (resolve an escalation)

    GET - /api/escalation/dashboard/staff/{staffId} (get escalation dashboard for a staff)
    GET - /api/escalation/dashboard/dept-head/{deptHeadId} (escalated complaints and all department complaints)
    GET - /api/escalation/dashboard/commissioner (all complaints and escalated complaints)
    GET - /api/escalation/dashboard/user/{userId} (for staffs and other users except citizen)
