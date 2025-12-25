import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import { createServer } from 'http';
import { Server } from 'socket.io';
import crypto from 'crypto';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { toASCII } from 'node:punycode';

import authRoutes from './routes/auth';
import eventRoutes from './routes/events';
import guestRoutes from './routes/guests';
import photoRoutes from './routes/photos';
import categoryRoutes from './routes/categories';
import challengeRoutes from './routes/challenges';
import statisticsRoutes from './routes/statistics';
import emailRoutes from './routes/email';
import likesRoutes from './routes/likes';
import commentsRoutes from './routes/comments';
import storiesRoutes from './routes/stories';
import guestbookRoutes from './routes/guestbook';
import votesRoutes from './routes/votes';
import duplicatesRoutes from './routes/duplicates';
import faceSearchRoutes from './routes/faceSearch';
import videoRoutes from './routes/videos';
import packageDefinitionsRoutes from './routes/packageDefinitions';
import invitationRoutes from './routes/invitations';
import woocommerceWebhooksRoutes from './routes/woocommerceWebhooks';

import { apiLimiter, authLimiter, uploadLimiter, passwordLimiter } from './middleware/rateLimit';
import { logger } from './utils/logger';
import { storageService } from './services/storage';
import { startRetentionPurgeWorker } from './services/retentionPurge';
import { startVirusScanWorker } from './services/virusScan';
import { startOrphanCleanupWorker } from './services/orphanCleanup';
import { startStorageReminderWorker } from './services/storageReminder';
import prisma from './config/database';
import { hasEventAccess } from './middleware/auth';

dotenv.config();
const envFile = process.env.ENV_FILE;
if (envFile) {
  dotenv.config({ path: envFile, override: false });
}

storageService.ensureBucketExists().catch((err) => {
  logger.warn('Storage config init failed', { error: err?.message || String(err) });
});

startRetentionPurgeWorker();
startVirusScanWorker();
startOrphanCleanupWorker();
startStorageReminderWorker();

// Initialize Sentry for error tracking
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });
  logger.info('Sentry initialized for error tracking');
}

// CORS Configuration - Must be defined before use
const allowedOrigins = process.env.FRONTEND_URL?.split(',').map(url => url.trim()) || [
  'http://localhost:3000',
  'http://app.xn--gstefotos-v2a.com',
  'https://app.xn--gstefotos-v2a.com',
  // NOTE: avoid unicode hostnames here to prevent mojibake in response headers.
  // The unicode domain is still allowed via alwaysAllow regex below.
];

const toAsciiOrigin = (origin: string): string => {
  try {
    const u = new URL(origin);
    const asciiHost = toASCII(u.hostname);
    return `${u.protocol}//${asciiHost}${u.port ? `:${u.port}` : ''}`;
  } catch {
    return origin;
  }
};

// Use ASCII-only origins for headers like CSP to avoid broken encoding.
const allowedOriginsForHeaders = Array.from(
  new Set(
    allowedOrigins
      .map((o) => toAsciiOrigin(o))
      .filter((o) => /^[\x00-\x7F]*$/.test(o))
      .filter((o) => (process.env.NODE_ENV === 'production' ? !/^https?:\/\/localhost:\d+$/i.test(o) : true))
  )
);

// Always include canonical ASCII production origins in CSP.
const cspConnectSrc = Array.from(
  new Set([
    "'self'",
    ...allowedOriginsForHeaders,
    'https://app.xn--gstefotos-v2a.com',
    'http://app.xn--gstefotos-v2a.com',
    'https://ws.xn--gstefotos-v2a.com',
  ])
);

const app = express();

// Trust proxy for Cloudflare (important for rate limiting and IP detection)
app.set('trust proxy', 1);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['polling'], // Nur Polling - WebSocket verursacht Probleme mit Cloudflare/Plesk
  allowEIO3: true, // Allow Engine.IO v3 clients
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  path: '/socket.io', // Explizit path setzen, damit Client und Server übereinstimmen
});

const PORT = process.env.PORT || 8001;

