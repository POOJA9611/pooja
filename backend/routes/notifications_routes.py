import datetime
from flask import Blueprint, request, jsonify, g, current_app
from backend.database import get_db
from backend.middleware.auth import authenticate_token

notifications_bp = Blueprint("notifications", __name__)


def create_system_notification(db, io, title, body, audience="both", posted_by=1, target_user_id=None, deadline=None):
    try:
        valid_audience = audience if audience in ("students", "faculty", "both", "user") else "both"
        res = db.run(
            """INSERT INTO notifications (title, body, audience, posted_by, target_user_id, deadline)
               VALUES (?, ?, ?, ?, ?, ?)""",
            [title, body, valid_audience, posted_by, target_user_id, deadline]
        )
        notif_id = res.lastID

        if io:
            payload = {
                "id": notif_id,
                "title": title,
                "body": body,
                "audience": valid_audience,
                "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }
            if target_user_id:
                io.emit("new_notification", payload, room=f"user_{target_user_id}")
            elif valid_audience in ("students", "both"):
                io.emit("new_notification", payload, room="role_student")
                if valid_audience == "both":
                    io.emit("new_notification", payload, room="role_faculty")
            elif valid_audience == "faculty":
                io.emit("new_notification", payload, room="role_faculty")

        return notif_id
    except Exception as e:
        print("Error creating system notification:", e)
        return None


@notifications_bp.route("", methods=["GET"])
@notifications_bp.route("/", methods=["GET"])
@authenticate_token
def get_notifications():
    try:
        db = get_db()
        user = g.user
        role = user["role"]

        if role == "student":
            query = """
                SELECT n.*, u.name as posted_by_name,
                       CASE WHEN nr.user_id IS NOT NULL THEN 1 ELSE 0 END as is_read
                FROM notifications n
                JOIN users u ON n.posted_by = u.id
                LEFT JOIN notification_reads nr ON n.id = nr.notification_id AND nr.user_id = ?
                WHERE (n.target_user_id = ? OR (n.target_user_id IS NULL AND n.audience IN ('students', 'both')))
                ORDER BY n.created_at DESC
            """
            params = [user["id"], user["id"]]
        elif role == "faculty":
            query = """
                SELECT n.*, u.name as posted_by_name,
                       CASE WHEN nr.user_id IS NOT NULL THEN 1 ELSE 0 END as is_read
                FROM notifications n
                JOIN users u ON n.posted_by = u.id
                LEFT JOIN notification_reads nr ON n.id = nr.notification_id AND nr.user_id = ?
                WHERE (n.target_user_id = ? OR (n.target_user_id IS NULL AND n.audience IN ('faculty', 'both')))
                ORDER BY n.created_at DESC
            """
            params = [user["id"], user["id"]]
        elif role == "hod":
            query = """
                SELECT n.*, u.name as posted_by_name,
                       CASE WHEN nr.user_id IS NOT NULL THEN 1 ELSE 0 END as is_read
                FROM notifications n
                JOIN users u ON n.posted_by = u.id
                LEFT JOIN notification_reads nr ON n.id = nr.notification_id AND nr.user_id = ?
                ORDER BY n.created_at DESC
            """
            params = [user["id"]]
        else:
            query = "SELECT * FROM notifications WHERE 1=0"
            params = []

        notifications = db.all(query, params)
        unread_count = sum(1 for n in notifications if not n.get("is_read"))

        return jsonify({
            "notifications": notifications,
            "unreadCount": unread_count
        })

    except Exception as error:
        print("Get notifications error:", error)
        return jsonify({"error": "Failed to retrieve notifications."}), 500


@notifications_bp.route("/<int:notif_id>/read", methods=["POST"])
@authenticate_token
def mark_read(notif_id):
    try:
        user_id = g.user["id"]
        db = get_db()
        db.run(
            "INSERT OR IGNORE INTO notification_reads (notification_id, user_id) VALUES (?, ?)",
            [notif_id, user_id]
        )
        return jsonify({"message": "Notification marked as read."})
    except Exception as error:
        print("Mark read error:", error)
        return jsonify({"error": "Failed to mark notification as read."}), 500


@notifications_bp.route("/mark-all-read", methods=["POST"])
@authenticate_token
def mark_all_read():
    try:
        user = g.user
        user_id = user["id"]
        role = user["role"]
        db = get_db()

        if role == "student":
            target_audience = ["students", "both"]
        elif role == "faculty":
            target_audience = ["faculty", "both"]
        else:
            target_audience = ["students", "faculty", "both"]

        placeholders = ",".join(["?"] * len(target_audience))
        relevant_notifs = db.all(
            f"SELECT id FROM notifications WHERE audience IN ({placeholders})",
            target_audience
        )

        for notif in relevant_notifs:
            db.run(
                "INSERT OR IGNORE INTO notification_reads (notification_id, user_id) VALUES (?, ?)",
                [notif["id"], user_id]
            )

        return jsonify({"message": "All notifications marked as read."})
    except Exception as error:
        print("Mark all read error:", error)
        return jsonify({"error": "Failed to mark all as read."}), 500
