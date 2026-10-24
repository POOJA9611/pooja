#!/usr/bin/env python3
"""
SQLite to MySQL Migration Utility for Smart Real-Time Project Team Finder System.
Transfers all records from SQLite to MySQL with foreign key integrity.
"""

import os
import sys
import sqlite3
import pymysql
from pymysql.cursors import DictCursor
from dotenv import load_dotenv

load_dotenv()

MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "college_portal")
SQLITE_FILE = os.getenv("DB_FILE", "portal.sqlite")


def migrate():
    sqlite_path = SQLITE_FILE
    if not os.path.isabs(sqlite_path):
        # Look in workspace, server folder, etc.
        candidates = [
            sqlite_path,
            os.path.join(os.path.dirname(__file__), "..", sqlite_path),
            os.path.join(os.path.dirname(__file__), "..", "team", "server", sqlite_path),
        ]
        for c in candidates:
            if os.path.exists(c):
                sqlite_path = c
                break

    if not os.path.exists(sqlite_path):
        print(f"ℹ️ No SQLite database file found at '{sqlite_path}'. Nothing to transfer.")
        return True

    print(f"📦 Found SQLite source database: {sqlite_path}")
    print(f"🔌 Connecting to MySQL database '{MYSQL_DATABASE}' at {MYSQL_HOST}:{MYSQL_PORT}...")

    try:
        mysql_conn = pymysql.connect(
            host=MYSQL_HOST,
            port=MYSQL_PORT,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DATABASE,
            cursorclass=DictCursor,
            autocommit=False
        )
    except Exception as e:
        print(f"❌ Failed to connect to MySQL: {e}")
        return False

    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row
    sq_cur = sqlite_conn.cursor()
    my_cur = mysql_conn.cursor()

    tables = [
        "users",
        "student_profiles",
        "faculty_profiles",
        "teams",
        "team_members",
        "team_join_requests",
        "projects",
        "project_members",
        "faculty_assignments",
        "change_requests",
        "notifications",
        "notification_reads",
        "chat_groups",
        "chat_group_members",
        "messages"
    ]

    try:
        # Disable foreign key checks during migration
        my_cur.execute("SET FOREIGN_KEY_CHECKS = 0;")

        for table in tables:
            # Check if table exists in SQLite
            sq_cur.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
            if not sq_cur.fetchone():
                print(f"  - Skipping {table} (not in SQLite)")
                continue

            sq_cur.execute(f"SELECT * FROM {table}")
            rows = sq_cur.fetchall()
            if not rows:
                print(f"  - Table {table}: 0 rows")
                continue

            # Clear existing MySQL table rows
            my_cur.execute(f"DELETE FROM {table};")

            columns = [col[0] for col in sq_cur.description]
            placeholders = ", ".join(["%s"] * len(columns))
            cols_str = ", ".join([f"`{c}`" for c in columns])
            insert_sql = f"INSERT INTO {table} ({cols_str}) VALUES ({placeholders})"

            row_tuples = [tuple(r[c] for c in columns) for r in rows]
            my_cur.executemany(insert_sql, row_tuples)
            print(f"  ✅ Migrated {len(rows)} records into table `{table}`")

        my_cur.execute("SET FOREIGN_KEY_CHECKS = 1;")
        mysql_conn.commit()
        print("🎉 SQLite to MySQL Migration finished successfully!")
        return True

    except Exception as e:
        mysql_conn.rollback()
        print(f"❌ Error during migration: {e}")
        return False
    finally:
        sqlite_conn.close()
        mysql_conn.close()


if __name__ == "__main__":
    success = migrate()
    sys.exit(0 if success else 1)