// Security middleware - must be before other middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Next.js benötigt unsafe-inline und unsafe-eval
      scriptSrcElem: ["'self'", "'unsafe-inline'"], // Separate directive für script elements
      imgSrc: ["'self'", "data:", "https:", "http:"],
      // Keep connect-src ASCII-only to avoid broken header encoding; 'self' covers same-origin API calls.
      connectSrc: cspConnectSrc,
    },
  },
  crossOriginEmbedderPolicy: false, // Allow Socket.IO
}));

// Sanitize input to prevent NoSQL injection
app.use(mongoSanitize());

// Request logging
app.use((req, res, next) => {
  const secret = process.env.IP_HASH_SECRET || process.env.JWT_SECRET || 'default';
  const ipHash = crypto.createHash('sha256').update(`${req.ip || 'unknown'}|${secret}`).digest('hex');
  const userAgent = req.get('user-agent');

  logger.info(`${req.method} ${req.path}`, {
    ip: ipHash,
    userAgent: process.env.NODE_ENV === 'production' ? undefined : userAgent,
  });
  next();
});

// Sentry request handler (must be before routes)
// Note: Sentry v10 uses automatic instrumentation, no manual handlers needed

// Apply rate limiting - nur für bestimmte Routen, nicht global
// app.use('/api', apiLimiter); // Deaktiviert - zu restriktiv für normale Nutzung

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Always allow our known app domains even if FRONTEND_URL is misconfigured.
    // This prevents accidental lockouts (e.g. login) when the browser sends an Origin header.
    const alwaysAllow = [
      /^https?:\/\/app\.(xn--gstefotos-v2a\.com|gästefotos\.com)$/i,
    ];
    if (alwaysAllow.some((re) => re.test(origin))) {
      return callback(null, true);
    }

    // Dev/E2E: allow any localhost origin regardless of port.
    // This avoids CORS issues when the frontend runs on 3000/3001/3002/... while backend is on 8001.
    if (process.env.NODE_ENV !== 'production') {
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Also check Punycode variants (legacy)
    const punycodeVariants = new Set([
      origin.replace('app.gästefotos.com', 'app.xn--gstefotos-v2a.com'),
      origin.replace('app.xn--gstefotos-v2a.com', 'app.gästefotos.com'),
    ]);

    for (const candidate of punycodeVariants) {
      if (allowedOrigins.includes(candidate)) {
        return callback(null, true);
      }
    }

    console.warn(`[CORS] Blocked origin: ${origin}`);
    // IMPORTANT: do not throw here; deny via CORS without crashing the process
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization'],
}));
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', version: '2.0.0' });
});

app.get('/api/health', (req, res) => {
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
        uploadLogo: 'POST /api/events/:id/logo',
        updateDesign: 'PUT /api/events/:id/design',
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
            download: 'GET /api/photos/:photoId/download',
            downloadZip: 'GET /api/events/:eventId/download-zip',
            edit: 'POST /api/photos/:photoId/edit',
            bulkApprove: 'POST /api/photos/bulk/approve',
            bulkReject: 'POST /api/photos/bulk/reject',
            bulkDelete: 'POST /api/photos/bulk/delete',
          },
          categories: {
            list: 'GET /api/events/:eventId/categories',
            create: 'POST /api/events/:eventId/categories',
            update: 'PUT /api/events/:eventId/categories/:categoryId',
            delete: 'DELETE /api/events/:eventId/categories/:categoryId',
            assignPhoto: 'PUT /api/photos/:photoId/category',
          },
    },
  });
});

// Swagger/OpenAPI Documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Gästefotos V2 API',
      version: '2.0.0',
      description: 'API für Event-Foto-Sharing Plattform',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
      {
        url: 'https://app.xn--gstefotos-v2a.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'], // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes with rate limiting
