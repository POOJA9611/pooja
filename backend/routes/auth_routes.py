import os
from flask import Blueprint, request, jsonify, g
from backend.database import get_db
from backend.middleware.auth import hash_password, check_password, create_token, authenticate_token
from backend.utils.validators import (
    validate_email,
    validate_faculty_email_domain,
    validate_linkedin_url,
    validate_github_url,
    validate_strength
)

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/signup", methods=["POST"])
def signup():
    try:
        data = request.get_json(silent=True) or {}
        role = data.get("role")
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")
        avatar = data.get("avatar")

        # Student specific
        reg_no = data.get("reg_no")
        department = data.get("department")
        semester = data.get("semester")
        cgpa = data.get("cgpa")
        bio = data.get("bio")
        strength = data.get("strength")
        languages = data.get("languages")
        linkedin_url = data.get("linkedin_url")
        github_url = data.get("github_url")

        # Faculty specific
        designation = data.get("designation")
        subjects = data.get("subjects")

        # Strict check: HOD registration is completely forbidden via signup
        if not role or role not in ("student", "faculty"):
            return jsonify({
                "error": "Invalid role selection. Only Student and Faculty accounts can register. HOD accounts cannot be registered."
            }), 400

        if not name or not isinstance(name, str) or len(name.strip()) < 2:
            return jsonify({"error": "Name must be at least 2 characters."}), 400

        if not validate_email(email):
            return jsonify({"error": "Valid email address is required."}), 400

        clean_email = email.strip().lower()

        # Faculty college domain validation
        if role == "faculty":
            if not validate_faculty_email_domain(clean_email):
                domain = os.getenv("FACULTY_EMAIL_DOMAIN", "@college.edu")
                return jsonify({
                    "error": f"Faculty registration requires an official college domain email address (must end with {domain})."
                }), 400

        if not password or not isinstance(password, str) or len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters long."}), 400

        if linkedin_url and not validate_linkedin_url(linkedin_url):
            return jsonify({"error": "Invalid LinkedIn URL format."}), 400

        if github_url and not validate_github_url(github_url):
            return jsonify({"error": "Invalid GitHub URL format."}), 400

        db = get_db()
        existing_user = db.get("SELECT id FROM users WHERE email = ?", [clean_email])
        if existing_user:
            return jsonify({"error": "An account with this email address already exists."}), 409

        password_hash = hash_password(password)
        default_avatar = avatar or (
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
            if role == "faculty" else
            "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"
        )

        user_result = db.run(
            """INSERT INTO users (role, name, email, password_hash, avatar)
               VALUES (?, ?, ?, ?, ?)""",
            [role, name.strip(), clean_email, password_hash, default_avatar]
        )
        user_id = user_result.lastID

        if role == "student":
            student_strength = strength if validate_strength(strength) else "fullstack"
            try:
                sem_val = int(semester) if semester is not None else 6
            except (ValueError, TypeError):
                sem_val = 6
            try:
                cgpa_val = float(cgpa) if cgpa is not None else 8.0
            except (ValueError, TypeError):
                cgpa_val = 8.0

            db.run(
                """INSERT INTO student_profiles (
                    user_id, reg_no, department, semester, cgpa, bio, strength, languages, linkedin_url, github_url, faculty_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)""",
                [
                    user_id,
                    reg_no.strip() if reg_no else f"RA2026{str(user_id).zfill(4)}",
                    department.strip() if department else "Computer Science & Engineering",
                    sem_val,
                    cgpa_val,
                    bio.strip() if bio else "",
                    student_strength,
                    languages.strip() if languages else "JavaScript, Python",
                    linkedin_url.strip() if linkedin_url else "",
                    github_url.strip() if github_url else ""
                ]
            )
        elif role == "faculty":
            db.run(
                """INSERT INTO faculty_profiles (
                    user_id, designation, department, bio, subjects, languages, linkedin_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?)""",
                [
                    user_id,
                    designation.strip() if designation else "Assistant Professor",
                    department.strip() if department else "Computer Science & Engineering",
                    bio.strip() if bio else "",
                    subjects.strip() if subjects else "Cloud Computing, Web Architecture",
                    languages.strip() if languages else "Python, JavaScript, Java",
                    linkedin_url.strip() if linkedin_url else ""
                ]
            )

        token = create_token(user_id, role)
        new_user = db.get("SELECT id, role, name, email, avatar, created_at FROM users WHERE id = ?", [user_id])

        return jsonify({
            "message": "Account successfully registered.",
            "token": token,
            "user": new_user
        }), 201

    except Exception as error:
        print("Signup error:", error)
        return jsonify({"error": "Server error during registration."}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json(silent=True) or {}
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Email and password are required."}), 400

        clean_email = email.strip().lower()
        db = get_db()
        user = db.get(
            "SELECT id, role, name, email, password_hash, avatar, created_at FROM users WHERE email = ?",
            [clean_email]
        )

        if not user or not check_password(password, user["password_hash"]):
            return jsonify({"error": "Invalid email or password."}), 401

        token = create_token(user["id"], user["role"])
        safe_user = {k: v for k, v in user.items() if k != "password_hash"}

        profile = None
        if user["role"] == "student":
            profile = db.get(
                """SELECT sp.*, u.name as faculty_name, u.email as faculty_email
                   FROM student_profiles sp
                   LEFT JOIN users u ON sp.faculty_id = u.id
                   WHERE sp.user_id = ?""",
                [user["id"]]
            )
        elif user["role"] == "faculty":
            profile = db.get("SELECT * FROM faculty_profiles WHERE user_id = ?", [user["id"]])

        return jsonify({
            "message": "Logged in successfully.",
            "token": token,
            "user": safe_user,
            "profile": profile
        })

    except Exception as error:
        print("Login error:", error)
        return jsonify({"error": "Server error during login."}), 500


@auth_bp.route("/me", methods=["GET"])
@authenticate_token
def get_me():
    try:
        db = get_db()
        user = g.user
        profile = None

        if user["role"] == "student":
            profile = db.get(
                """SELECT sp.*, u.name as faculty_name, u.email as faculty_email
                   FROM student_profiles sp
                   LEFT JOIN users u ON sp.faculty_id = u.id
                   WHERE sp.user_id = ?""",
                [user["id"]]
            )
        elif user["role"] == "faculty":
            profile = db.get("SELECT * FROM faculty_profiles WHERE user_id = ?", [user["id"]])

        return jsonify({
            "user": user,
            "profile": profile
        })
    except Exception as error:
        print("Me endpoint error:", error)
        return jsonify({"error": "Failed to fetch current user profile."}), 500
