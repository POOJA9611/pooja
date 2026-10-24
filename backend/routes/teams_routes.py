from flask import Blueprint, request, jsonify, g, current_app
from backend.database import get_db
from backend.middleware.auth import authenticate_token, require_role
from backend.utils.validators import sanitize_string
from backend.utils.recommendations import calculate_student_team_match
from backend.routes.notifications_routes import create_system_notification

teams_bp = Blueprint("teams", __name__)


# 1. Get Teams
@teams_bp.route("", methods=["GET"])
@teams_bp.route("/", methods=["GET"])
@authenticate_token
def get_teams():
    try:
        db = get_db()
        user = g.user
        role = user["role"]

        if role == "faculty":
            query = """
                SELECT t.*, u.name as faculty_name, u.avatar as faculty_avatar,
                       l.name as leader_name,
                       (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count,
                       cg.id as chat_group_id
                FROM teams t
                LEFT JOIN users u ON t.faculty_id = u.id
                LEFT JOIN users l ON t.leader_id = l.id
                LEFT JOIN chat_groups cg ON t.id = cg.team_id
                WHERE t.faculty_id = ?
                ORDER BY t.created_at DESC
            """
            params = [user["id"]]
        elif role == "student":
            query = """
                SELECT t.*, u.name as faculty_name, u.avatar as faculty_avatar,
                       l.name as leader_name,
                       (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count,
                       cg.id as chat_group_id
                FROM teams t
                JOIN team_members tm ON t.id = tm.team_id
                LEFT JOIN users u ON t.faculty_id = u.id
                LEFT JOIN users l ON t.leader_id = l.id
                LEFT JOIN chat_groups cg ON t.id = cg.team_id
                WHERE tm.student_id = ?
                ORDER BY t.created_at DESC
            """
            params = [user["id"]]
        elif role == "hod":
            query = """
                SELECT t.*, u.name as faculty_name, u.avatar as faculty_avatar,
                       l.name as leader_name,
                       (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count,
                       cg.id as chat_group_id
                FROM teams t
                LEFT JOIN users u ON t.faculty_id = u.id
                LEFT JOIN users l ON t.leader_id = l.id
                LEFT JOIN chat_groups cg ON t.id = cg.team_id
                ORDER BY t.created_at DESC
            """
            params = []
        else:
            return jsonify({"teams": []})

        teams = db.all(query, params)

        for team in teams:
            members = db.all(
                """SELECT u.id, u.name, u.email, u.avatar, tm.role as team_role,
                          sp.reg_no, sp.strength, sp.languages, sp.cgpa, sp.department
                   FROM team_members tm
                   JOIN users u ON tm.student_id = u.id
                   LEFT JOIN student_profiles sp ON u.id = sp.user_id
                   WHERE tm.team_id = ?""",
                [team["id"]]
            )
            team["members"] = members

            projects = db.all("SELECT * FROM projects WHERE team_id = ?", [team["id"]])
            team["projects"] = projects

        return jsonify({"teams": teams})

    except Exception as error:
        print("Get teams error:", error)
        return jsonify({"error": "Failed to retrieve teams."}), 500


