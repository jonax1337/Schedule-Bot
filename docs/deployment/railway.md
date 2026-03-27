# Railway Deployment

## Uebersicht

Schedule-Bot kann auf [Railway](https://railway.app) deployed werden. Die Konfiguration liegt in `railway.toml`.

## Konfiguration

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/api/health"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 5
```

## Setup

### 1. Projekt erstellen

1. Railway Dashboard oeffnen
2. "New Project" → "Deploy from GitHub repo"
3. Repository verbinden

### 2. PostgreSQL hinzufuegen

1. Im Projekt: "New" → "Database" → "Add PostgreSQL"
2. Railway erstellt automatisch `DATABASE_URL`

### 3. Umgebungsvariablen setzen

Im Railway Dashboard unter "Variables":

```
DISCORD_TOKEN=...
DISCORD_GUILD_ID=...
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=...
JWT_SECRET=...
DASHBOARD_URL=https://dein-dashboard.railway.app
```

### 4. Dashboard Service

Fuer das Dashboard einen separaten Service erstellen:
1. "New" → "Service"
2. Root Directory: `dashboard`
3. Variablen setzen:
   ```
   BOT_API_URL=http://schedule-bot-backend.railway.internal:3001
   NEXT_PUBLIC_BOT_API_URL=https://dein-backend.railway.app
   ```

## Health Check

Der Bot stellt `/api/health` bereit. Railway nutzt diesen Endpunkt um den Service-Status zu ueberpruefen.

## Automatisches Deployment

Railway deployed automatisch bei jedem Push auf den `main` Branch.
