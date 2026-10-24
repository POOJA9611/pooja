import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimit.js';
import {
  validateEmail,
  validateFacultyEmailDomain,
  validateLinkedInUrl,
  validateGitHubUrl,
  validateStrength
} from '../utils/validators.js';

const router = express.Router();

// Public signup (STUDENT or FACULTY only. HOD strictly forbidden)
router.post('/signup', authRateLimiter, async (req, res) => {
  try {
    const {
      role,
      name,
      email,
      password,
      avatar,
      // Student specific
      reg_no,
      department,
      semester,
      cgpa,
      bio,
      strength,
      languages,
      linkedin_url,
      github_url,
      // Faculty specific
      designation,
      subjects
    } = req.body;

    // Strict check: HOD registration is completely forbidden via signup
    if (!role || (role !== 'student' && role !== 'faculty')) {
      return res.status(400).json({
        error: 'Invalid role selection. Only Student and Faculty accounts can register. HOD accounts cannot be registered.'
      });
    }

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters.' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Faculty college domain validation
    if (role === 'faculty') {
      if (!validateFacultyEmailDomain(cleanEmail)) {
        const domain = process.env.FACULTY_EMAIL_DOMAIN || '@college.edu';
        return res.status(400).json({
          error: `Faculty registration requires an official college domain email address (must end with ${domain}).`
        });
      }
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    if (linkedin_url && !validateLinkedInUrl(linkedin_url)) {
      return res.status(400).json({ error: 'Invalid LinkedIn URL format.' });
    }

    if (github_url && !validateGitHubUrl(github_url)) {
      return res.status(400).json({ error: 'Invalid GitHub URL format.' });
    }

    const db = await getDb();

    // Check existing email
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const defaultAvatar = avatar || (role === 'faculty'
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
      : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150');

    // Insert user
    const userResult = await db.run(
      `INSERT INTO users (role, name, email, password_hash, avatar)
       VALUES (?, ?, ?, ?, ?)`,
      [role, name.trim(), cleanEmail, passwordHash, defaultAvatar]
    );

    const userId = userResult.lastID;

    // Insert role-specific profile
    if (role === 'student') {
      const studentStrength = validateStrength(strength) ? strength : 'fullstack';
      await db.run(
        `INSERT INTO student_profiles (
          user_id, reg_no, department, semester, cgpa, bio, strength, languages, linkedin_url, github_url, faculty_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        [
          userId,
          reg_no ? reg_no.trim() : 'RA2026' + String(userId).padStart(4, '0'),
          department ? department.trim() : 'Computer Science & Engineering',
          parseInt(semester, 10) || 6,
          parseFloat(cgpa) || 8.0,
          bio ? bio.trim() : '',
          studentStrength,
          languages ? languages.trim() : 'JavaScript, Python',
          linkedin_url ? linkedin_url.trim() : '',
          github_url ? github_url.trim() : ''
        ]
      );
    } else if (role === 'faculty') {
      await db.run(
        `INSERT INTO faculty_profiles (
          user_id, designation, department, bio, subjects, languages, linkedin_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          designation ? designation.trim() : 'Assistant Professor',
          department ? department.trim() : 'Computer Science & Engineering',
          bio ? bio.trim() : '',
          subjects ? subjects.trim() : 'Cloud Computing, Web Architecture',
          languages ? languages.trim() : 'Python, JavaScript, Java',
          linkedin_url ? linkedin_url.trim() : ''
        ]
      );
    }

    // Generate JWT
    const secret = process.env.JWT_SECRET || 'supersecret_college_portal_jwt_token_key_2026!';
    const token = jwt.sign({ userId, role }, secret, { expiresIn: '7d' });

    // Fetch created user without password
    const newUser = await db.get(
      'SELECT id, role, name, email, avatar, created_at FROM users WHERE id = ?',
      [userId]
    );

    return res.status(201).json({
      message: 'Account successfully registered.',
      token,
      user: newUser
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Server error during registration.' });
  }
});

// Login (Students, Faculty, HOD)
router.post('/login', authRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const db = await getDb();
    const user = await db.get(
      'SELECT id, role, name, email, password_hash, avatar, created_at FROM users WHERE email = ?',
      [email.trim().toLowerCase()]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const secret = process.env.JWT_SECRET || 'supersecret_college_portal_jwt_token_key_2026!';
    const token = jwt.sign({ userId: user.id, role: user.role }, secret, { expiresIn: '7d' });

    // Never return password_hash
    const { password_hash, ...safeUser } = user;

    // Attach role-specific profile details
    let profile = null;
    if (user.role === 'student') {
      profile = await db.get(
        `SELECT sp.*, u.name as faculty_name, u.email as faculty_email
         FROM student_profiles sp
         LEFT JOIN users u ON sp.faculty_id = u.id
         WHERE sp.user_id = ?`,
        [user.id]
      );
    } else if (user.role === 'faculty') {
      profile = await db.get(
        'SELECT * FROM faculty_profiles WHERE user_id = ?',
        [user.id]
      );
    }

    return res.json({
      message: 'Logged in successfully.',
      token,
      user: safeUser,
      profile
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error during login.' });
  }
});

// Get current user profile (/api/auth/me)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    let profile = null;

    if (req.user.role === 'student') {
      profile = await db.get(
        `SELECT sp.*, u.name as faculty_name, u.email as faculty_email
         FROM student_profiles sp
         LEFT JOIN users u ON sp.faculty_id = u.id
         WHERE sp.user_id = ?`,
        [req.user.id]
      );
    } else if (req.user.role === 'faculty') {
      profile = await db.get(
        'SELECT * FROM faculty_profiles WHERE user_id = ?',
        [req.user.id]
      );
    }

    return res.json({
      user: req.user,
      profile
    });
  } catch (error) {
    console.error('Me endpoint error:', error);
    return res.status(500).json({ error: 'Failed to fetch current user profile.' });
  }
});

export default router;
