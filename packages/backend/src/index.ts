import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth';
import eventRoutes from './routes/events';
import guestRoutes from './routes/guests';
import photoRoutes from './routes/photos';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:3000', 'https://app.xn--gstefotos-v2a.com'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 8001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:3000', 'https://app.gaestefotos.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', version: '2.0.0' });
});

// API Root endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Gästefotos V2 API',
    version: '2.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
      },
      events: {
        list: 'GET /api/events',
        get: 'GET /api/events/:id',
        getBySlug: 'GET /api/events/slug/:slug',
        create: 'POST /api/events',
        update: 'PUT /api/events/:id',
        delete: 'DELETE /api/events/:id',
      },
      guests: {
        list: 'GET /api/events/:eventId/guests',
        create: 'POST /api/events/:eventId/guests',
        update: 'PUT /api/events/:eventId/guests/:guestId',
        delete: 'DELETE /api/events/:eventId/guests/:guestId',
      },
      photos: {
        list: 'GET /api/events/:eventId/photos',
        upload: 'POST /api/events/:eventId/photos/upload',
        approve: 'POST /api/photos/:photoId/approve',
        reject: 'POST /api/photos/:photoId/reject',
        delete: 'DELETE /api/photos/:photoId',
      },
    },
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/events', guestRoutes);
app.use('/api/events', photoRoutes); // Photo routes: /api/events/:eventId/photos/*
app.use('/api/photos', photoRoutes); // Photo actions: /api/photos/:photoId/*

// WebSocket connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join event room
  socket.on('join:event', (eventId: string) => {
    socket.join(`event:${eventId}`);
    console.log(`Client ${socket.id} joined event:${eventId}`);
  });

  // Leave event room
  socket.on('leave:event', (eventId: string) => {
    socket.leave(`event:${eventId}`);
    console.log(`Client ${socket.id} left event:${eventId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Export io for use in routes
export { io };

// Start server - listen on all interfaces for external access
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🌐 Accessible from: http://localhost:${PORT} and external IPs`);
});
