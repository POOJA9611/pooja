# Project Guidance & Team Portal

> A full-stack academic web platform for college department capstone project guidance, faculty mentee allocations, team formation, and real-time collaboration.

---

## 🚀 Tech Stack

- **Frontend**: React 18, Vite 5, Socket.IO Client, Font Awesome 6 Icons, CSS Custom Properties (Deep Indigo Design System).
- **Backend**: Node.js, Express 5, Socket.IO (WebSockets), JSON Web Tokens (JWT), bcrypt password hashing, `express-rate-limit`, `validator`.
- **Database**: SQLite (via `sqlite3` and `sqlite` async driver; designed with ANSI SQL queries and foreign keys for seamless migration to MySQL).
- **Real-Time Layer**: Socket.IO room-based event broadcasting with server-side membership authorization.

---

## 👥 Roles & Governance Rules

The system enforces three strict roles on both the backend middleware and ownership layer:

| Role | Creation Method | Privileges & Governance Rules |
| :--- | :--- | :--- |
| **HOD (Admin)** | **Seed Script Only** (`npm run seed`) | Exactly **one** HOD account. Can **never** be registered via signup. Views department-wide directories, assigns/reassigns students to faculty based on workload & skills, approves/rejects change requests, posts targeted notifications. **Strictly CANNOT create, edit, import (no CSV), or delete student/faculty accounts.** |
| **FACULTY** | **Public Signup** | Mentor accounts require an email matching the college domain (`@college.edu`). Faculty manage only their assigned students, form project teams, mentor students in dedicated group chats, and edit their research profiles. |
| **STUDENT** | **Public Signup** | Students manage their portfolio and projects, chat with teammates and their mentor in their assigned team group, view faculty research profiles, read role-filtered notices, and submit mentor change requests to the HOD. Cannot access other students' private data or other teams' chats. |

---

## 📁 Folder Structure

