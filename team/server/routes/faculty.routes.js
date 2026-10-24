import express from 'express';
import { getDb } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validateLinkedInUrl, sanitizeString } from '../utils/validators.js';

const router = express.Router();

// Enforce FACULTY role across all routes in this router
router.use(authenticateToken, requireRole('faculty'));

/**
 * 1. "My Students": List ONLY students assigned to THIS faculty member
 * Includes student profile, strengths, languages, and their ongoing & completed projects.
 */
router.get('/my-students', async (req, res) => {
  try {
    const db = await getDb();
    const facultyId = req.user.id;

    // Strict ownership: faculty_id = facultyId
    const students = await db.all(
      `SELECT u.id, u.name, u.email, u.avatar,
              sp.reg_no, sp.department, sp.semester, sp.cgpa, sp.bio,
              sp.strength, sp.languages, sp.linkedin_url, sp.github_url
       FROM users u
       JOIN student_profiles sp ON u.id = sp.user_id
       WHERE sp.faculty_id = ?
       ORDER BY u.name ASC`,
      [facultyId]
    );

    // Fetch projects for each assigned student
    for (const student of students) {
      const studentProjects = await db.all(
        `SELECT p.id, p.title, p.description, p.status, p.team_id, t.name as team_name
         FROM projects p
         JOIN project_members pm ON p.id = pm.project_id
         LEFT JOIN teams t ON p.team_id = t.id
         WHERE pm.student_id = ?
         ORDER BY p.status DESC, p.created_at DESC`,
        [student.id]
      );
      student.projects = studentProjects;
    }

    return res.json({ students });
  } catch (error) {
    console.error('Faculty my-students error:', error);
    return res.status(500).json({ error: 'Failed to retrieve assigned students.' });
  }
});

/**
 * 2. Get Faculty's Own Profile
 */
router.get('/profile', async (req, res) => {
  try {
    const db = await getDb();
    const profile = await db.get(
      `SELECT u.id, u.name, u.email, u.avatar,
              fp.designation, fp.department, fp.bio, fp.subjects, fp.languages, fp.linkedin_url
       FROM users u
       JOIN faculty_profiles fp ON u.id = fp.user_id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (!profile) {
      return res.status(404).json({ error: 'Faculty profile not found.' });
    }

    return res.json({ profile });
  } catch (error) {
    console.error('Get faculty profile error:', error);
    return res.status(500).json({ error: 'Failed to fetch faculty profile.' });
  }
});

/**
 * 3. Update Faculty's Own Profile
 * Basic info, subjects, programming languages known, LinkedIn URL.
 */
router.put('/profile', async (req, res) => {
  try {
    const { name, avatar, designation, department, bio, subjects, languages, linkedin_url } = req.body;

    if (linkedin_url && !validateLinkedInUrl(linkedin_url)) {
      return res.status(400).json({ error: 'Invalid LinkedIn URL format.' });
    }

    const db = await getDb();
    const facultyId = req.user.id;

    if (name) {
      await db.run(
        `UPDATE users SET name = ?, avatar = COALESCE(?, avatar) WHERE id = ?`,
        [name.trim(), avatar || null, facultyId]
      );
    }

    await db.run(
      `UPDATE faculty_profiles
       SET designation = COALESCE(?, designation),
           department = COALESCE(?, department),
           bio = COALESCE(?, bio),
           subjects = COALESCE(?, subjects),
           languages = COALESCE(?, languages),
           linkedin_url = COALESCE(?, linkedin_url)
       WHERE user_id = ?`,
      [
        designation ? designation.trim() : null,
        department ? department.trim() : null,
        bio ? bio.trim() : null,
        subjects ? subjects.trim() : null,
        languages ? languages.trim() : null,
        linkedin_url ? linkedin_url.trim() : null,
        facultyId
      ]
    );

    const updatedProfile = await db.get(
      `SELECT u.id, u.name, u.email, u.avatar,
              fp.designation, fp.department, fp.bio, fp.subjects, fp.languages, fp.linkedin_url
       FROM users u
       JOIN faculty_profiles fp ON u.id = fp.user_id
       WHERE u.id = ?`,
      [facultyId]
    );

    return res.json({
      message: 'Profile updated successfully.',
      profile: updatedProfile
    });
  } catch (error) {
    console.error('Update faculty profile error:', error);
    return res.status(500).json({ error: 'Failed to update faculty profile.' });
  }
});

export default router;
