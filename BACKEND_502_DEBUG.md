# 🔴 Backend 502 Bad Gateway - Debugging Guide

## Problem:
```
GET https://schedule-bot-backend-sql.up.railway.app/api/settings net::ERR_FAILED 502 (Bad Gateway)
```

**502 Bad Gateway bedeutet:** Das Backend ist down oder crashed beim Start!

---

## 🔍 Debugging Schritte:

### 1. Railway Backend Logs prüfen

**Via Railway Dashboard:**
1. Railway Dashboard öffnen
2. **Backend Service** (schedule-bot-backend-sql) auswählen
3. Tab **"Deployments"** → Neuestes Deployment anklicken
4. **"View Logs"** klicken

**Via Railway CLI:**
```bash
npx @railway/cli logs --service schedule-bot-backend-sql
```

---

## 🎯 Was du in den Logs suchst:

### ✅ Erfolgreicher Start sieht so aus:
```
[CORS] Allowed origins: [ 'http://localhost:3000', 'http://127.0.0.1:3000', 'https://schedule-dashboard-sql.up.railway.app' ]
[CORS] DASHBOARD_URL from env: https://schedule-dashboard-sql.up.railway.app
✅ Database connected successfully
PostgreSQL connection successful!
Settings loaded successfully!
API Server started on port XXXX
Discord bot ready
```

### ❌ Häufige Fehler:

#### 1. Discord Intent Fehler:
```
Fatal error: Error: Used disallowed intents
```
**Fix:** SERVER MEMBERS INTENT im Discord Developer Portal aktivieren

#### 2. Database Connection Fehler:
```
Error: Connection to PostgreSQL failed
```
**Fix:** DATABASE_URL Environment Variable prüfen

#### 3. Missing Environment Variable:
```
Error: Missing required environment variable: DISCORD_TOKEN
```
**Fix:** Fehlende Environment Variable in Railway setzen

#### 4. Port Binding Fehler:
```
Error: listen EADDRINUSE: address already in use :::3001
```
**Fix:** Sollte nicht passieren, Railway setzt PORT automatisch

#### 5. TypeScript/Build Fehler:
```
Error: Cannot find module './config.js'
```
**Fix:** `npm run build` lokal testen, dann neu deployen

---

## 📋 Railway Environment Variables Checkliste:

**Backend Service MUSS haben:**
```
✅ DATABASE_URL (automatisch von PostgreSQL Service)
✅ DISCORD_TOKEN
✅ DISCORD_GUILD_ID
✅ ADMIN_USERNAME
✅ ADMIN_PASSWORD_HASH
✅ JWT_SECRET
✅ DASHBOARD_URL (Reference Variable!)
```

**Optional:**
```
DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET
DISCORD_REDIRECT_URI
```

---

## 🚀 Quick Checks:

### 1. Prüfe ob Backend Service läuft:
```bash
# Via Railway CLI
npx @railway/cli status
```

### 2. Prüfe Environment Variables:
```bash
# Via Railway CLI
npx @railway/cli variables
```

### 3. Prüfe letztes Deployment:
Railway Dashboard → Backend Service → Deployments Tab

**Status sollte sein:** ✅ Success (grün)  
**Nicht:** ❌ Failed (rot) oder ⚠️ Crashed

---

## 🔧 Häufigste Lösungen:

### Lösung 1: Discord Intents aktivieren
1. https://discord.com/developers/applications
2. Deine Bot Application auswählen
3. "Bot" Tab
4. "Privileged Gateway Intents"
5. ✅ SERVER MEMBERS INTENT aktivieren
6. "Save Changes"

### Lösung 2: Environment Variables setzen
Railway Dashboard → Backend Service → Variables Tab

**DASHBOARD_URL als Reference Variable:**
```
Variable Name: DASHBOARD_URL
Service: schedule-dashboard-sql
Variable: RAILWAY_PUBLIC_DOMAIN
Value: https://${{schedule-dashboard-sql.RAILWAY_PUBLIC_DOMAIN}}
```

### Lösung 3: Backend neu deployen
```bash
# Lokale Änderungen committen
git add .
git commit -m "fix: backend configuration"
git push origin main

# Railway deployed automatisch
```

### Lösung 4: Build lokal testen
```bash
cd e:\DEV\schedule-bot
npm run build
npm start

# Wenn lokal funktioniert, dann zu Railway pushen
```

---

## 🎯 Nächste Schritte:

1. **Railway Backend Logs öffnen** (wichtigster Schritt!)
2. **Fehlermeldung finden** (erste Zeile mit "Error:" oder "Fatal error:")
3. **Entsprechende Lösung anwenden**
4. **Backend neu deployen** (falls nötig)
5. **Dashboard testen**

---

## 📝 Logs Beispiele:

### Gute Logs (Backend läuft):
```
[dotenv] injecting env from .env
Using default settings. Call loadSettingsAsync() to load from PostgreSQL.
==================================================
Valorant Schedule Bot
==================================================
Connecting to PostgreSQL database...
[INFO] Connecting to PostgreSQL database
✅ Database connected successfully
PostgreSQL connection successful!
[SUCCESS] PostgreSQL connected
Loading settings...
Settings loaded successfully!
[SUCCESS] Settings loaded
[CORS] Allowed origins: [ 'http://localhost:3000', 'http://127.0.0.1:3000', 'https://schedule-dashboard-sql.up.railway.app' ]
[CORS] DASHBOARD_URL from env: https://schedule-dashboard-sql.up.railway.app
[INFO] Starting Discord bot
Discord bot logged in as: YourBotName#1234
[SUCCESS] Discord bot ready
API Server started on port 8080
```

### Schlechte Logs (Backend crashed):
```
[dotenv] injecting env from .env
Using default settings. Call loadSettingsAsync() to load from PostgreSQL.
==================================================
Valorant Schedule Bot
==================================================
Connecting to PostgreSQL database...
[INFO] Connecting to PostgreSQL database
✅ Database connected successfully
PostgreSQL connection successful!
[SUCCESS] PostgreSQL connected
Loading settings...
Settings loaded successfully!
[SUCCESS] Settings loaded
[INFO] Starting Discord bot
Fatal error: Error: Used disallowed intents
    at WebSocketShard.onClose (/app/node_modules/@discordjs/ws/dist/index.js:1151:18)
    ...
```

---

## ✅ Wenn Backend läuft:

**Du solltest sehen können:**
- ✅ Backend Service Status: "Active" (grün)
- ✅ Logs zeigen "API Server started"
- ✅ Logs zeigen "Discord bot ready"
- ✅ Keine Error Messages

**Dann funktioniert auch:**
- ✅ Dashboard kann API erreichen
- ✅ Keine 502 Fehler mehr
- ✅ CORS funktioniert

---

**Der wichtigste Schritt: RAILWAY LOGS PRÜFEN!** 🔍
