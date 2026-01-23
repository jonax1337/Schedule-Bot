import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiLimiter } from '../shared/middleware/rateLimiter.js';
import { logger } from '../shared/utils/logger.js';
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
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));

// Security: CORS with whitelist
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://schedule-bot-dashboard.up.railway.app',
  'https://schedule-bot-dashboard-production.up.railway.app',
  process.env.DASHBOARD_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(express.json({ limit: '1mb' }));

// Security: Rate limiting for all API routes
app.use('/api', apiLimiter);

// Mount all API routes
app.use('/api', apiRoutes);

// Export startApiServer function
export function startApiServer(): void {
  app.listen(PORT, () => {
    console.log(`API Server listening on port ${PORT}`);
    logger.success('API Server started', `Listening on port ${PORT}`);
  });
}

export { app };
