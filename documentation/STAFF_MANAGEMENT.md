# Staff & Department Management API Documentation

## Overview

This module handles staff management within departments. Departments are pre-populated on application startup, and admins can create staff members and assign department heads.

---

## Pre-populated Data

### Departments (Fixed IDs)

| ID | Department Name |
|----|-----------------|
| 1  | ROADS           |
| 2  | ELECTRICAL      |
| 3  | WATER_SUPPLY    |
| 4  | SEWERAGE        |
| 5  | SANITATION      |
| 6  | TRAFFIC         |

### Sample Staff & Department Heads

All users have password: `argusargus`

#### Department 1: ROADS
| Name         | Email                    | Mobile      | Role      |
|--------------|--------------------------|-------------|-----------|
| Suresh Patel | suresh.patel@gmail.com   | 9876543100  | DEPT_HEAD |
| Rajesh Kumar | rajesh.kumar@gmail.com   | 9876543101  | STAFF     |
| Amit Sharma  | amit.sharma@gmail.com    | 9876543102  | STAFF     |
| Vikram Singh | vikram.singh@gmail.com   | 9876543103  | STAFF     |

#### Department 2: ELECTRICAL
| Name         | Email                    | Mobile      | Role      |
|--------------|--------------------------|-------------|-----------|
| Ramesh Joshi | ramesh.joshi@gmail.com   | 9876543200  | DEPT_HEAD |
| Manoj Verma  | manoj.verma@gmail.com    | 9876543201  | STAFF     |
| Deepak Gupta | deepak.gupta@gmail.com   | 9876543202  | STAFF     |
| Anil Yadav   | anil.yadav@gmail.com     | 9876543203  | STAFF     |

#### Department 3: WATER_SUPPLY
| Name           | Email                      | Mobile      | Role      |
|----------------|----------------------------|-------------|-----------|
| Mukesh Agarwal | mukesh.agarwal@gmail.com   | 9876543300  | DEPT_HEAD |
| Pradeep Mishra | pradeep.mishra@gmail.com   | 9876543301  | STAFF     |
| Sanjay Tiwari  | sanjay.tiwari@gmail.com    | 9876543302  | STAFF     |
| Arvind Pandey  | arvind.pandey@gmail.com    | 9876543303  | STAFF     |

#### Department 4: SEWERAGE
| Name              | Email                        | Mobile      | Role      |
|-------------------|------------------------------|-------------|-----------|
| Ashok Srivastava  | ashok.srivastava@gmail.com   | 9876543400  | DEPT_HEAD |
| Ravi Saxena       | ravi.saxena@gmail.com        | 9876543401  | STAFF     |
| Vinod Chauhan     | vinod.chauhan@gmail.com      | 9876543402  | STAFF     |
| Sunil Dubey       | sunil.dubey@gmail.com        | 9876543403  | STAFF     |

#### Department 5: SANITATION
| Name         | Email                    | Mobile      | Role      |
|--------------|--------------------------|-------------|-----------|
| Yogesh Bisht | yogesh.bisht@gmail.com   | 9876543500  | DEPT_HEAD |
| Dinesh Rawat | dinesh.rawat@gmail.com   | 9876543501  | STAFF     |
| Rakesh Negi  | rakesh.negi@gmail.com    | 9876543502  | STAFF     |
| Pankaj Bhatt | pankaj.bhatt@gmail.com   | 9876543503  | STAFF     |

#### Department 6: TRAFFIC
| Name         | Email                    | Mobile      | Role      |
|--------------|--------------------------|-------------|-----------|
| Harish Iyer  | harish.iyer@gmail.com    | 9876543600  | DEPT_HEAD |
| Naresh Thakur| naresh.thakur@gmail.com  | 9876543601  | STAFF     |
| Kamal Mehta  | kamal.mehta@gmail.com    | 9876543602  | STAFF     |
| Gopal Reddy  | gopal.reddy@gmail.com    | 9876543603  | STAFF     |

---

## API Endpoints

### Department Endpoints

#### List All Departments
```http
GET /api/departments
```

**Response:**
```json
[
  { "id": 1, "name": "ROADS" },
  { "id": 2, "name": "ELECTRICAL" },
  { "id": 3, "name": "WATER_SUPPLY" },
  { "id": 4, "name": "SEWERAGE" },
  { "id": 5, "name": "SANITATION" },
  { "id": 6, "name": "TRAFFIC" }
]
```

#### Get Department by ID
```http
GET /api/departments/{id}
```

