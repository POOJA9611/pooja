import os
import time
import random
from flask import Blueprint, request, jsonify, g, current_app
from werkzeug.utils import secure_filename
from backend.database import get_db
from backend.middleware.auth import authenticate_token, require_role
from backend.utils.validators import (
    validate_linkedin_url,
    validate_github_url,
    validate_strength,
    sanitize_string
)

student_bp = Blueprint("student", __name__)

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# 1. Get Profile
@student_bp.route("/profile", methods=["GET"])
@authenticate_token
@require_role("student")
def get_student_profile():
    try:
        db = get_db()
        student_id = g.user["id"]

        profile = db.get(
            """SELECT sp.*, u.name, u.email, u.avatar,
                      f.id as faculty_id, f.name as faculty_name, f.email as faculty_email,
                      fp.designation as faculty_designation, fp.department as faculty_department,
                      fp.subjects as faculty_subjects, fp.linkedin_url as faculty_linkedin
               FROM users u
               JOIN student_profiles sp ON u.id = sp.user_id
               LEFT JOIN users f ON sp.faculty_id = f.id
               LEFT JOIN faculty_profiles fp ON f.id = fp.user_id
               WHERE u.id = ?""",
            [student_id]
        )

        if not profile:
            return jsonify({"error": "Student profile not found."}), 404

        projects = db.all(
            """SELECT p.id, p.title, p.description, p.status, p.created_at, p.team_id, t.name as team_name
               FROM projects p
               JOIN project_members pm ON p.id = pm.project_id
               LEFT JOIN teams t ON p.team_id = t.id
               WHERE pm.student_id = ?
               ORDER BY p.status DESC, p.created_at DESC""",
            [student_id]
        )

        change_requests = db.all(
            """SELECT cr.*, cf.name as current_faculty_name, rf.name as requested_faculty_name
               FROM change_requests cr
               JOIN users cf ON cr.current_faculty_id = cf.id
               LEFT JOIN users rf ON cr.requested_faculty_id = rf.id
               WHERE cr.student_id = ?
               ORDER BY cr.created_at DESC""",
            [student_id]
        )

        has_pending = any(r.get("status") == "pending" for r in change_requests)

        return jsonify({
            "profile": profile,
            "projects": projects,
            "changeRequests": change_requests,
            "hasPendingRequest": has_pending
        })

    except Exception as error:
        print("Student profile error:", error)
        return jsonify({"error": "Failed to retrieve profile."}), 500


# 2. Update Profile
@student_bp.route("/profile", methods=["PUT"])
@authenticate_token
@require_role("student")
def update_student_profile():
    try:
        data = request.get_json(silent=True) or {}
        name = data.get("name")
        email = data.get("email")
        avatar = data.get("avatar")
        bio = data.get("bio")
        strength = data.get("strength")
        languages = data.get("languages")
        linkedin_url = data.get("linkedin_url")
        github_url = data.get("github_url")
        semester = data.get("semester")
        cgpa = data.get("cgpa")
        username = data.get("username")
        location = data.get("location")
        website_url = data.get("website_url")
        headline = data.get("headline")
        technical_skills = data.get("technical_skills")
        frameworks = data.get("frameworks")
        experience_level = data.get("experience_level")
        college = data.get("college")
        education = data.get("education")
        interests = data.get("interests")
        achievements = data.get("achievements")
        availability_status = data.get("availability_status")

        if linkedin_url and not validate_linkedin_url(linkedin_url):
            return jsonify({"error": "Invalid LinkedIn URL format. Must start with https:// or http://"}), 400

        if github_url and not validate_github_url(github_url):
            return jsonify({"error": "Invalid GitHub URL format. Must start with https:// or http://"}), 400

        if strength and not validate_strength(strength):
            return jsonify({"error": "Invalid strength value. Must be frontend, backend, or fullstack."}), 400

        db = get_db()
        student_id = g.user["id"]

        if email and email.strip():
            clean_email = email.strip().lower()
            existing_user = db.get("SELECT id FROM users WHERE email = ? AND id != ?", [clean_email, student_id])
            if existing_user:
                return jsonify({"error": "Email address is already in use by another user."}), 400

        with db.transaction():
            if name or email or avatar:
                db.run(
                    """UPDATE users
                       SET name = COALESCE(?, name),
                           email = COALESCE(?, email),
                           avatar = COALESCE(?, avatar)
                       WHERE id = ?""",
                    [
                        name.strip() if name else None,
                        email.strip().lower() if email else None,
                        avatar or None,
                        student_id
                    ]
                )

            sem_val = int(semester) if semester is not None else None
            cgpa_val = float(cgpa) if cgpa is not None else None

            db.run(
                """UPDATE student_profiles
                   SET bio = COALESCE(?, bio),
                       strength = COALESCE(?, strength),
                       languages = COALESCE(?, languages),
                       linkedin_url = COALESCE(?, linkedin_url),
                       github_url = COALESCE(?, github_url),
                       semester = COALESCE(?, semester),
                       cgpa = COALESCE(?, cgpa),
                       username = COALESCE(?, username),
                       location = COALESCE(?, location),
                       website_url = COALESCE(?, website_url),
                       headline = COALESCE(?, headline),
                       technical_skills = COALESCE(?, technical_skills),
                       frameworks = COALESCE(?, frameworks),
                       experience_level = COALESCE(?, experience_level),
                       college = COALESCE(?, college),
                       education = COALESCE(?, education),
                       interests = COALESCE(?, interests),
                       achievements = COALESCE(?, achievements),
                       availability_status = COALESCE(?, availability_status)
                   WHERE user_id = ?""",
                [
                    bio.strip() if bio is not None else None,
                    strength or None,
                    languages.strip() if languages is not None else None,
                    linkedin_url.strip() if linkedin_url is not None else None,
                    github_url.strip() if github_url is not None else None,
                    sem_val,
                    cgpa_val,
                    username.strip() if username is not None else None,
                    location.strip() if location is not None else None,
                    website_url.strip() if website_url is not None else None,
                    headline.strip() if headline is not None else None,
                    technical_skills.strip() if technical_skills is not None else None,
                    frameworks.strip() if frameworks is not None else None,
                    experience_level or None,
                    college.strip() if college is not None else None,
                    education.strip() if education is not None else None,
                    interests.strip() if interests is not None else None,
                    achievements.strip() if achievements is not None else None,
                    availability_status or None,
                    student_id
                ]
            )

        return jsonify({"message": "Profile updated successfully."})

    except Exception as error:
        print("Update student profile error:", error)
        return jsonify({"error": "Failed to update profile."}), 500


