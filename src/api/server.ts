import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiLimiter } from '../shared/middleware/rateLimiter.js';
import { resolveTenant } from '../shared/middleware/tenant.js';
import { logger, getErrorMessage } from '../shared/utils/logger.js';
import apiRoutes from './routes/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy - required for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security: Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com"],
      frameAncestors: ["'self'", "http://localhost:3000", "http://127.0.0.1:3000", ...(process.env.DASHBOARD_URL ? [process.env.DASHBOARD_URL] : [])],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  crossOriginResourcePolicy: false,
  frameguard: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// Additional security headers not covered by Helmet
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  next();
});

// Security: CORS with whitelist
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.DASHBOARD_URL,
].filter(Boolean) as string[];

// Multi-tenant: each team is served from its own subdomain. Allow any
// <slug>.synqed.org (prod); the *.localhost dev pattern is enabled only outside
// production so it can never widen the prod allowlist.
const allowedOriginPatterns = [
  // Whole synqed.org zone: the bare apex AND any single-label subdomain
  // (app.synqed.org control plane + every team's <slug>.synqed.org).
  /^https:\/\/([a-z0-9-]+\.)?synqed\.org$/,
  ...(process.env.NODE_ENV !== 'production' ? [/^http:\/\/([a-z0-9-]+\.)?localhost:3000$/] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin only for server-to-server communication
    // (e.g. Next.js API proxy routes calling backend from server side)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin) || allowedOriginPatterns.some((re) => re.test(origin))) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked', `Origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(express.json({ limit: '1mb' }));

// Disable caching for all API responses - live data only
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Health check — must answer BEFORE tenant resolution and rate limiting. The
// platform health probe hits this with no subdomain/tenant and no auth; routing
// it through resolveTenant would 400 ("Unknown tenant") and fail the deploy.
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Security: Rate limiting for all API routes
app.use('/api', apiLimiter);

// Multi-tenancy: resolve the tenant and run each request inside its org context
app.use('/api', resolveTenant);

// Mount all API routes
app.use('/api', apiRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  logger.error('Unhandled route error', getErrorMessage(err));
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export startApiServer function
export function startApiServer() {
  return app.listen(PORT, () => {
    logger.success('API Server started', `Listening on port ${PORT}`);
  });
}

export { app };
