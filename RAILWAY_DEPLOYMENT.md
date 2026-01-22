# 🚀 Railway Deployment Checkliste

**Status**: ⚠️ **Fast bereit - einige Anpassungen empfohlen**

---

## ✅ Was bereits funktioniert

### 1. ✅ PostgreSQL Integration
- ✅ Prisma ORM konfiguriert
- ✅ `DATABASE_URL` wird aus Environment gelesen
- ✅ Alle Daten-Operationen nutzen PostgreSQL
- ✅ Schema definiert in `prisma/schema.prisma`

### 2. ✅ Package.json
- ✅ `build` Script vorhanden: `tsc`
- ✅ `start` Script vorhanden: `node dist/index.js`
- ✅ Alle Dependencies korrekt definiert
- ✅ `type: "module"` für ES Modules

### 3. ✅ .gitignore
- ✅ `node_modules/` ignoriert
- ✅ `dist/` ignoriert
- ✅ `.env` ignoriert (sensible Daten)
- ✅ `*.log` ignoriert

### 4. ✅ Code-Qualität
- ✅ TypeScript kompiliert ohne Fehler
- ✅ Keine Google Sheets Abhängigkeiten mehr
- ✅ App läuft stabil lokal

---

## ⚠️ Empfohlene Anpassungen für Railway

### 1. ⚠️ Build & Start Scripts optimieren

**Aktuell:**
```json
"scripts": {
  "build": "tsc",
  "start": "node dist/index.js"
}
```

**Empfohlen - Füge hinzu:**
```json
"scripts": {
  "build": "prisma generate && tsc",
  "start": "node dist/index.js",
  "railway:build": "prisma generate && tsc",
  "railway:start": "prisma db push --accept-data-loss && node dist/index.js"
}
```

**Warum?**
- `prisma generate` muss vor dem Build laufen
- `prisma db push` synchronisiert das Schema beim Start
- Railway nutzt automatisch `build` und `start` Scripts

### 2. ⚠️ .env.example erstellen

**Erstelle `.env.example` für Dokumentation:**
```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_GUILD_ID=your_guild_id_here

# PostgreSQL Database (Railway provides this automatically)
DATABASE_URL=postgresql://user:password@host:port/database

# Discord OAuth Configuration
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
DISCORD_REDIRECT_URI=https://your-app.railway.app/auth/callback

# Admin Dashboard Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=your_bcrypt_hash_here

# JWT Secret (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your_jwt_secret_here

# Dashboard URL (for CORS)
DASHBOARD_URL=https://your-dashboard.railway.app/
```

### 3. ⚠️ Railway-spezifische Konfiguration

**Option A: Erstelle `railway.toml` (empfohlen):**
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm run start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

**Option B: Nutze Nixpacks (automatisch):**
Railway erkennt automatisch Node.js Projekte und nutzt die `package.json` Scripts.

### 4. ⚠️ Health Check Endpoint

**Bereits vorhanden** ✅ in `apiServer.ts`:
```typescript
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});
```

Railway kann diesen für Health Checks nutzen.

### 5. ⚠️ Port-Konfiguration

**Prüfe ob der Port flexibel ist:**
```typescript
// In apiServer.ts sollte stehen:
const PORT = process.env.PORT || 3001;
```

Railway setzt automatisch `PORT` Environment Variable.

---

## 📋 Railway Deployment Schritte

### Vorbereitung (lokal):

1. **Build Script anpassen:**
```bash
# In package.json
"build": "prisma generate && tsc"
```

2. **`.env.example` erstellen** (siehe oben)

3. **Commit & Push zu GitHub:**
```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

### In Railway:

1. **Neues Projekt erstellen:**
   - "New Project" → "Deploy from GitHub repo"
   - Repository auswählen

2. **PostgreSQL Datenbank hinzufügen:**
   - "New" → "Database" → "Add PostgreSQL"
   - Railway erstellt automatisch `DATABASE_URL`

3. **Environment Variables setzen:**
   ```
   DISCORD_TOKEN=...
   DISCORD_GUILD_ID=...
   DISCORD_CLIENT_ID=...
   DISCORD_CLIENT_SECRET=...
   DISCORD_REDIRECT_URI=https://your-app.railway.app/auth/callback
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD_HASH=...
   JWT_SECRET=...
   DASHBOARD_URL=https://your-dashboard.railway.app/
   ```
   
   **Wichtig:** `DATABASE_URL` wird automatisch von Railway gesetzt!

4. **Deploy:**
   - Railway baut und startet automatisch
   - Nutzt `npm run build` und `npm start`

5. **Prisma Schema pushen:**
   - Entweder im Start-Script: `prisma db push`
   - Oder manuell in Railway CLI: `railway run prisma db push`

---

## ⚠️ Wichtige Hinweise

### 1. Prisma Client Generation
**Problem:** Prisma Client muss nach `npm install` generiert werden.

**Lösung A (empfohlen):** Füge zu `package.json` hinzu:
```json
"scripts": {
  "postinstall": "prisma generate"
}
```

**Lösung B:** Nutze `build` Script:
```json
"build": "prisma generate && tsc"
```

### 2. Database Migrations
**Für Staging:**
```bash
# Nutze db:push (keine Migration-Files)
prisma db push --accept-data-loss
```

**Für Production (später):**
```bash
# Nutze Migrations
prisma migrate deploy
```

### 3. CORS Configuration
Stelle sicher, dass `DASHBOARD_URL` in Railway Environment gesetzt ist:
```typescript
// In apiServer.ts
const allowedOrigins = [
  process.env.DASHBOARD_URL,
  'http://localhost:3000'
];
```

### 4. Secrets Management
**NIEMALS committen:**
- ❌ `.env` Datei
- ❌ `credentials.json` (bereits gelöscht ✅)
- ❌ Private Keys

**Nur in Railway Environment Variables setzen!**

---

## ✅ Finale Checkliste vor Deployment

- [ ] `package.json` Build-Script angepasst: `"build": "prisma generate && tsc"`
- [ ] `.env.example` erstellt
- [ ] Port-Konfiguration geprüft (`process.env.PORT`)
- [ ] Alle sensiblen Daten in `.gitignore`
- [ ] Code committed und gepusht
- [ ] Railway Projekt erstellt
- [ ] PostgreSQL Datenbank in Railway hinzugefügt
- [ ] Environment Variables in Railway gesetzt
- [ ] Deployment gestartet
- [ ] Health Check funktioniert (`/api/health`)
- [ ] Bot verbindet sich zu Discord
- [ ] Datenbank-Verbindung funktioniert

---

## 🎯 Zusammenfassung

**Ist das Projekt bereit für Railway?**

**✅ Technisch: JA** - Der Code ist sauber und funktioniert
**⚠️ Konfiguration: FAST** - Einige kleine Anpassungen empfohlen

**Minimale Änderungen für Deployment:**
1. Build-Script anpassen: `"build": "prisma generate && tsc"`
2. `.env.example` erstellen (für Dokumentation)
3. Environment Variables in Railway setzen

**Dann kann es direkt deployed werden!** 🚀

---

**Nächste Schritte:**
1. Soll ich die empfohlenen Änderungen jetzt vornehmen?
2. Oder möchtest du es so wie es ist deployen und später optimieren?
