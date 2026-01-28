# ---- Backend: Discord Bot + API Server ----

# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install dependencies (skip postinstall, we run prisma generate explicitly below)
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Copy prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source and build
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

# Copy prisma schema + generated client (Prisma 7.x outputs to custom path only)
COPY prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated

# Copy built application
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Run migrations and start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
