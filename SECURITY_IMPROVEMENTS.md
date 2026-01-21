# Security Improvements Roadmap

## Phase 1: Critical Security Fixes (1-2 Wochen)

### 1. JWT-basierte API-Authentifizierung

**Installation:**
```bash
npm install jsonwebtoken bcrypt express-rate-limit helmet
npm install --save-dev @types/jsonwebtoken @types/bcrypt
```

**Implementierung:**

#### a) JWT Middleware (`src/middleware/auth.ts`)
```typescript
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const JWT_EXPIRES_IN = '24h';

export interface AuthRequest extends Request {
  user?: {
    username: string;
    role: 'admin' | 'user';
  };
}

export function generateToken(username: string, role: 'admin' | 'user'): string {
  return jwt.sign({ username, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { username: string; role: string };
    req.user = decoded as { username: string; role: 'admin' | 'user' };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
```

#### b) Password Hashing (`src/auth/passwordManager.ts`)
```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Migration: Hash existing password on first run
export async function migrateAdminPassword() {
  const plainPassword = process.env.ADMIN_PASSWORD;
  if (!plainPassword) throw new Error('ADMIN_PASSWORD not set');
  
  const hashedPassword = await hashPassword(plainPassword);
  console.log('Hashed password (store this in .env as ADMIN_PASSWORD_HASH):');
  console.log(hashedPassword);
}
```

#### c) Update Login Endpoint
```typescript
import { generateToken } from './middleware/auth.js';
import { verifyPassword } from './auth/passwordManager.js';

app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Use hashed password from env
    const storedPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    
    if (username === config.admin.username && 
        await verifyPassword(password, storedPasswordHash)) {
      
      const token = generateToken(username, 'admin');
      
      logger.success('Admin login successful', `User: ${username}`);
      
      res.json({ 
        success: true, 
        token,
        expiresIn: '24h'
      });
    } else {
      logger.warn('Admin login failed', `Invalid credentials for: ${username}`);
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Error during admin login:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});
```

#### d) Protect All Admin Routes
```typescript
import { verifyToken, requireAdmin } from './middleware/auth.js';

// Apply to all /api routes except login
app.use('/api', (req, res, next) => {
  if (req.path === '/admin/login' || req.path === '/health') {
    return next();
  }
  verifyToken(req, res, next);
});

// Admin-only routes
app.get('/api/settings', requireAdmin, async (req, res) => { ... });
app.post('/api/settings', requireAdmin, async (req, res) => { ... });
app.post('/api/user-mappings', requireAdmin, async (req, res) => { ... });
// ... etc
```

### 2. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// Login rate limiting (stricter)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/admin/login', loginLimiter, async (req, res) => { ... });

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'Too many requests, please slow down' },
});

app.use('/api', apiLimiter);
```

### 3. Security Headers (Helmet)

```typescript
import helmet from 'helmet';

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
    preload: true,
  },
}));
```

### 4. CORS Configuration

```typescript
import cors from 'cors';

