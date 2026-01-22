import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import { createServer } from 'http';
import { Server } from 'socket.io';
import crypto from 'crypto';
import * as Sentry from '@sentry/node';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { domainToASCII } from 'node:url';

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
import printServiceRoutes from './routes/printService';
import videoRoutes from './routes/videos';
import cohostsRoutes from './routes/cohosts';
import packageDefinitionsRoutes from './routes/packageDefinitions';
import invitationRoutes from './routes/invitations';
import woocommerceWebhooksRoutes from './routes/woocommerceWebhooks';
import adminWooWebhooksRoutes from './routes/adminWooWebhooks';
import adminApiKeysRoutes from './routes/adminApiKeys';
import adminInvoicesRoutes from './routes/adminInvoices';
import adminEmailTemplatesRoutes from './routes/adminEmailTemplates';
import adminInvitationTemplatesRoutes from './routes/adminInvitationTemplates';
import adminCmsSyncRoutes from './routes/adminCmsSync';
import cmsPublicRoutes from './routes/cmsPublic';
import maintenanceRoutes from './routes/maintenance';
import adminMaintenanceRoutes from './routes/adminMaintenance';
import adminImpersonationRoutes from './routes/adminImpersonation';
import adminMarketingRoutes from './routes/adminMarketing';
import adminThemeRoutes from './routes/adminTheme';
import themeRoutes from './routes/theme';
import faceSearchConsentRoutes from './routes/faceSearchConsent';
import adminFaceSearchConsentRoutes from './routes/adminFaceSearchConsent';
import adminOpsRoutes from './routes/adminOps';
import wpConsentRoutes from './routes/wpConsent';
import qaLogsRoutes from './routes/qaLogs';
import adminQaLogsRoutes from './routes/adminQaLogs';
import adminFeatureFlagsRoutes from './routes/adminFeatureFlags';
import adminPhotosRoutes from './routes/adminPhotos';
import adminLogsRoutes from './routes/adminLogs';
import cohostInvitesRoutes from './routes/cohostInvites';
import uploadsRoutes from './routes/uploads';
import qrDesignsRoutes from './routes/qrDesigns';

import { apiLimiter, authLimiter, uploadLimiter, passwordLimiter } from './middleware/rateLimit';
import { logger } from './utils/logger';
import { storageService } from './services/storage';
import { startRetentionPurgeWorker } from './services/retentionPurge';
import { startVirusScanWorker } from './services/virusScan';
import { startOrphanCleanupWorker } from './services/orphanCleanup';
import { startStorageReminderWorker } from './services/storageReminder';
import { startFaceSearchConsentRetentionWorker } from './services/faceSearchConsentRetention';
import { startQaLogRetentionWorker } from './services/qaLogRetention';
import { startWooLogRetentionWorker } from './services/wooLogRetention';
import prisma from './config/database';
import { hasEventAccess } from './middleware/auth';
import { maintenanceModeMiddleware } from './middleware/maintenanceMode';

dotenv.config();
const envFile = process.env.ENV_FILE;
if (envFile) {
  dotenv.config({ path: envFile, override: false });
}

function validateRequiredEnv() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) return;

  const jwtSecret = String(process.env.JWT_SECRET || '').trim();
  if (!jwtSecret) {
    throw new Error('Server misconfigured: JWT_SECRET is missing');
  }

  const twoFactorKey = String(process.env.TWO_FACTOR_ENCRYPTION_KEY || '').trim();
  const twoFactorKeys = String(process.env.TWO_FACTOR_ENCRYPTION_KEYS || '').trim();
  if (!twoFactorKey && !twoFactorKeys) {
    throw new Error('Server misconfigured: TWO_FACTOR_ENCRYPTION_KEY(S) is missing');
  }
}

try {
  validateRequiredEnv();
} catch (err: any) {
  logger.error('Startup validation failed', { message: err?.message || String(err) });
  process.exit(1);
}

storageService.ensureBucketExists().catch((err) => {
  logger.warn('Storage config init failed', { error: err?.message || String(err) });
});

startRetentionPurgeWorker();
startVirusScanWorker();
startOrphanCleanupWorker();
startStorageReminderWorker();
startFaceSearchConsentRetentionWorker();
startQaLogRetentionWorker();
startWooLogRetentionWorker();

// Initialize Sentry for error tracking
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0,
  });
  logger.info('Sentry initialized for error tracking');
}

// CORS Configuration - Must be defined before use
const CANONICAL_APP_HOST_UNICODE = 'app.gästefotos.com';
const CANONICAL_WP_HOST_UNICODE = 'gästefotos.com';
const CANONICAL_DASH_HOST_UNICODE = 'dash.gästefotos.com';

// Legacy ASCII domains (historical); still used in some environments/DNS.
const LEGACY_APP_HOST_ASCII = 'app.gaestefotos.com';
const LEGACY_DASH_HOST_ASCII = 'dash.gaestefotos.com';

const allowedOriginsFromEnv = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

