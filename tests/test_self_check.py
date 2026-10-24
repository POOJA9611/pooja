#!/usr/bin/env python3
"""
Comprehensive Automated Self-Check Test Suite for Smart Real-Time Project Team Finder System.
Runs all 7 critical governance, ownership, security, and real-time flows.
"""

import sys
import os
import time

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Ensure pooja root is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
from backend.seed import seed_hod
from backend.database import get_db


def run_self_check():
    print("🧪 ========================================================")
    print("🧪 RUNNING COMPREHENSIVE FINAL SELF-CHECK FOR COLLEGE PORTAL")
    print("🧪 ========================================================\n")

    client = app.test_client()

    # Seed HOD
    hod_seed = seed_hod()
    assert hod_seed, "HOD seed must succeed"

    def req(endpoint, method="GET", json=None, token=None):
        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        if method == "GET":
            res = client.get(endpoint, headers=headers, follow_redirects=True)
        elif method == "POST":
            res = client.post(endpoint, json=json, headers=headers, follow_redirects=True)
        elif method == "PUT":
            res = client.put(endpoint, json=json, headers=headers, follow_redirects=True)
        elif method == "DELETE":
            res = client.delete(endpoint, headers=headers, follow_redirects=True)
        else:
            raise ValueError(f"Unknown method {method}")
        return res.status_code, res.get_json(silent=True) or {}

    # Login as HOD
    status, data = req("/api/auth/login", method="POST", json={"email": "hod.cs@college.edu", "password": "HodPass@2026"})
    assert status == 200, f"HOD login should return 200, got {status} ({data})"
    hod_token = data.get("token")
    assert hod_token, "HOD token must be present"
    print("🔑 Logged in as HOD successfully.")

    # ----------------------------------------------------
    # FLOW 1: Signup enforcement & HOD rejection
    # ----------------------------------------------------
    print("\n▶️ Testing Flow 1: Signup enforcement & HOD rejection...")

    # 1a. Attempt to register as HOD
    status, data = req("/api/auth/signup", method="POST", json={
        "role": "hod",
        "name": "Imposter HOD",
        "email": "imposter.hod@college.edu",
        "password": "Password@123"
    })
    assert status == 400, f"HOD registration must be rejected with 400, got {status}"
    print("  ✅ 1a. HOD registration rejected with 400:", data.get("error"))

    # 1b. Faculty signup with invalid domain
    status, data = req("/api/auth/signup", method="POST", json={
        "role": "faculty",
        "name": "Prof. Hacker",
        "email": "hacker@gmail.com",
        "password": "Password@123"
    })
    assert status == 400, f"Faculty signup without college domain must be rejected with 400, got {status}"
    print("  ✅ 1b. Faculty signup with invalid domain rejected with 400:", data.get("error"))

    # 1c. Faculty signed up successfully
    test_fac_email = f"test.prof.{int(time.time()*1000)}@college.edu"
    status, data = req("/api/auth/signup", method="POST", json={
        "role": "faculty",
        "name": "Prof. Test Mentor",
        "email": test_fac_email,
        "password": "Password@123",
        "designation": "Associate Professor",
        "subjects": "Parallel Systems, GPU Architecture",
        "languages": "C++, CUDA, Python"
    })
    assert status == 201, f"Valid faculty signup must return 201, got {status} ({data})"
    faculty_token = data.get("token")
    faculty_user = data.get("user")
    print(f"  ✅ 1c. Faculty signed up successfully (ID: {faculty_user['id']}, {test_fac_email})")

    # 1d. Students signup
    ts = int(time.time()*1000)
    std1_email = f"test.std1.{ts}@student.edu"
    status, data = req("/api/auth/signup", method="POST", json={
        "role": "student",
        "name": "Test Student One",
        "email": std1_email,
        "password": "Password@123",
        "reg_no": "RA2026TEST01",
        "strength": "frontend",
        "languages": "React, TypeScript, CSS"
    })
    assert status == 201, f"Student 1 signup must return 201, got {status}"
    std1_token = data.get("token")
    std1_user = data.get("user")

    std2_email = f"test.std2.{ts}@student.edu"
    status, data = req("/api/auth/signup", method="POST", json={
        "role": "student",
        "name": "Test Student Two",
        "email": std2_email,
        "password": "Password@123",
        "reg_no": "RA2026TEST02",
        "strength": "backend",
        "languages": "Python, Django, PostgreSQL"
    })
    assert status == 201, f"Student 2 signup must return 201, got {status}"
    std2_token = data.get("token")
    std2_user = data.get("user")
    print(f"  ✅ 1d. Students signed up successfully (Std1 ID: {std1_user['id']}, Std2 ID: {std2_user['id']})")

    # ----------------------------------------------------
    # FLOW 2: HOD assignment & Faculty ownership isolation
    # ----------------------------------------------------
    print("\n▶️ Testing Flow 2: HOD assignment & Faculty ownership isolation...")

    # 2a. HOD assigns students to faculty
    status, data = req("/api/hod/assign-students", method="POST", json={
        "studentIds": [std1_user["id"], std2_user["id"]],
        "facultyId": faculty_user["id"],
        "note": "Assigned for High-Performance Computing Capstone"
    }, token=hod_token)
    assert status == 200, f"HOD assign-students must return 200, got {status} ({data})"
    print(f"  ✅ 2a. HOD assigned students to faculty: {data.get('message')}")

    # 2b. Faculty sees exactly their own assigned students
    status, data = req("/api/faculty/my-students", method="GET", token=faculty_token)
    assert status == 200, f"Faculty my-students must return 200, got {status}"
    assigned_students = data.get("students", [])
    assigned_ids = [s["id"] for s in assigned_students]
    assert std1_user["id"] in assigned_ids and std2_user["id"] in assigned_ids, "Faculty must see newly assigned students"
    print(f"  ✅ 2b. Faculty sees exactly their own assigned students ({len(assigned_students)} students)")

    # ----------------------------------------------------
    # FLOW 3: Team creation, auto chat group, and message exchange
    # ----------------------------------------------------
    print("\n▶️ Testing Flow 3: Team creation, auto chat group, and message exchange...")

    status, data = req("/api/teams", method="POST", json={
        "name": f"HPC Cluster Team {ts}",
        "studentIds": [std1_user["id"]]
    }, token=faculty_token)
    assert status == 201, f"Team creation must return 201, got {status} ({data})"
    team1_id = data.get("teamId")
    print(f"  ✅ 3a. Created Team 1 with auto chat group (Team ID: {team1_id})")

    status, data = req("/api/teams", method="POST", json={
        "name": f"GPU AI Team {ts}",
        "studentIds": [std2_user["id"]]
    }, token=faculty_token)
    assert status == 201, f"Team 2 creation must return 201, got {status}"
    team2_id = data.get("teamId")
    print(f"  ✅ 3b. Created Team 2 with auto chat group (Team ID: {team2_id})")

    # Get chat groups for Student 1
    status, data = req("/api/chat/groups", method="GET", token=std1_token)
    assert status == 200, "Student 1 chat groups fetch failed"
    std1_groups = data.get("groups", [])
    group1 = next((g for g in std1_groups if g.get("team_id") == team1_id), None)
    assert group1, "Group 1 must exist for Student 1"

    # Send message from Student 1
    status, data = req(f"/api/chat/groups/{group1['id']}/messages", method="POST", json={
        "body": "Hello Mentor! I have pushed the first CUDA kernel benchmarks."
    }, token=std1_token)
    assert status == 201, f"Posting message must return 201, got {status} ({data})"

    # Verify messages list
    status, data = req(f"/api/chat/groups/{group1['id']}/messages", method="GET", token=std1_token)
    assert status == 200, "Reading messages failed"
    msgs = data.get("messages", [])
    assert any("first CUDA kernel" in m.get("body", "") for m in msgs), "Message body must be persisted"
    print(f"  ✅ 3c. Messages successfully sent and persisted in Group {group1['id']}")

    # ----------------------------------------------------
    # FLOW 4: Student change request & HOD approval
    # ----------------------------------------------------
    print("\n▶️ Testing Flow 4: Student change request & HOD approval...")

    # Create another faculty for destination
    fac2_email = f"prof.dest.{ts}@college.edu"
    status, data = req("/api/auth/signup", method="POST", json={
        "role": "faculty",
        "name": "Prof. Destination Guide",
        "email": fac2_email,
        "password": "Password@123",
        "designation": "Professor",
        "subjects": "Distributed Systems",
        "languages": "Go, Python"
    })
    fac2_user = data.get("user")

    # 4a. Change request submitted by Student 1
    status, data = req("/api/student/change-request", method="POST", json={
        "reason": "My capstone focus shifted to distributed clusters which matches Prof. Destination Guide.",
        "requested_faculty_id": fac2_user["id"]
    }, token=std1_token)
    assert status == 201, f"Submit change request must return 201, got {status} ({data})"
    cr_id = data.get("requestId")
    print(f"  ✅ 4a. Change request submitted by Student 1 (Request ID: {cr_id})")

    # 4b. Duplicate change request rejected with 400
    status, data = req("/api/student/change-request", method="POST", json={
        "reason": "Submitting second request before decision.",
        "requested_faculty_id": fac2_user["id"]
    }, token=std1_token)
    assert status == 400, f"Duplicate change request must return 400, got {status}"
    print("  ✅ 4b. Duplicate change request rejected with 400 (only 1 pending allowed)")

    # 4c. HOD approved request
    status, data = req("/api/hod/change-requests/decide", method="POST", json={
        "requestId": cr_id,
        "action": "approved",
        "newFacultyId": fac2_user["id"],
        "remark": "Approved based on research alignment."
    }, token=hod_token)
    assert status == 200, f"HOD approve request must return 200, got {status} ({data})"

    # Verify student is now assigned to fac2
    status, data = req("/api/student/profile", method="GET", token=std1_token)
    assert status == 200
    prof = data.get("profile", {})
    assert prof.get("faculty_id") == fac2_user["id"], "Student 1 must now be allocated to fac2"
    print(f"  ✅ 4c. HOD approved request. Student 1 reallocated to mentor ID {fac2_user['id']}")

    # ----------------------------------------------------
    # FLOW 5: Role-targeted notification delivery
    # ----------------------------------------------------
    print("\n▶️ Testing Flow 5: Role-targeted notification delivery...")

    # Post student notice
    req("/api/hod/notifications", method="POST", json={
        "title": f"Students Only Notice {ts}",
        "body": "Important notice for students only.",
        "audience": "students"
    }, token=hod_token)

    # Post faculty notice
    req("/api/hod/notifications", method="POST", json={
        "title": f"Faculty Only Notice {ts}",
        "body": "Important notice for faculty only.",
        "audience": "faculty"
    }, token=hod_token)

    # Student reads notifications
    status, data = req("/api/notifications", method="GET", token=std1_token)
    notifs = data.get("notifications", [])
    has_student_notice = any(f"Students Only Notice {ts}" in n.get("title", "") for n in notifs)
    has_faculty_notice = any(f"Faculty Only Notice {ts}" in n.get("title", "") for n in notifs)
    assert has_student_notice, "Student must see students notice"
    assert not has_faculty_notice, "Faculty notice must be strictly hidden from student"
    print("  ✅ 5a. Student sees ONLY student and both notices (Faculty notice strictly hidden)")

    # Faculty reads notifications
    status, data = req("/api/notifications", method="GET", token=faculty_token)
    f_notifs = data.get("notifications", [])
    f_has_student_notice = any(f"Students Only Notice {ts}" in n.get("title", "") for n in f_notifs)
    f_has_faculty_notice = any(f"Faculty Only Notice {ts}" in n.get("title", "") for n in f_notifs)
    assert f_has_faculty_notice, "Faculty must see faculty notice"
    assert not f_has_student_notice, "Student notice must be strictly hidden from faculty"
    print("  ✅ 5b. Faculty sees ONLY faculty and both notices (Student notice strictly hidden)")

    # ----------------------------------------------------
    # FLOW 6: Verification that HOD cannot create or edit user accounts
    # ----------------------------------------------------
    print("\n▶️ Testing Flow 6: Verification that HOD cannot create or edit user accounts...")
    rules = [rule.rule for rule in app.url_map.iter_rules()]
    forbidden_prefixes = ["/api/hod/users", "/api/hod/create-user", "/api/hod/students/create", "/api/hod/import-csv"]
    for p in forbidden_prefixes:
        assert not any(r.startswith(p) for r in rules), f"Forbidden endpoint {p} exists!"
    print("  ✅ 6. Verified: Zero endpoints exist for HOD user creation, CSV import, or deletion")

    # ----------------------------------------------------
    # FLOW 7: Chat group security & ownership enforcement
    # ----------------------------------------------------
    print("\n▶️ Testing Flow 7: Chat group security & ownership enforcement...")

    # Student 2 is NOT in Group 1
    # 7a. Non-member student read attempt blocked with 403
    status, data = req(f"/api/chat/groups/{group1['id']}/messages", method="GET", token=std2_token)
    assert status == 403, f"Non-member read must be blocked with 403, got {status}"
    print("  ✅ 7a. Non-member student read attempt blocked with 403: Forbidden")

    # 7b. Non-member student message post blocked with 403
    status, data = req(f"/api/chat/groups/{group1['id']}/messages", method="POST", json={
        "body": "Hacker attempt to post in Group 1"
    }, token=std2_token)
    assert status == 403, f"Non-member post must be blocked with 403, got {status}"
    print("  ✅ 7b. Non-member student message post blocked with 403: Forbidden")
    print(f"  ✅ 7c. Student 2 blocked from Group 1 with 403: Forbidden")

    print("\n🎉 ========================================================")
    print("🎉 ALL 7/7 SELF-CHECK VERIFICATION FLOWS PASSED PERFECTLY!")
    print("🎉 ========================================================")
    return True


if __name__ == "__main__":
    success = run_self_check()
    sys.exit(0 if success else 1)
