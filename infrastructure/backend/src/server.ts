// =============================================================================
// SolarCRM Backend API - Main Server
// =============================================================================
// Production Express server with:
// - Helmet security headers
// - CORS with whitelist
// - Rate limiting
// - Compression
// - Structured logging
// - Sentry error monitoring
// - Graceful shutdown
// =============================================================================

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

import { authRouter } from './routes/auth.js';
import { clientsRouter } from './routes/clients.js';
import { uploadsRouter } from './routes/uploads.js';
import { healthRouter } from './routes/health.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { authenticate } from './middleware/auth.js';
import { tracingMiddleware } from './middleware/tracing.js';
import { pool, testConnection } from './db/pool.js';

// Initialize Sentry for error monitoring and performance tracking
const SENTRY_DSN = process.env.SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({
        request: true,
        serverName: true,
        transaction: true,
      }),
      nodeProfilingIntegration(),
    ],
    // Set sample rate for errors
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
} else if (process.env.NODE_ENV === 'production') {
  console.warn('⚠️  Sentry DSN not configured. Error monitoring disabled.');
}

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// Sentry request handler - attach trace data to requests
if (SENTRY_DSN) {
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================

// Helmet: Sets various HTTP headers for security
// WHY: Prevents clickjacking, XSS, MIME sniffing, and other common attacks
app.use(helmet({
  contentSecurityPolicy: false, // Let Cloudflare handle CSP
  crossOriginEmbedderPolicy: false,
}));

// CORS: Only allow requests from our domain
// WHY: Prevents unauthorized domains from making API requests
const corsOptions: cors.CorsOptions = {
  origin: process.env.CORS_ORIGIN || 'https://crm.yourdomain.com',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // Cache preflight for 24 hours
};
app.use(cors(corsOptions));

// Rate limiting: Prevent abuse
// WHY: 100 requests per 15 minutes is reasonable for a CRM with 1-50 users
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  // Trust Cloudflare's CF-Connecting-IP header
  keyGenerator: (req) => {
    return (req.headers['cf-connecting-ip'] as string) ||
           (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
           req.ip || 'unknown';
  },
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 min
  message: { error: 'Too many login attempts, please try again in 15 minutes.' },
  keyGenerator: (req) => {
    return (req.headers['cf-connecting-ip'] as string) ||
           (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
           req.ip || 'unknown';
  },
});
app.use('/api/auth/login', authLimiter);

// =============================================================================
// GENERAL MIDDLEWARE
// =============================================================================

// Request tracing: Add X-Request-ID headers for debugging
app.use(tracingMiddleware);

// Parse JSON bodies (limit to 10MB for file metadata)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression: Reduce bandwidth usage
app.use(compression());

// Logging: Combined format for production, dev format for development
const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(logFormat, {
  // Skip health check logging to reduce noise
  skip: (req) => req.url === '/api/health',
}));

// Trust proxy (Cloudflare + Nginx)
// WHY: Required for rate limiting to use the real client IP, not the proxy IP
app.set('trust proxy', 2); // 2 proxies: Cloudflare → Nginx

// =============================================================================
// ROUTES
// =============================================================================

// Health check (unauthenticated — used by Docker, Uptime Kuma, load balancers)
app.use('/api/health', healthRouter);

// Authentication (login, register, refresh)
app.use('/api/auth', authRouter);

// Protected routes — require valid JWT
app.use('/api/clients', authenticate, clientsRouter);
app.use('/api/uploads', authenticate, uploadsRouter);

// 404 handler for unknown API routes
app.use('/api/*', notFoundHandler);

// Sentry error handler - must be last, before custom error handler
if (SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

// Global error handler
app.use(errorHandler);

// =============================================================================
// SERVER STARTUP
// =============================================================================

async function startServer() {
  try {
    // Test database connection before starting
    await testConnection();
    console.log('✅ Database connection verified');

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 SolarCRM API running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 CORS origin: ${corsOptions.origin}`);
    });

    // Graceful shutdown
    // WHY: Allows in-flight requests to complete before shutting down.
    // Critical for zero-downtime deployments.
    const shutdown = async (signal: string) => {
      console.log(`\n⚠️  ${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        console.log('🔌 HTTP server closed');

        // Close database pool
        await pool.end();
        console.log('🗄️  Database pool closed');

        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
