# Public Grievance Redressal System - Hackathon Use Case Documentation (48-Hour Edition)

## CRITICAL CLARIFICATION

**This version is designed for: 1 SOLO STUDENT or TEAM OF 2 working 48 hours**

Estimated development time: **38-40 hours of active work**, with **8-9 hours buffer** for:
- Workflow state transitions (3-4 hours)
- Complex routing logic (2-3 hours)
- Final refinement (1-2 hours)

---

## 1. Problem Statement

Build a **Public Grievance Redressal System** (inspired by India's CPGRAMS) that:
1. Allows citizens to file complaints (potholes, streetlights, water, sanitation)
2. Assigns complaints to specific departments automatically (routing logic)
3. Tracks complaint status through a workflow (Open → In Progress → Resolved)
4. Generates reports showing resolution times, department performance
5. Escalates stalled complaints to higher authority
6. Allows department staff to update complaint status and add remarks
7. Notifies citizens of status changes in real-time

**Key Challenge:** Implement a workflow engine that manages ticket state transitions, enforces business rules (e.g., can't resolve without department action), escalates overdue tickets, and prevents invalid transitions.

---

## 2. Real-World Relevance

India's **CPGRAMS (Centralized Public Grievance Redress and Monitoring System)** handled:
- **70+ lakh grievances** in 2022-2024
- **90.5% resolution rate** in 2024
- **Average 13-day resolution** (down from 28 days in 2019)
- **1.01 lakh grievance officers** across all ministries/departments

This project teaches:
- Workflow engine design (state machines, transitions)
- Business rule enforcement
- Routing algorithms (complaint → department mapping)
- Escalation policies (time-based automatic escalations)
- Role-based access control
- Real-time notifications
- SLA (Service Level Agreement) tracking

**India Context:** Cities generate 1000+ complaints daily. Manual tracking = lost complaints. Automated system = accountability, faster resolution, public trust.

---

## 3. Scope: What's ACTUALLY Being Built

### **IN SCOPE (Core Feature Set)**

**Citizen Features:**
- Register/login with email, phone
- File complaint (category, description, location/address, photo optional)
- Get unique complaint number (tracking ID)
- View complaint status (Open, In Progress, Resolved)
- Receive notifications (status changes, resolution)
- Rate resolution (satisfied, partially satisfied, not satisfied)
- Download resolution receipt
- View timeline of complaint (who updated what, when)

**Department Staff Features:**
- View complaints assigned to their department
- Filter by priority, date, status
- Update complaint status (Open → In Progress → Resolved)
- Add remarks/progress notes visible to citizen
- Request extension if can't meet deadline
- Close complaint after resolution
- View department performance (avg resolution time, pending count)

**Administrator Features:**
- View system dashboard (total complaints, open, resolved, pending)
- View all departments' performance (SLA compliance %)
- Escalate overdue complaints to higher authority
- Generate reports (by category, by department, resolution times)
- Configure complaint categories and department mappings
- Set SLA timelines (e.g., potholes = 7 days, streetlights = 10 days)
- Manage user accounts (staff, departments)
- View escalation history

**System Features:**
- Automatic routing (complaint → department based on category)
- Workflow engine (state machine: OPEN → IN_PROGRESS → RESOLVED)
- SLA tracking (deadline = filed date + SLA timeline)
- Auto-escalation (if not resolved by deadline, escalate to higher authority)
- Notifications (email, in-app, SMS on status change)
- Audit trail (every action logged with user, timestamp)
- Real-time dashboard updates
- Performance analytics

### **COMPLETELY OUT OF SCOPE**

- Automated complaint resolution (ML prediction)
- Payment/fine collection for violations
- Integration with municipal budget systems
- Video surveillance integration
- Drone inspections for damage assessment
- Multi-language support (English only)
- Mobile app (web only, responsive design instead)
- Integration with CPGRAMS (standalone system)
- Predictive maintenance (machine learning)
- GIS/mapping integration
- Document e-signature
- Advanced analytics (only basic reports)
- SMS sending (mock logs only)
- Integration with payment gateways
- Worker assignment/tracking

---

## 4. Functional Requirements

### 4.1 User Roles (5 Roles Only)

**Citizen:**
- File complaint
- View status
- Rate resolution
- Download receipt

**Department Staff:**
- View assigned complaints
- Update status
- Add remarks
- Request extension

**Department Head:**
- View department performance
- Approve status updates
- Manage staff
- View escalations

**Administrator:**
- System oversight
- Reports generation
- Configure categories
- Manage escalations

**Superuser:**
- All permissions

---

### 4.2 Complaint Workflow (State Machine)

#### **State Transitions:**

```
STATE MACHINE DIAGRAM:

FILED (Initial State)
  ↓ (Auto-assigned to department)
OPEN
  ↓ (Department staff marks as attending)
IN_PROGRESS
  ↓ (Issue fixed/resolved)
RESOLVED
  ↓ (Optional: Citizen feedback)
CLOSED

ESCALATION PATH:
  OPEN (SLA date passed)
    ↓ (Auto-escalate)
  ESCALATED_LEVEL_1
    ↓ (Still not resolved after 2 more days)
  ESCALATED_LEVEL_2
    ↓ (Critical priority now)
  ESCALATED_LEVEL_3 (DM/Commissioner)

CANCELLATION PATH:
  Any state → CANCELLED (if citizen requests or duplicate found)

HOLD PATH:
  IN_PROGRESS → HOLD (department requests extension)
                 → IN_PROGRESS (after extension granted)

DATABASE TRACKING:
- Complaint ID: comp_2024_001
- Category: POTHOLE
- Status: IN_PROGRESS
- Assigned department: ROADS
- Assigned staff: Ramesh Kumar
- Filed date: 2025-12-20 10:30 AM
- SLA deadline: 2025-12-27 10:30 AM (7 days for potholes)
- Current stage: IN_PROGRESS (started at 2025-12-22 09:15 AM)
- Escalations: None yet
- Last update: 2025-12-25 02:30 PM
- Citizen satisfaction: Not yet rated
```

#### **Business Rules (Critical):**

```
RULE 1: Valid State Transitions
- OPEN → IN_PROGRESS ✓
- OPEN → RESOLVED ✗ (must go through IN_PROGRESS)
- IN_PROGRESS → OPEN ✗ (no rollback)
- IN_PROGRESS → RESOLVED ✓
- RESOLVED → CLOSED ✓
- Any state → CANCELLED ✓ (if citizen requests or duplicate)

RULE 2: SLA Enforcement
- Each category has SLA: Pothole (7 days), Streetlight (10 days), Water (5 days)
- SLA deadline = filed_date + category_sla_days
- If complaint not resolved by deadline → AUTO ESCALATE
- Escalation visible in dashboard as RED
- Escalation notifies higher authority immediately

RULE 3: Department Assignment
IF complaint.category == "POTHOLE":
  assign_to_department = "ROADS"
ELSE IF complaint.category == "STREETLIGHT":
  assign_to_department = "ELECTRICAL"
ELSE IF complaint.category == "WATER":
  assign_to_department = "WATER_SUPPLY"
ELSE:
  assign_to_department = "ADMIN"

RULE 4: Escalation Levels
Level 0: Department staff (junior technician)
Level 1: Department supervisor (after 1 day overdue)
Level 2: Department head (after 3 days overdue)
Level 3: Municipal Commissioner (after 7 days overdue, CRITICAL)

RULE 5: No Duplicate Complaints
- If similar complaint filed within 7 days of existing complaint
- Show warning: "Complaint [ID] already exists for same location"
- Allow filing anyway but link both complaints

RULE 6: Resolution Remarks Required
- Department can't mark RESOLVED without adding remarks
- Remarks visible to citizen
- Remarks must be at least 20 characters

RULE 7: Citizen Rating (Post-Resolution)
- After marked RESOLVED, city gets 48 hours to rate
- Rating: 5-star (satisfied), 3-star (partially), 1-star (not satisfied)
- Low rating (1-2 stars) triggers review by department head
```

---

### 4.3 Routing Logic (Category → Department)

```
COMPLAINT CATEGORY → DEPARTMENT MAPPING:

POTHOLE → ROADS
  SLA: 7 days
  Priority base: MEDIUM (becomes HIGH if main road)
  
STREETLIGHT → ELECTRICAL
  SLA: 10 days
  Priority base: MEDIUM
  
WATER SHORTAGE → WATER_SUPPLY
  SLA: 5 days
  Priority base: HIGH (affects health)
  
SEWER/DRAINAGE → SEWERAGE
  SLA: 7 days
  Priority base: MEDIUM
  
GARBAGE → SANITATION
  SLA: 3 days
  Priority base: LOW
  
TRAFFIC/SIGNALS → TRAFFIC
  SLA: 5 days
  Priority base: MEDIUM
  
PARK MAINTENANCE → PARKS
  SLA: 10 days
  Priority base: LOW
  
ELECTRICAL DAMAGE → ELECTRICAL
  SLA: 3 days (safety issue)
  Priority base: CRITICAL
  
OTHER → ADMIN
  SLA: 14 days (generic)
  Priority base: LOW

PRIORITY ESCALATION:
- If location = "HOSPITAL/SCHOOL" → Priority up 1 level
- If category = "ELECTRICAL_DAMAGE" → Priority = CRITICAL always
- If escalated once → Priority up 1 level
- If escalated twice → Priority = CRITICAL
```

---

### 4.4 Auto-Escalation Logic

```
SCHEDULED JOB: Every 6 hours, check all IN_PROGRESS complaints

FOR EACH complaint IN IN_PROGRESS:
  
  days_passed = NOW - complaint.filed_date
  sla_days = category_sla[complaint.category]
  
  IF days_passed > sla_days:
    
    IF no escalation yet:
      complaint.escalation_level = 1
      complaint.priority = HIGH
      notify(department_head)
      log("Complaint escalated to supervisor")
    
    ELSE IF days_passed > sla_days + 2:
      complaint.escalation_level = 2
      complaint.priority = HIGH
      notify(commissioner_office)
      log("Complaint escalated to department head")
    
    ELSE IF days_passed > sla_days + 5:
      complaint.escalation_level = 3
      complaint.priority = CRITICAL
      notify(cmo_and_admin_board)
      log("CRITICAL: Escalated to CMO office")

NOTIFICATION CONTENT:
  Subject: "Complaint #comp_2024_001 OVERDUE - ESCALATION LEVEL 1"
  Body: "Pothole complaint filed 8 days ago (SLA: 7 days)"
        "Location: Main Street, Sector 5"
        "Current status: IN_PROGRESS"
        "Last update: 2025-12-24 03:45 PM"
        "Action required: Please resolve immediately"
        "Link: [View complaint]"
```

---

## 5. Data Model (MINIMAL - 8 Tables)

### **User Entity (Role-Based)**
```
- user_id (PK)
- email (UNIQUE)
- phone (UNIQUE)
- name
- password_hash

- user_type (ENUM: CITIZEN, STAFF, DEPT_HEAD, ADMIN, SUPERUSER)
- department_id (FK, NULL if citizen)

- created_at
- last_login
- is_active


- INDEX idx_email
- INDEX idx_user_type
- INDEX idx_department_id
```

### **Complaint Entity (Core)**
```
- complaint_id (PK)
- complaint_number (VARCHAR UNIQUE) - "comp_2024_001"
- citizen_id (FK to user)
- category (ENUM: POTHOLE, STREETLIGHT, WATER, etc.)
- description (TEXT)
- location_address (VARCHAR)
- latitude (DECIMAL, optional)
- longitude (DECIMAL, optional)
- photo_url (VARCHAR, optional)
- priority (ENUM: LOW, MEDIUM, HIGH, CRITICAL)
- status (ENUM: FILED, OPEN, IN_PROGRESS, HOLD, RESOLVED, CLOSED, CANCELLED)
- assigned_department_id (FK)
- assigned_staff_id (FK to user, NULL initially)
- filed_date (TIMESTAMP)
- sla_deadline (TIMESTAMP) - calculated from filed_date + category SLA
- start_date (TIMESTAMP, when moved to IN_PROGRESS)
- resolved_date (TIMESTAMP)
- closed_date (TIMESTAMP)
- escalation_level (INT, default 0) - 0, 1, 2, 3 (escalated to higher authority)
- escalation_history (JSON) - [{level: 1, date: '...', notified_to: 'supervisor'}, ...]
- citizen_satisfaction (INT 1-5, NULL until rated)
- is_duplicate_of (FK to complaint, NULL if not duplicate)
- created_at
- updated_at
- INDEX idx_status
- INDEX idx_category
- INDEX idx_sla_deadline
- INDEX idx_citizen_id
- INDEX idx_assigned_department
- INDEX idx_escalation_level
```

### **Complaint Remark Entity**
```
- remark_id (PK)
- complaint_id (FK)
- staff_id (FK to user who made remark)
- remark_text (TEXT, min 20 chars)
- is_public (BOOLEAN) - visible to citizen?
- type (ENUM: STATUS_UPDATE, PROGRESS, RESOLUTION)
- created_at
- INDEX idx_complaint_id
- INDEX idx_created_at
```

### **Department Entity**
```
- department_id (PK)
- name (VARCHAR) - "ROADS", "ELECTRICAL"
- description (VARCHAR)
- head_id (FK to user)
- contact_phone (VARCHAR)
- contact_email (VARCHAR)
- avg_resolution_time (FLOAT, in days)
- total_complaints (INT)
- resolved_complaints (INT)
- created_at
- INDEX idx_name
```

### **SLA Configuration Entity**
```
- sla_id (PK)
- category (ENUM UNIQUE)
- sla_days (INT) - 7, 10, 5, etc.
- escalation_days (ARRAY) - [1, 3, 7] (escalate after 1, 3, 7 days overdue)
- priority (ENUM: LOW, MEDIUM, HIGH)
- created_at
- updated_at
```

### **Escalation Event Entity**
```
- escalation_id (PK)
- complaint_id (FK)
- level (INT) - 1, 2, 3
- escalated_from_user_id (FK)
- escalated_to_user_id (FK)
- reason (TEXT)
- escalated_at (TIMESTAMP)
- resolved_at (TIMESTAMP, NULL if not yet)
- INDEX idx_complaint_id
- INDEX idx_level
```

### **Audit Trail Entity**
```
- audit_id (PK)
- complaint_id (FK)
- user_id (FK)
- action (VARCHAR) - "STATUS_CHANGE", "REMARK_ADDED", "ESCALATED", etc.
- old_value (VARCHAR) - what changed from
- new_value (VARCHAR) - what changed to
- timestamp (TIMESTAMP)
- ip_address (VARCHAR)
- INDEX idx_complaint_id
- INDEX idx_action
- INDEX idx_timestamp
```

### **Notification Entity**
```
- notification_id (PK)
- user_id (FK)
- complaint_id (FK)
- type (ENUM: STATUS_CHANGE, ESCALATION, RATING_REQUEST, COMPLETION)
- title (VARCHAR)
- message (TEXT)
- link (VARCHAR)
- read (BOOLEAN DEFAULT FALSE)
- created_at
- INDEX idx_user_id
- INDEX idx_read
```

**Total: 8 tables. Focused on complaint lifecycle management.**

---

## 6. Technical Stack (Minimalist)

**Backend:**
- Spring Boot (REST API + business logic)
- MySQL (complaint data + audit trail)
- Scheduled Tasks (for auto-escalation every 6 hours)
- JWT Authentication
- Jackson (JSON serialization)

**Frontend:**
- React (functional components)
- Axios (HTTP requests)
- Bootstrap (styling)
- React Hooks (state management)
- React Router (navigation)

**No extras:** No ML, no advanced analytics, no payment processing.

---

## 7. API Endpoints (20 ONLY)

### **Authentication (2 endpoints)**
- `POST /api/auth/register` - Register citizen/staff
- `POST /api/auth/login` - Login (returns JWT)

### **Complaint Management (6 endpoints)**
- `POST /api/complaints` - File new complaint
- `GET /api/complaints` - Get complaints (with filters: status, category, department)
- `GET /api/complaints/{complaintId}` - Get single complaint details
- `PUT /api/complaints/{complaintId}/status` - Update complaint status
- `POST /api/complaints/{complaintId}/remarks` - Add remark
- `DELETE /api/complaints/{complaintId}` - Cancel complaint

### **Citizen Operations (3 endpoints)**
- `GET /api/my-complaints` - Get my filed complaints
- `PUT /api/complaints/{complaintId}/rate` - Rate resolution (1-5 stars)
- `GET /api/complaints/{complaintId}/receipt` - Download receipt

### **Department Operations (3 endpoints)**
- `GET /api/department/assigned-complaints` - Get complaints assigned to my dept
- `PUT /api/complaints/{complaintId}/assign-to-me` - Self-assign complaint
- `GET /api/department/performance` - View department stats

### **Admin Operations (4 endpoints)**
- `GET /api/admin/dashboard` - System statistics
- `POST /api/admin/escalate/{complaintId}` - Manually escalate
- `GET /api/admin/reports` - Generate reports (by category, dept, time)
- `POST /api/admin/sla-config` - Configure SLA timelines

### **System Operations (2 endpoints)**
- `POST /api/system/check-escalations` - Manually trigger escalation check (admin)
- `GET /api/system/health` - System health check

**That's 20 endpoints. Complete workflow coverage.**

---

## 8. Frontend Pages (8 PAGES ONLY)

### **Page 1: Authentication**
- Login form (email + password)
- Register form (role selector: citizen or staff)
- Forgot password link

### **Page 2: Citizen - File Complaint**
- Form:
  - Category (dropdown: Pothole, Streetlight, Water, etc.)
  - Location/Address (text field + optional map pin)
  - Description (textarea, min 50 chars)
  - Photo upload (optional)
  - Agree to terms (checkbox)
- Submit button: "FILE COMPLAINT"
- Success page: Shows complaint number, SLA deadline, department assigned

### **Page 3: Citizen - View Complaints**
- List of all my complaints (filed by me)
- Columns: Complaint#, Category, Status, Filed date, SLA deadline, Days remaining
- Filter by: Status (Open, In Progress, Resolved), Category
- Sort by: Filed date, SLA deadline
- Click row → View details page

### **Page 4: Citizen - Complaint Details**
- Full complaint info:
  - Complaint number, category, status
  - Location, description, photo
  - Filed date, SLA deadline, escalation level
  - Department assigned, staff assigned
- Timeline (all updates):
  - When filed, when assigned, when moved to in-progress, remarks added
  - Each with timestamp, who made update, remark text
- Actions:
  - Cancel button (if status is OPEN)
  - Rate button (if status is RESOLVED, not yet rated)
  - Download receipt button

### **Page 5: Staff - Dashboard**
- List of assigned complaints (sorted by SLA deadline)
- Columns: Complaint#, Category, Priority, Filed date, Days left, Status
- Color coding: RED if SLA deadline < 2 days away, YELLOW if < 5 days
- Filter by: Status, Priority
- Click row → View complaint
- Quick actions: Mark as "In Progress", "Resolved"

### **Page 6: Staff - Complaint Detail & Update**
- Full complaint info (read-only for staff)
- Status update section:
  - Current status dropdown
  - New status dropdown
  - Remarks textarea (min 20 chars)
  - Submit button
- Timeline of all remarks
- Extension request button (if need more time)

### **Page 7: Admin - Dashboard**
- Statistics panel:
  - Total complaints: 1,234
  - Open: 45, In Progress: 123, Resolved: 980
  - Escalated: 12 (red highlight)
  - Average resolution time: 5.2 days
- Department performance table:
  - Department, Total, Resolved, Pending, Avg resolution time, SLA compliance %
- Escalation alerts:
  - List of critical escalations (level 3)
  - List of overdue complaints
- Quick actions: View all escalations, Generate reports

### **Page 8: Admin - Reports & Analytics**
- Report builder:
  - By category (pie chart: Pothole: 234, Streetlight: 156, etc.)
  - By department (bar chart: ROADS: 320, ELECTRICAL: 210, etc.)
  - By resolution time (histogram: 1-3 days: 200, 3-7 days: 300, 7+ days: 100)
  - By month (line chart: Jan: 450, Feb: 520, etc.)
- Exportable: CSV, PDF
- Filter by: Date range, Category, Department, Status

---

## 9. Core Workflows

### **Workflow 1: Citizen Files Complaint**

1. Citizen registers/logs in
2. Clicks "FILE NEW COMPLAINT"
3. Selects category: "POTHOLE"
4. Enters location: "Main Street, Sector 5"
5. Describes: "Large pothole on main road, 3 feet wide, 1 foot deep"
6. Uploads photo
7. Submits
8. System:
   - Creates complaint: comp_2024_001
   - Status: FILED → OPEN (auto-transition)
   - Routes to department: ROADS (auto-assignment)
   - SLA deadline: 7 days from now
   - Priority: MEDIUM (main road would be HIGH)
   - Notifies ROADS department
9. Citizen sees:
   - Confirmation page: "Complaint filed successfully!"
   - Complaint number: comp_2024_001
   - SLA deadline: 2025-12-27
   - Department: ROADS
   - Status: OPEN (awaiting staff assignment)

---

### **Workflow 2: Staff Updates Complaint Status**

**Initial:** Complaint is OPEN (not yet assigned to anyone)

1. Staff from ROADS department logs in
2. Sees list of OPEN complaints assigned to ROADS
3. Clicks complaint comp_2024_001
4. Views full details (location, description, photo)
5. Clicks "Assign to Me" button
6. Status auto-updated: OPEN → IN_PROGRESS
7. Staff adds remark: "Visited location. Pothole confirmed. Repair scheduled for tomorrow morning."
8. System:
   - Updates complaint.status = IN_PROGRESS
   - Sets assigned_staff = current staff
   - Records remark with timestamp
   - Notifies citizen: "Your complaint is being addressed. Status: In Progress"
   - Updates timeline
9. Citizen receives notification + sees updated status

---

### **Workflow 3: Staff Resolves Complaint**

**Current:** Complaint is IN_PROGRESS (3 days later)

1. Staff logs in
2. Clicks complaint comp_2024_001
3. Views current status: IN_PROGRESS
4. After fixing pothole, adds remark: "Pothole repaired. Road surface leveled and sealed. Quality check passed."
5. Changes status: IN_PROGRESS → RESOLVED
6. System:
   - Updates complaint.status = RESOLVED
   - Sets resolved_date = now
   - Records remark
   - Notifies citizen: "Your complaint has been resolved!"
   - Sends notification with link to rate resolution
7. Citizen receives notification with rating prompt
8. Citizen rates: 5 stars (satisfied)
9. Status auto-transitions: RESOLVED → CLOSED (after citizen rates)

---

### **Workflow 4: Auto-Escalation (SLA Breach)**

**Scenario:** Complaint filed 8 days ago (SLA: 7 days)

1. Scheduled job runs every 6 hours
2. Checks complaint comp_2024_001 (status: IN_PROGRESS, filed 8 days ago)
3. SLA deadline was 7 days ago → OVERDUE
4. No escalation level yet → Escalate to Level 1
5. System:
   - Sets escalation_level = 1
   - Sets priority = HIGH (from MEDIUM)
   - Notifies department supervisor: "Complaint comp_2024_001 is overdue by 1 day!"
   - Logs escalation event with reason: "SLA deadline breached"
   - Makes complaint RED in dashboard

**If still not resolved after 3 more days:**

6. Next scheduled job run (11 days after filing)
7. Escalates to Level 2
8. Notifies department head: "CRITICAL: Complaint overdue by 4 days!"
9. Priority now: CRITICAL

**If still not resolved after 7 more days:**

10. Escalates to Level 3
11. Notifies Commissioner: "CRITICAL: Complaint overdue by 11 days! Immediate action required!"
12. Creates escalation record in admin dashboard

---

### **Workflow 5: Admin Generates Report**

1. Admin logs in
2. Clicks "Reports & Analytics"
3. Selects report type: "By Department"
4. Filters: Date range = Dec 1-31, 2025
5. System generates:
   - ROADS: 234 total, 210 resolved (89.7%), avg 5.2 days
   - ELECTRICAL: 145 total, 140 resolved (96.5%), avg 4.1 days
   - WATER: 89 total, 76 resolved (85.4%), avg 3.8 days
6. Shows bar chart
7. Admin exports as PDF
8. Admin sees: ELECTRICAL has best SLA compliance, WATER needs improvement

---

## 10. Realistic 48-Hour Timeline (38-40 Hours Work + 8-9 Hours Buffer)

| Hours | Task | Deliverable |
|-------|------|-------------|
| 0-1 | Project setup | Spring Boot + React skeleton |
| 1-2 | Database schema | 8 tables with relationships |
| 2-3 | User auth CRUD | Register, login, JWT |
| 3-4 | Complaint CRUD | Create, read, update |
| 4-5 | Routing logic | Auto-assign to department |
| 5-6 | Remark system | Add remarks, audit trail |
| 6-7 | **Status transitions** | Validate state changes |
| 7-9 | **Escalation logic** | Auto-escalate, notify |
| 9-10 | **SLA tracking** | Calculate deadline, highlight overdue |
| 10-11 | Notification system | Email, in-app, SMS logs |
| 11-12 | Department dashboard UI | View assigned complaints |
| 12-13 | Citizen file complaint UI | Form, file upload |
| 13-14 | Complaint details UI | View timeline, status |
| 14-15 | Status update UI | Change status, add remark |
| 15-16 | Admin dashboard UI | Statistics, escalations |
| 16-17 | Reports UI | Generate, filter, export |
| 17-18 | Complaint list UI | Filter, sort, search |
| 18-19 | Rating system UI | Star rating, feedback |
| 19-20 | API integration | Connect frontend to backend |
| 20-21 | Styling & responsive | Bootstrap, mobile-friendly |
| 21-22 | Testing - complaint flow | File → Open → In Progress → Resolved |
| 22-23 | Testing - escalation | Check auto-escalation logic |
| 23-24 | Testing - routing | Various categories → correct dept |
| 24-25 | Testing - validation | Invalid transitions blocked |
| 25-26 | Bug fixes | State transitions, routing |
| 26-27 | Performance testing | Handle 1000 complaints |
| 27-28 | Final polish | UI refinement, responsiveness |
| 28-30 | Dry run & demo prep | Test all workflows |
| 30-40 | BUFFER | Debug escalation (2-3 hrs), fix state machine (2-3 hrs), final polish (1-2 hrs) |

**Total: 40-49 hours covered, with substantial buffer.**

---

## 11. Minimal Feature Demo (12 Minutes)

```
Minute 0-1: Explain the system
  "Public Grievance Redressal System - tracks complaints from filing to resolution"
  "Citizens file, departments fix, system ensures accountability"

Minute 1-2: Show citizen registration & complaint filing
  - Register as citizen: "Rahul Patel"
  - Logs in
  - Clicks "FILE COMPLAINT"
  - Selects category: "POTHOLE"
  - Enters location: "Main Street, Sector 5"
  - Describes: "Large pothole on main road"
  - Uploads photo
  - Submits
  - Confirmation: "Complaint filed! Number: comp_2024_001"

Minute 2-3: Show auto-routing & department assignment
  - Behind the scenes (admin view):
    * System auto-routed to ROADS department
    * ROADS staff sees new complaint in their dashboard
    * Status: OPEN (awaiting action)
    * SLA deadline: 7 days from now

Minute 3-4: Show staff workflow
  - Log in as ROADS staff
  - See complaint comp_2024_001 in dashboard
  - Click complaint → View details
  - Click "Assign to Me"
  - Add remark: "Visited, confirmed. Repair tomorrow."
  - Change status: OPEN → IN_PROGRESS
  - Citizen notified in real-time

Minute 4-5: Show resolution
  - (Next day) Staff returns, marks resolved
  - Adds remark: "Pothole repaired. Quality check passed."
  - Status: IN_PROGRESS → RESOLVED
  - Citizen gets notification: "Your complaint is resolved!"
  - Citizen asked to rate: Stars
  - Status: RESOLVED → CLOSED

Minute 5-6: Show escalation (SLA breach)
  - Show another complaint: comp_2024_002
  - Filed 8 days ago (SLA: 7 days)
  - Status: IN_PROGRESS
  - Admin dashboard shows: RED highlight "OVERDUE by 1 day"
  - Shows escalation: "Escalated to Level 1 - Supervisor"
  - Supervisor gets notification with complaint details

Minute 6-8: Show admin dashboard
  - Statistics panel:
    * Total: 342 complaints
    * Open: 45, In Progress: 123, Resolved: 250
    * Escalated: 12 (RED)
    * Avg resolution: 5.2 days
  - Department performance:
    * ROADS: 120 total, 98% SLA compliance
    * ELECTRICAL: 89 total, 92% SLA compliance
  - Critical escalations list

Minute 8-10: Show reports
  - Click "Reports"
  - Generate "By Department" report
  - Shows bar chart: ROADS (120), ELECTRICAL (89), WATER (67)
  - Shows line chart: Resolution trend over time
  - Exports as PDF

Minute 10-12: Show timeline & audit
  - Click complaint comp_2024_001
  - View complete timeline:
    * Filed: Dec 20, 10:30 AM
    * Assigned to staff: Dec 20, 11:15 AM
    * In Progress: Dec 20, 2:45 PM (remark: "Repair scheduled")
    * Resolved: Dec 22, 9:30 AM (remark: "Repaired successfully")
    * Rated: 5 stars
    * Closed: Dec 22, 9:35 AM
  - Each entry shows who, what, when

Demo END
```

**Demonstrates:** File → Auto-route → In Progress → Resolve → Rate → Escalate.

---

## 12. Database Schema (EXACT)

```sql
-- Users table
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(15) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  user_type ENUM('CITIZEN', 'STAFF', 'DEPT_HEAD', 'ADMIN', 'SUPERUSER') NOT NULL,
  department_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (department_id) REFERENCES departments(department_id),
  INDEX idx_email (email),
  INDEX idx_user_type (user_type),
  INDEX idx_department_id (department_id)
);

-- Departments table
CREATE TABLE departments (
  department_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description VARCHAR(255),
  head_id INT,
  contact_phone VARCHAR(15),
  contact_email VARCHAR(100),
  avg_resolution_time FLOAT DEFAULT 0,
  total_complaints INT DEFAULT 0,
  resolved_complaints INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (head_id) REFERENCES users(user_id),
  INDEX idx_name (name)
);

-- Complaints table (Core)
CREATE TABLE complaints (
  complaint_id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_number VARCHAR(50) UNIQUE NOT NULL,
  citizen_id INT NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  location_address VARCHAR(255) NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  photo_url VARCHAR(255),
  priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
  status ENUM('FILED', 'OPEN', 'IN_PROGRESS', 'HOLD', 'RESOLVED', 'CLOSED', 'CANCELLED') DEFAULT 'FILED',
  assigned_department_id INT,
  assigned_staff_id INT,
  filed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sla_deadline TIMESTAMP,
  start_date TIMESTAMP,
  resolved_date TIMESTAMP,
  closed_date TIMESTAMP,
  escalation_level INT DEFAULT 0,
  escalation_history JSON,
  citizen_satisfaction INT,
  is_duplicate_of INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (citizen_id) REFERENCES users(user_id),
  FOREIGN KEY (assigned_department_id) REFERENCES departments(department_id),
  FOREIGN KEY (assigned_staff_id) REFERENCES users(user_id),
  FOREIGN KEY (is_duplicate_of) REFERENCES complaints(complaint_id),
  UNIQUE KEY unique_number (complaint_number),
  INDEX idx_status (status),
  INDEX idx_category (category),
  INDEX idx_sla_deadline (sla_deadline),
  INDEX idx_citizen_id (citizen_id),
  INDEX idx_assigned_department (assigned_department_id),
  INDEX idx_escalation_level (escalation_level),
  INDEX idx_filed_date (filed_date)
);

-- Remarks table
CREATE TABLE remarks (
  remark_id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL,
  staff_id INT NOT NULL,
  remark_text TEXT NOT NULL,
  is_public BOOLEAN DEFAULT TRUE,
  type ENUM('STATUS_UPDATE', 'PROGRESS', 'RESOLUTION') DEFAULT 'PROGRESS',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES users(user_id),
  INDEX idx_complaint_id (complaint_id),
  INDEX idx_created_at (created_at)
);

-- SLA Configuration table
CREATE TABLE sla_configs (
  sla_id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(50) UNIQUE NOT NULL,
  sla_days INT NOT NULL,
  escalation_days JSON,
  base_priority ENUM('LOW', 'MEDIUM', 'HIGH') DEFAULT 'MEDIUM',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category)
);

-- Escalation Events table
CREATE TABLE escalation_events (
  escalation_id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL,
  level INT NOT NULL,
  escalated_from_user_id INT,
  escalated_to_user_id INT,
  reason VARCHAR(255),
  escalated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id),
  FOREIGN KEY (escalated_from_user_id) REFERENCES users(user_id),
  FOREIGN KEY (escalated_to_user_id) REFERENCES users(user_id),
  INDEX idx_complaint_id (complaint_id),
  INDEX idx_level (level)
);

-- Audit Trail table
CREATE TABLE audit_logs (
  audit_id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL,
  user_id INT,
  action VARCHAR(100),
  old_value VARCHAR(255),
  new_value VARCHAR(255),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  INDEX idx_complaint_id (complaint_id),
  INDEX idx_action (action),
  INDEX idx_timestamp (timestamp)
);

-- Notifications table
CREATE TABLE notifications (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  complaint_id INT,
  type ENUM('STATUS_CHANGE', 'ESCALATION', 'RATING_REQUEST', 'COMPLETION'),
  title VARCHAR(150),
  message TEXT,
  link VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id),
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read)
);
```

---

## 13. What Can Go Wrong (Risk Mitigation)

| Risk | Mitigation |
|------|-----------|
| Invalid state transition | Validate in code, only allow valid transitions |
| Escalation not triggered | Run scheduled job every 6 hours, log results |
| Wrong department assigned | Test routing logic with all categories |
| Staff marks resolved without remarks | Make remarks mandatory in code |
| Duplicate complaints not caught | Check location + category + date within 7 days |
| SLA deadline calculation wrong | Use standard date libraries, test edge cases |
| Notification not sent | Log all notifications, provide retry mechanism |
| Complaint lost in system | Ensure unique complaint number, audit trail |

---

## 14. Definition of "Done" (Bare Minimum)

Student can demonstrate:
1. Citizen files complaint (category, location, description)
2. System auto-routes to correct department
3. Staff logs in, sees assigned complaints
4. Staff marks as "In Progress" (with remark)
5. Staff marks as "Resolved" (with remark, required)
6. Citizen notified of status changes
7. Citizen rates resolution (1-5 stars)
8. Status auto-transitions: RESOLVED → CLOSED
9. Admin dashboard shows statistics (total, open, resolved)
10. Overdue complaints escalate (Level 1, 2, 3) after deadlines

**If all 10 work end-to-end, project is successful.**

---

## 15. Evaluation Rubric (Realistic)

**Working System (40%)**
- Complaint filing works
- Auto-routing to department works
- Status updates work
- No crashes, data persists
- Responsive UI (desktop + mobile)

**State Machine & Workflow (35%)**
- Valid transitions enforced
- Invalid transitions blocked
- Status changes logged to audit trail
- Remarks required for resolution
- Escalation triggers at correct times

**Routing Logic (15%)**
- Each category maps to correct department
- SLA deadline calculated correctly
- Priority assigned based on category/location
- Duplicate detection working

**Notifications & Reporting (10%)**
- Notifications sent on status change
- Admin dashboard shows accurate stats
- Reports generated correctly

---

## 16. Bonus Features (If Time Permits)

1. **SMS notifications** - Send actual SMS (not mock)
2. **Email to department** - Notify via email
3. **GIS mapping** - Show complaint location on map
4. **Attachment support** - Multiple photos per complaint
5. **Advanced search** - Full-text search by description
6. **Bulk operations** - Assign multiple complaints at once
7. **Custom workflows** - Allow department to define own state transitions
8. **Photo before/after** - Track photos of resolution
9. **Feedback survey** - Detailed satisfaction survey
10. **Mobile app** - Native Android/iOS app

---

## 17. If Student Gets Stuck (Bailout Options)

If running out of time, priority order:

**Must have (70% of grade):**
- Complaint filing
- Auto-routing
- Status updates
- State machine validation
- Department dashboard

**Nice to have (20% of grade):**
- Escalation logic
- Notifications
- Admin dashboard
- Reports

**Don't bother (10% of grade):**
- SMS sending
- GIS mapping
- Detailed analytics
- Mobile app

**Better to submit 70% working core + basic status updates than 100% with broken state machine.**

---

## 18. Sample Data (Hardcoded)

**Users:**
- Citizen: "rahul@citizen.com" - Rahul Patel
- Staff: "akshay@roads.com" - Akshay (ROADS dept)
- Admin: "admin@city.com" - Admin User

**Departments:**
- ROADS, ELECTRICAL, WATER_SUPPLY, SEWERAGE, SANITATION, TRAFFIC

**Complaints:**
- comp_2024_001: Pothole, Main St, ROADS, SLA 7 days
- comp_2024_002: Streetlight, Sector 5, ELECTRICAL, SLA 10 days
- comp_2024_003: Water shortage, Block C, WATER, SLA 5 days

**SLA Configs:**
- POTHOLE: 7 days, escalate at [1, 3, 7] days
- STREETLIGHT: 10 days, escalate at [2, 5, 10] days
- WATER: 5 days, escalate at [1, 3, 5] days

---

## 19. Common Mistakes to Avoid

**Don't:**
- Don't allow OPEN → RESOLVED (must go through IN_PROGRESS)
- Don't skip remark when resolving
- Don't allow same person to resolve own complaint
- Don't forget to update SLA deadline on filing
- Don't hardcode department mappings (use config)
- Don't skip escalation logic (critical for accountability)
- Don't forget audit trail (every action must be logged)

**Do:**
- Validate all state transitions before allowing
- Require remarks for status changes
- Log all actions with user, timestamp, old/new value
- Test all transition paths
- Use database constraints (UNIQUE complaint number)
- Run escalation job regularly
- Notify stakeholders on every change

---

## 20. Critical Implementation Checklist

### **State Machine:**
- All 6 states defined (FILED, OPEN, IN_PROGRESS, RESOLVED, CLOSED, CANCELLED)
- Valid transitions map correct
- Invalid transitions throw exception
- Remarks required for resolution
- Audit logged for each transition

### **Routing:**
- All categories mapped to departments
- SLA deadline calculated on filing
- Priority set based on category
- Duplicate warning shown

### **Escalation:**
- Scheduled job checks every 6 hours
- Escalates at correct day thresholds
- Notifies escalation authority
- Escalation visible in dashboard
- Multiple levels supported (1, 2, 3)

### **Database:**
- Unique complaint numbers
- Foreign key constraints
- Audit trail captures everything
- Indexes on frequently queried columns

---

## 21. Performance Checklist

For large system (10,000 complaints, 1000 staff, 100 departments):

- File complaint in <1 second
- List complaints in <2 seconds
- Update status in <500ms
- Generate report in <5 seconds
- Search/filter in <1 second

**Optimization strategies:**
- Index on status, category, sla_deadline
- Pagination for lists (50 per page)
- Cache department list (rarely changes)
- Use prepared statements
- Batch escalation checks

---

## Conclusion

This **48-hour version** focuses on **core complaint workflow:** File → Route → Update → Escalate → Resolve.

**Key Success Factor:** Get state machine right. Everything else is UI.

**What makes this achievable:**
- Simple data model (8 tables)
- Clear state transitions
- Straightforward routing logic
- Standard REST API
- 20 focused endpoints

**Realistic assessment: A solo student or team of 2 working 48 hours can complete this 100% with proper buffer.**

**Key insight:** This teaches workflow engine design - critical for ERP, CRM, and process automation systems.

**Critical Reminders:**
- State machine must enforce valid transitions
- Escalation is automatic, not manual
- Routing is deterministic based on category
- Audit trail captures everything
- SLA deadline calculated once, used for escalation
- No complaints lost (unique number + database constraint)

**Real-world impact:** India's CPGRAMS system handles 29+ lakh complaints annually, with this exact workflow pattern.

**Good luck!**
