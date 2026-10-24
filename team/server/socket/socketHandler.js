import jwt from 'jsonwebtoken';
import { getDb } from '../config/database.js';

export function setupSocketIO(io) {
  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const secret = process.env.JWT_SECRET || 'supersecret_college_portal_jwt_token_key_2026!';
      const decoded = jwt.verify(token, secret);

      const db = await getDb();
      const user = await db.get(
        'SELECT id, role, name, email, avatar FROM users WHERE id = ?',
        [decoded.userId]
      );

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      return next(new Error('Invalid or expired socket token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`⚡ Socket connected: User ${socket.user.name} (${socket.user.role}, ID: ${socket.user.id})`);

    // Automatically join a personal room for targeted user notifications
    socket.join(`user_${socket.user.id}`);
    // Join role room for broadcasts
    socket.join(`role_${socket.user.role}`);

    /**
     * Join Chat Group Room
     * Server-side verification: Must be an existing member in chat_group_members!
     */
    socket.on('join_group', async ({ groupId }, callback) => {
      try {
        if (!groupId) {
          if (callback) callback({ error: 'Group ID is required.' });
          return;
        }

        const db = await getDb();
        const membership = await db.get(
          `SELECT * FROM chat_group_members WHERE group_id = ? AND user_id = ?`,
          [groupId, socket.user.id]
        );

        if (!membership) {
          console.warn(`⛔ Unauthorized join attempt: User ${socket.user.id} tried to join group ${groupId}`);
          socket.emit('error_message', {
            error: 'Access denied: You are not a member of this chat group.'
          });
          if (callback) callback({ error: 'Access denied: Not a member.' });
          return;
        }

        const roomName = `group_${groupId}`;
        socket.join(roomName);
        console.log(`👥 User ${socket.user.name} joined room ${roomName}`);

        if (callback) callback({ success: true, room: roomName });
      } catch (err) {
        console.error('Socket join_group error:', err);
        if (callback) callback({ error: 'Failed to join group room.' });
      }
    });

    /**
     * Leave Chat Group Room
     */
    socket.on('leave_group', ({ groupId }) => {
      if (groupId) {
        const roomName = `group_${groupId}`;
        socket.leave(roomName);
        console.log(`👋 User ${socket.user.name} left room ${roomName}`);
      }
    });

    /**
     * Real-time Chat Message Sender
     */
    socket.on('chat_message', async ({ groupId, body }, callback) => {
      try {
        if (!groupId || !body || typeof body !== 'string' || body.trim().length === 0) {
          if (callback) callback({ error: 'Group ID and non-empty body required.' });
          return;
        }

        const db = await getDb();
        const membership = await db.get(
          `SELECT * FROM chat_group_members WHERE group_id = ? AND user_id = ?`,
          [groupId, socket.user.id]
        );

        if (!membership) {
          if (callback) callback({ error: 'Access denied: You are not in this chat group.' });
          return;
        }

        const cleanBody = body.trim();
        const result = await db.run(
          `INSERT INTO messages (group_id, sender_id, body)
           VALUES (?, ?, ?)`,
          [groupId, socket.user.id, cleanBody]
        );

        const savedMsg = await db.get(
          `SELECT m.id, m.group_id, m.sender_id, m.body, m.created_at,
                  u.name as sender_name, u.role as sender_role, u.avatar as sender_avatar
           FROM messages m
           JOIN users u ON m.sender_id = u.id
           WHERE m.id = ?`,
          [result.lastID]
        );

        // Broadcast to all participants in the group
        io.to(`group_${groupId}`).emit('receive_message', savedMsg);

        if (callback) callback({ success: true, message: savedMsg });
      } catch (err) {
        console.error('Socket chat_message error:', err);
        if (callback) callback({ error: 'Failed to process message.' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: User ${socket.user?.name} (ID: ${socket.user?.id})`);
    });
  });
}
