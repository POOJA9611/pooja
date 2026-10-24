import jwt from 'jsonwebtoken';
import { getDb } from '../config/database.js';

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'supersecret_college_portal_jwt_token_key_2026!';
    const decoded = jwt.verify(token, secret);

    const db = await getDb();
    const user = await db.get(
      'SELECT id, role, name, email, avatar, created_at FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists or invalid token.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}
