# ---- Backend: Discord Bot + API Server ----
# Cache bust: 2026-01-28-v3

# Build stage
FROM node:20-slim AS builder

# Force cache invalidation when this changes
ARG CACHEBUST=1

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install dependencies (skip postinstall, we run prisma generate explicitly below)
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Dummy DATABASE_URL for entire build stage - satisfies prisma.config.ts validation
# (no actual database connection is made during build)
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"

# Copy prisma schema + config and generate client
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

# Copy source and build (npm run build = prisma generate && tsc)
# Cache bust to ensure new code is always rebuilt
ARG CACHEBUST=1
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production stage
FROM node:20-slim AS runner

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy production dependencies (skip postinstall since we copy generated client from builder)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts

# Copy prisma schema, config + generated client (Prisma 7.x outputs to custom path only)
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY --from=builder /app/src/generated ./src/generated

# Copy built application
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
# PORT is provided by Railway at runtime

EXPOSE 3001

# Run migrations and start
CMD ["sh", "-c", "npx prisma migrate deploy && echo 'Starting Node.js app on port:' $PORT && node dist/index.js"]