```
team finder/
├── server/
│   ├── config/
│   │   └── database.js          # SQLite connection & PRAGMA foreign_keys
│   ├── db/
│   │   ├── schema.sql           # Complete relational schema & indexes
│   │   ├── initDb.js            # Database schema runner
│   │   ├── seed.js              # Seeds exactly ONE HOD account
│   │   └── demoSeed.js          # Seeds demo faculty, students, teams & chats
│   ├── middleware/
│   │   ├── auth.js              # JWT Bearer token authentication
│   │   ├── role.js              # Role-based route guard
│   │   └── rateLimit.js         # IP rate limiting on auth endpoints
│   ├── routes/
│   │   ├── auth.routes.js       # Signup, login, and profile validation
│   │   ├── hod.routes.js        # HOD metrics, directories, assignments, decisions
│   │   ├── faculty.routes.js    # My-students, faculty profile update
│   │   ├── student.routes.js    # Student profile, projects, change requests
│   │   ├── teams.routes.js      # Team creation & member management
│   │   ├── chat.routes.js       # Chat groups & persisted message logs
│   │   └── notifications.routes.js # Role-targeted notices & read tracking
│   ├── socket/
│   │   └── socketHandler.js     # Authenticated Socket.IO rooms & chat events
│   ├── utils/
│   │   └── validators.js        # Input sanitization, domain & URL validators
│   ├── test/
│   │   └── selfCheck.js         # Automated 7-flow verification suite
│   ├── index.js                 # HTTP + WebSocket server entry point
│   ├── package.json
│   └── .env                     # Server configuration & JWT secret
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx      # Role-filtered navigation & user footer
│   │   │   ├── Topbar.jsx       # Real-time notification bell & persona switcher
│   │   │   ├── StatCard.jsx     # Dashboard KPI card
│   │   │   ├── Modal.jsx        # Accessible dialog wrapper
│   │   │   ├── ChatWorkspace.jsx# Real-time WebSocket messaging UI
│   │   │   └── FacultyDetailModal.jsx # Read-only faculty inspection modal
│   │   ├── context/
│   │   │   ├── AuthContext.jsx  # Authentication state & token management
│   │   │   └── SocketContext.jsx# Live Socket.IO client connection
│   │   ├── pages/
│   │   │   ├── Login.jsx        # Login with 1-click demo login buttons
│   │   │   ├── Signup.jsx       # Student & Faculty signup (HOD rejected)
│   │   │   ├── hod/             # HOD console pages
│   │   │   ├── faculty/         # Faculty console pages
│   │   │   ├── student/         # Student console pages
│   │   │   └── common/          # Notifications list
│   │   ├── services/
│   │   │   └── api.js           # REST API client
│   │   ├── styles/              # Indigo design tokens & CSS system
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 🗄️ Database Schema

```sql
users (id, role, name, email UNIQUE, password_hash, avatar, created_at)
student_profiles (user_id, reg_no, department, semester, cgpa, bio, strength, languages, linkedin_url, github_url, faculty_id)
faculty_profiles (user_id, designation, department, bio, subjects, languages, linkedin_url)
teams (id, name, faculty_id, created_by, created_at)
team_members (team_id, student_id)
projects (id, title, description, status, team_id, created_at)
project_members (project_id, student_id)
faculty_assignments (id, student_id, faculty_id, assigned_by, assigned_at, note)
change_requests (id, student_id, current_faculty_id, requested_faculty_id, reason, status, hod_remark, created_at, decided_at)
notifications (id, title, body, audience, posted_by, deadline, created_at)
notification_reads (notification_id, user_id, read_at)
chat_groups (id, name, team_id, faculty_id, created_by, created_at)
chat_group_members (group_id, user_id, joined_at)
messages (id, group_id, sender_id, body, created_at)
```

---

## 🔌 REST API Endpoints

### Authentication (`/api/auth`)
- `POST /signup` — Register as Student or Faculty (HOD role rejected with 400; Faculty requires `@college.edu`).
- `POST /login` — Authenticate and receive JWT token.
- `GET /me` — Retrieve current authenticated user profile.

### HOD Console (`/api/hod`) — *Requires role `hod`*
- `GET /dashboard-stats` — Department overview metrics.
- `GET /directory/students` — View-only registered students list with skills & assigned faculty.
- `GET /directory/faculty` — View-only registered faculty list with workloads and subjects.
- `POST /assign-students` — Single or bulk student assignment/reassignment with audit logging.
- `GET /assignments-history` — Full audit log of all mentor allocations.
- `GET /change-requests` — Inbox of student mentor transfer requests.
- `POST /change-requests/decide` — Approve (reassigns mentor) or reject with remarks.
- `POST /notifications` — Broadcast notice to `students`, `faculty`, or `both`.

### Faculty Console (`/api/faculty`) — *Requires role `faculty`*
- `GET /my-students` — Returns **only** students assigned to the calling faculty.
- `GET /profile` — Retrieve own profile.
- `PUT /profile` — Update subjects, languages, designation, bio, and LinkedIn.

### Student Workspace (`/api/student`) — *Requires role `student`*
- `GET /profile` — Retrieve own profile, projects, and active mentor details.
- `PUT /profile` — Update portfolio, tech stack, CGPA, and bio.
- `POST /projects` — Create ongoing or completed projects.
- `POST /change-request` — Submit mentor change request (only 1 pending allowed).
- `GET /faculty-list` — Browse department faculty mentors and research areas.
- `GET /faculty/:id` — Inspect individual faculty member details.

### Teams & Collaboration (`/api/teams`)
- `GET /` — Faculty sees their teams; Students see only teams they belong to.
- `POST /` — (*Faculty only*) Create team from assigned students; auto-creates group chat.
- `POST /:teamId/members` — (*Owner faculty only*) Add student to team and chat.
- `DELETE /:teamId/members/:studentId` — (*Owner faculty only*) Remove student.

### Real-Time Chat (`/api/chat`)
- `GET /groups` — Returns chat groups user belongs to.
- `GET /groups/:groupId/messages` — Enforces group membership (returns 403 Forbidden if not member).
- `POST /groups/:groupId/messages` — Post message (emits live WebSocket event to room).

### Notifications (`/api/notifications`)
- `GET /` — Filtered by role (`students` sees `students`+`both`; `faculty` sees `faculty`+`both`).
- `POST /:id/read` — Mark notification read for current user.
- `POST /mark-all-read` — Mark all relevant notifications as read.

---

## ⚡ Setup & Quickstart

### 1. Environment Configuration
Create `server/.env`:
```env
PORT=5000
JWT_SECRET=supersecret_college_portal_jwt_token_key_2026!
FACULTY_EMAIL_DOMAIN=@college.edu
DB_FILE=portal.sqlite
CLIENT_URL=http://localhost:5173
```

### 2. Install Dependencies
```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