const canonicalAppOriginsAscii = [
  `https://${domainToASCII(CANONICAL_APP_HOST_UNICODE)}`,
  `http://${domainToASCII(CANONICAL_APP_HOST_UNICODE)}`,
  `https://${LEGACY_APP_HOST_ASCII}`,
  `http://${LEGACY_APP_HOST_ASCII}`,
];

const canonicalDashOriginsAscii = [
  `https://${domainToASCII(CANONICAL_DASH_HOST_UNICODE)}`,
  `http://${domainToASCII(CANONICAL_DASH_HOST_UNICODE)}`,
  `https://${LEGACY_DASH_HOST_ASCII}`,
  `http://${LEGACY_DASH_HOST_ASCII}`,
];

const allowedOrigins = Array.from(
  new Set([
    ...allowedOriginsFromEnv,
    'http://localhost:3002',
    ...canonicalAppOriginsAscii,
    ...canonicalDashOriginsAscii,
  ])
);

const toAsciiOrigin = (origin: string): string => {
  try {
    const u = new URL(origin);
    const asciiHost = domainToASCII(u.hostname);
    return `${u.protocol}//${asciiHost}${u.port ? `:${u.port}` : ''}`;
  } catch {
    return origin;
  }
};

const isAllAscii = (input: string): boolean => {
  for (let i = 0; i < input.length; i++) {
    if (input.charCodeAt(i) > 0x7f) return false;
  }
  return true;
};

// Use ASCII-only origins for headers like CSP to avoid broken encoding.
const allowedOriginsForHeaders = Array.from(
  new Set(
    allowedOrigins
      .map((o) => toAsciiOrigin(o))
      .filter((o) => isAllAscii(o))
      .filter((o) => (process.env.NODE_ENV === 'production' ? !/^https?:\/\/localhost:\d+$/i.test(o) : true))
  )
);

// Always include canonical ASCII production origins in CSP.
const cspConnectSrc =
  process.env.NODE_ENV === 'production'
    ? ["'self'"]
    : Array.from(
        new Set([
          "'self'",
          ...allowedOriginsForHeaders,
          ...canonicalAppOriginsAscii,
        ])
      );

const STARTED_AT = new Date().toISOString();

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
  transports: ['websocket', 'polling'], // WebSocket bevorzugt, Polling als Fallback
  allowEIO3: true, // Allow Engine.IO v3 clients
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  path: '/socket.io', // Explizit path setzen, damit Client und Server übereinstimmen
});

const PORT = process.env.PORT || 8002;
const IS_PROD = process.env.NODE_ENV === 'production';

// Security middleware - must be before other middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: IS_PROD
        ? ["'self'", "'unsafe-inline'"]
        : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
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

app.use((req, res, next) => {
  const incoming = req.get('x-request-id');
  const requestId = (typeof incoming === 'string' && incoming.trim())
    ? incoming.trim().slice(0, 128)
    : (typeof (crypto as any).randomUUID === 'function'
        ? (crypto as any).randomUUID()
        : crypto.randomBytes(16).toString('hex'));

  (req as any).requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  if (process.env.SENTRY_DSN) {
    try {
      (Sentry as any).getCurrentScope?.()?.setTag?.('requestId', requestId);
      (Sentry as any).getCurrentScope?.()?.setContext?.('request', {
        id: requestId,
        method: req.method,
        path: req.path,
      });
    } catch {
      // ignore
    }
  }

  next();
});

// Request logging
app.use((req, res, next) => {
  const isProd = process.env.NODE_ENV === 'production';
  const secret = process.env.IP_HASH_SECRET || process.env.JWT_SECRET || '';
  if (isProd && !secret) {
    throw new Error('Server misconfigured: IP_HASH_SECRET (or at least JWT_SECRET) must be set in production');
  }

  const effectiveSecret = secret || 'dev-ip-hash-secret';
  const ipHash = crypto.createHash('sha256').update(`${req.ip || 'unknown'}|${effectiveSecret}`).digest('hex');
  const userAgent = req.get('user-agent');

  logger.info(`${req.method} ${req.path}`, {
    ip: ipHash,
    requestId: (req as any).requestId,
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
      new RegExp(`^https?://${domainToASCII(CANONICAL_APP_HOST_UNICODE).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      /^https?:\/\/app\.gästefotos\.com$/i,
      /^https?:\/\/app\.gaestefotos\.com$/i,
      /^https?:\/\/dash\.gaestefotos\.com$/i,
      new RegExp(`^https?://${domainToASCII(CANONICAL_DASH_HOST_UNICODE).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      /^https?:\/\/dash\.gästefotos\.com$/i,
    ];
    if (alwaysAllow.some((re) => re.test(origin))) {
      return callback(null, true);
    }

    // Dev/E2E: allow any localhost origin regardless of port.
    // This avoids CORS issues when the frontend runs on 3000/3001/3002/... while backend is on 8002.
    if (process.env.NODE_ENV !== 'production') {
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
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

app.use((req, res, next) => {
  const method = (req.method || 'GET').toUpperCase();
  const isSafeMethod = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
  if (isSafeMethod) return next();

  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.trim()) {
    return next();
  }

  const cookieHeader = req.headers.cookie || '';
  const usesAuthCookie = typeof cookieHeader === 'string' && (cookieHeader.includes('auth_token=') || cookieHeader.includes('event_access_'));
  if (!usesAuthCookie) {
    return next();
  }

  const origin = req.get('origin');
  const referer = req.get('referer');

  const originFromReferer = (() => {
    if (!referer) return null;
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  })();

  const effectiveOrigin = origin || originFromReferer;
  if (!effectiveOrigin) {
    return next();
  }

  // Dev/E2E: allow any localhost origin regardless of port.
  // This avoids CSRF issues when the frontend runs on 3000/3001/3002/... while backend is on 8002/8001/...
  if (process.env.NODE_ENV !== 'production') {
    if (effectiveOrigin.startsWith('http://localhost:') || effectiveOrigin.startsWith('http://127.0.0.1:')) {
      return next();
    }
  }

  if (allowedOrigins.includes(effectiveOrigin)) {
    return next();
  }

  return res.status(403).json({ error: 'Forbidden: CSRF protection' });
});

app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: true }));

// Maintenance mode gate (must be after request parsing, before routes)
app.use(maintenanceModeMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', version: '2.0.0' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', version: '2.0.0' });
});

