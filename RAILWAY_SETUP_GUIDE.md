# 🚂 Railway Deployment - Schritt für Schritt

## 📍 Wo führe ich `railway run npx prisma db push` aus?

### Option 1: Railway CLI (Empfohlen)

**Installation:**
```bash
# Railway CLI installieren
npm install -g @railway/cli

# Login
railway login

# Mit deinem Projekt verbinden
railway link
```

**Dann Schema pushen:**
```bash
# Dieser Command wird LOKAL ausgeführt, aber auf der Railway-Datenbank
railway run npx prisma db push --accept-data-loss
```

**Was passiert:**
- ✅ Command läuft auf deinem lokalen Computer
- ✅ Verbindet sich automatisch zur Railway PostgreSQL Datenbank
- ✅ Nutzt die `DATABASE_URL` aus Railway
- ✅ Pusht das Prisma Schema zur Railway DB

### Option 2: Railway Dashboard (Alternative)

1. Gehe zu deinem Railway Projekt
2. Klicke auf deinen Service (Bot)
3. Tab "Settings" → "Deploy Logs"
4. Warte bis erster Deploy fertig ist
5. Dann in "Settings" → "Variables" → Füge hinzu:
   ```
   RAILWAY_RUN_COMMAND=npx prisma db push --accept-data-loss
   ```
6. Oder nutze das Railway Dashboard Terminal (falls verfügbar)

### Option 3: Nach dem Deploy manuell

**Wenn die App bereits läuft:**
```bash
# Via Railway CLI
railway shell
npx prisma db push --accept-data-loss
```

---

## 🔑 DATABASE_URL - Automatisches Verhalten

### ✅ JA, DATABASE_URL wird automatisch gesetzt!

**Wie es funktioniert:**

1. **Du fügst PostgreSQL Datenbank hinzu:**
   - Railway Dashboard → "New" → "Database" → "Add PostgreSQL"

2. **Railway erstellt automatisch:**
   ```
   DATABASE_URL=postgresql://postgres:RANDOM_PASSWORD@containers-us-west-XXX.railway.app:XXXX/railway
   ```

3. **Railway verlinkt automatisch:**
   - Die `DATABASE_URL` wird automatisch zu deinem Service hinzugefügt
   - Du siehst sie in "Variables" Tab
   - Du musst sie NICHT manuell setzen!

### ⚠️ WICHTIG: Nicht überschreiben!

**FALSCH:**
```
❌ DATABASE_URL=postgresql://... (manuell setzen)
```

**RICHTIG:**
```
✅ Lass Railway die DATABASE_URL automatisch setzen
✅ Füge nur andere Environment Variables hinzu:
   - DISCORD_TOKEN
   - DISCORD_GUILD_ID
   - ADMIN_USERNAME
   - etc.
```

### 🔍 So überprüfst du es:

**In Railway Dashboard:**
1. Gehe zu deinem Service
2. Tab "Variables"
3. Du solltest sehen:
   ```
   DATABASE_URL (von PostgreSQL Service verlinkt)
   DISCORD_TOKEN (von dir gesetzt)
   DISCORD_GUILD_ID (von dir gesetzt)
   ...
   ```

**Via Railway CLI:**
```bash
railway variables
# Zeigt alle Environment Variables inklusive DATABASE_URL
```

---

## 📋 Kompletter Railway Setup Workflow

### Schritt 1: Code zu GitHub pushen
```bash
git add .
git commit -m "feat: migrate from Google Sheets to PostgreSQL

BREAKING CHANGE: Complete migration from Google Sheets to PostgreSQL database

- Remove all Google Sheets dependencies and code (~2000 lines)
- Implement PostgreSQL with Prisma ORM (6 new database modules)
- Update all modules to use PostgreSQL (12 files)
- Remove googleapis package and credentials
- Configure for Railway deployment (flexible PORT, build scripts)
- Add postinstall script for Prisma client generation

Migration includes:
- 14 schedules migrated
- 7 user mappings migrated
- 8 settings migrated
- 2 scrims migrated

Closes #migration-to-postgresql"

git push origin main
```

### Schritt 2: Railway Projekt erstellen
1. Gehe zu [railway.app](https://railway.app)
2. "New Project"
3. "Deploy from GitHub repo"
4. Wähle dein Repository
5. Railway startet automatisch den ersten Deploy

### Schritt 3: PostgreSQL hinzufügen
1. Im Railway Projekt Dashboard
2. "New" → "Database" → "Add PostgreSQL"
3. **Fertig!** DATABASE_URL wird automatisch gesetzt

### Schritt 4: Environment Variables setzen
**Nur diese manuell hinzufügen:**
```
DISCORD_TOKEN=dein_token
DISCORD_GUILD_ID=deine_guild_id
DISCORD_CLIENT_ID=deine_client_id (optional)
DISCORD_CLIENT_SECRET=dein_secret (optional)
DISCORD_REDIRECT_URI=https://deine-app.railway.app/auth/callback
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=dein_bcrypt_hash
JWT_SECRET=dein_jwt_secret
DASHBOARD_URL=https://dein-dashboard.railway.app/
```

**DATABASE_URL NICHT setzen** - wird automatisch von PostgreSQL Service gesetzt!

### Schritt 5: Schema zur Datenbank pushen

**Via Railway CLI (empfohlen):**
```bash
# Railway CLI installieren (einmalig)
npm install -g @railway/cli

# Login
railway login

# Projekt verbinden
railway link

# Schema pushen
railway run npx prisma db push --accept-data-loss
```

**Oder via Railway Shell:**
```bash
railway shell
npx prisma db push --accept-data-loss
exit
```

### Schritt 6: Deployment verifizieren

**Logs checken:**
```bash
railway logs
```

**Erwartete Ausgabe:**
```
✅ Database connected successfully
✅ Settings loaded from PostgreSQL
✅ Discord bot ready - Logged in as Schedule Bot#...
✅ API Server started - Listening on port XXXX
```

**Health Check:**
```bash
curl https://deine-app.railway.app/api/health
# {"status":"ok"}
```

---

## 🎯 Zusammenfassung

### Wo wird `railway run npx prisma db push` ausgeführt?
**Antwort:** Auf deinem **lokalen Computer** mit Railway CLI installiert.

### Wird DATABASE_URL automatisch gesetzt?
**Antwort:** **JA!** Wenn du PostgreSQL in Railway hinzufügst, wird `DATABASE_URL` automatisch erstellt und mit deinem Service verlinkt. Du musst sie **NICHT** manuell setzen.

### Was muss ich manuell setzen?
**Antwort:** Nur die anderen Environment Variables (DISCORD_TOKEN, etc.). DATABASE_URL wird von Railway verwaltet.

---

## 🚨 Troubleshooting

### "DATABASE_URL not found"
**Lösung:** Stelle sicher, dass PostgreSQL Service mit deinem Bot Service verlinkt ist.

### "Permission denied" beim Schema Push
**Lösung:** Railway CLI neu installieren und `railway login` ausführen.

### Schema Push schlägt fehl
**Lösung:** 
```bash
# Prüfe ob Railway CLI verbunden ist
railway status

# Neu verbinden falls nötig
railway link
```

### App startet, aber keine DB Verbindung
**Lösung:** Prüfe in Railway Dashboard ob DATABASE_URL in "Variables" Tab sichtbar ist.

---

**Railway macht es dir einfach - DATABASE_URL wird automatisch verwaltet!** ✅