const allowedOrigins = [
  'http://localhost:3000',
  'https://your-production-domain.com',
  process.env.DASHBOARD_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### 5. Input Validation

```bash
npm install joi
npm install --save-dev @types/joi
```

```typescript
import Joi from 'joi';

// Validation schemas
const updateCellSchema = Joi.object({
  row: Joi.number().integer().min(1).max(1000).required(),
  column: Joi.string().pattern(/^[A-Z]+$/).required(),
  value: Joi.string().max(100).allow('').required(),
});

const addScrimSchema = Joi.object({
  date: Joi.string().pattern(/^\d{2}\.\d{2}\.\d{4}$/).required(),
  opponent: Joi.string().min(1).max(100).required(),
  result: Joi.string().valid('win', 'loss', 'draw').required(),
  scoreUs: Joi.number().integer().min(0).max(100).required(),
  scoreThem: Joi.number().integer().min(0).max(100).required(),
  map: Joi.string().max(50).allow(''),
  matchType: Joi.string().max(50).allow(''),
  ourAgents: Joi.array().items(Joi.string().max(50)).max(5),
  theirAgents: Joi.array().items(Joi.string().max(50)).max(5),
  vodUrl: Joi.string().uri().allow(''),
  notes: Joi.string().max(500).allow(''),
});

// Validation middleware
function validate(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details.map(d => d.message) 
      });
    }
    next();
  };
}

// Usage
app.post('/api/sheet-data/update', 
  verifyToken, 
  validate(updateCellSchema), 
  async (req, res) => { ... }
);
```

### 6. Sanitize Output (XSS Prevention)

```bash
npm install dompurify jsdom
npm install --save-dev @types/dompurify
```

```typescript
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

export function sanitizeString(input: string): string {
  return purify.sanitize(input, { ALLOWED_TAGS: [] });
}

// Use in sheet operations
await updateSheetCell(row, column, sanitizeString(value));
```

---

## Phase 2: Infrastructure & Deployment (1 Woche)

### 1. Dockerfile

```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY src ./src

# Build
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built files
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start
CMD ["node", "dist/index.js"]
```

### 2. Docker Compose

```yaml
version: '3.8'

services:
  bot:
    build: .
    container_name: schedule-bot
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DISCORD_TOKEN=${DISCORD_TOKEN}
      - DISCORD_GUILD_ID=${DISCORD_GUILD_ID}
      - GOOGLE_SHEET_ID=${GOOGLE_SHEET_ID}
      - ADMIN_USERNAME=${ADMIN_USERNAME}
      - ADMIN_PASSWORD_HASH=${ADMIN_PASSWORD_HASH}
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./credentials.json:/app/credentials.json:ro
      - logs:/app/logs
    ports:
      - "3001:3001"
    networks:
      - bot-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  dashboard:
    build: ./dashboard
    container_name: schedule-dashboard
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_BOT_API_URL=http://bot:3001
    ports:
      - "3000:3000"
    depends_on:
      - bot
    networks:
      - bot-network

  # Optional: Redis for session storage
  redis:
    image: redis:7-alpine
    container_name: schedule-redis
    restart: unless-stopped
    volumes:
      - redis-data:/data
    networks:
      - bot-network

volumes:
  logs:
  redis-data:

networks:
  bot-network:
    driver: bridge
```

### 3. Environment-spezifische Configs

```typescript
// src/config/environment.ts
export const environment = {
  production: {
    logLevel: 'error',
    enableDebug: false,
    corsOrigins: ['https://your-domain.com'],
  },
  staging: {
    logLevel: 'warn',
    enableDebug: true,
    corsOrigins: ['https://staging.your-domain.com'],
  },
  development: {
    logLevel: 'info',
    enableDebug: true,
    corsOrigins: ['http://localhost:3000'],
  },
};

export const config = environment[process.env.NODE_ENV || 'development'];
```

### 4. Secrets Management (Empfohlung)

**Option A: Docker Secrets**
```yaml
services:
  bot:
    secrets:
      - discord_token
      - google_credentials
      - admin_password_hash

secrets:
  discord_token:
    file: ./secrets/discord_token.txt
  google_credentials:
    file: ./secrets/credentials.json
  admin_password_hash:
    file: ./secrets/admin_password_hash.txt
```

**Option B: Vault/AWS Secrets Manager**
```typescript
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

async function getSecret(secretName: string): Promise<string> {
  const client = new SecretsManagerClient({ region: "eu-central-1" });
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName })
  );
  return response.SecretString || '';
}
```

---

## Phase 3: Monitoring & Logging (1 Woche)

### 1. Persistent Logging

```bash
npm install winston winston-daily-rotate-file
```

```typescript
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // File - Errors
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
    }),
    // File - All
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
});

export default logger;
```

### 2. Error Tracking (Sentry)

```bash
npm install @sentry/node @sentry/tracing
```

```typescript
import * as Sentry from "@sentry/node";
import * as Tracing from "@sentry/tracing";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Tracing.Integrations.Express({ app }),
  ],
});

// Error handler
app.use(Sentry.Handlers.errorHandler());
```

### 3. Metrics (Prometheus)

```bash
npm install prom-client
```

```typescript
import client from 'prom-client';

const register = new client.Registry();

// Default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const discordCommandsTotal = new client.Counter({
  name: 'discord_commands_total',
  help: 'Total number of Discord commands processed',
  labelNames: ['command', 'status'],
  registers: [register],
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### 4. Health Checks (erweitert)

```typescript
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      bot: { status: 'unknown' },
      sheets: { status: 'unknown' },
      memory: { status: 'unknown' },
    },
  };

  try {
    // Bot check
    health.checks.bot.status = client.isReady() ? 'healthy' : 'unhealthy';

    // Sheets check
    try {
      await testConnection();
      health.checks.sheets.status = 'healthy';
    } catch {
      health.checks.sheets.status = 'unhealthy';
      health.status = 'degraded';
    }

    // Memory check
    const memUsage = process.memoryUsage();
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    health.checks.memory = {
      status: memUsagePercent < 90 ? 'healthy' : 'unhealthy',
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});
```

---

## Phase 4: Backup & Disaster Recovery (3 Tage)

### 1. Automated Google Sheets Backup

```typescript
import { google } from 'googleapis';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