# 2. Get My Team Details
@teams_bp.route("/my-team", methods=["GET"])
@authenticate_token
@require_role("student")
def get_my_team():
    try:
        db = get_db()
        student_id = g.user["id"]

        team = db.get(
            """SELECT t.*, tm.role as my_role, u.name as faculty_name, u.email as faculty_email,
                      u.avatar as faculty_avatar, fp.designation as faculty_designation,
                      fp.department as faculty_department, fp.subjects as faculty_subjects,
                      cg.id as chat_group_id
               FROM teams t
               JOIN team_members tm ON t.id = tm.team_id
               LEFT JOIN users u ON t.faculty_id = u.id
               LEFT JOIN faculty_profiles fp ON u.id = fp.user_id
               LEFT JOIN chat_groups cg ON t.id = cg.team_id
               WHERE tm.student_id = ?
               ORDER BY t.created_at DESC
               LIMIT 1""",
            [student_id]
        )

        members = []
        incoming_requests = []

        if team:
            members = db.all(
                """SELECT u.id, u.name, u.email, u.avatar, tm.role as team_role, tm.joined_at,
                          sp.reg_no, sp.strength, sp.languages, sp.cgpa, sp.department
                   FROM team_members tm
                   JOIN users u ON tm.student_id = u.id
                   LEFT JOIN student_profiles sp ON u.id = sp.user_id
                   WHERE tm.team_id = ?
                   ORDER BY (CASE WHEN tm.role = 'leader' THEN 0 ELSE 1 END), u.name ASC""",
                [team["id"]]
            )

            if team.get("leader_id") == student_id or team.get("my_role") == "leader":
                incoming_requests = db.all(
                    """SELECT jr.*, u.name as student_name, u.email as student_email, u.avatar as student_avatar,
                              sp.reg_no, sp.strength, sp.languages, sp.cgpa, sp.department, sp.bio
                       FROM team_join_requests jr
                       JOIN users u ON jr.student_id = u.id
                       LEFT JOIN student_profiles sp ON u.id = sp.user_id
                       WHERE jr.team_id = ?
                       ORDER BY jr.created_at DESC""",
                    [team["id"]]
                )

        return jsonify({
            "team": team,
            "members": members,
            "incomingRequests": incoming_requests
        })

    except Exception as error:
        print("Get my team error:", error)
        return jsonify({"error": "Failed to retrieve my team details."}), 500


# 3. Create Team Proposal
@teams_bp.route("/proposals", methods=["POST"])
@authenticate_token
@require_role("student")
def create_team_proposal():
    try:
        data = request.get_json(silent=True) or {}
        name = data.get("name")
        project_title = data.get("project_title")
        description = data.get("description")
        domain = data.get("domain")
        technologies = data.get("technologies")
        required_skills = data.get("required_skills")
        max_members = data.get("max_members", 4)
        objectives = data.get("objectives")
        target_date = data.get("target_date")

        if not name or not isinstance(name, str) or len(name.strip()) < 3:
            return jsonify({"error": "Team name must be at least 3 characters."}), 400

        if not project_title or not isinstance(project_title, str) or len(project_title.strip()) < 3:
            return jsonify({"error": "Project title must be at least 3 characters."}), 400

        try:
            max_m = int(max_members)
            if max_m < 2 or max_m > 6:
                max_m = 4
        except Exception:
            max_m = 4

        db = get_db()
        student_id = g.user["id"]

        # Check if student already leads an active team
        existing_lead = db.get(
            """SELECT t.id, t.name, t.status FROM teams t
               JOIN team_members tm ON t.id = tm.team_id
               WHERE tm.student_id = ? AND tm.role = 'leader' AND t.status IN ('approved', 'pending_approval', 'modification_requested')""",
            [student_id]
        )
        if existing_lead:
            return jsonify({
                "error": f"You are already leading the active team '{existing_lead['name']}'. Each student can lead only one active project team."
            }), 400

        io = current_app.extensions.get("socketio")

        with db.transaction():
            res = db.run(
                """INSERT INTO teams (
                    name, leader_id, created_by, project_title, description, domain,
                    technologies, required_skills, max_members, objectives, target_date, status, is_accepting_members
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_approval', 1)""",
                [
                    name.strip(),
                    student_id,
                    student_id,
                    project_title.strip(),
                    description.strip() if description else "",
                    domain.strip() if domain else "General Software Engineering",
                    technologies.strip() if technologies else "",
                    required_skills.strip() if required_skills else "",
                    max_m,
                    objectives.strip() if objectives else "",
                    target_date.strip() if target_date else None
                ]
            )
            team_id = res.lastID

            # Add student as leader
            db.run(
                "INSERT INTO team_members (team_id, student_id, role) VALUES (?, ?, 'leader')",
                [team_id, student_id]
            )

            # Auto create chat group
            cg_res = db.run(
                "INSERT INTO chat_groups (name, team_id, created_by) VALUES (?, ?, ?)",
                [f"Team: {name.strip()}", team_id, student_id]
            )
            cg_id = cg_res.lastID
            db.run("INSERT INTO chat_group_members (group_id, user_id) VALUES (?, ?)", [cg_id, student_id])

            # Initial welcome message
            db.run(
                "INSERT INTO messages (group_id, sender_id, body) VALUES (?, ?, ?)",
                [cg_id, student_id, f"Welcome to {name.strip()} team workspace! Project proposal: {project_title.strip()}"]
            )

            # Notify HOD
            create_system_notification(
                db, io,
                title="New Project Team Proposal Submitted",
                body=f"Student {g.user['name']} has submitted a capstone proposal: '{project_title.strip()}' for team '{name.strip()}'.",
                audience="both",
                posted_by=student_id
            )

        new_team = db.get("SELECT * FROM teams WHERE id = ?", [team_id])
        return jsonify({
            "message": "Project team proposal submitted successfully. It is now awaiting HOD review.",
            "team": new_team
        }), 201

    except Exception as error:
        print("Create proposal error:", error)
        return jsonify({"error": "Failed to submit project team proposal."}), 500