---

### Staff Management Endpoints

#### Create Staff (Admin Only)
Creates a new staff member and assigns them to a department.

```http
POST /api/users/staff?deptId={departmentId}
Content-Type: application/json

{
  "name": "Ajay Mehra",
  "email": "ajay.mehra@gmail.com",
  "password": "argusargus",
  "mobile": "9876543999"
}
```

**Response (201 Created):**
```json
{
  "userId": 25,
  "name": "Ajay Mehra",
  "email": "ajay.mehra@gmail.com",
  "mobile": "9876543999",
  "userType": "STAFF",
  "deptId": 1,
  "createdAt": "2026-01-20T10:30:00",
  "lastLogin": null
}
```

---

#### Assign Department Head (Admin Only)
Promotes an existing staff member to department head. If another head exists, they are demoted to STAFF.

```http
PUT /api/users/{userId}/assign-head?deptId={departmentId}
```

**Rules:**
- User must exist and be a STAFF member
- User must belong to the specified department
- Previous DEPT_HEAD (if any) is automatically demoted to STAFF

**Response (200 OK):**
```json
{
  "userId": 5,
  "name": "Rajesh Kumar",
  "email": "rajesh.kumar@gmail.com",
  "mobile": "9876543101",
  "userType": "DEPT_HEAD",
  "deptId": 1,
  "createdAt": "2026-01-20T09:00:00",
  "lastLogin": null
}
```

---

#### Get Staff by Department
Returns all staff (STAFF + DEPT_HEAD) in a department.

```http
GET /api/users/department/{deptId}/staff
```

**Response (200 OK):**
```json
[
  {
    "userId": 1,
    "name": "Suresh Patel",
    "userType": "DEPT_HEAD",
    "deptId": 1
  },
  {
    "userId": 2,
    "name": "Rajesh Kumar",
    "userType": "STAFF",
    "deptId": 1
  }
]
```

---

#### Get Department Head
Returns the department head of a specific department.

```http
GET /api/users/department/{deptId}/head
```

**Response (200 OK):**
```json
{
  "userId": 1,
  "name": "Suresh Patel",
  "email": "suresh.patel@gmail.com",
  "mobile": "9876543100",
  "userType": "DEPT_HEAD",
  "deptId": 1,
  "createdAt": "2026-01-20T09:00:00",
  "lastLogin": null
}
```

---

## User Types (Enum)

| UserType    | Description                          |
|-------------|--------------------------------------|
| CITIZEN     | Regular user who files grievances    |
| STAFF       | Department staff handling grievances |
| DEPT_HEAD   | Head of a department                 |
| ADMIN       | System administrator                 |
| SUPER_ADMIN | Super administrator                  |

---

## Error Responses

| Status | Error                        | Description                              |
|--------|------------------------------|------------------------------------------|
| 400    | Email already exists         | Duplicate email address                  |
| 400    | Mobile number already exists | Duplicate mobile number                  |
| 400    | User does not belong to department | User's deptId doesn't match        |
| 400    | Only STAFF members can be promoted | User is not STAFF type            |
| 404    | Department not found         | Invalid department ID                    |
| 404    | User not found               | Invalid user ID                          |
| 404    | No department head assigned  | Department has no DEPT_HEAD              |

---

## Flow Summary

```
1. Departments are pre-populated on startup (ROADS, ELECTRICAL, etc.)

2. Admin creates staff:
   POST /api/users/staff?deptId=1
   → User created as STAFF with deptId=1

3. Admin assigns department head:
   PUT /api/users/{staffUserId}/assign-head?deptId=1
   → Staff promoted to DEPT_HEAD
   → Previous DEPT_HEAD (if any) demoted to STAFF

4. Query department info:
   GET /api/users/department/1/staff  → All staff in dept
   GET /api/users/department/1/head   → Department head
```

---

## Files Structure

```
springapp/src/main/java/com/backend/springapp/
├── config/
│   └── DataInitializer.java      # Pre-populates departments & sample data
├── controller/
│   ├── DepartmentController.java # List departments
│   └── UserController.java       # Staff management endpoints
├── service/
│   └── UserService.java          # Staff business logic
├── repository/
│   ├── DepartmentRepository.java # Department data access
│   └── UserRepository.java       # User data access
├── model/
│   ├── Department.java           # Department entity
│   └── User.java                 # User entity with deptId
└── enums/
    └── UserType.java             # CITIZEN, STAFF, DEPT_HEAD, etc.
```