### 3. Initialize & Seed Database
```bash
cd server

# Seed exactly 1 HOD account
npm run seed

# (Optional) Seed realistic demo faculty, students, teams, chats, and requests
npm run seed:demo
```

### 4. Run Development Servers
In terminal 1 (Backend):
```bash
cd server
npm start
```

In terminal 2 (Frontend):
```bash
cd client
npm run dev
```
Open **http://localhost:5173** in your browser.

---

## 🔑 Demo Logins

| Persona | Role | Email | Password | Details |
| :--- | :--- | :--- | :--- | :--- |
| **Dr. Robert Vance** | `hod` | `hod.cs@college.edu` | `HodPass@2026` | Exactly 1 HOD account. Executive console. |
| **Dr. Sarah Jenkins** | `faculty` | `sarah.jenkins@college.edu` | `Password@123` | Cloud Computing mentor. Mentors Team CloudScale. |
| **Prof. Alan Turing** | `faculty` | `alan.turing@college.edu` | `Password@123` | Machine Learning director. |
| **Alex Chen** | `student` | `alex.chen@student.edu` | `Password@123` | Full-stack student in Team CloudScale. |
| **Priya Sharma** | `student` | `priya.sharma@student.edu` | `Password@123` | Frontend student in Team CloudScale. |
| **Ananya Iyer** | `student` | `ananya.iyer@student.edu` | `Password@123` | Student with a pending change request. |
| **Sneha Reddy** | `student` | `sneha.reddy@student.edu` | `Password@123` | Unassigned student for testing HOD assignment. |

*(Note: The login screen also features 1-click fill buttons for instant testing).*

---

## 🧪 Automated Self-Check Verification Results

Run the verification test suite at any time:
```bash
cd server
npm test
```

### Verified Test Results:
```
🧪 ========================================================
🧪 RUNNING COMPREHENSIVE FINAL SELF-CHECK FOR COLLEGE PORTAL
🧪 ========================================================

▶️ Testing Flow 1: Signup enforcement & HOD rejection...
  ✅ 1a. HOD registration rejected with 400: Invalid role selection. Only Student and Faculty accounts can register. HOD accounts cannot be registered.
  ✅ 1b. Faculty signup with invalid domain rejected with 400: Faculty registration requires an official college domain email address (must end with @college.edu).
  ✅ 1c. Faculty signed up successfully
  ✅ 1d. Students signed up successfully

▶️ Testing Flow 2: HOD assignment & Faculty ownership isolation...
  ✅ 2a. HOD assigned students to faculty: Successfully assigned 2 student(s) to Prof. Test Mentor.
  ✅ 2b. Faculty sees exactly their own assigned students (2 students)

▶️ Testing Flow 3: Team creation, auto chat group, and message exchange...
  ✅ 3a. Created Team 1 with auto chat group
  ✅ 3b. Created Team 2 with auto chat group
  ✅ 3c. Messages successfully sent and persisted in Group 1

▶️ Testing Flow 4: Student change request & HOD approval...
  ✅ 4a. Change request submitted by Student 1
  ✅ 4b. Duplicate change request rejected with 400 (only 1 pending allowed)
  ✅ 4c. HOD approved request. Student 1 reallocated to mentor ID 2

▶️ Testing Flow 5: Role-targeted notification delivery...
  ✅ 5a. Student sees ONLY student and both notices (Faculty notice strictly hidden)
  ✅ 5b. Faculty sees ONLY faculty and both notices (Student notice strictly hidden)

▶️ Testing Flow 6: Verification that HOD cannot create or edit user accounts...
  ✅ 6. Verified: Zero endpoints exist for HOD user creation, CSV import, or deletion

▶️ Testing Flow 7: Chat group security & ownership enforcement...
  ✅ 7a. Non-member student read attempt blocked with 403: Forbidden
  ✅ 7b. Non-member student message post blocked with 403: Forbidden
  ✅ 7c. Student 2 blocked from Group 1 with 403: Forbidden

🎉 ========================================================
🎉 ALL 7/7 SELF-CHECK VERIFICATION FLOWS PASSED PERFECTLY!
🎉 ========================================================
```
