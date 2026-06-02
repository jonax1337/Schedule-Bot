# Docker Deployment

## docker-compose.yml

The project ships with a `docker-compose.yml` that orchestrates all three services.

### Services

```yaml
services:
  db:          # PostgreSQL 16
  bot:         # Backend (bot + API)
  dashboard:   # Next.js frontend
```

## Quick Start

```bash
# 1. Configure .env
cp .env.example .env
# Adjust values (DISCORD_TOKEN, ADMIN_PASSWORD_HASH, etc.)

# 2. Start
docker-compose up -d

# 3. Check logs
docker-compose logs -f bot
docker-compose logs -f dashboard
```

## PostgreSQL Service

```yaml
db:
  image: postgres:16-alpine
  environment:
    POSTGRES_DB: schedule_bot
    POSTGRES_USER: schedule_bot_user
    POSTGRES_PASSWORD: ${DB_PASSWORD:-changeme}
  volumes:
    - pgdata:/var/lib/postgresql/data
  ports:
    - "5432:5432"
  healthcheck:
    test: pg_isready -U schedule_bot_user -d schedule_bot
    interval: 5s
    timeout: 5s
    retries: 5
```

::: warning DB_PASSWORD
Always set a strong password in `.env`:
```env
DB_PASSWORD=a_secure_password
```
:::

## Bot Service

```yaml
bot:
  build: .
  depends_on:
    db:
      condition: service_healthy
  environment:
    DATABASE_URL: postgresql://schedule_bot_user:${DB_PASSWORD}@db:5432/schedule_bot
    DISCORD_TOKEN: ${DISCORD_TOKEN}
    # ... additional variables
  ports:
    - "3001:3001"
  restart: unless-stopped
```

### Dockerfile (multi-stage)

**Builder stage:**
1. Node 20 Slim + OpenSSL
2. `npm ci --ignore-scripts`
3. Generate the Prisma Client
4. Compile TypeScript

**Runner stage:**
1. Production dependencies only
2. Copy the Prisma schema and generated client
3. Copy the compiled code
4. Start: migrations + `node dist/index.js`

## Dashboard Service

```yaml
dashboard:
  build: ./dashboard
  depends_on:
    - bot
  build_args:
    NEXT_PUBLIC_BOT_API_URL: ${NEXT_PUBLIC_BOT_API_URL}
  ports:
    - "3000:3000"
  environment:
    BOT_API_URL: http://bot:3001
    NEXT_PUBLIC_BOT_API_URL: ${NEXT_PUBLIC_BOT_API_URL}
```

::: info NEXT_PUBLIC_BOT_API_URL
This variable is baked in at **build time**. It must point to the publicly reachable URL of the bot API server, not the internal Docker URL.
:::

## Volumes

```yaml
volumes:
  pgdata:    # Persistent PostgreSQL data
```

## Network

Docker Compose creates an internal network automatically. Services talk to each other via their service name:
- Dashboard -> Bot: `http://bot:3001`
- Bot -> DB: `postgresql://...@db:5432/schedule_bot`

## Updates

```bash
# Pull the latest code
git pull

# Rebuild and restart
docker-compose up -d --build

# Rebuild a single service
docker-compose up -d --build bot
```

## Troubleshooting

**Database unreachable:**
```bash
docker-compose logs db
docker-compose exec db pg_isready
```

**Bot won't start:**
```bash
docker-compose logs bot
# Common cause: missing .env variables
```

**Dashboard shows no data:**
- Check that `NEXT_PUBLIC_BOT_API_URL` is set correctly
- Check that the bot API is reachable: `curl http://localhost:3001/api/health`
