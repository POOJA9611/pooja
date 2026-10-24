import datetime
from flask import Blueprint, request, jsonify, g, current_app
from backend.database import get_db
from backend.middleware.auth import authenticate_token, require_role
from backend.utils.validators import sanitize_string, validate_audience
from backend.utils.recommendations import calculate_faculty_mentor_match
from backend.routes.notifications_routes import create_system_notification

hod_bp = Blueprint("hod", __name__)


# 1. Dashboard Metrics
@hod_bp.route("/dashboard-stats", methods=["GET"])
@authenticate_token
@require_role("hod")
def dashboard_stats():
    try:
        db = get_db()
        student_count = db.get("SELECT COUNT(*) as count FROM users WHERE role = 'student'")["count"]
        faculty_count = db.get("SELECT COUNT(*) as count FROM users WHERE role = 'faculty'")["count"]
        unassigned_count = db.get("SELECT COUNT(*) as count FROM student_profiles WHERE faculty_id IS NULL")["count"]
        pending_requests_count = db.get("SELECT COUNT(*) as count FROM change_requests WHERE status = 'pending'")["count"]
        total_teams_count = db.get("SELECT COUNT(*) as count FROM teams")["count"]
        total_projects_count = db.get("SELECT COUNT(*) as count FROM projects")["count"]

        return jsonify({
            "totalStudents": student_count,
            "totalFaculty": faculty_count,
            "unassignedStudents": unassigned_count,
            "pendingChangeRequests": pending_requests_count,
            "totalTeams": total_teams_count,
            "totalProjects": total_projects_count
        })
    except Exception as error:
        print("HOD stats error:", error)
        return jsonify({"error": "Failed to retrieve dashboard statistics."}), 500


# 2. View-only Directory: Registered Students
@hod_bp.route("/directory/students", methods=["GET"])
@authenticate_token
@require_role("hod")
def directory_students():
    try:
        db = get_db()
        students = db.all(
            """SELECT u.id, u.name, u.email, u.avatar, u.created_at,
                      sp.reg_no, sp.department, sp.semester, sp.cgpa, sp.bio,
                      sp.strength, sp.languages, sp.linkedin_url, sp.github_url,
                      sp.faculty_id, f.name as faculty_name, f.email as faculty_email
               FROM users u
               JOIN student_profiles sp ON u.id = sp.user_id
               LEFT JOIN users f ON sp.faculty_id = f.id
               WHERE u.role = 'student'
               ORDER BY u.name ASC"""
        )
        return jsonify({"students": students})
    except Exception as error:
        print("HOD student directory error:", error)
        return jsonify({"error": "Failed to retrieve student directory."}), 500


# 3. View-only Directory: Registered Faculty
@hod_bp.route("/directory/faculty", methods=["GET"])
@authenticate_token
@require_role("hod")
def directory_faculty():
    try:
        db = get_db()
        faculty = db.all(
            """SELECT u.id, u.name, u.email, u.avatar, u.created_at,
                      fp.designation, fp.department, fp.bio, fp.subjects, fp.languages, fp.linkedin_url,
                      (SELECT COUNT(*) FROM student_profiles WHERE faculty_id = u.id) as workload
               FROM users u
               JOIN faculty_profiles fp ON u.id = fp.user_id
               WHERE u.role = 'faculty'
               ORDER BY workload ASC, u.name ASC"""
        )
        return jsonify({"faculty": faculty})
    except Exception as error:
        print("HOD faculty directory error:", error)
        return jsonify({"error": "Failed to retrieve faculty directory."}), 500


