/**
 * Genuine Recommendation & Compatibility Engine
 * Calculates mathematical match percentages based on actual database records.
 */

// Helper to tokenize comma-separated or space-separated skill strings into clean lowercase words/tokens
function tokenize(str) {
  if (!str || typeof str !== 'string') return [];
  return str
    .toLowerCase()
    .split(/[,/;|\n\r]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * 1. Calculate Team Match for a Student
 * Weights:
 * - Technical skills match: 40%
 * - Technology / programming language match: 25%
 * - Project domain or interest match: 15%
 * - Availability and project commitment: 10%
 * - Complementary skills needed by team: 10%
 */
export function calculateStudentTeamMatch({ student, team, teamMembers = [], studentActiveTeamsCount = 0 }) {
  if (!student || !team) {
    return { score: 0, explanation: 'Incomplete student profile or team data.' };
  }

  const profileIncomplete = !student.languages || student.languages.trim().length === 0;

  // 1. Technical skills match (40%)
  const reqSkills = tokenize(team.required_skills || '');
  const studentStrength = (student.strength || '').toLowerCase();
  let skillMatchRatio = 0;

  if (reqSkills.length === 0) {
    skillMatchRatio = 0.8; // Baseline if no specific skills specified
  } else {
    let matchedCount = 0;
    for (const req of reqSkills) {
      if (studentStrength === 'fullstack') {
        if (req.includes('front') || req.includes('back') || req.includes('full') || req.includes('web')) {
          matchedCount += 1;
        } else {
          matchedCount += 0.5;
        }
      } else if (studentStrength === 'frontend') {
        if (req.includes('front') || req.includes('ui') || req.includes('ux') || req.includes('web') || req.includes('client')) {
          matchedCount += 1;
        }
      } else if (studentStrength === 'backend') {
        if (req.includes('back') || req.includes('api') || req.includes('db') || req.includes('database') || req.includes('devops') || req.includes('server')) {
          matchedCount += 1;
        }
      }
    }
    skillMatchRatio = Math.min(1, matchedCount / reqSkills.length);
  }
  const skillScore = skillMatchRatio * 40;

  // 2. Technology / Language match (25%)
  const teamTech = tokenize(team.technologies || '');
  const studentLangs = tokenize(student.languages || '');
  const matchedTech = [];
  const missingTech = [];

  for (const tech of teamTech) {
    const found = studentLangs.some((lang) => lang.includes(tech) || tech.includes(lang));
    if (found) {
      matchedTech.push(tech);
    } else {
      missingTech.push(tech);
    }
  }

  const techMatchRatio = teamTech.length > 0 ? matchedTech.length / teamTech.length : 0.7;
  const techScore = Math.min(1, techMatchRatio) * 25;

  // 3. Domain or interest match (15%)
  const domain = (team.domain || '').toLowerCase();
  const studentBio = (student.bio || '').toLowerCase();
  const studentDept = (student.department || '').toLowerCase();
  let domainRatio = 0.3; // baseline department match

  if (domain && studentBio.length > 0) {
    const domainWords = tokenize(domain);
    const hasDomainKeyword = domainWords.some((word) => studentBio.includes(word) || domain.includes(word));
    if (hasDomainKeyword) {
      domainRatio = 1.0;
    } else if (studentDept.includes('computer') || studentDept.includes('science') || studentDept.includes('ai')) {
      domainRatio = 0.75;
    }
  } else if (domain) {
    domainRatio = 0.6;
  }
  const domainScore = domainRatio * 15;

  // 4. Availability & commitment (10%)
  // If student has 0 active teams, 100% available; if already in team, lower availability
  const availabilityRatio = studentActiveTeamsCount === 0 ? 1.0 : 0.2;
  const availabilityScore = availabilityRatio * 10;

  // 5. Complementary skills needed by team (10%)
  // Check what existing team members have
  let complementaryRatio = 0.5;
  if (teamMembers.length > 0) {
    const existingStrengths = teamMembers.map((m) => (m.strength || '').toLowerCase());
    const hasBackend = existingStrengths.some((s) => s === 'backend' || s === 'fullstack');
    const hasFrontend = existingStrengths.some((s) => s === 'frontend' || s === 'fullstack');

    if (studentStrength === 'backend' && !hasBackend) {
      complementaryRatio = 1.0; // Fills critical gap
    } else if (studentStrength === 'frontend' && !hasFrontend) {
      complementaryRatio = 1.0; // Fills critical gap
    } else if (studentStrength === 'fullstack') {
      complementaryRatio = 0.9;
    } else {
      complementaryRatio = 0.6;
    }
  } else {
    complementaryRatio = 0.8;
  }
  const complementaryScore = complementaryRatio * 10;

  // Compute total normalized score
  const totalScore = Math.min(100, Math.max(10, Math.round(skillScore + techScore + domainScore + availabilityScore + complementaryScore)));

  // Generate dynamic, honest explanation
  let explanation = '';
  if (profileIncomplete) {
    explanation = 'Profile is missing languages/skills. Complete your profile for higher accuracy.';
  } else if (totalScore >= 80) {
    const matchedList = matchedTech.slice(0, 3).map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(', ');
    explanation = matchedList
      ? `Strong match: ${matchedList} skills align with project requirements and your ${studentStrength} focus fits team needs.`
      : `Strong match: Your ${studentStrength} background and domain knowledge align closely with this capstone project.`;
  } else if (totalScore >= 60) {
    const missing = missingTech[0] ? missingTech[0].charAt(0).toUpperCase() + missingTech[0].slice(1) : 'some tech stack requirements';
    explanation = `Partial match: Good domain knowledge, but ${missing} may require learning on the project.`;
  } else {
    explanation = `Complementary match: Team has openings and your ${studentStrength || 'technical'} profile can contribute to the objectives.`;
  }

  return {
    score: totalScore,
    explanation,
    matchedTech,
    missingTech,
    skillScore: Math.round(skillScore),
    techScore: Math.round(techScore),
    domainScore: Math.round(domainScore),
    availabilityScore: Math.round(availabilityScore),
    complementaryScore: Math.round(complementaryScore)
  };
}

/**
 * 2. Calculate Mentor Compatibility for HOD
 * Compares project's domain, technologies, and required skills against faculty's profile.
 * Weights:
 * - Domain / Specialization match: 45%
 * - Technology match: 30%
 * - Availability / Mentoring workload: 25%
 */
export function calculateFacultyMentorMatch({ faculty, project, activeMentoredCount = 0 }) {
  if (!faculty || !project) {
    return { score: 0, explanation: 'Incomplete data for mentor evaluation.' };
  }

  const facultySubjects = tokenize(faculty.subjects || '');
  const facultyLangs = tokenize(faculty.languages || '');
  const facultyBio = (faculty.bio || '').toLowerCase();
  const projectDomain = (project.domain || '').toLowerCase();
  const projectTech = tokenize(project.technologies || '');
  const projectTitle = (project.project_title || project.title || project.name || '').toLowerCase();

  // 1. Domain match (45%)
  let domainMatchedCount = 0;
  const domainWords = tokenize(projectDomain);
  for (const subject of facultySubjects) {
    if (domainWords.some((dw) => subject.includes(dw) || dw.includes(subject))) {
      domainMatchedCount += 1.5;
    } else if (facultyBio.includes(subject) && domainWords.some((dw) => facultyBio.includes(dw))) {
      domainMatchedCount += 1.0;
    }
  }
  const domainRatio = facultySubjects.length > 0 ? Math.min(1, domainMatchedCount / Math.max(1, domainWords.length)) : 0.5;
  const domainScore = Math.min(45, Math.max(10, domainRatio * 45));

  // 2. Technology match (30%)
  const matchedTech = [];
  for (const tech of projectTech) {
    const found = facultyLangs.some((fl) => fl.includes(tech) || tech.includes(fl));
    if (found) {
      matchedTech.push(tech);
    }
  }
  const techRatio = projectTech.length > 0 ? matchedTech.length / projectTech.length : 0.6;
  const techScore = Math.min(30, Math.max(5, techRatio * 30));

  // 3. Workload / Availability (25%)
  // 0 teams = 25 pts, 1 team = 21 pts, 2 teams = 16 pts, 3+ teams = 10 pts
  let workloadScore = 25;
  if (activeMentoredCount === 1) workloadScore = 21;
  else if (activeMentoredCount === 2) workloadScore = 16;
  else if (activeMentoredCount >= 3) workloadScore = 10;

  const totalScore = Math.min(99, Math.max(35, Math.round(domainScore + techScore + workloadScore)));

  // Generate dynamic explanation
  const topSubject = facultySubjects[0] || faculty.department;
  const techStr = matchedTech.slice(0, 2).map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(', ');
  let explanation = `${totalScore}% Compatibility — `;

  if (matchedTech.length > 0) {
    explanation += `Specialization in ${topSubject}; verified skills in ${techStr}; currently guiding ${activeMentoredCount} team(s).`;
  } else {
    explanation += `Research expertise in ${topSubject}; available mentoring capacity (${activeMentoredCount} current teams).`;
  }

  return {
    score: totalScore,
    explanation,
    domainScore: Math.round(domainScore),
    techScore: Math.round(techScore),
    workloadScore,
    activeMentoredCount,
    matchedTech
  };
}
