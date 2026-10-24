import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from backend.database import get_db, initialize_database
from backend.middleware.auth import hash_password


def seed_hod():
    initialize_database()
    db = get_db()

    existing_hod = db.get("SELECT * FROM users WHERE role = 'hod'")
    if existing_hod:
        print(f"ℹ️ HOD account already exists: {existing_hod['email']}")
        return existing_hod

    default_password = os.getenv("HOD_PASSWORD", "HodPass@2026")
    pw_hash = hash_password(default_password)

    result = db.run(
        """INSERT INTO users (role, name, email, password_hash, avatar)
           VALUES (?, ?, ?, ?, ?)""",
        [
            "hod",
            "Dr. Robert Vance (HOD)",
            "hod.cs@college.edu",
            pw_hash,
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
        ]
    )

    print("✅ Exactly 1 HOD account created successfully:")
    print("   Email: hod.cs@college.edu")
    print(f"   Password: {default_password}")
    print(f"   Role: hod (ID: {result.lastID})")

    return {"id": result.lastID, "email": "hod.cs@college.edu", "role": "hod"}


if __name__ == "__main__":
    seed_hod()
