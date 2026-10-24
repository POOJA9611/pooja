import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { getDb } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { handleAvatarUpload } from '../middleware/upload.js';
import {
  validateLinkedInUrl,
  validateGitHubUrl,
  validateStrength,
  sanitizeString
} from '../utils/validators.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsBaseDir = path.resolve(__dirname, '../uploads');

const router = express.Router();

// Enforce STUDENT role across routes in this router (except public faculty viewing which any authenticated student can access)
router.use(authenticateToken);

/**
 * 1. Get Student's Own Profile
 * Includes academic info, assigned faculty, and projects
 */
router.get('/profile', requireRole('student'), async (req, res) => {
  try {
    const db = await getDb();
    const studentId = req.user.id;

    const profile = await db.get(
      `SELECT sp.*, u.name, u.email, u.avatar,
              f.id as faculty_id, f.name as faculty_name, f.email as faculty_email,
              fp.designation as faculty_designation, fp.department as faculty_department,
              fp.subjects as faculty_subjects, fp.linkedin_url as faculty_linkedin
       FROM users u
       JOIN student_profiles sp ON u.id = sp.user_id
       LEFT JOIN users f ON sp.faculty_id = f.id
       LEFT JOIN faculty_profiles fp ON f.id = fp.user_id
       WHERE u.id = ?`,
      [studentId]
    );

    if (!profile) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    // Get student's projects (ongoing and completed)
    const projects = await db.all(
      `SELECT p.id, p.title, p.description, p.status, p.created_at, p.team_id, t.name as team_name
       FROM projects p
       JOIN project_members pm ON p.id = pm.project_id
       LEFT JOIN teams t ON p.team_id = t.id
       WHERE pm.student_id = ?
       ORDER BY p.status DESC, p.created_at DESC`,
      [studentId]
    );

    // Get student's change request history / active pending status
    const changeRequests = await db.all(
      `SELECT cr.*, cf.name as current_faculty_name, rf.name as requested_faculty_name
       FROM change_requests cr
       JOIN users cf ON cr.current_faculty_id = cf.id
       LEFT JOIN users rf ON cr.requested_faculty_id = rf.id
       WHERE cr.student_id = ?
       ORDER BY cr.created_at DESC`,
      [studentId]
    );

    const hasPendingRequest = changeRequests.some((r) => r.status === 'pending');

    return res.json({
      profile,
      projects,
      changeRequests,
      hasPendingRequest
    });
  } catch (error) {
    console.error('Student profile error:', error);
    return res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

/**
 * 2. Update Student's Own Profile
 */
router.put('/profile', requireRole('student'), async (req, res) => {
  try {
    const {
      name,
      email,
      avatar,
      bio,
      strength,
      languages,
      linkedin_url,
      github_url,
      semester,
      cgpa,
      username,
      location,
      website_url,
      headline,
      technical_skills,
      frameworks,
      experience_level,
      college,
      education,
      interests,
      achievements,
      availability_status
    } = req.body;

    if (linkedin_url && !validateLinkedInUrl(linkedin_url)) {
      return res.status(400).json({ error: 'Invalid LinkedIn URL format. Must start with https:// or http://' });
    }

    if (github_url && !validateGitHubUrl(github_url)) {
      return res.status(400).json({ error: 'Invalid GitHub URL format. Must start with https:// or http://' });
    }

    if (strength && !validateStrength(strength)) {
      return res.status(400).json({ error: 'Invalid strength value. Must be frontend, backend, or fullstack.' });
    }

    const db = await getDb();
    const studentId = req.user.id;

    if (email && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      const existingUser = await db.get(
        `SELECT id FROM users WHERE email = ? AND id != ?`,
        [cleanEmail, studentId]
      );
      if (existingUser) {
        return res.status(400).json({ error: 'Email address is already in use by another user.' });
      }
    }

    if (name || email || avatar) {
      await db.run(
        `UPDATE users
         SET name = COALESCE(?, name),
             email = COALESCE(?, email),
             avatar = COALESCE(?, avatar)
         WHERE id = ?`,
        [
          name ? name.trim() : null,
          email ? email.trim().toLowerCase() : null,
          avatar || null,
          studentId
        ]
      );
    }

    await db.run(
      `UPDATE student_profiles
       SET bio = COALESCE(?, bio),
           strength = COALESCE(?, strength),
           languages = COALESCE(?, languages),
           linkedin_url = COALESCE(?, linkedin_url),
           github_url = COALESCE(?, github_url),
           semester = COALESCE(?, semester),
           cgpa = COALESCE(?, cgpa),
           username = COALESCE(?, username),
           location = COALESCE(?, location),
           website_url = COALESCE(?, website_url),
           headline = COALESCE(?, headline),
           technical_skills = COALESCE(?, technical_skills),
           frameworks = COALESCE(?, frameworks),
           experience_level = COALESCE(?, experience_level),
           college = COALESCE(?, college),
           education = COALESCE(?, education),
           interests = COALESCE(?, interests),
           achievements = COALESCE(?, achievements),
           availability_status = COALESCE(?, availability_status)
       WHERE user_id = ?`,
      [
        bio !== undefined && bio !== null ? bio.trim() : null,
        strength || null,
        languages !== undefined && languages !== null ? languages.trim() : null,
        linkedin_url !== undefined && linkedin_url !== null ? linkedin_url.trim() : null,
        github_url !== undefined && github_url !== null ? github_url.trim() : null,
        semester !== undefined && semester !== null ? parseInt(semester, 10) : null,
        cgpa !== undefined && cgpa !== null ? parseFloat(cgpa) : null,
        username !== undefined && username !== null ? username.trim() : null,
        location !== undefined && location !== null ? location.trim() : null,
        website_url !== undefined && website_url !== null ? website_url.trim() : null,
        headline !== undefined && headline !== null ? headline.trim() : null,
        technical_skills !== undefined && technical_skills !== null ? technical_skills.trim() : null,
        frameworks !== undefined && frameworks !== null ? frameworks.trim() : null,
        experience_level || null,
        college !== undefined && college !== null ? college.trim() : null,
        education !== undefined && education !== null ? education.trim() : null,
        interests !== undefined && interests !== null ? interests.trim() : null,
        achievements !== undefined && achievements !== null ? achievements.trim() : null,
        availability_status || null,
        studentId
      ]
    );

    return res.json({ message: 'Profile updated successfully.' });
  } catch (error) {
    console.error('Update student profile error:', error);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

/**
 * 2b. Upload Profile Avatar (Multipart)
 */
router.post('/profile/avatar', requireRole('student'), handleAvatarUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded.' });
    }

    const db = await getDb();
    const studentId = req.user.id;
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Safely remove previous local avatar file if it exists
    const currentUser = await db.get(`SELECT avatar FROM users WHERE id = ?`, [studentId]);
    if (currentUser && currentUser.avatar && currentUser.avatar.startsWith('/uploads/avatars/')) {
      const oldFilename = path.basename(currentUser.avatar);
      const oldFilePath = path.join(uploadsBaseDir, 'avatars', oldFilename);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch (err) {
          console.warn('Failed to delete old avatar file:', err.message);
        }
      }
    }

    await db.run(`UPDATE users SET avatar = ? WHERE id = ?`, [avatarUrl, studentId]);

    return res.json({
      message: 'Profile picture updated successfully.',
      avatarUrl
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    return res.status(500).json({ error: 'Failed to upload profile picture.' });
  }
});

/**
 * 2c. Remove Profile Avatar (Restore default)
 */
router.delete('/profile/avatar', requireRole('student'), async (req, res) => {
  try {
    const db = await getDb();
    const studentId = req.user.id;
    const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';

    const currentUser = await db.get(`SELECT avatar FROM users WHERE id = ?`, [studentId]);
    if (currentUser && currentUser.avatar && currentUser.avatar.startsWith('/uploads/avatars/')) {
      const oldFilename = path.basename(currentUser.avatar);
      const oldFilePath = path.join(uploadsBaseDir, 'avatars', oldFilename);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch (err) {
          console.warn('Failed to delete avatar file on remove:', err.message);
        }
      }
    }

    await db.run(`UPDATE users SET avatar = ? WHERE id = ?`, [defaultAvatar, studentId]);

    return res.json({
      message: 'Profile picture removed successfully.',
      avatarUrl: defaultAvatar
    });
  } catch (error) {
    console.error('Delete avatar error:', error);
    return res.status(500).json({ error: 'Failed to remove profile picture.' });
  }
});

/**
 * 3. Add a Project
 */
router.post('/projects', requireRole('student'), async (req, res) => {
  try {
    const { title, description, status, team_id } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Project title is required.' });
    }

    const projectStatus = status === 'completed' ? 'completed' : 'ongoing';
    const db = await getDb();

    const result = await db.run(
      `INSERT INTO projects (title, description, status, team_id)
       VALUES (?, ?, ?, ?)`,
      [title.trim(), description ? description.trim() : '', projectStatus, team_id || null]
    );

    const projectId = result.lastID;

    // Associate student with project
    await db.run(
      `INSERT INTO project_members (project_id, student_id)
       VALUES (?, ?)`,
      [projectId, req.user.id]
    );

    return res.status(201).json({
      message: 'Project created successfully.',
      projectId
    });
  } catch (error) {
    console.error('Create project error:', error);
    return res.status(500).json({ error: 'Failed to create project.' });
  }
});

/**
 * 4. Submit Faculty Change Request
 * Only ONE pending request allowed at a time.
 */
router.post('/change-request', requireRole('student'), async (req, res) => {
  try {
    const { reason, requested_faculty_id } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({ error: 'A clear reason for the faculty change is required.' });
    }

    const db = await getDb();
    const studentId = req.user.id;

    // Check student's current assignment
    const student = await db.get(
      `SELECT faculty_id FROM student_profiles WHERE user_id = ?`,
      [studentId]
    );

    if (!student || !student.faculty_id) {
      return res.status(400).json({
        error: 'You do not currently have an assigned faculty to request a change from.'
      });
    }

    // Check if there is already a pending request
    const existingPending = await db.get(
      `SELECT id FROM change_requests WHERE student_id = ? AND status = 'pending'`,
      [studentId]
    );

    if (existingPending) {
      return res.status(400).json({
        error: 'You already have an active pending faculty change request. Please wait for HOD decision.'
      });
    }

    // Optional requested faculty validation
    let reqFacultyId = null;
    if (requested_faculty_id) {
      const targetFaculty = await db.get(
        `SELECT id FROM users WHERE id = ? AND role = 'faculty'`,
        [requested_faculty_id]
      );
      if (targetFaculty) {
        reqFacultyId = targetFaculty.id;
      }
    }

    const cleanReason = sanitizeString(reason);

    const result = await db.run(
      `INSERT INTO change_requests (
        student_id, current_faculty_id, requested_faculty_id, reason, status
      ) VALUES (?, ?, ?, ?, 'pending')`,
      [studentId, student.faculty_id, reqFacultyId, cleanReason]
    );

    // Notify HOD in real time via socket
    const io = req.app.get('io');
    if (io) {
      io.emit('new_change_request', {
        requestId: result.lastID,
        studentId,
        studentName: req.user.name
      });
    }

    return res.status(201).json({
      message: 'Faculty change request submitted successfully to the HOD.',
      requestId: result.lastID
    });
  } catch (error) {
    console.error('Submit change request error:', error);
    return res.status(500).json({ error: 'Failed to submit faculty change request.' });
  }
});

/**
 * 5. View Faculty Profiles (Students can view all faculty profiles to decide preferences)
 */
router.get('/faculty-list', async (req, res) => {
  try {
    const db = await getDb();
    const faculty = await db.all(
      `SELECT u.id, u.name, u.email, u.avatar,
              fp.designation, fp.department, fp.bio, fp.subjects, fp.languages, fp.linkedin_url,
              (SELECT COUNT(*) FROM student_profiles WHERE faculty_id = u.id) as workload
       FROM users u
       JOIN faculty_profiles fp ON u.id = fp.user_id
       WHERE u.role = 'faculty'
       ORDER BY u.name ASC`
    );

    return res.json({ faculty });
  } catch (error) {
    console.error('Student faculty list error:', error);
    return res.status(500).json({ error: 'Failed to retrieve faculty list.' });
  }
});

/**
 * 6. Get Faculty Profile Details
 */
router.get('/faculty/:id', async (req, res) => {
  try {
    const db = await getDb();
    const faculty = await db.get(
      `SELECT u.id, u.name, u.email, u.avatar,
              fp.designation, fp.department, fp.bio, fp.subjects, fp.languages, fp.linkedin_url,
              (SELECT COUNT(*) FROM student_profiles WHERE faculty_id = u.id) as workload
       FROM users u
       JOIN faculty_profiles fp ON u.id = fp.user_id
       WHERE u.id = ? AND u.role = 'faculty'`,
      [req.params.id]
    );

    if (!faculty) {
      return res.status(404).json({ error: 'Faculty member not found.' });
    }

    return res.json({ faculty });
  } catch (error) {
    console.error('Get faculty error:', error);
    return res.status(500).json({ error: 'Failed to retrieve faculty details.' });
  }
});

export default router;
