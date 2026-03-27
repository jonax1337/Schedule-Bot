# Docker Deployment

## docker-compose.yml

Das Projekt stellt eine `docker-compose.yml` bereit, die alle drei Services orchestriert.

### Services

```yaml
services:
  db:          # PostgreSQL 16
  bot:         # Backend (Bot + API)
  dashboard:   # Next.js Frontend
```

## Schnellstart

```bash
# 1. .env konfigurieren
cp .env.example .env
# Werte anpassen (DISCORD_TOKEN, ADMIN_PASSWORD_HASH, etc.)

# 2. Starten
docker-compose up -d

# 3. Logs pruefen
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
Setze unbedingt ein sicheres Passwort in der `.env`:
```env
DB_PASSWORD=ein_sicheres_passwort
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
    # ... weitere Variablen
  ports:
    - "3001:3001"
  restart: unless-stopped
```

### Dockerfile (Multi-Stage)

**Builder Stage:**
1. Node 20 Slim + OpenSSL
2. `npm ci --ignore-scripts`
3. Prisma Client generieren
4. TypeScript kompilieren

**Runner Stage:**
1. Nur Production Dependencies
2. Prisma Schema + Generated Client kopieren
3. Kompilierten Code kopieren
4. Start: Migrationen + `node dist/index.js`

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
Diese Variable wird zur **Build-Zeit** eingebettet. Sie muss die oeffentlich erreichbare URL des Bot-API-Servers sein (nicht die interne Docker-URL).
:::

## Volumes

```yaml
volumes:
  pgdata:    # Persistente PostgreSQL-Daten
```

## Netzwerk

Docker Compose erstellt automatisch ein internes Netzwerk. Services kommunizieren ueber ihren Service-Namen:
- Dashboard → Bot: `http://bot:3001`
- Bot → DB: `postgresql://...@db:5432/schedule_bot`

## Updates

```bash
# Neuester Code
git pull

# Neu bauen und starten
docker-compose up -d --build

# Nur einen Service neu bauen
docker-compose up -d --build bot
```

## Troubleshooting

**Datenbank nicht erreichbar:**
```bash
docker-compose logs db
docker-compose exec db pg_isready
```

**Bot startet nicht:**
```bash
docker-compose logs bot
# Haeufig: Fehlende .env Variablen
```

**Dashboard zeigt keine Daten:**
- Pruefen ob `NEXT_PUBLIC_BOT_API_URL` korrekt gesetzt ist
- Pruefen ob Bot-API erreichbar ist: `curl http://localhost:3001/api/health`