# 3. Avatar Upload
@student_bp.route("/profile/avatar", methods=["POST"])
@authenticate_token
@require_role("student")
def upload_avatar():
    try:
        if "avatar" not in request.files:
            return jsonify({"error": "No image file uploaded."}), 400

        file = request.files["avatar"]
        if file.filename == "":
            return jsonify({"error": "No selected file."}), 400

        if not allowed_file(file.filename):
            return jsonify({"error": "Invalid file type. Only JPG, JPEG, PNG, and WebP images are allowed."}), 400

        student_id = g.user["id"]
        ext = file.filename.rsplit(".", 1)[1].lower()
        unique_suffix = f"{int(time.time())}-{random.randint(100000, 999999)}"
        filename = f"avatar-{student_id}-{unique_suffix}.{ext}"

        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        uploads_dir = os.path.join(base_dir, "uploads", "avatars")
        os.makedirs(uploads_dir, exist_ok=True)
        save_path = os.path.join(uploads_dir, filename)
        file.save(save_path)

        avatar_url = f"/uploads/avatars/{filename}"
        db = get_db()

        # Remove old local avatar if exists
        current_user = db.get("SELECT avatar FROM users WHERE id = ?", [student_id])
        if current_user and current_user.get("avatar") and current_user["avatar"].startswith("/uploads/avatars/"):
            old_name = os.path.basename(current_user["avatar"])
            old_path = os.path.join(uploads_dir, old_name)
            if os.path.exists(old_path) and old_path != save_path:
                try:
                    os.remove(old_path)
                except Exception as e:
                    print("Warning deleting old avatar:", e)

        db.run("UPDATE users SET avatar = ? WHERE id = ?", [avatar_url, student_id])

        return jsonify({
            "message": "Profile picture updated successfully.",
            "avatarUrl": avatar_url
        })

    except Exception as error:
        print("Upload avatar error:", error)
        return jsonify({"error": "Failed to upload profile picture."}), 500


# 4. Remove Avatar
@student_bp.route("/profile/avatar", methods=["DELETE"])
@authenticate_token
@require_role("student")
def remove_avatar():
    try:
        db = get_db()
        student_id = g.user["id"]
        default_avatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"

        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        uploads_dir = os.path.join(base_dir, "uploads", "avatars")

        current_user = db.get("SELECT avatar FROM users WHERE id = ?", [student_id])
        if current_user and current_user.get("avatar") and current_user["avatar"].startswith("/uploads/avatars/"):
            old_name = os.path.basename(current_user["avatar"])
            old_path = os.path.join(uploads_dir, old_name)
            if os.path.exists(old_path):
                try:
                    os.remove(old_path)
                except Exception as e:
                    print("Warning deleting avatar:", e)

        db.run("UPDATE users SET avatar = ? WHERE id = ?", [default_avatar, student_id])

        return jsonify({
            "message": "Profile picture removed successfully.",
            "avatarUrl": default_avatar
        })

    except Exception as error:
        print("Delete avatar error:", error)
        return jsonify({"error": "Failed to remove profile picture."}), 500


