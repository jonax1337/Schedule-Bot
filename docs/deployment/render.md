# Render Deployment

## Uebersicht

Schedule-Bot kann auf [Render](https://render.com) deployed werden. Die Konfiguration liegt in `render.yaml` (Blueprint).

## Blueprint

Die `render.yaml` definiert alle Services und die Datenbank:

### Datenbank

```yaml
databases:
  - name: schedule-bot-db
    databaseName: schedule_bot
    user: schedule_bot_user
    plan: free
```

### Backend Service

```yaml
services:
  - type: web
    name: schedule-bot-backend
    runtime: docker
    dockerfilePath: ./Dockerfile
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: schedule-bot-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: NODE_ENV
        value: production
```

### Dashboard Service

```yaml
  - type: web
    name: schedule-bot-dashboard
    runtime: docker
    dockerfilePath: ./dashboard/Dockerfile
    dockerContext: ./dashboard
    envVars:
      - key: NODE_ENV
        value: production
```

## Setup

### 1. Blueprint deployen

1. Render Dashboard → "New" → "Blueprint"
2. GitHub Repository verbinden
3. Render erkennt `render.yaml` automatisch
4. Services und Datenbank werden erstellt

### 2. Sync-Variablen setzen

Folgende Variablen muessen manuell gesetzt werden (als "Synced" markiert):

- `DISCORD_TOKEN`
- `DISCORD_GUILD_ID`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI`
- `ADMIN_PASSWORD_HASH`
- `DASHBOARD_URL`
- `BOT_API_URL`
- `NEXT_PUBLIC_BOT_API_URL`

### 3. Deploy

Nach dem Setzen aller Variablen: "Manual Deploy" → "Clear build cache & deploy".

## Hinweise

- Render Free Tier: Services schlafen nach 15 Minuten Inaktivitaet ein
- Fuer einen Discord Bot ist der Paid Plan empfohlen (Always On)
- `JWT_SECRET` wird automatisch generiert
- `DATABASE_URL` wird automatisch von der Datenbank uebernommen
