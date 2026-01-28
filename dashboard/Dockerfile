# ---- Dashboard: Next.js ----
# This is the DASHBOARD Dockerfile - NOT the backend
# Cache bust: 2026-01-28-v2

# Build stage
FROM node:20-slim AS builder

# Force cache invalidation for dashboard builds
ARG CACHEBUST=1
LABEL service="dashboard"

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

COPY . .

# Build arguments for Next.js (available at build time)
ARG NEXT_PUBLIC_BOT_API_URL=http://localhost:3001

ENV NEXT_PUBLIC_BOT_API_URL=$NEXT_PUBLIC_BOT_API_URL

RUN npm run build

# Production stage
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
