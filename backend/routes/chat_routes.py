from flask import Blueprint, request, jsonify, g, current_app
from backend.database import get_db
from backend.middleware.auth import authenticate_token, require_role
from backend.utils.validators import sanitize_string

chat_bp = Blueprint("chat", __name__)


# 1. Get Groups for Current User
@chat_bp.route("/groups", methods=["GET"])
@authenticate_token
def get_chat_groups():
    try:
        db = get_db()
        user_id = g.user["id"]

        groups = db.all(
            """SELECT cg.id, cg.name, cg.team_id, cg.faculty_id, cg.created_by, cg.created_at,
                      f.name as faculty_name,
                      t.name as team_name,
                      (SELECT body FROM messages WHERE group_id = cg.id ORDER BY created_at DESC LIMIT 1) as last_message,
                      (SELECT created_at FROM messages WHERE group_id = cg.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
                      (SELECT COUNT(*) FROM chat_group_members WHERE group_id = cg.id) as member_count
               FROM chat_groups cg
               JOIN chat_group_members cgm ON cg.id = cgm.group_id
               LEFT JOIN users f ON cg.faculty_id = f.id
               LEFT JOIN teams t ON cg.team_id = t.id
               WHERE cgm.user_id = ?
               ORDER BY COALESCE(last_message_time, cg.created_at) DESC""",
            [user_id]
        )

        for group in groups:
            members = db.all(
                """SELECT u.id, u.name, u.role, u.avatar
                   FROM chat_group_members cgm
                   JOIN users u ON cgm.user_id = u.id
                   WHERE cgm.group_id = ?""",
                [group["id"]]
            )
            group["members"] = members

        return jsonify({"groups": groups})

    except Exception as error:
        print("Get chat groups error:", error)
        return jsonify({"error": "Failed to retrieve chat groups."}), 500


# 2. Get Messages for a Group
@chat_bp.route("/groups/<int:group_id>/messages", methods=["GET"])
@authenticate_token
def get_group_messages(group_id):
    try:
        user_id = g.user["id"]
        db = get_db()

        # Strict membership verification
        membership = db.get(
            "SELECT * FROM chat_group_members WHERE group_id = ? AND user_id = ?",
            [group_id, user_id]
        )

        if not membership:
            return jsonify({
                "error": "Forbidden: You are not a member of this chat group and cannot view its messages."
            }), 403

        messages = db.all(
            """SELECT m.id, m.group_id, m.sender_id, m.body, m.created_at,
                      u.name as sender_name, u.role as sender_role, u.avatar as sender_avatar
               FROM messages m
               JOIN users u ON m.sender_id = u.id
               WHERE m.group_id = ?
               ORDER BY m.created_at ASC""",
            [group_id]
        )

        return jsonify({"messages": messages})

    except Exception as error:
        print("Get messages error:", error)
        return jsonify({"error": "Failed to retrieve messages."}), 500


# 3. Post Message to Group
@chat_bp.route("/groups/<int:group_id>/messages", methods=["POST"])
@authenticate_token
def post_group_message(group_id):
    try:
        data = request.get_json(silent=True) or {}
        body = data.get("body")
        user_id = g.user["id"]

        if not body or not isinstance(body, str) or len(body.strip()) == 0:
            return jsonify({"error": "Message content cannot be empty."}), 400

        db = get_db()
        membership = db.get(
            "SELECT * FROM chat_group_members WHERE group_id = ? AND user_id = ?",
            [group_id, user_id]
        )

        if not membership:
            return jsonify({
                "error": "Forbidden: You cannot post messages to a chat group you do not belong to."
            }), 403

        clean_body = body.strip()
        res = db.run(
            "INSERT INTO messages (group_id, sender_id, body) VALUES (?, ?, ?)",
            [group_id, user_id, clean_body]
        )

        saved_msg = db.get(
            """SELECT m.id, m.group_id, m.sender_id, m.body, m.created_at,
                      u.name as sender_name, u.role as sender_role, u.avatar as sender_avatar
               FROM messages m
               JOIN users u ON m.sender_id = u.id
               WHERE m.id = ?""",
            [res.lastID]
        )

        io = current_app.extensions.get("socketio")
        if io:
            io.emit("receive_message", saved_msg, room=f"group_{group_id}")

        return jsonify({"message": saved_msg}), 201

    except Exception as error:
        print("Send message error:", error)
        return jsonify({"error": "Failed to send message."}), 500


# 4. Create Custom Group (Faculty)
@chat_bp.route("/groups", methods=["POST"])
@authenticate_token
@require_role("faculty")
def create_chat_group():
    try:
        data = request.get_json(silent=True) or {}
        name = data.get("name")
        team_id = data.get("teamId")
        student_ids = data.get("studentIds", [])

        if not name or not isinstance(name, str) or len(name.strip()) < 2:
            return jsonify({"error": "Group name must be at least 2 characters."}), 400

        db = get_db()
        faculty_id = g.user["id"]

        with db.transaction():
            res = db.run(
                "INSERT INTO chat_groups (name, team_id, faculty_id, created_by) VALUES (?, ?, ?, ?)",
                [name.strip(), team_id or None, faculty_id, faculty_id]
            )
            cg_id = res.lastID

            db.run("INSERT INTO chat_group_members (group_id, user_id) VALUES (?, ?)", [cg_id, faculty_id])
            for s_id in student_ids:
                db.run("INSERT OR IGNORE INTO chat_group_members (group_id, user_id) VALUES (?, ?)", [cg_id, s_id])

        new_group = db.get("SELECT * FROM chat_groups WHERE id = ?", [cg_id])
        return jsonify({"group": new_group}), 201

    except Exception as error:
        print("Create chat group error:", error)
        return jsonify({"error": "Failed to create chat group."}), 500
