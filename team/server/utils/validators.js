import validator from 'validator';

export function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return validator.escape(str.trim());
}

export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return validator.isEmail(email.trim());
}

export function validateFacultyEmailDomain(email) {
  if (!validateEmail(email)) return false;
  const configuredDomain = (process.env.FACULTY_EMAIL_DOMAIN || '@college.edu').toLowerCase().trim();
  const lowerEmail = email.trim().toLowerCase();
  
  if (configuredDomain.startsWith('@')) {
    return lowerEmail.endsWith(configuredDomain);
  }
  return lowerEmail.endsWith(`@${configuredDomain}`);
}

export function validateLinkedInUrl(url) {
  if (!url) return true; // Optional field
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed === '') return true;
  const regex = /^https:\/\/(www\.)?linkedin\.com\/(in|company)\/[a-zA-Z0-9_\-./]+$/i;
  return regex.test(trimmed) && validator.isURL(trimmed, { protocols: ['https'], require_protocol: true });
}

export function validateGitHubUrl(url) {
  if (!url) return true; // Optional field
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed === '') return true;
  const regex = /^https:\/\/(www\.)?github\.com\/[a-zA-Z0-9_\-./]+$/i;
  return regex.test(trimmed) && validator.isURL(trimmed, { protocols: ['https'], require_protocol: true });
}

export function validateStrength(strength) {
  return ['frontend', 'backend', 'fullstack'].includes(strength);
}

export function validateAudience(audience) {
  return ['students', 'faculty', 'both'].includes(audience);
}