# 4. Assign / Reassign Students (Single and Bulk)
@hod_bp.route("/assign-students", methods=["POST"])
@authenticate_token
@require_role("hod")
def assign_students():
    try:
        data = request.get_json(silent=True) or {}
        student_ids = data.get("studentIds")
        faculty_id = data.get("facultyId")
        note = data.get("note")

        if not isinstance(student_ids, list) or len(student_ids) == 0:
            return jsonify({"error": "At least one student must be selected."}), 400

        if not faculty_id:
            return jsonify({"error": "A destination faculty must be specified."}), 400

        db = get_db()
        faculty = db.get("SELECT id, name, email FROM users WHERE id = ? AND role = 'faculty'", [faculty_id])
        if not faculty:
            return jsonify({"error": "Target faculty member not found."}), 404

        clean_note = sanitize_string(note) if note else "Assigned by HOD"
        assigned_by = g.user["id"]
        io = current_app.extensions.get("socketio")

        updated_students = []

        with db.transaction():
            for s_id in student_ids:
                student = db.get(
                    """SELECT u.id, u.name, u.email, sp.faculty_id
                       FROM users u
                       JOIN student_profiles sp ON u.id = sp.user_id
                       WHERE u.id = ? AND u.role = 'student'""",
                    [s_id]
                )
                if not student:
                    continue

                db.run("UPDATE student_profiles SET faculty_id = ? WHERE user_id = ?", [faculty_id, s_id])
                db.run(
                    """INSERT INTO faculty_assignments (student_id, faculty_id, assigned_by, note)
                       VALUES (?, ?, ?, ?)""",
                    [s_id, faculty_id, assigned_by, clean_note]
                )

                # Send targeted notification to student
                create_system_notification(
                    db, io,
                    title="Faculty Mentor Assigned",
                    body=f"You have been assigned to {faculty['name']} for project guidance. Note: {clean_note}",
                    audience="user",
                    posted_by=assigned_by,
                    target_user_id=s_id
                )

                updated_students.append({"id": s_id, "name": student["name"]})

            # Send targeted notification to faculty
            count = len(updated_students)
            create_system_notification(
                db, io,
                title="New Student Mentees Assigned",
                body=f"The HOD has allocated {count} new student(s) to your mentorship portfolio.",
                audience="user",
                posted_by=assigned_by,
                target_user_id=faculty_id
            )

        if io:
            io.emit("assignments_updated", {
                "count": len(updated_students),
                "facultyId": faculty_id,
                "studentIds": [s["id"] for s in updated_students]
            })

        return jsonify({
            "message": f"Successfully assigned {len(updated_students)} student(s) to {faculty['name']}.",
            "assignedCount": len(updated_students),
            "faculty": faculty
        })

    except Exception as error:
        print("Assign students error:", error)
        return jsonify({"error": "Failed to assign students."}), 500


# 5. Assignment History Log
@hod_bp.route("/assignments-history", methods=["GET"])
@authenticate_token
@require_role("hod")
def assignments_history():
    try:
        db = get_db()
        history = db.all(
            """SELECT fa.*,
                      s.name as student_name, s.email as student_email,
                      f.name as faculty_name, f.email as faculty_email,
                      a.name as assigned_by_name
               FROM faculty_assignments fa
               JOIN users s ON fa.student_id = s.id
               JOIN users f ON fa.faculty_id = f.id
               JOIN users a ON fa.assigned_by = a.id
               ORDER BY fa.assigned_at DESC
               LIMIT 200"""
        )
        return jsonify({"history": history})
    except Exception as error:
        print("HOD assignments history error:", error)
        return jsonify({"error": "Failed to retrieve assignments history."}), 500


# 6. Change Requests Inbox
@hod_bp.route("/change-requests", methods=["GET"])
@authenticate_token
@require_role("hod")
def change_requests():
    try:
        db = get_db()
        requests_list = db.all(
            """SELECT cr.*,
                      s.name as student_name, s.email as student_email, s.avatar as student_avatar,
                      sp.reg_no, sp.strength, sp.languages, sp.cgpa, sp.department,
                      cf.name as current_faculty_name, cf.email as current_faculty_email,
                      rf.name as requested_faculty_name, rf.email as requested_faculty_email
               FROM change_requests cr
               JOIN users s ON cr.student_id = s.id
               JOIN student_profiles sp ON s.id = sp.user_id
               JOIN users cf ON cr.current_faculty_id = cf.id
               LEFT JOIN users rf ON cr.requested_faculty_id = rf.id
               ORDER BY (CASE WHEN cr.status = 'pending' THEN 0 ELSE 1 END), cr.created_at DESC"""
        )
        return jsonify({"changeRequests": requests_list})
    except Exception as error:
        print("HOD change requests error:", error)
        return jsonify({"error": "Failed to retrieve change requests."}), 500