# 4. Available Teams to Join
@teams_bp.route("/available-to-join", methods=["GET"])
@authenticate_token
@require_role("student")
def available_teams_to_join():
    try:
        db = get_db()
        student_id = g.user["id"]

        student = db.get(
            """SELECT sp.*, u.name, u.email
               FROM users u
               JOIN student_profiles sp ON u.id = sp.user_id
               WHERE u.id = ?""",
            [student_id]
        )

        active_teams_count = db.get(
            "SELECT COUNT(*) as count FROM team_members WHERE student_id = ?",
            [student_id]
        )["count"]

        # Fetch teams accepting members that are approved
        teams = db.all(
            """SELECT t.*, u.name as faculty_name, l.name as leader_name, l.avatar as leader_avatar,
                      (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as current_members_count
               FROM teams t
               LEFT JOIN users u ON t.faculty_id = u.id
               LEFT JOIN users l ON t.leader_id = l.id
               WHERE t.status = 'approved'
                 AND t.is_accepting_members = 1
                 AND t.id NOT IN (SELECT team_id FROM team_members WHERE student_id = ?)
               ORDER BY t.created_at DESC""",
            [student_id]
        )

        available_list = []
        for team in teams:
            if team["current_members_count"] >= team["max_members"]:
                continue

            members = db.all(
                """SELECT u.id, u.name, tm.role, sp.strength, sp.languages
                   FROM team_members tm
                   JOIN users u ON tm.student_id = u.id
                   LEFT JOIN student_profiles sp ON u.id = sp.user_id
                   WHERE tm.team_id = ?""",
                [team["id"]]
            )

            existing_request = db.get(
                "SELECT id, status FROM team_join_requests WHERE team_id = ? AND student_id = ? ORDER BY created_at DESC LIMIT 1",
                [team["id"], student_id]
            )

            match_result = calculate_student_team_match(
                student=student,
                team=team,
                team_members=members,
                student_active_teams_count=active_teams_count
            )

            team_copy = dict(team)
            team_copy["members"] = members
            team_copy["compatibilityScore"] = match_result["score"]
            team_copy["matchExplanation"] = match_result["explanation"]
            team_copy["matchedTech"] = match_result.get("matchedTech", [])
            team_copy["missingTech"] = match_result.get("missingTech", [])
            team_copy["requestStatus"] = existing_request["status"] if existing_request else None
            team_copy["requestId"] = existing_request["id"] if existing_request else None

            available_list.append(team_copy)

        available_list.sort(key=lambda x: x["compatibilityScore"], reverse=True)
        return jsonify({"teams": available_list})

    except Exception as error:
        print("Available teams error:", error)
        return jsonify({"error": "Failed to retrieve available teams."}), 500


