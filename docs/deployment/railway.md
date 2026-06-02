# Railway Deployment

## Overview

Schedule-Bot can be deployed to [Railway](https://railway.app). The configuration lives in `railway.toml`.

## Configuration

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

### 1. Create the project

1. Open the Railway dashboard
2. "New Project" -> "Deploy from GitHub repo"
3. Connect the repository

### 2. Add PostgreSQL

1. In your project: "New" -> "Database" -> "Add PostgreSQL"
2. Railway sets `DATABASE_URL` automatically

### 3. Set environment variables

In the Railway dashboard under "Variables":

```env
DISCORD_TOKEN=...
DISCORD_GUILD_ID=...
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=...
JWT_SECRET=...
DASHBOARD_URL=https://your-dashboard.railway.app
```

### 4. Dashboard service

Create a separate service for the dashboard:
1. "New" -> "Service"
2. Root directory: `dashboard`
3. Set the variables:
   ```env
   BOT_API_URL=http://schedule-bot-backend.railway.internal:3001
   NEXT_PUBLIC_BOT_API_URL=https://your-backend.railway.app
   ```

## Health Check

The bot exposes `/api/health`. Railway uses this endpoint to monitor service status.

## Automatic Deployment

Railway redeploys automatically on every push to the `main` branch.