# 7. Decide Change Request
@hod_bp.route("/change-requests/decide", methods=["POST"])
@authenticate_token
@require_role("hod")
def decide_change_request():
    try:
        data = request.get_json(silent=True) or {}
        request_id = data.get("requestId")
        action = data.get("action")  # 'approved' or 'rejected'
        new_faculty_id = data.get("newFacultyId")
        remark = data.get("remark")

        if not request_id or action not in ("approved", "rejected"):
            return jsonify({"error": "Invalid request ID or action."}), 400

        db = get_db()
        cr = db.get(
            """SELECT cr.*, s.name as student_name, cf.name as current_faculty_name
               FROM change_requests cr
               JOIN users s ON cr.student_id = s.id
               JOIN users cf ON cr.current_faculty_id = cf.id
               WHERE cr.id = ?""",
            [request_id]
        )

        if not cr:
            return jsonify({"error": "Change request not found."}), 404

        if cr["status"] != "pending":
            return jsonify({"error": "This change request has already been decided."}), 400

        clean_remark = sanitize_string(remark) if remark else f"Decision by HOD: {action}"
        io = current_app.extensions.get("socketio")
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        if action == "approved":
            target_faculty_id = new_faculty_id or cr["requested_faculty_id"]
            if not target_faculty_id:
                return jsonify({"error": "A replacement faculty mentor must be selected for approval."}), 400

            target_faculty = db.get("SELECT id, name FROM users WHERE id = ? AND role = 'faculty'", [target_faculty_id])
            if not target_faculty:
                return jsonify({"error": "Target replacement faculty not found."}), 404

            with db.transaction():
                db.run("UPDATE student_profiles SET faculty_id = ? WHERE user_id = ?", [target_faculty_id, cr["student_id"]])
                db.run(
                    """INSERT INTO faculty_assignments (student_id, faculty_id, assigned_by, note)
                       VALUES (?, ?, ?, ?)""",
                    [cr["student_id"], target_faculty_id, g.user["id"], f"Change Request Approved: {clean_remark}"]
                )
                db.run(
                    """UPDATE change_requests
                       SET status = 'approved', hod_remark = ?, decided_at = CURRENT_TIMESTAMP
                       WHERE id = ?""",
                    [clean_remark, request_id]
                )

                # Notifications
                create_system_notification(
                    db, io,
                    title="Mentor Change Request Approved",
                    body=f"Your request to change mentor was approved by the HOD. New mentor: {target_faculty['name']}. Remark: {clean_remark}",
                    audience="user",
                    posted_by=g.user["id"],
                    target_user_id=cr["student_id"]
                )
                create_system_notification(
                    db, io,
                    title="Student Transferred Out",
                    body=f"Student {cr['student_name']} was transferred from your guidance portfolio by the HOD.",
                    audience="user",
                    posted_by=g.user["id"],
                    target_user_id=cr["current_faculty_id"]
                )
                create_system_notification(
                    db, io,
                    title="New Student Mentee Transferred In",
                    body=f"Student {cr['student_name']} has been reassigned to your mentorship portfolio by the HOD.",
                    audience="user",
                    posted_by=g.user["id"],
                    target_user_id=target_faculty_id
                )

            if io:
                io.emit("change_request_decided", {
                    "requestId": request_id,
                    "studentId": cr["student_id"],
                    "decision": "approved",
                    "newFacultyId": target_faculty_id
                })

            return jsonify({
                "message": f"Change request approved. {cr['student_name']} reallocated to {target_faculty['name']}.",
                "status": "approved"
            })

        else:
            with db.transaction():
                db.run(
                    """UPDATE change_requests
                       SET status = 'rejected', hod_remark = ?, decided_at = CURRENT_TIMESTAMP
                       WHERE id = ?""",
                    [clean_remark, request_id]
                )
                create_system_notification(
                    db, io,
                    title="Mentor Change Request Declined",
                    body=f"Your faculty change request was reviewed and declined by the HOD. Remark: {clean_remark}",
                    audience="user",
                    posted_by=g.user["id"],
                    target_user_id=cr["student_id"]
                )

            if io:
                io.emit("change_request_decided", {
                    "requestId": request_id,
                    "studentId": cr["student_id"],
                    "decision": "rejected"
                })

            return jsonify({
                "message": f"Change request declined for {cr['student_name']}.",
                "status": "rejected"
            })

    except Exception as error:
        print("Decide change request error:", error)
        return jsonify({"error": "Failed to record change request decision."}), 500


