import re
import os
import html

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
LINKEDIN_REGEX = re.compile(r"^https?://(www\.)?linkedin\.com/(in|company)/[a-zA-Z0-9_\-./]+/?$", re.IGNORECASE)
GITHUB_REGEX = re.compile(r"^https?://(www\.)?github\.com/[a-zA-Z0-9_\-./]+/?$", re.IGNORECASE)


def sanitize_string(s: str) -> str:
    if not isinstance(s, str):
        return ""
    return html.escape(s.strip())


def validate_email(email: str) -> bool:
    if not email or not isinstance(email, str):
        return False
    return bool(EMAIL_REGEX.match(email.strip()))


def validate_faculty_email_domain(email: str) -> bool:
    if not validate_email(email):
        return False
    configured_domain = os.getenv("FACULTY_EMAIL_DOMAIN", "@college.edu").lower().strip()
    lower_email = email.strip().lower()
    if configured_domain.startswith("@"):
        return lower_email.endswith(configured_domain)
    return lower_email.endswith(f"@{configured_domain}")


def validate_linkedin_url(url: str) -> bool:
    if not url:
        return True  # Optional
    if not isinstance(url, str):
        return False
    trimmed = url.strip()
    if trimmed == "":
        return True
    return bool(LINKEDIN_REGEX.match(trimmed))


def validate_github_url(url: str) -> bool:
    if not url:
        return True  # Optional
    if not isinstance(url, str):
        return False
    trimmed = url.strip()
    if trimmed == "":
        return True
    return bool(GITHUB_REGEX.match(trimmed))


def validate_strength(strength: str) -> bool:
    return strength in ("frontend", "backend", "fullstack")


def validate_audience(audience: str) -> bool:
    return audience in ("students", "faculty", "both", "user")
