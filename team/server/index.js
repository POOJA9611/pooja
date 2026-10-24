import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { Server } from 'socket.io';

import { initializeDatabase } from './db/initDb.js';
import { setupSocketIO } from './socket/socketHandler.js';

import authRoutes from './routes/auth.routes.js';
import hodRoutes from './routes/hod.routes.js';
import facultyRoutes from './routes/faculty.routes.js';
import studentRoutes from './routes/student.routes.js';
import teamsRoutes from './routes/teams.routes.js';
import chatRoutes from './routes/chat.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: [clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Attach io to express app so routes can broadcast
app.set('io', io);
setupSocketIO(io);

// Middleware
app.use(cors({
  origin: [clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Setup static uploads directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, 'uploads');
const avatarsDir = path.join(uploadsDir, 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/hod', hodRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Project Guidance & Team Portal API'
  });
});

// Serve frontend build from ../client/dist if available
const clientDistPath = path.resolve(__dirname, '../client/dist');

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  // SPA fallback for client-side routing in Express 5
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    const indexPath = path.join(clientDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      next();
    }
  });
}

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

// Start server after ensuring DB schema exists
async function startServer() {
  try {
    await initializeDatabase();
    server.listen(PORT, () => {
      console.log(`🚀 College Portal Backend running on http://localhost:${PORT}`);
      console.log(`📡 Socket.IO listening for real-time events`);
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

startServer();

export { app, server, io };