# 8. Post Department-Wide Notification
@hod_bp.route("/notifications", methods=["POST"])
@authenticate_token
@require_role("hod")
def post_notification():
    try:
        data = request.get_json(silent=True) or {}
        title = data.get("title")
        body = data.get("body")
        audience = data.get("audience")
        deadline = data.get("deadline")

        if not title or not isinstance(title, str) or len(title.strip()) < 3:
            return jsonify({"error": "Notification title must be at least 3 characters."}), 400

        if not body or not isinstance(body, str) or len(body.strip()) < 5:
            return jsonify({"error": "Notification message body must be at least 5 characters."}), 400

        if not validate_audience(audience):
            return jsonify({"error": "Audience must be 'students', 'faculty', or 'both'."}), 400

        clean_title = title.strip()
        clean_body = body.strip()
        deadline_val = deadline if deadline else None
        db = get_db()
        io = current_app.extensions.get("socketio")

        notif_id = create_system_notification(
            db, io,
            title=clean_title,
            body=clean_body,
            audience=audience,
            posted_by=g.user["id"],
            deadline=deadline_val
        )

        return jsonify({
            "message": "Notification published successfully.",
            "notificationId": notif_id
        }), 201

    except Exception as error:
        print("Post notification error:", error)
        return jsonify({"error": "Failed to broadcast notification."}), 500


# 9. Get Team Proposals
@hod_bp.route("/team-proposals", methods=["GET"])
@authenticate_token
@require_role("hod")
def get_team_proposals():
    try:
        status_filter = request.args.get("status")
        search = request.args.get("search", "").strip().lower()
        db = get_db()

        query = """
            SELECT t.*,
                   u.name as faculty_name, u.email as faculty_email,
                   l.name as leader_name, l.email as leader_email, l.avatar as leader_avatar,
                   (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
            FROM teams t
            LEFT JOIN users u ON t.faculty_id = u.id
            LEFT JOIN users l ON t.leader_id = l.id
            WHERE 1=1
        """
        params = []

        if status_filter and status_filter != "all":
            query += " AND t.status = ?"
            params.append(status_filter)

        if search:
            query += " AND (LOWER(t.name) LIKE ? OR LOWER(t.project_title) LIKE ? OR LOWER(t.domain) LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

        query += " ORDER BY (CASE WHEN t.status = 'pending_approval' THEN 0 WHEN t.status = 'modification_requested' THEN 1 ELSE 2 END), t.created_at DESC"

        proposals = db.all(query, params)

        for p in proposals:
            members = db.all(
                """SELECT u.id, u.name, u.email, u.avatar, tm.role as team_role,
                          sp.reg_no, sp.strength, sp.languages, sp.cgpa, sp.department
                   FROM team_members tm
                   JOIN users u ON tm.student_id = u.id
                   LEFT JOIN student_profiles sp ON u.id = sp.user_id
                   WHERE tm.team_id = ?""",
                [p["id"]]
            )
            p["members"] = members

        return jsonify({"proposals": proposals})

    except Exception as error:
        print("HOD team proposals error:", error)
        return jsonify({"error": "Failed to retrieve project team proposals."}), 500


# 10. Decide Team Proposal
@hod_bp.route("/team-proposals/<int:team_id>/decide", methods=["POST"])
@authenticate_token
@require_role("hod")
def decide_team_proposal(team_id):
    try:
        data = request.get_json(silent=True) or {}
        action = data.get("action")
        remarks = data.get("remarks")

        status_map = {
            "approve": "approved",
            "approved": "approved",
            "request_modification": "modification_requested",
            "modification_requested": "modification_requested",
            "reject": "rejected",
            "rejected": "rejected"
        }
        new_status = status_map.get(action)
        if not new_status:
            return jsonify({"error": "Invalid action. Must be approve, request_modification, or reject."}), 400

        db = get_db()
        team = db.get("SELECT * FROM teams WHERE id = ?", [team_id])
        if not team:
            return jsonify({"error": "Project team not found."}), 404

        clean_remarks = sanitize_string(remarks) if remarks else f"Status updated to {new_status} by HOD"
        db.run(
            "UPDATE teams SET status = ?, hod_remarks = ? WHERE id = ?",
            [new_status, clean_remarks, team_id]
        )

        io = current_app.extensions.get("socketio")
        if team.get("leader_id"):
            create_system_notification(
                db, io,
                title=f"Team Proposal {new_status.replace('_', ' ').capitalize()}",
                body=f"Your project proposal for '{team.get('project_title') or team.get('name')}' status is now {new_status}. Remarks: {clean_remarks}",
                audience="user",
                posted_by=g.user["id"],
                target_user_id=team["leader_id"]
            )

        return jsonify({
            "message": f"Team proposal status successfully updated to {new_status}.",
            "status": new_status,
            "remarks": clean_remarks
        })

    except Exception as error:
        print("Decide team proposal error:", error)
        return jsonify({"error": "Failed to record team proposal decision."}), 500


