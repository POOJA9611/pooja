# Smart Real-Time Project Team Finder System

> **Technology Migration Edition**: Full-stack academic web platform for college department capstone project guidance, faculty mentee allocations, skill-based team formation, and real-time collaboration.
> Migrated from *Node.js / Express / SQLite / React 18* to **Python Flask / MySQL / Vanilla JavaScript (HTML5 + CSS3 + ES6)** with **100% functional, UI/UX, and data model preservation**.

---

## 🚀 Migrated Technology Stack

| Component | Original Technology | **New Migrated Technology** |
| :--- | :--- | :--- |
| **Frontend Runtime** | React 18, Vite 5, JSX | **HTML5, CSS3, Vanilla JavaScript (ES6 Modules)** |
| **State & Interactivity**| React Context, useState, useEffect | **Vanilla JS State Store (`auth.js`), DOM event listeners, Fetch API** |
| **Icons & Design** | Lucide React / Font Awesome | **Font Awesome 6 (CDN), Deep Indigo CSS Tokens, Flexbox & CSS Grid** |
| **Real-Time Client** | Socket.IO Client (npm package) | **Socket.IO Client (CDN `socket.io.min.js`), Custom event bridge** |
| **Backend Runtime** | Node.js 20+, Express 5 | **Python 3.12+, Flask 3.0+** |
| **WebSockets** | Socket.IO (npm `socket.io`) | **Flask-SocketIO (with `simple-websocket` / threading)** |
| **Authentication** | JWT (`jsonwebtoken`), bcryptjs | **PyJWT (HS256 Bearer auth), bcrypt / Werkzeug hashing** |
| **Rate Limiting & CORS**| `express-rate-limit`, `cors` | **Flask-Limiter, Flask-CORS** |
| **Database** | SQLite3 (`sqlite` async driver) | **MySQL 8.0+ (PyMySQL driver) with dual SQLite dev fallback** |
| **Database Schema** | Relational SQLite Schema | **ANSI MySQL Schema (`database/schema.sql`, InnoDB, Foreign Keys)** |

---

## 👥 Roles & Governance Rules (Strictly Preserved)

The system enforces three strict roles on both the backend middleware and ownership layer:

| Role | Creation Method | Privileges & Governance Rules |
| :--- | :--- | :--- |
| **HOD (Admin)** | **Seed Script Only** (`python backend/seed.py`) | Exactly **one** official HOD account (`hod.cs@college.edu`). Can **never** be registered via signup. Views department-wide directories, assigns/reassigns students to faculty based on workload & skills, approves/rejects change requests, posts targeted notifications. **Strictly CANNOT create, edit, import (no CSV), or delete student/faculty accounts.** |
| **FACULTY** | **Public Signup** | Mentor accounts require an email matching the college domain (`@college.edu`). Faculty manage only their assigned students, form project teams, mentor students in dedicated group chats, and edit their research profiles. |
| **STUDENT** | **Public Signup** | Students manage their portfolio and projects, chat with teammates and their mentor in their assigned team group, view faculty research profiles, read role-filtered notices, and submit mentor change requests to the HOD. Cannot access other students' private data or other teams' chats. |

---

## 📁 Migrated Project Structure

```
pooja/
├── app.py                         # Main Flask Application & Socket.IO server entry point
├── START-PORTAL.bat               # Windows one-click launcher (Flask + Browser)
├── run.bat                        # Shortcut alias for START-PORTAL.bat
├── requirements.txt               # Pinned Python package dependencies
├── .env                           # Active environment configuration
├── .env.example                   # Environment variable template
├── backend/                       # Python Flask backend package
│   ├── database.py                # Dual MySQL / SQLite connection manager with ? to %s translation
│   ├── seed.py                    # Official HOD account seeder (HodPass@2026)
│   ├── demo_seed.py               # Complete demo seeder (HOD, faculty, students, teams, chats)
│   ├── middleware/
│   │   └── auth.py                # PyJWT Bearer validation, bcrypt hashing, role guard
│   ├── routes/
│   │   ├── auth_routes.py         # /api/auth (signup, login, me)
│   │   ├── hod_routes.py          # /api/hod (stats, directory, assignments, change requests, team review)
│   │   ├── faculty_routes.py      # /api/faculty (my-students, profile)
│   │   ├── student_routes.py      # /api/student (profile, projects, change requests, faculty list)
│   │   ├── teams_routes.py        # /api/teams (team creation, membership, proposals, join requests)
│   │   ├── chat_routes.py         # /api/chat (channels, messages, 403 membership verification)
│   │   └── notifications_routes.py# /api/notifications (list, read, mark-all-read, create)
│   ├── sockets/
│   │   └── socket_handler.py      # Authenticated Socket.IO rooms & real-time messaging
│   └── utils/
│       ├── validators.py          # Email, @college.edu domain, GitHub/LinkedIn regex validators
│       └── recommendations.py     # Algorithmic student-team and faculty matching logic
├── database/                      # Database scripts
│   ├── schema.sql                 # Complete MySQL DDL schema (InnoDB, UTF8MB4, constraints)
│   └── migrate_sqlite_to_mysql.py # SQLite-to-MySQL live data migration utility
├── templates/                     # Flask Jinja2 HTML templates
│   └── index.html                 # Single-page application shell (Vanilla JS mounted)
├── static/                        # Static assets (No build tools or bundlers needed)
│   ├── css/
│   │   ├── style.css              # Color tokens, reset, typography, cards
│   │   ├── components.css         # Buttons, badges, tables, modals, avatars
│   │   └── responsive.css         # Tablet and mobile responsive media queries
│   ├── js/                        # Vanilla ES6 JavaScript modules
│   │   ├── api.js                 # Central Fetch API client with Bearer token injection
│   │   ├── auth.js                # Auth state management & 1-click persona switcher
│   │   ├── socket.js              # Real-time WebSocket connection manager & toast alerts
│   │   ├── router.js              # Client-side router & role-based sidebar manager
│   │   ├── app.js                 # Application bootstrap & topbar interaction coordinator
│   │   └── views/
│   │       ├── auth_views.js      # Login and signup views
│   │       ├── hod_views.js       # Executive dashboard, assignments, change requests, directory
│   │       ├── faculty_views.js   # Faculty overview, assigned students, capstone teams, profile
│   │       ├── student_views.js   # Student dashboard, portfolio & projects, teams, directory
│   │       ├── chat_view.js       # Real-time group messaging workspace with live participants
│   │       ├── notifications_view.js # Department announcements and submission deadlines
│   │       └── modals.js          # Faculty research inspection modal
├── tests/
│   └── test_self_check.py         # 7-Flow end-to-end automated verification test suite
└── team/                          # Original unmodified reference source project (preserved)
```

