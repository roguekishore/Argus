# 🏛️ Argus - AI-Powered Grievance Redressal System

Application link : https://argusweb.tech/

<div align="center">

![Java](https://img.shields.io/badge/Java-17-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5-6DB33F?style=for-the-badge&logo=spring&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![AWS S3](https://img.shields.io/badge/AWS_S3-Storage-FF9900?style=for-the-badge&logo=amazons3&logoColor=white)
![Twilio](https://img.shields.io/badge/Twilio-WhatsApp-F22F46?style=for-the-badge&logo=twilio&logoColor=white)

**A comprehensive municipal grievance management system with AI-powered complaint classification, multi-channel support, and automated escalation management.**

[Features](#-features) • [Architecture](#-architecture) • [Getting Started](#-getting-started) • [API Documentation](#-api-documentation) • [Documentation](#-documentation)

</div>

---

## 📋 Overview

**Argus** is an enterprise-grade public grievance redressal system designed for municipal corporations. It enables citizens to file complaints through multiple channels (Web Portal & WhatsApp), leverages AI for intelligent complaint classification and prioritization, and provides comprehensive dashboards for various administrative roles.

### Key Highlights

- 🤖 **AI-Powered Classification** - Automatic categorization, priority assignment, and SLA calculation using Google Gemini
- 📱 **Multi-Channel Support** - File complaints via Web Portal or WhatsApp (Twilio integration)
- 📸 **Image Evidence Analysis** - Multimodal AI analyzes uploaded images for verification and severity assessment
- ⏰ **Automated Escalation** - Time-based escalation to department heads and municipal commissioners
- 🎮 **Gamification System** - Points, tiers, and leaderboards for citizens and staff performance tracking
- 🔐 **Role-Based Access Control** - Six distinct user roles with granular permissions
- 📊 **Real-time Dashboards** - Role-specific dashboards with actionable insights

---

## ✨ Features

### For Citizens
| Feature | Description |
|---------|-------------|
| 📝 **File Complaints** | Submit grievances with descriptions, locations, and image evidence |
| 📍 **Location Mapping** | Interactive maps using Leaflet for precise location tagging |
| 📲 **WhatsApp Integration** | Conversational complaint filing via WhatsApp |
| 🔔 **Status Tracking** | Real-time updates on complaint progress |
| ⭐ **Rate Resolutions** | Provide feedback on resolved complaints |
| 🏆 **Earn Points** | Gamification rewards for civic participation |

### For Staff & Department Heads
| Feature | Description |
|---------|-------------|
| 📋 **Complaint Queue** | View and manage assigned complaints |
| ✅ **Resolution Workflow** | Mark complaints as resolved with notes |
| 📈 **Performance Metrics** | Track resolution times and satisfaction scores |
| 🚨 **Escalation Alerts** | Notifications for SLA breaches and escalations |

### For Administrators
| Feature | Description |
|---------|-------------|
| 👥 **User Management** | Create and manage citizens, staff, and department heads |
| 🏢 **Department Configuration** | Manage 7 civic departments and staff assignments |
| 📂 **Category Management** | Configure complaint categories and mappings |
| ⏱️ **SLA Configuration** | Define service level agreements per category |
| 📊 **Analytics Dashboard** | System-wide statistics and insights |

### AI & Automation
| Feature | Description |
|---------|-------------|
| 🧠 **Smart Classification** | AI categorizes complaints into predefined categories |
| ⚡ **Priority Assignment** | Context-aware priority (LOW to CRITICAL) with upgrade rules |
| 🖼️ **Image Analysis** | Multimodal AI verifies evidence and detects safety risks |
| ⬆️ **Auto-Escalation** | Scheduled escalation based on SLA breaches |
| 🔄 **State Machine** | Robust complaint lifecycle management |

---

## 🏗️ Architecture

### System Overview

![1](https://github.com/user-attachments/assets/2eebe1eb-194e-412c-9ada-6bcf4c338f22)


```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ARGUS ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────────┐│
│  │   React      │     │   WhatsApp   │     │        Spring Boot           ││
│  │   Frontend   │────▶│   (Twilio)   │────▶│        Backend API           ││
│  │   :3000      │     │              │     │        :8080                 ││
│  └──────────────┘     └──────────────┘     └─────────────┬────────────────┘│
│                                                          │                  │
│  ┌───────────────────────────────────────────────────────┼─────────────────┐│
│  │                          SERVICES                     │                 ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │                 ││
│  │  │ Complaint   │  │ Escalation  │  │ Gamification│   │                 ││
│  │  │ Service     │  │ Service     │  │ Service     │   │                 ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │                 ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │                 ││
│  │  │ AI/Gemini   │  │ S3 Storage  │  │ State       │   │                 ││
│  │  │ Service     │  │ Service     │  │ Machine     │   │                 ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │                 ││
│  └───────────────────────────────────────────────────────┼─────────────────┘│
│                                                          │                  │
│  ┌───────────────────────────────────────────────────────┼─────────────────┐│
│  │                     EXTERNAL SERVICES                 ▼                 ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────────┐ ││
│  │  │ Google      │  │ AWS S3      │  │ MySQL Database                  │ ││
│  │  │ Gemini AI   │  │ Storage     │  │ (Complaints, Users, Audit Logs) │ ││
│  │  └─────────────┘  └─────────────┘  └─────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Backend Package Structure

```
com.backend.springapp/
├── SpringappApplication.java # Main application entry point
├── audit/                  # Audit logging system
├── config/                 # Application configuration
├── controller/             # REST API controllers
├── dto/                    # Data Transfer Objects
├── enums/                  # Enumerations (State, Priority, Role, etc.)
├── escalation/             # Escalation management system
├── exception/              # Custom exceptions & handlers
├── gamification/           # Points & leaderboard system
├── model/                  # JPA entities
├── notification/           # Notification services
├── repository/             # Data access layer
├── security/               # Authentication & authorization
├── service/                # Business logic services
├── statemachine/           # Complaint state transitions
└── whatsapp/               # WhatsApp/Twilio integration
```

### Frontend Structure

```
reactapp/src/
├── components/
│   ├── admin/              # Admin-specific components
│   ├── auth/               # Authentication components
│   ├── common/             # Reusable components (ComplaintCard, etc.)
│   ├── gamification/       # Leaderboards & badges
│   └── ui/                 # UI primitives (shadcn/ui)
├── constants/              # Roles, permissions, configs
├── context/                # React context (UserContext)
├── hooks/                  # Custom React hooks
├── layouts/                # Dashboard layouts
├── pages/
│   ├── LandingPage.jsx     # Public landing page
│   ├── Login.jsx           # Login page
│   ├── Signup.jsx          # Registration page
│   └── dashboards/         # Role-specific dashboards
├── router/                 # Routing configuration
├── services/               # API service layer
└── lib/                    # Utility functions
```

---

## 🚀 Getting Started

### Prerequisites

- **Java 17** or higher
- **Node.js 18+** and npm
- **MySQL 8.0+**
- **Maven 3.8+**
- AWS Account (for S3 image storage)
- Twilio Account (for WhatsApp integration)

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/argus.git
   cd argus/springapp
   ```

2. **Configure database**
   ```bash
   # Create MySQL database
   mysql -u root -p -e "CREATE DATABASE springdb;"
   ```

3. **Set environment variables** (or modify `application.properties`)
   ```bash
   export DB_URL=jdbc:mysql://localhost:3306/springdb
   export DB_USERNAME=root
   export DB_PASSWORD=your_password
   export API_SECRET_KEY=your_gemini_api_key
   export AWS_ACCESS_KEY_ID=your_aws_key
   export AWS_SECRET_ACCESS_KEY=your_aws_secret
   export AWS_S3_BUCKET=your_bucket_name
   ```

4. **Run the application**
   ```bash
   # Development mode (initializes sample data)
   mvn spring-boot:run
   
   # Production mode
   export INIT_SAMPLE_DATA=false
   mvn spring-boot:run
   ```

5. **Backend starts at** `http://localhost:8080`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd argus/reactapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API endpoint**
   ```bash
   # Create .env file
   echo "REACT_APP_API_URL=http://localhost:8080/api" > .env
   ```

4. **Start development server**
   ```bash
   npm start
   ```

5. **Frontend starts at** `http://localhost:3000`

### Default Test Users (Development Mode)

| Role | Email | Password |
|------|-------|----------|
| Citizen | citizen@gmail.com | argusargus |
| Staff | roads1@gmail.com | argusargus |
| Department Head | roadshead@gmail.com | argusargus |
| Admin | admin@gmail.com | argusargus |
| Super Admin | superadmin@gmail.com | argusargus |
| Municipal Commissioner | commissioner@gmail.com | argusargus |

---

## 📡 API Documentation

### Core Endpoints

#### Complaints
```http
POST   /api/complaints/citizen/{citizenId}              # Create complaint
POST   /api/complaints/citizen/{citizenId}/with-image   # Create with image
GET    /api/complaints/{complaintId}                    # Get complaint
GET    /api/complaints/{complaintId}/details            # Get full details
PUT    /api/complaints/{id}/state                       # Update state
PUT    /api/complaints/{id}/resolve                     # Mark resolved
PUT    /api/complaints/{id}/close                       # Close complaint
```

#### Users
```http
GET    /api/users                                       # Get all users
POST   /api/users                                       # Create user
POST   /api/users/staff?deptId=1                        # Create staff
GET    /api/users/department/{deptId}/staff             # Get department staff
PUT    /api/users/{userId}/assign-head?deptId=1         # Assign as dept head
```

#### Departments & Categories
```http
GET    /api/departments                                 # Get all departments
GET    /api/categories                                  # Get all categories
POST   /api/categories                                  # Create category
```

#### SLA Management
```http
GET    /api/sla                                         # Get all SLA configs
POST   /api/sla?categoryId=1&departmentId=1             # Create SLA
PUT    /api/sla/{id}                                    # Update SLA
```

#### Escalations
```http
GET    /api/complaints/{id}/escalations                 # Get escalation history
GET    /api/escalations/overdue                         # Get overdue complaints
GET    /api/escalations/stats                           # Get statistics
POST   /api/escalations/trigger                         # Manual trigger
```

#### Gamification
```http
GET    /api/gamification/citizens/leaderboard       # Citizen leaderboard
GET    /api/gamification/staff/leaderboard          # Staff leaderboard
GET    /api/gamification/citizens/{citizenId}/points # Citizen points
GET    /api/gamification/staff/{staffId}/stats      # Staff statistics
GET    /api/gamification/thresholds                 # Tier thresholds
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [AI_INTEGRATION.md](./AI_INTEGRATION.md) | AI classification prompts and examples |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Production deployment guide |
| [ENDPOINTS.md](./ENDPOINTS.md) | Complete API reference |
| [ERROR_HANDLING.md](./ERROR_HANDLING.md) | Error codes and handling |
| [ESCALATION_MANAGEMENT.md](./ESCALATION_MANAGEMENT.md) | Escalation rules and architecture |
| [GAMIFICATION.md](./GAMIFICATION.md) | Points system and leaderboards |
| [IMAGE_INTEGRATION.md](./IMAGE_INTEGRATION.md) | Image upload and analysis |
| [STAFF_MANAGEMENT.md](./STAFF_MANAGEMENT.md) | Staff roles and assignment |
| [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md) | Complaint lifecycle states |
| [WHATSAPP_INTEGRATION.md](./WHATSAPP_INTEGRATION.md) | WhatsApp/Twilio setup |
| [FRONTEND_ARCHITECTURE.md](./reactapp/FRONTEND_ARCHITECTURE.md) | Frontend structure guide |

---

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_URL` | `jdbc:mysql://localhost:3306/springdb` | Database connection URL |
| `DB_USERNAME` | `root` | Database username |
| `DB_PASSWORD` | `root` | Database password |
| `INIT_SAMPLE_DATA` | `true` | Initialize sample data |
| `API_SECRET_KEY` | - | Google Gemini API key |
| `AWS_S3_ENABLED` | `true` | Enable S3 storage |
| `AWS_ACCESS_KEY_ID` | - | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | - | AWS secret key |
| `AWS_S3_BUCKET` | - | S3 bucket name |
| `AWS_REGION` | `ap-south-1` | AWS region |
| `TWILIO_ENABLED` | `true` | Enable WhatsApp |
| `TWILIO_ACCOUNT_SID` | - | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | - | Twilio Auth Token |
| `ESCALATION_CRON` | `0 0 0/6 * * *` | Escalation check interval |

---

## 🏢 User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **CITIZEN** | File complaints, track status, rate resolutions, view leaderboard |
| **STAFF** | View assigned complaints, mark as resolved |
| **DEPT_HEAD** | Manage department staff, view department complaints, handle L1 escalations |
| **ADMIN** | Manage staff/heads, departments, categories, SLAs, all complaints |
| **SUPER_ADMIN** | Full system access including user management |
| **MUNICIPAL_COMMISSIONER** | View all complaints, handle L2 escalations, system oversight |

---

## 🔄 Complaint Lifecycle

```
┌─────────┐     AI Processing     ┌─────────────┐     Staff Action     ┌──────────┐
│  FILED  │ ──────────────────▶  │ IN_PROGRESS │ ─────────────────▶   │ RESOLVED │
└─────────┘                       └─────────────┘                      └──────────┘
     │                                   │                                   │
     │                                   │                                   │ Citizen/Auto
     │                                   │                                   ▼
     │                                   │                              ┌─────────┐
     └───────────── Any State ──────────┴─────────────────────────────▶│ CLOSED  │
                         │                                              └─────────┘
                         │
                         ▼
                   ┌───────────┐
                   │ CANCELLED │
                   └───────────┘
```

---

## 📈 Escalation Levels

| Level | Assignee | Trigger |
|-------|----------|---------|
| **L0** | Staff | Default (within SLA) |
| **L1** | Department Head | SLA + 1 day breached |
| **L2** | Municipal Commissioner | SLA + 3 days breached |

---

## 🎮 Gamification System

### Citizen Points
| Action | Points |
|--------|--------|
| File complaint | +10 |
| Complaint resolved | +20 |
| Receive upvote | +5 |
| Clean record bonus | +50 |

### Citizen Tiers
| Tier | Points | Benefit |
|------|--------|---------|
| 🥉 Bronze | 0+ | Base level |
| 🥈 Silver | 100+ | Priority boost |
| 🥇 Gold | 200+ | Enhanced visibility |
| 💎 Platinum | 500+ | Top recognition |

---

## 🛠️ Tech Stack

### Backend
- **Framework:** Spring Boot 3.5
- **Language:** Java 17
- **Database:** MySQL 8.0
- **ORM:** Spring Data JPA / Hibernate
- **Validation:** Jakarta Validation
- **AI:** Google Gemini API
- **Storage:** AWS S3
- **Messaging:** Twilio SDK

### Frontend
- **Framework:** React 19
- **Routing:** React Router 7
- **Styling:** Tailwind CSS 3.4
- **Maps:** Leaflet / React-Leaflet
- **Icons:** Lucide React
- **Build:** Create React App

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📞 Support

For support, please send a mail to contactforkishore@gmail.com .

---

<div align="center">

**Built by Maverick for better civic engagement**

</div>