# 5. Send Join Request
@teams_bp.route("/<int:team_id>/join-request", methods=["POST"])
@authenticate_token
@require_role("student")
def request_to_join_team(team_id):
    try:
        data = request.get_json(silent=True) or {}
        message = data.get("message")
        student_id = g.user["id"]
        db = get_db()

        team = db.get("SELECT * FROM teams WHERE id = ?", [team_id])
        if not team:
            return jsonify({"error": "Target project team not found."}), 404

        is_member = db.get("SELECT * FROM team_members WHERE team_id = ? AND student_id = ?", [team_id, student_id])
        if is_member:
            return jsonify({"error": "You are already a member of this team."}), 400

        member_count = db.get("SELECT COUNT(*) as count FROM team_members WHERE team_id = ?", [team_id])["count"]
        if member_count >= team["max_members"]:
            return jsonify({"error": "This team has reached its maximum capacity."}), 400

        existing_req = db.get(
            "SELECT * FROM team_join_requests WHERE team_id = ? AND student_id = ? AND status = 'pending'",
            [team_id, student_id]
        )
        if existing_req:
            return jsonify({"error": "You already have a pending join request for this team."}), 400

        clean_message = sanitize_string(message) if message else "I would like to contribute my skills to your project team."
        res = db.run(
            """INSERT INTO team_join_requests (team_id, student_id, message, status)
               VALUES (?, ?, ?, 'pending')""",
            [team_id, student_id, clean_message]
        )

        io = current_app.extensions.get("socketio")
        if team.get("leader_id"):
            create_system_notification(
                db, io,
                title="New Team Join Request",
                body=f"Student {g.user['name']} has requested to join your team '{team['name']}'. Message: {clean_message}",
                audience="user",
                posted_by=student_id,
                target_user_id=team["leader_id"]
            )

        return jsonify({
            "message": "Join request successfully submitted to team leader.",
            "requestId": res.lastID
        }), 201

    except Exception as error:
        print("Join request error:", error)
        return jsonify({"error": "Failed to submit join request."}), 500


# 6. Decide Join Request
@teams_bp.route("/join-requests/<int:request_id>/decide", methods=["POST"])
@authenticate_token
@require_role("student")
def decide_join_request(request_id):
    try:
        data = request.get_json(silent=True) or {}
        action = data.get("action")  # 'accept' or 'reject'
        student_id = g.user["id"]

        if action not in ("accept", "reject"):
            return jsonify({"error": "Invalid action. Must be 'accept' or 'reject'."}), 400

        db = get_db()
        req_row = db.get(
            """SELECT jr.*, t.name as team_name, t.leader_id, t.max_members,
                      s.name as applicant_name
               FROM team_join_requests jr
               JOIN teams t ON jr.team_id = t.id
               JOIN users s ON jr.student_id = s.id
               WHERE jr.id = ?""",
            [request_id]
        )

        if not req_row:
            return jsonify({"error": "Join request not found."}), 404

        if req_row["leader_id"] != student_id:
            return jsonify({"error": "Only the team leader can decide join requests."}), 403

        if req_row["status"] != "pending":
            return jsonify({"error": f"This request has already been {req_row['status']}."}), 400

        io = current_app.extensions.get("socketio")

        if action == "accept":
            current_count = db.get("SELECT COUNT(*) as count FROM team_members WHERE team_id = ?", [req_row["team_id"]])["count"]
            if current_count >= req_row["max_members"]:
                return jsonify({"error": "Team is already at maximum capacity."}), 400

            with db.transaction():
                db.run(
                    "UPDATE team_join_requests SET status = 'accepted', decided_at = CURRENT_TIMESTAMP WHERE id = ?",
                    [request_id]
                )
                db.run(
                    "INSERT INTO team_members (team_id, student_id, role) VALUES (?, ?, 'member')",
                    [req_row["team_id"], req_row["student_id"]]
                )

                cg = db.get("SELECT id FROM chat_groups WHERE team_id = ?", [req_row["team_id"]])
                if cg:
                    db.run(
                        "INSERT OR IGNORE INTO chat_group_members (group_id, user_id) VALUES (?, ?)",
                        [cg["id"], req_row["student_id"]]
                    )
                    db.run(
                        "INSERT INTO messages (group_id, sender_id, body) VALUES (?, ?, ?)",
                        [cg["id"], student_id, f"Please welcome {req_row['applicant_name']} to the team!"]
                    )

                create_system_notification(
                    db, io,
                    title="Team Join Request Accepted!",
                    body=f"Congratulations! Your request to join '{req_row['team_name']}' has been accepted by the leader.",
                    audience="user",
                    posted_by=student_id,
                    target_user_id=req_row["student_id"]
                )

            return jsonify({
                "message": f"Accepted {req_row['applicant_name']} into team '{req_row['team_name']}'.",
                "status": "accepted"
            })

        else:
            with db.transaction():
                db.run(
                    "UPDATE team_join_requests SET status = 'rejected', decided_at = CURRENT_TIMESTAMP WHERE id = ?",
                    [request_id]
                )
                create_system_notification(
                    db, io,
                    title="Team Join Request Declined",
                    body=f"Your request to join team '{req_row['team_name']}' was declined by the leader.",
                    audience="user",
                    posted_by=student_id,
                    target_user_id=req_row["student_id"]
                )

            return jsonify({
                "message": f"Declined join request from {req_row['applicant_name']}.",
                "status": "rejected"
            })

    except Exception as error:
        print("Decide join request error:", error)
        return jsonify({"error": "Failed to process join request decision."}), 500


