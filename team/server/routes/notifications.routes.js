import express from 'express';
import { getDb } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * 1. Get Notifications for Current User
 * Strictly filtered by user role:
 * - Student: audience IN ('students', 'both')
 * - Faculty: audience IN ('faculty', 'both')
 * - HOD: sees all
 * Includes read status flag (is_read).
 */
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const user = req.user;

    let query = '';
    let params = [];

    if (user.role === 'student') {
      query = `
        SELECT n.*, u.name as posted_by_name,
               CASE WHEN nr.user_id IS NOT NULL THEN 1 ELSE 0 END as is_read
        FROM notifications n
        JOIN users u ON n.posted_by = u.id
        LEFT JOIN notification_reads nr ON n.id = nr.notification_id AND nr.user_id = ?
        WHERE (n.target_user_id = ? OR (n.target_user_id IS NULL AND n.audience IN ('students', 'both')))
        ORDER BY n.created_at DESC
      `;
      params = [user.id, user.id];
    } else if (user.role === 'faculty') {
      query = `
        SELECT n.*, u.name as posted_by_name,
               CASE WHEN nr.user_id IS NOT NULL THEN 1 ELSE 0 END as is_read
        FROM notifications n
        JOIN users u ON n.posted_by = u.id
        LEFT JOIN notification_reads nr ON n.id = nr.notification_id AND nr.user_id = ?
        WHERE (n.target_user_id = ? OR (n.target_user_id IS NULL AND n.audience IN ('faculty', 'both')))
        ORDER BY n.created_at DESC
      `;
      params = [user.id, user.id];
    } else if (user.role === 'hod') {
      query = `
        SELECT n.*, u.name as posted_by_name,
               CASE WHEN nr.user_id IS NOT NULL THEN 1 ELSE 0 END as is_read
        FROM notifications n
        JOIN users u ON n.posted_by = u.id
        LEFT JOIN notification_reads nr ON n.id = nr.notification_id AND nr.user_id = ?
        ORDER BY n.created_at DESC
      `;
      params = [user.id];
    }

    const notifications = await db.all(query, params);
    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
});

/**
 * 2. Mark Notification as Read
 */
router.post('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const db = await getDb();

    await db.run(
      `INSERT OR IGNORE INTO notification_reads (notification_id, user_id)
       VALUES (?, ?)`,
      [id, userId]
    );

    return res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    console.error('Mark read error:', error);
    return res.status(500).json({ error: 'Failed to mark notification as read.' });
  }
});

/**
 * 3. Mark All Notifications as Read
 */
router.post('/mark-all-read', async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const db = await getDb();

    let targetAudience = [];
    if (role === 'student') targetAudience = ['students', 'both'];
    else if (role === 'faculty') targetAudience = ['faculty', 'both'];
    else targetAudience = ['students', 'faculty', 'both'];

    const placeholders = targetAudience.map(() => '?').join(',');
    const relevantNotifs = await db.all(
      `SELECT id FROM notifications WHERE audience IN (${placeholders})`,
      targetAudience
    );

    for (const notif of relevantNotifs) {
      await db.run(
        `INSERT OR IGNORE INTO notification_reads (notification_id, user_id)
         VALUES (?, ?)`,
        [notif.id, userId]
      );
    }

    return res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Mark all read error:', error);
    return res.status(500).json({ error: 'Failed to mark all as read.' });
  }
});

export async function createSystemNotification(db, io, { title, body, audience = 'both', postedBy = 1, targetUserId = null, deadline = null }) {
  try {
    const validAudience = ['students', 'faculty', 'both'].includes(audience) ? audience : 'both';
    const res = await db.run(
      `INSERT INTO notifications (title, body, audience, posted_by, target_user_id, deadline)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, body, validAudience, postedBy, targetUserId, deadline]
    );
    const notifId = res.lastID;

    if (io) {
      if (targetUserId) {
        io.to(`user_${targetUserId}`).emit('new_notification', {
          id: notifId,
          title,
          body,
          created_at: new Date().toISOString()
        });
      } else if (audience === 'students' || audience === 'both') {
        io.to('role_student').emit('new_notification', {
          id: notifId,
          title,
          body,
          created_at: new Date().toISOString()
        });
      } else if (audience === 'faculty' || audience === 'both') {
        io.to('role_faculty').emit('new_notification', {
          id: notifId,
          title,
          body,
          created_at: new Date().toISOString()
        });
      }
    }
    return notifId;
  } catch (err) {
    console.error('Failed to create system notification:', err);
    return null;
  }
}

export default router;
