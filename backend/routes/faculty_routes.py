from flask import Blueprint, request, jsonify, g
from backend.database import get_db
from backend.middleware.auth import authenticate_token, require_role
from backend.utils.validators import validate_linkedin_url, sanitize_string

faculty_bp = Blueprint("faculty", __name__)


# 1. My Students
@faculty_bp.route("/my-students", methods=["GET"])
@authenticate_token
@require_role("faculty")
def get_my_students():
    try:
        db = get_db()
        faculty_id = g.user["id"]

        students = db.all(
            """SELECT u.id, u.name, u.email, u.avatar,
                      sp.reg_no, sp.department, sp.semester, sp.cgpa, sp.bio,
                      sp.strength, sp.languages, sp.linkedin_url, sp.github_url
               FROM users u
               JOIN student_profiles sp ON u.id = sp.user_id
               WHERE sp.faculty_id = ?
               ORDER BY u.name ASC""",
            [faculty_id]
        )

        for student in students:
            student_projects = db.all(
                """SELECT p.id, p.title, p.description, p.status, p.team_id, t.name as team_name
                   FROM projects p
                   JOIN project_members pm ON p.id = pm.project_id
                   LEFT JOIN teams t ON p.team_id = t.id
                   WHERE pm.student_id = ?
                   ORDER BY p.status DESC, p.created_at DESC""",
                [student["id"]]
            )
            student["projects"] = student_projects

        return jsonify({"students": students})

    except Exception as error:
        print("Faculty my-students error:", error)
        return jsonify({"error": "Failed to retrieve assigned students."}), 500


# 2. Get Profile
@faculty_bp.route("/profile", methods=["GET"])
@authenticate_token
@require_role("faculty")
def get_faculty_profile():
    try:
        db = get_db()
        faculty_id = g.user["id"]

        profile = db.get(
            """SELECT u.id, u.name, u.email, u.avatar,
                      fp.designation, fp.department, fp.bio, fp.subjects, fp.languages, fp.linkedin_url
               FROM users u
               JOIN faculty_profiles fp ON u.id = fp.user_id
               WHERE u.id = ?""",
            [faculty_id]
        )

        if not profile:
            return jsonify({"error": "Faculty profile not found."}), 404

        return jsonify({"profile": profile})

    except Exception as error:
        print("Get faculty profile error:", error)
        return jsonify({"error": "Failed to fetch faculty profile."}), 500


# 3. Update Profile
@faculty_bp.route("/profile", methods=["PUT"])
@authenticate_token
@require_role("faculty")
def update_faculty_profile():
    try:
        data = request.get_json(silent=True) or {}
        name = data.get("name")
        avatar = data.get("avatar")
        designation = data.get("designation")
        department = data.get("department")
        bio = data.get("bio")
        subjects = data.get("subjects")
        languages = data.get("languages")
        linkedin_url = data.get("linkedin_url")

        if linkedin_url and not validate_linkedin_url(linkedin_url):
            return jsonify({"error": "Invalid LinkedIn URL format."}), 400

        db = get_db()
        faculty_id = g.user["id"]

        with db.transaction():
            if name:
                db.run(
                    "UPDATE users SET name = ?, avatar = COALESCE(?, avatar) WHERE id = ?",
                    [name.strip(), avatar or None, faculty_id]
                )

            db.run(
                """UPDATE faculty_profiles
                   SET designation = COALESCE(?, designation),
                       department = COALESCE(?, department),
                       bio = COALESCE(?, bio),
                       subjects = COALESCE(?, subjects),
                       languages = COALESCE(?, languages),
                       linkedin_url = COALESCE(?, linkedin_url)
                   WHERE user_id = ?""",
                [
                    designation.strip() if designation else None,
                    department.strip() if department else None,
                    bio.strip() if bio else None,
                    subjects.strip() if subjects else None,
                    languages.strip() if languages else None,
                    linkedin_url.strip() if linkedin_url else None,
                    faculty_id
                ]
            )

        updated_profile = db.get(
            """SELECT u.id, u.name, u.email, u.avatar,
                      fp.designation, fp.department, fp.bio, fp.subjects, fp.languages, fp.linkedin_url
               FROM users u
               JOIN faculty_profiles fp ON u.id = fp.user_id
               WHERE u.id = ?""",
            [faculty_id]
        )

        return jsonify({
            "message": "Profile updated successfully.",
            "profile": updated_profile
        })

    except Exception as error:
        print("Update faculty profile error:", error)
        return jsonify({"error": "Failed to update faculty profile."}), 500
