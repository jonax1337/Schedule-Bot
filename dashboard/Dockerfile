# ===============================================
# Dashboard: Next.js Frontend
# This is NOT the backend - uses Alpine base image
# ===============================================

# Build stage - use Alpine to avoid cache sharing with backend (which uses slim)
FROM node:20-alpine AS nextjs-builder

# Install libc6-compat for Alpine
RUN apk add --no-cache libc6-compat

WORKDIR /dashboard

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Copy source files
COPY . .

# Build arguments for Next.js
ARG NEXT_PUBLIC_BOT_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_BOT_API_URL=$NEXT_PUBLIC_BOT_API_URL

# Build the Next.js application
RUN npm run build

# Production stage
FROM node:20-alpine AS nextjs-runner

WORKDIR /dashboard

ENV NODE_ENV=production
ENV PORT=3000

# Copy standalone output from builder
COPY --from=nextjs-builder /dashboard/.next/standalone ./
COPY --from=nextjs-builder /dashboard/.next/static ./.next/static
COPY --from=nextjs-builder /dashboard/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