# 5. Add Project
@student_bp.route("/projects", methods=["POST"])
@authenticate_token
@require_role("student")
def add_project():
    try:
        data = request.get_json(silent=True) or {}
        title = data.get("title")
        description = data.get("description")
        status = data.get("status")
        team_id = data.get("team_id")

        if not title or not isinstance(title, str) or len(title.strip()) == 0:
            return jsonify({"error": "Project title is required."}), 400

        project_status = "completed" if status == "completed" else "ongoing"
        db = get_db()

        with db.transaction():
            res = db.run(
                """INSERT INTO projects (title, description, status, team_id)
                   VALUES (?, ?, ?, ?)""",
                [title.strip(), description.strip() if description else "", project_status, team_id or None]
            )
            project_id = res.lastID
            db.run(
                "INSERT INTO project_members (project_id, student_id) VALUES (?, ?)",
                [project_id, g.user["id"]]
            )

        return jsonify({
            "message": "Project created successfully.",
            "projectId": project_id
        }), 201

    except Exception as error:
        print("Create project error:", error)
        return jsonify({"error": "Failed to create project."}), 500


# 6. Submit Change Request
@student_bp.route("/change-request", methods=["POST"])
@authenticate_token
@require_role("student")
def submit_change_request():
    try:
        data = request.get_json(silent=True) or {}
        reason = data.get("reason")
        requested_faculty_id = data.get("requested_faculty_id")

        if not reason or not isinstance(reason, str) or len(reason.strip()) == 0:
            return jsonify({"error": "A clear reason for the faculty change is required."}), 400

        db = get_db()
        student_id = g.user["id"]

        student = db.get("SELECT faculty_id FROM student_profiles WHERE user_id = ?", [student_id])
        if not student or not student.get("faculty_id"):
            return jsonify({"error": "You do not currently have an assigned faculty to request a change from."}), 400

        existing_pending = db.get("SELECT id FROM change_requests WHERE student_id = ? AND status = 'pending'", [student_id])
        if existing_pending:
            return jsonify({
                "error": "You already have an active pending faculty change request. Please wait for HOD decision."
            }), 400

        req_faculty_id = None
        if requested_faculty_id:
            target = db.get("SELECT id FROM users WHERE id = ? AND role = 'faculty'", [requested_faculty_id])
            if target:
                req_faculty_id = target["id"]

        clean_reason = sanitize_string(reason)
        res = db.run(
            """INSERT INTO change_requests (student_id, current_faculty_id, requested_faculty_id, reason, status)
               VALUES (?, ?, ?, ?, 'pending')""",
            [student_id, student["faculty_id"], req_faculty_id, clean_reason]
        )

        io = current_app.extensions.get("socketio")
        if io:
            io.emit("new_change_request", {
                "requestId": res.lastID,
                "studentId": student_id,
                "studentName": g.user["name"]
            })

        return jsonify({
            "message": "Faculty change request submitted successfully to the HOD.",
            "requestId": res.lastID
        }), 201

    except Exception as error:
        print("Submit change request error:", error)
        return jsonify({"error": "Failed to submit faculty change request."}), 500


# 7. Browse Faculty List
@student_bp.route("/faculty-list", methods=["GET"])
@authenticate_token
def get_faculty_list():
    try:
        db = get_db()
        faculty = db.all(
            """SELECT u.id, u.name, u.email, u.avatar,
                      fp.designation, fp.department, fp.bio, fp.subjects, fp.languages, fp.linkedin_url,
                      (SELECT COUNT(*) FROM student_profiles WHERE faculty_id = u.id) as workload
               FROM users u
               JOIN faculty_profiles fp ON u.id = fp.user_id
               WHERE u.role = 'faculty'
               ORDER BY u.name ASC"""
        )
        return jsonify({"faculty": faculty})
    except Exception as error:
        print("Student faculty list error:", error)
        return jsonify({"error": "Failed to retrieve faculty list."}), 500


# 8. Get Faculty Details
@student_bp.route("/faculty/<int:fac_id>", methods=["GET"])
@authenticate_token
def get_faculty_detail(fac_id):
    try:
        db = get_db()
        faculty = db.get(
            """SELECT u.id, u.name, u.email, u.avatar,
                      fp.designation, fp.department, fp.bio, fp.subjects, fp.languages, fp.linkedin_url,
                      (SELECT COUNT(*) FROM student_profiles WHERE faculty_id = u.id) as workload
               FROM users u
               JOIN faculty_profiles fp ON u.id = fp.user_id
               WHERE u.id = ? AND u.role = 'faculty'""",
            [fac_id]
        )

        if not faculty:
            return jsonify({"error": "Faculty member not found."}), 404

        return jsonify({"faculty": faculty})
    except Exception as error:
        print("Get faculty error:", error)
        return jsonify({"error": "Failed to retrieve faculty details."}), 500
