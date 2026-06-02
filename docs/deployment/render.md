# Render Deployment

## Overview

Schedule-Bot can be deployed to [Render](https://render.com). The configuration lives in `render.yaml` (Blueprint).

## Blueprint

`render.yaml` defines all services and the database:

### Database

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

### 1. Deploy the Blueprint

1. Render dashboard -> "New" -> "Blueprint"
2. Connect the GitHub repository
3. Render detects `render.yaml` automatically
4. Services and database are provisioned

### 2. Set synced variables

The following variables must be set manually (marked as "Synced"):

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

Once all variables are set: "Manual Deploy" -> "Clear build cache & deploy".

## Notes

- Render free tier: services go to sleep after 15 minutes of inactivity
- A paid plan (Always On) is recommended for a Discord bot
- `JWT_SECRET` is generated automatically
- `DATABASE_URL` is wired in automatically from the database