# 7. Toggle Recruiting
@teams_bp.route("/<int:team_id>/toggle-recruiting", methods=["PUT"])
@authenticate_token
@require_role("student")
def toggle_recruiting(team_id):
    try:
        db = get_db()
        student_id = g.user["id"]

        team = db.get("SELECT * FROM teams WHERE id = ?", [team_id])
        if not team:
            return jsonify({"error": "Team not found."}), 404

        if team["leader_id"] != student_id:
            return jsonify({"error": "Only the team leader can modify recruiting status."}), 403

        new_status = 0 if team.get("is_accepting_members") else 1
        db.run("UPDATE teams SET is_accepting_members = ? WHERE id = ?", [new_status, team_id])

        return jsonify({
            "message": f"Team recruiting is now {'open' if new_status else 'closed'}.",
            "is_accepting_members": new_status
        })

    except Exception as error:
        print("Toggle recruiting error:", error)
        return jsonify({"error": "Failed to update recruiting status."}), 500


# 8. Create Team (Faculty)
@teams_bp.route("", methods=["POST"])
@teams_bp.route("/", methods=["POST"])
@authenticate_token
@require_role("faculty")
def create_team_by_faculty():
    try:
        data = request.get_json(silent=True) or {}
        name = data.get("name")
        student_ids = data.get("studentIds")

        if not name or not isinstance(name, str) or len(name.strip()) < 2:
            return jsonify({"error": "Team name must be at least 2 characters."}), 400

        if not isinstance(student_ids, list) or len(student_ids) == 0:
            return jsonify({"error": "At least one student must be selected to form a team."}), 400

        db = get_db()
        faculty_id = g.user["id"]

        # Verify all students belong to this faculty
        for s_id in student_ids:
            st = db.get("SELECT user_id FROM student_profiles WHERE user_id = ? AND faculty_id = ?", [s_id, faculty_id])
            if not st:
                return jsonify({"error": f"Student ID {s_id} is not assigned to your mentorship."}), 403

        io = current_app.extensions.get("socketio")

        with db.transaction():
            res = db.run(
                """INSERT INTO teams (name, faculty_id, leader_id, created_by, status)
                   VALUES (?, ?, ?, ?, 'approved')""",
                [name.strip(), faculty_id, student_ids[0], faculty_id]
            )
            team_id = res.lastID

            for idx, s_id in enumerate(student_ids):
                role = "leader" if idx == 0 else "member"
                db.run("INSERT INTO team_members (team_id, student_id, role) VALUES (?, ?, ?)", [team_id, s_id, role])

            # Auto create chat group
            cg_res = db.run(
                "INSERT INTO chat_groups (name, team_id, faculty_id, created_by) VALUES (?, ?, ?, ?)",
                [f"Team: {name.strip()}", team_id, faculty_id, faculty_id]
            )
            cg_id = cg_res.lastID
            db.run("INSERT INTO chat_group_members (group_id, user_id) VALUES (?, ?)", [cg_id, faculty_id])
            for s_id in student_ids:
                db.run("INSERT INTO chat_group_members (group_id, user_id) VALUES (?, ?)", [cg_id, s_id])

            db.run(
                "INSERT INTO messages (group_id, sender_id, body) VALUES (?, ?, ?)",
                [cg_id, faculty_id, f"Welcome to {name.strip()} team workspace! Let's get started on your capstone project."]
            )

        if io:
            io.emit("team_created", {
                "teamId": team_id,
                "name": name.strip(),
                "facultyId": faculty_id,
                "memberCount": len(student_ids)
            })

        return jsonify({
            "message": f"Team '{name.strip()}' created successfully.",
            "teamId": team_id
        }), 201

    except Exception as error:
        print("Faculty create team error:", error)
        return jsonify({"error": "Failed to create team."}), 500


