"""
Genuine Recommendation & Compatibility Engine for Smart Real-Time Project Team Finder System.
Calculates mathematical match percentages based on actual database records.
"""

import re
import math


def tokenize(s: str):
    if not s or not isinstance(s, str):
        return []
    parts = re.split(r"[,/;|\n\r]+", s.lower())
    return [p.strip() for p in parts if p.strip()]


def calculate_student_team_match(student: dict, team: dict, team_members=None, student_active_teams_count=0):
    if team_members is None:
        team_members = []

    if not student or not team:
        return {"score": 0, "explanation": "Incomplete student profile or team data."}

    student_langs_str = student.get("languages") or ""
    profile_incomplete = len(student_langs_str.strip()) == 0

    # 1. Technical skills match (40%)
    req_skills = tokenize(team.get("required_skills") or "")
    student_strength = (student.get("strength") or "").lower()
    skill_match_ratio = 0.0

    if not req_skills:
        skill_match_ratio = 0.8  # Baseline if no specific skills specified
    else:
        matched_count = 0.0
        for req in req_skills:
            if student_strength == "fullstack":
                if any(k in req for k in ("front", "back", "full", "web")):
                    matched_count += 1.0
                else:
                    matched_count += 0.5
            elif student_strength == "frontend":
                if any(k in req for k in ("front", "ui", "ux", "web", "client")):
                    matched_count += 1.0
            elif student_strength == "backend":
                if any(k in req for k in ("back", "api", "db", "database", "devops", "server")):
                    matched_count += 1.0

        skill_match_ratio = min(1.0, matched_count / len(req_skills))

    skill_score = skill_match_ratio * 40.0

    # 2. Technology / Language match (25%)
    team_tech = tokenize(team.get("technologies") or "")
    student_langs = tokenize(student_langs_str)
    matched_tech = []
    missing_tech = []

    for tech in team_tech:
        found = any(tech in lang or lang in tech for lang in student_langs)
        if found:
            matched_tech.append(tech)
        else:
            missing_tech.append(tech)

    tech_match_ratio = (len(matched_tech) / len(team_tech)) if team_tech else 0.7
    tech_score = min(1.0, tech_match_ratio) * 25.0

    # 3. Domain or interest match (15%)
    domain = (team.get("domain") or "").lower()
    student_bio = (student.get("bio") or "").lower()
    student_dept = (student.get("department") or "").lower()
    domain_ratio = 0.3  # baseline department match

    if domain and student_bio:
        domain_words = tokenize(domain)
        has_domain_keyword = any(w in student_bio or domain in w for w in domain_words)
        if has_domain_keyword:
            domain_ratio = 1.0
        elif any(k in student_dept for k in ("computer", "science", "ai")):
            domain_ratio = 0.75
    elif domain:
        domain_ratio = 0.6

    domain_score = domain_ratio * 15.0

    # 4. Availability & commitment (10%)
    availability_ratio = 1.0 if student_active_teams_count == 0 else 0.2
    availability_score = availability_ratio * 10.0

    # 5. Complementary skills needed by team (10%)
    complementary_ratio = 0.5
    if team_members:
        existing_strengths = [(m.get("strength") or "").lower() for m in team_members]
        has_backend = any(s in ("backend", "fullstack") for s in existing_strengths)
        has_frontend = any(s in ("frontend", "fullstack") for s in existing_strengths)

        if student_strength == "backend" and not has_backend:
            complementary_ratio = 1.0
        elif student_strength == "frontend" and not has_frontend:
            complementary_ratio = 1.0
        elif student_strength == "fullstack":
            complementary_ratio = 0.9
        else:
            complementary_ratio = 0.6
    else:
        complementary_ratio = 0.8

    complementary_score = complementary_ratio * 10.0

    total_score = min(100, max(10, round(skill_score + tech_score + domain_score + availability_score + complementary_score)))

    # Explanation
    if profile_incomplete:
        explanation = "Profile is missing languages/skills. Complete your profile for higher accuracy."
    elif total_score >= 80:
        matched_list = ", ".join([t.capitalize() for t in matched_tech[:3]])
        explanation = (
            f"Strong match: {matched_list} skills align with project requirements and your {student_strength} focus fits team needs."
            if matched_list else
            f"Strong match: Your {student_strength} background and domain knowledge align closely with this capstone project."
        )
    elif total_score >= 60:
        missing = missing_tech[0].capitalize() if missing_tech else "some tech stack requirements"
        explanation = f"Partial match: Good domain knowledge, but {missing} may require learning on the project."
    else:
        explanation = f"Complementary match: Team has openings and your {student_strength or 'technical'} profile can contribute to the objectives."

    return {
        "score": total_score,
        "explanation": explanation,
        "matchedTech": matched_tech,
        "missingTech": missing_tech,
        "skillScore": round(skill_score),
        "techScore": round(tech_score),
        "domainScore": round(domain_score),
        "availabilityScore": round(availability_score),
        "complementaryScore": round(complementary_score)
    }


def calculate_faculty_mentor_match(faculty: dict, project: dict, active_mentored_count=0):
    if not faculty or not project:
        return {"score": 0, "explanation": "Incomplete data for mentor evaluation."}

    faculty_subjects = tokenize(faculty.get("subjects") or "")
    faculty_langs = tokenize(faculty.get("languages") or "")
    faculty_bio = (faculty.get("bio") or "").lower()
    project_domain = (project.get("domain") or "").lower()
    project_tech = tokenize(project.get("technologies") or "")

    # 1. Domain match (45%)
    domain_matched_count = 0.0
    domain_words = tokenize(project_domain)
    for subject in faculty_subjects:
        if any(dw in subject or subject in dw for dw in domain_words):
            domain_matched_count += 1.5
        elif subject in faculty_bio and any(dw in faculty_bio for dw in domain_words):
            domain_matched_count += 1.0

    domain_ratio = min(1.0, domain_matched_count / max(1, len(domain_words))) if faculty_subjects else 0.5
    domain_score = min(45.0, max(10.0, domain_ratio * 45.0))

    # 2. Technology match (30%)
    matched_tech = []
    for tech in project_tech:
        found = any(tech in fl or fl in tech for fl in faculty_langs)
        if found:
            matched_tech.append(tech)

    tech_ratio = (len(matched_tech) / len(project_tech)) if project_tech else 0.6
    tech_score = min(30.0, max(5.0, tech_ratio * 30.0))

    # 3. Workload / Availability (25%)
    workload_score = 25
    if active_mentored_count == 1:
        workload_score = 21
    elif active_mentored_count == 2:
        workload_score = 16
    elif active_mentored_count >= 3:
        workload_score = 10

    total_score = min(99, max(35, round(domain_score + tech_score + workload_score)))

    top_subject = faculty_subjects[0] if faculty_subjects else faculty.get("department", "Computer Science")
    tech_str = ", ".join([t.capitalize() for t in matched_tech[:2]])
    explanation = f"{total_score}% Compatibility — "

    if matched_tech:
        explanation += f"Specialization in {top_subject}; verified skills in {tech_str}; currently guiding {active_mentored_count} team(s)."
    else:
        explanation += f"Research expertise in {top_subject}; available mentoring capacity ({active_mentored_count} current teams)."

    return {
        "score": total_score,
        "explanation": explanation,
        "domainScore": round(domain_score),
        "techScore": round(tech_score),
        "workloadScore": workload_score,
        "activeMentoredCount": active_mentored_count,
        "matchedTech": matched_tech
    }