async function backupSheet(): Promise<void> {
  const sheets = await getAuthenticatedClient();
  const drive = google.drive({ version: 'v3', auth: sheets.auth });

  // Export as Excel
  const response = await drive.files.export({
    fileId: config.googleSheets.sheetId,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }, { responseType: 'stream' });

  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const filename = `backups/schedule-backup-${timestamp}.xlsx`;

  await pipeline(
    response.data,
    createWriteStream(filename)
  );

  logger.info('Backup created', filename);

  // Upload to S3/Cloud Storage (optional)
  // await uploadToS3(filename);

  // Cleanup old backups (keep last 30 days)
  await cleanupOldBackups(30);
}

// Schedule daily backup
cron.schedule('0 2 * * *', backupSheet, { timezone: 'Europe/Berlin' });
```

### 2. Restore Procedure

```typescript
async function restoreFromBackup(backupFile: string): Promise<void> {
  // 1. Validate backup file
  if (!existsSync(backupFile)) {
    throw new Error('Backup file not found');
  }

  // 2. Create new sheet or clear existing
  logger.warn('Starting restore process...');

  // 3. Import data
  const sheets = await getAuthenticatedClient();
  // ... import logic

  logger.success('Restore completed');
}
```

---

## Phase 5: Testing & CI/CD (1 Woche)

### 1. Unit Tests

```bash
npm install --save-dev jest ts-jest @types/jest
```

```typescript
// src/__tests__/analyzer.test.ts
import { parseTimeRange, calculateOverlappingTime } from '../analyzer';

describe('Analyzer', () => {
  describe('parseTimeRange', () => {
    it('should parse valid time range', () => {
      const result = parseTimeRange('14:00-20:00');
      expect(result).toEqual({ start: '14:00', end: '20:00' });
    });

    it('should handle single time', () => {
      const result = parseTimeRange('14:00');
      expect(result).toEqual({ start: '14:00', end: '23:59' });
    });

    it('should return null for "x"', () => {
      const result = parseTimeRange('x');
      expect(result).toBeNull();
    });
  });

  describe('calculateOverlappingTime', () => {
    it('should calculate overlap correctly', () => {
      const ranges = [
        { start: '14:00', end: '20:00' },
        { start: '15:00', end: '22:00' },
      ];
      const result = calculateOverlappingTime(ranges);
      expect(result).toEqual({ start: '15:00', end: '20:00' });
    });
  });
});
```

### 2. Integration Tests

```typescript
// src/__tests__/api.test.ts
import request from 'supertest';
import { app } from '../apiServer';

describe('API Endpoints', () => {
  let authToken: string;

  beforeAll(async () => {
    // Login
    const response = await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: 'test' });
    authToken = response.body.token;
  });

  it('should require authentication', async () => {
    const response = await request(app).get('/api/settings');
    expect(response.status).toBe(401);
  });

  it('should get settings with valid token', async () => {
    const response = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${authToken}`);
    expect(response.status).toBe(200);
  });
});
```

### 3. GitHub Actions CI/CD

```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Security audit
        run: npm audit --audit-level=moderate

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker build -t schedule-bot:latest .
      
      - name: Push to registry
        run: |
          echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin
          docker push schedule-bot:latest
```

---

## Zusammenfassung: Prioritäten

### 🔴 **SOFORT (Diese Woche):**
1. JWT-Authentifizierung implementieren
2. Rate Limiting hinzufügen
3. Input-Validierung mit Joi
4. CORS richtig konfigurieren
5. Passwörter hashen

### 🟡 **DRINGEND (Nächste 2 Wochen):**
6. Dockerfile & Docker Compose
7. Persistent Logging (Winston)
8. Health Checks erweitern
9. Backup-System implementieren

### 🟢 **WICHTIG (Nächster Monat):**
10. Monitoring (Prometheus/Grafana)
11. Error Tracking (Sentry)
12. Testing-Suite
13. CI/CD Pipeline

---

## Geschätzte Kosten

**Infrastruktur (monatlich):**
- VPS/Cloud Server: €10-30
- Domain: €1-2
- SSL-Zertifikat: €0 (Let's Encrypt)
- Sentry (Error Tracking): €0-26 (Free tier ausreichend)
- Backup Storage: €2-5

**Total: ~€15-65/Monat**

---

## Empfohlene Tools/Services

1. **Hosting:** Hetzner Cloud, DigitalOcean, AWS EC2
2. **Monitoring:** Grafana Cloud (Free tier), Uptime Robot
3. **Logging:** Better Stack (ehemals Logtail), Papertrail
4. **Error Tracking:** Sentry
5. **Secrets:** Doppler, AWS Secrets Manager
6. **CI/CD:** GitHub Actions (kostenlos)