# 9. Add Team Member (Faculty)
@teams_bp.route("/<int:team_id>/members", methods=["POST"])
@authenticate_token
@require_role("faculty")
def add_team_member(team_id):
    try:
        data = request.get_json(silent=True) or {}
        student_id = data.get("studentId")

        if not student_id:
            return jsonify({"error": "Student ID is required."}), 400

        db = get_db()
        faculty_id = g.user["id"]

        team = db.get("SELECT * FROM teams WHERE id = ? AND faculty_id = ?", [team_id, faculty_id])
        if not team:
            return jsonify({"error": "Team not found or not mentored by you."}), 404

        assigned = db.get("SELECT user_id FROM student_profiles WHERE user_id = ? AND faculty_id = ?", [student_id, faculty_id])
        if not assigned:
            return jsonify({"error": "Student is not assigned to your mentorship."}), 403

        existing = db.get("SELECT * FROM team_members WHERE team_id = ? AND student_id = ?", [team_id, student_id])
        if existing:
            return jsonify({"error": "Student is already in this team."}), 400

        with db.transaction():
            db.run("INSERT INTO team_members (team_id, student_id, role) VALUES (?, ?, 'member')", [team_id, student_id])
            cg = db.get("SELECT id FROM chat_groups WHERE team_id = ?", [team_id])
            if cg:
                db.run("INSERT OR IGNORE INTO chat_group_members (group_id, user_id) VALUES (?, ?)", [cg["id"], student_id])

        return jsonify({"message": "Student added to team successfully."})

    except Exception as error:
        print("Add team member error:", error)
        return jsonify({"error": "Failed to add student to team."}), 500


# 10. Remove Team Member (Faculty)
@teams_bp.route("/<int:team_id>/members/<int:student_id>", methods=["DELETE"])
@authenticate_token
@require_role("faculty")
def remove_team_member(team_id, student_id):
    try:
        db = get_db()
        faculty_id = g.user["id"]

        team = db.get("SELECT * FROM teams WHERE id = ? AND faculty_id = ?", [team_id, faculty_id])
        if not team:
            return jsonify({"error": "Team not found or not mentored by you."}), 404

        with db.transaction():
            db.run("DELETE FROM team_members WHERE team_id = ? AND student_id = ?", [team_id, student_id])
            cg = db.get("SELECT id FROM chat_groups WHERE team_id = ?", [team_id])
            if cg:
                db.run("DELETE FROM chat_group_members WHERE group_id = ? AND user_id = ?", [cg["id"], student_id])

        return jsonify({"message": "Student removed from team successfully."})

    except Exception as error:
        print("Remove team member error:", error)
        return jsonify({"error": "Failed to remove student from team."}), 500