app.get('/api/version', (_req, res) => {
  res.json({
    service: 'backend',
    version: '2.0.0',
    nodeEnv: process.env.NODE_ENV || 'unknown',
    startedAt: STARTED_AT,
  });
});

// API Root endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Gästefotos API',
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
      title: 'Gästefotos API',
      version: '2.0.0',
      description: 'API für Event-Foto-Sharing Plattform',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
      {
        url: `https://${CANONICAL_APP_HOST_UNICODE}`,
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
 app.use('/api', maintenanceRoutes);
 app.use('/api', wpConsentRoutes);
 app.use('/api/theme', themeRoutes);
 app.use('/api/face-search-consent', faceSearchConsentRoutes);
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
app.use('/api/face-search', faceSearchRoutes);
app.use('/api/print-service', printServiceRoutes);
app.use('/api/events', videoRoutes); // Videos: /api/events/:eventId/videos
app.use('/api/events', cohostsRoutes); // Co-hosts: /api/events/:eventId/cohosts
app.use('/api/cohosts', cohostInvitesRoutes); // Co-host invite accept: /api/cohosts/accept
app.use('/api/videos', videoRoutes); // Video files: /api/videos/:eventId/file/*
app.use('/api', invitationRoutes);
app.use('/api', qrDesignsRoutes);
app.use('/api/admin/package-definitions', packageDefinitionsRoutes);
app.use('/api/admin/webhooks/woocommerce', adminWooWebhooksRoutes);
app.use('/api/admin/api-keys', adminApiKeysRoutes);
app.use('/api/admin/invoices', adminInvoicesRoutes);
app.use('/api/admin/email-templates', adminEmailTemplatesRoutes);
app.use('/api/admin/invitation-templates', adminInvitationTemplatesRoutes);
app.use('/api/admin/cms', adminCmsSyncRoutes);
app.use('/api/cms', cmsPublicRoutes);
app.use('/api/admin/maintenance', adminMaintenanceRoutes);
app.use('/api/admin/theme', adminThemeRoutes);
app.use('/api/admin/face-search-consent', adminFaceSearchConsentRoutes);
app.use('/api/admin/ops', adminOpsRoutes);
app.use('/api/admin/qa-logs', adminQaLogsRoutes);
app.use('/api/qa-logs', qaLogsRoutes);
app.use('/api/admin/impersonation', adminImpersonationRoutes);
app.use('/api/admin/marketing', adminMarketingRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/users', adminUsersRouter);
app.use('/api/admin/dashboard', adminDashboardRouter);
app.use('/api/admin/feature-flags', adminFeatureFlagsRouter);
app.use('/api/admin/photos', adminPhotosRoutes);
app.use('/api/admin/logs', adminLogsRoutes);
app.use('/api/webhooks/woocommerce', woocommerceWebhooksRoutes);

// Tus.io resumable uploads
app.use('/api/uploads', uploadsRoutes);

// Sentry error handler (must be after routes, before error handlers)
// Note: Sentry v10 uses automatic error tracking, manual handler not needed

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  if (process.env.SENTRY_DSN) {
    try {
      Sentry.withScope((scope) => {
        const requestId = (req as any).requestId;
        if (requestId) scope.setTag('requestId', String(requestId));
        scope.setContext('request', {
          id: requestId,
          method: req.method,
          path: req.path,
        });
        Sentry.captureException(err);
      });
    } catch {
      // ignore
    }
  }
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
server = httpServer.listen(Number(PORT), '::', () => {
  logger.info(`Server running on http://[::]:${PORT}`);
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