// Note: authLimiter is applied per-route in auth.ts for more granular control
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/events', guestRoutes);
app.use('/api/events', photoRoutes); // Photo routes: /api/events/:eventId/photos/*
app.use('/api/events', categoryRoutes); // Category routes: /api/events/:eventId/categories/*
app.use('/api/events', challengeRoutes); // Challenge routes: /api/events/:eventId/challenges/*
app.use('/api/events', statisticsRoutes); // Statistics routes: /api/events/:eventId/statistics
app.use('/api', statisticsRoutes); // User statistics: /api/statistics
app.use('/api/events', emailRoutes); // Email routes: /api/events/:eventId/invite
app.use('/api/email', emailRoutes); // Email test: /api/email/test
// Photo file route (no rate limiting - files are cached)
app.use('/api/photos', photoRoutes); // Photo actions: /api/photos/:photoId/*
app.use('/api/photos', categoryRoutes); // Photo category assignment: /api/photos/:photoId/category
app.use('/api/photos', likesRoutes); // Likes: /api/photos/:photoId/like
app.use('/api/photos', commentsRoutes); // Comments: /api/photos/:photoId/comments
app.use('/api/photos', votesRoutes); // Votes: /api/photos/:photoId/vote
app.use('/api/events', storiesRoutes); // Stories: /api/events/:eventId/stories
app.use('/api/photos', storiesRoutes); // Story from photo: /api/photos/:photoId/story
app.use('/api/events', guestbookRoutes); // Guestbook: /api/events/:eventId/guestbook
app.use('/api/events', duplicatesRoutes); // Duplicates: /api/events/:eventId/duplicates
app.use('/api/events', faceSearchRoutes); // Face Search: /api/events/:eventId/face-search
app.use('/api/events', videoRoutes); // Videos: /api/events/:eventId/videos
app.use('/api/videos', videoRoutes); // Video files: /api/videos/:eventId/file/*
app.use('/api', invitationRoutes);
app.use('/api/admin/package-definitions', packageDefinitionsRoutes);
app.use('/api/webhooks/woocommerce', woocommerceWebhooksRoutes);

// Sentry error handler (must be after routes, before error handlers)
// Note: Sentry v10 uses automatic error tracking, manual handler not needed

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Interner Serverfehler' 
      : err.message,
  });
});

// WebSocket connection
io.on('connection', (socket) => {
  logger.info('Client connected', { socketId: socket.id });

  // Join event room
  socket.on('join:event', async (eventId: string) => {
    try {
      if (!eventId || typeof eventId !== 'string') return;

      const cookie = socket.handshake.headers?.cookie;
      const reqLike = { headers: { cookie } } as any;

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, deletedAt: true, isActive: true },
      });

      if (!event || event.deletedAt || event.isActive === false) {
        return;
      }

      if (!hasEventAccess(reqLike, eventId)) {
        return;
      }

      socket.join(`event:${eventId}`);
      logger.info('Client joined event', { socketId: socket.id, eventId });
    } catch (error) {
      logger.warn('WebSocket join:event failed', { socketId: socket.id, eventId, error });
    }
  });

  // Leave event room
  socket.on('leave:event', (eventId: string) => {
    socket.leave(`event:${eventId}`);
    logger.info('Client left event', { socketId: socket.id, eventId });
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected', { socketId: socket.id });
  });
});

// Export io for use in routes
export { io };

// Graceful shutdown handler
let server: any = null;

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  if (server) {
    // Close server immediately - don't wait for connections
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    
    // Close all connections immediately
    server.closeAllConnections?.();
    
    // Force close after 2 seconds (much faster for tsx watch)
    setTimeout(() => {
      logger.warn('Force closing after 2s timeout');
      process.exit(0); // Exit 0 to allow restart
    }, 2000);
  } else {
    process.exit(0);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error);
  }
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(reason as Error);
  }
  gracefulShutdown('unhandledRejection');
});

// Start server - listen on all interfaces for external access
server = httpServer.listen(Number(PORT), '0.0.0.0', () => {
  logger.info(`Server running on http://0.0.0.0:${PORT}`);
  logger.info(`WebSocket server ready`);
  logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);
  logger.info(`Accessible from: http://localhost:${PORT} and external IPs`);
});

// Handle server errors
server.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use!`);
    logger.warn('This is normal during tsx watch restarts. Waiting for port to be released...');
    // Don't exit - tsx watch will retry
    // Instead, wait a bit and let the graceful shutdown complete
    setTimeout(() => {
      // If still in use after 3 seconds, exit
      if (error.code === 'EADDRINUSE') {
        logger.error('Port still in use after wait. Exiting...');
        process.exit(1);
      }
    }, 3000);
  } else {
    logger.error('Server error', { error: error.message, code: error.code });
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error);
    }
    process.exit(1);
  }
});
