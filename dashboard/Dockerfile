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

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000
