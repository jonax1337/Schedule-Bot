# ---- Frontend: Vite + React SPA ----

# Build stage
FROM node:20-slim AS builder

WORKDIR /app

ARG VITE_BOT_API_URL=http://localhost:3001
ENV VITE_BOT_API_URL=${VITE_BOT_API_URL}

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine AS runner

# Listen on $PORT (Railway injects this); fall back to 3000 locally / docker-compose.
# nginx:alpine's entrypoint renders /etc/nginx/templates/*.template via envsubst.
# Restrict substitution to PORT so nginx's own $uri / $host vars stay intact.
ENV PORT=3000
ENV NGINX_ENVSUBST_FILTER=^PORT$

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 3000
