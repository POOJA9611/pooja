import express from 'express';
import { getDb } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { sanitizeString } from '../utils/validators.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * 1. Get All Chat Groups for Current User
 * Strictly returns only groups where the user is an explicit member.
 */
router.get('/groups', async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.id;

    const groups = await db.all(
      `SELECT cg.id, cg.name, cg.team_id, cg.faculty_id, cg.created_by, cg.created_at,
              f.name as faculty_name,
              t.name as team_name,
              (SELECT body FROM messages WHERE group_id = cg.id ORDER BY created_at DESC LIMIT 1) as last_message,
              (SELECT created_at FROM messages WHERE group_id = cg.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
              (SELECT COUNT(*) FROM chat_group_members WHERE group_id = cg.id) as member_count
       FROM chat_groups cg
       JOIN chat_group_members cgm ON cg.id = cgm.group_id
       LEFT JOIN users f ON cg.faculty_id = f.id
       LEFT JOIN teams t ON cg.team_id = t.id
       WHERE cgm.user_id = ?
       ORDER BY COALESCE(last_message_time, cg.created_at) DESC`,
      [userId]
    );

    // Fetch member details for each group
    for (const group of groups) {
      const members = await db.all(
        `SELECT u.id, u.name, u.role, u.avatar
         FROM chat_group_members cgm
         JOIN users u ON cgm.user_id = u.id
         WHERE cgm.group_id = ?`,
        [group.id]
      );
      group.members = members;
    }

    return res.json({ groups });
  } catch (error) {
    console.error('Get chat groups error:', error);
    return res.status(500).json({ error: 'Failed to retrieve chat groups.' });
  }
});

/**
 * 2. Get Messages for a Group
 * Enforces ownership/membership: User MUST be in chat_group_members!
 */
router.get('/groups/:groupId/messages', async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const db = await getDb();

    // Verify membership
    const membership = await db.get(
      `SELECT * FROM chat_group_members WHERE group_id = ? AND user_id = ?`,
      [groupId, userId]
    );

    if (!membership) {
      return res.status(403).json({
        error: 'Forbidden: You are not a member of this chat group and cannot view its messages.'
      });
    }

    const messages = await db.all(
      `SELECT m.id, m.group_id, m.sender_id, m.body, m.created_at,
              u.name as sender_name, u.role as sender_role, u.avatar as sender_avatar
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.group_id = ?
       ORDER BY m.created_at ASC`,
      [groupId]
    );

    return res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    return res.status(500).json({ error: 'Failed to retrieve messages.' });
  }
});

/**
 * 3. Send Message to Group
 * Enforces membership before saving or emitting
 */
router.post('/groups/:groupId/messages', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { body } = req.body;
    const userId = req.user.id;

    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      return res.status(400).json({ error: 'Message content cannot be empty.' });
    }

    const db = await getDb();

    // Verify membership
    const membership = await db.get(
      `SELECT * FROM chat_group_members WHERE group_id = ? AND user_id = ?`,
      [groupId, userId]
    );

    if (!membership) {
      return res.status(403).json({
        error: 'Forbidden: You cannot post messages to a chat group you do not belong to.'
      });
    }

    const cleanBody = body.trim();

    const result = await db.run(
      `INSERT INTO messages (group_id, sender_id, body)
       VALUES (?, ?, ?)`,
      [groupId, userId, cleanBody]
    );

    const message = await db.get(
      `SELECT m.id, m.group_id, m.sender_id, m.body, m.created_at,
              u.name as sender_name, u.role as sender_role, u.avatar as sender_avatar
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.id = ?`,
      [result.lastID]
    );

    // Broadcast in real time to the room via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`group_${groupId}`).emit('receive_message', message);
    }

    return res.status(201).json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({ error: 'Failed to send message.' });
  }
});

/**
 * 4. Create an Additional Chat Group (Faculty Only)
 */
router.post('/groups', async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ error: 'Only faculty can create new chat groups.' });
    }

    const { name, teamId, studentIds } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Group name is required.' });
    }

    const db = await getDb();
    const facultyId = req.user.id;
    const cleanName = sanitizeString(name);

    // Create group
    const result = await db.run(
      `INSERT INTO chat_groups (name, team_id, faculty_id, created_by)
       VALUES (?, ?, ?, ?)`,
      [cleanName, teamId || null, facultyId, facultyId]
    );
    const groupId = result.lastID;

    // Add faculty to group
    await db.run(
      `INSERT INTO chat_group_members (group_id, user_id)
       VALUES (?, ?)`,
      [groupId, facultyId]
    );

    // Add selected students (ensure they are assigned to faculty)
    if (Array.isArray(studentIds)) {
      for (const sId of studentIds) {
        const isAssigned = await db.get(
          `SELECT user_id FROM student_profiles WHERE user_id = ? AND faculty_id = ?`,
          [sId, facultyId]
        );
        if (isAssigned) {
          await db.run(
            `INSERT OR IGNORE INTO chat_group_members (group_id, user_id)
             VALUES (?, ?)`,
            [groupId, sId]
          );
        }
      }
    }

    return res.status(201).json({
      message: 'Chat group created successfully.',
      groupId
    });
  } catch (error) {
    console.error('Create custom chat group error:', error);
    return res.status(500).json({ error: 'Failed to create chat group.' });
  }
});

export default router;