---

## 🗄️ Database Setup & MySQL Migration

### 1. MySQL Schema Setup
Ensure your MySQL server is running (default port `3306`), then run:
```bash
mysql -u root -p < database/schema.sql
```
This creates the database `college_portal` with all 15 relational tables, cascading foreign keys, and indexes.

### 2. Live Data Migration from SQLite to MySQL
To migrate existing SQLite data into your MySQL database without losing records or relationships:
```bash
python database/migrate_sqlite_to_mysql.py
```

### 3. Graceful Fallback Mode
If MySQL is not installed or currently offline, `backend/database.py` will **automatically fall back to local SQLite** (`portal.sqlite`), ensuring seamless development and testing with zero blockers.

---

## ⚡ Quick Start & Running Instructions

### Prerequisites
- Python 3.10+ (tested on Python 3.12)
- Pip

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Seed Default Accounts
```bash
# Seed official HOD account:
python backend/seed.py

# Seed full demo suite (HOD, faculty, students, teams, chats, notifications):
python backend/demo_seed.py
```

### 3. Start the Portal
#### Option A: One-Click Windows Batch File (Recommended)
Double-click `START-PORTAL.bat` or run:
```cmd
START-PORTAL.bat
```
This automatically locates Python, checks database seeds, starts Flask on `http://localhost:5000`, and opens your default browser.

#### Option B: Terminal Command
```bash
python app.py
```
Open your browser to: **`http://localhost:5000`**

---

## 🔑 Default Demo Accounts

Use the **"Demo Persona" dropdown** at the top right of the topbar to switch roles instantly with 1 click, or sign in using these pre-seeded credentials:

| Persona | Email | Password | Role / Function |
| :--- | :--- | :--- | :--- |
| **HOD (Head of Dept)** | `hod.cs@college.edu` | `HodPass@2026` | Oversee faculty workloads, allocate students, approve/reject change requests, broadcast notices |
| **Faculty Mentor** | `dr.jenkins@college.edu` | `password123` | View assigned students, form teams, mentor in team group chat, update research areas |
| **Faculty Mentor 2** | `prof.sharma@college.edu` | `password123` | Machine Learning mentor |
| **Student** | `alex.chen@student.edu` | `password123` | View assigned faculty, collaborate in team chat, create project portfolio, submit mentor change requests |
| **Student 2** | `priya.patel@student.edu` | `password123` | Full-stack student collaborator |

---

## 🧪 Automated Verification Suite

Run the full end-to-end self-check verification test covering all 7 critical governance and security flows:
```bash
python tests/test_self_check.py
```

### Verified Test Flows:
1. **Flow 1: HOD Immutability** — Public signup with `role: hod` is strictly rejected (HTTP 400). Only official seeder can create HOD.
2. **Flow 2: Faculty Email Domain Validation** — Faculty signup with `@gmail.com` is rejected (HTTP 400); `@college.edu` is accepted (HTTP 201).
3. **Flow 3: HOD Workload Reassignment** — Single & bulk assignments persist and write immutable audit history records.
4. **Flow 4: Change Request Lifecycle** — Student submits mentor change request, HOD approves, student is automatically reassigned.
5. **Flow 5: Notification Audience Filtering** — Students see notices marked `students` or `both`, but never `faculty`-only notices.
6. **Flow 6: Faculty Team Isolation** — Faculty can only add students assigned to them; attempting to add unassigned students returns HTTP 400.
7. **Flow 7: Chat Group Authorization** — Non-member access to team chat messages is blocked with HTTP 403 Forbidden.