# 11. Get Mentor Recommendations for Team
@hod_bp.route("/team-proposals/<int:team_id>/mentor-recommendations", methods=["GET"])
@authenticate_token
@require_role("hod")
def get_mentor_recommendations(team_id):
    try:
        db = get_db()
        team = db.get("SELECT * FROM teams WHERE id = ?", [team_id])
        if not team:
            return jsonify({"error": "Project team not found."}), 404

        faculty_list = db.all(
            """SELECT u.id, u.name, u.email, u.avatar,
                      fp.designation, fp.department, fp.bio, fp.subjects, fp.languages, fp.linkedin_url,
                      (SELECT COUNT(*) FROM teams WHERE faculty_id = u.id) as active_mentored_count
               FROM users u
               JOIN faculty_profiles fp ON u.id = fp.user_id
               WHERE u.role = 'faculty'"""
        )

        recommendations = []
        for fac in faculty_list:
            match = calculate_faculty_mentor_match(fac, team, fac.get("active_mentored_count", 0))
            recommendations.append({
                "facultyId": fac["id"],
                "facultyName": fac["name"],
                "email": fac["email"],
                "avatar": fac["avatar"],
                "designation": fac["designation"],
                "department": fac["department"],
                "subjects": fac["subjects"],
                "languages": fac["languages"],
                "activeMentoredCount": fac.get("active_mentored_count", 0),
                "compatibilityScore": match["score"],
                "explanation": match["explanation"],
                "domainScore": match["domainScore"],
                "techScore": match["techScore"],
                "workloadScore": match["workloadScore"],
                "matchedTech": match["matchedTech"]
            })

        recommendations.sort(key=lambda x: x["compatibilityScore"], reverse=True)

        return jsonify({
            "team": team,
            "recommendations": recommendations
        })

    except Exception as error:
        print("Mentor recommendations error:", error)
        return jsonify({"error": "Failed to calculate mentor recommendations."}), 500


# 12. Assign Mentor to Team
@hod_bp.route("/team-proposals/<int:team_id>/assign-mentor", methods=["POST"])
@authenticate_token
@require_role("hod")
def assign_team_mentor(team_id):
    try:
        data = request.get_json(silent=True) or {}
        faculty_id = data.get("facultyId")
        note = data.get("note")

        if not faculty_id:
            return jsonify({"error": "Target faculty mentor ID is required."}), 400

        db = get_db()
        team = db.get("SELECT * FROM teams WHERE id = ?", [team_id])
        if not team:
            return jsonify({"error": "Project team not found."}), 404

        faculty = db.get("SELECT id, name, email FROM users WHERE id = ? AND role = 'faculty'", [faculty_id])
        if not faculty:
            return jsonify({"error": "Faculty mentor not found."}), 404

        clean_note = sanitize_string(note) if note else "Assigned mentor by HOD"
        io = current_app.extensions.get("socketio")

        with db.transaction():
            db.run("UPDATE teams SET faculty_id = ? WHERE id = ?", [faculty_id, team_id])

            # Check if chat group exists for this team
            cg = db.get("SELECT id FROM chat_groups WHERE team_id = ?", [team_id])
            if cg:
                db.run("UPDATE chat_groups SET faculty_id = ? WHERE id = ?", [faculty_id, cg["id"]])
                db.run("INSERT OR IGNORE INTO chat_group_members (group_id, user_id) VALUES (?, ?)", [cg["id"], faculty_id])

            # Update team members' assigned faculty
            members = db.all("SELECT student_id FROM team_members WHERE team_id = ?", [team_id])
            for m in members:
                db.run("UPDATE student_profiles SET faculty_id = ? WHERE user_id = ?", [faculty_id, m["student_id"]])
                create_system_notification(
                    db, io,
                    title="Capstone Team Mentor Allocated",
                    body=f"Your team '{team['name']}' has been assigned to mentor {faculty['name']}. Note: {clean_note}",
                    audience="user",
                    posted_by=g.user["id"],
                    target_user_id=m["student_id"]
                )

            # Notify faculty
            create_system_notification(
                db, io,
                title="New Capstone Team Mentorship Assigned",
                body=f"You have been assigned to mentor the student capstone team '{team['name']}'. Project: {team.get('project_title') or 'Capstone'}",
                audience="user",
                posted_by=g.user["id"],
                target_user_id=faculty_id
            )

        return jsonify({
            "message": f"Successfully assigned {faculty['name']} as mentor for team '{team['name']}'.",
            "faculty": faculty
        })

    except Exception as error:
        print("Assign team mentor error:", error)
        return jsonify({"error": "Failed to assign team mentor."}), 500
