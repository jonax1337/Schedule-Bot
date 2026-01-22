# ✅ BEREIT FÜR RAILWAY DEPLOYMENT

**Status**: ✅ **100% BEREIT**  
**Datum**: 22. Januar 2026, 11:40 Uhr

---

## ✅ Alle kritischen Änderungen durchgeführt

### 1. ✅ PORT flexibel gemacht
```typescript
// src/apiServer.ts
const PORT = process.env.PORT || 3001;
```
Railway kann jetzt den Port dynamisch setzen.

### 2. ✅ Build-Script optimiert
```json
// package.json
"scripts": {
  "build": "prisma generate && tsc",
  "postinstall": "prisma generate"
}
```
- Prisma Client wird automatisch vor dem Build generiert
- Nach `npm install` wird Prisma Client automatisch generiert

### 3. ✅ .env.example bereinigt
- Google Sheets Kommentare entfernt
- Nur noch PostgreSQL relevante Konfiguration
- Dokumentiert alle benötigten Environment Variables

---

## 🚀 Railway Deployment Anleitung

### Schritt 1: GitHub Push
```bash
git add .
git commit -m "Ready for Railway deployment - PostgreSQL migration complete"
git push origin main
```

### Schritt 2: Railway Projekt erstellen
1. Gehe zu [railway.app](https://railway.app)
2. "New Project" → "Deploy from GitHub repo"
3. Wähle dein Repository aus
4. Railway erkennt automatisch Node.js und nutzt die Scripts

### Schritt 3: PostgreSQL Datenbank hinzufügen
1. Im Railway Projekt: "New" → "Database" → "Add PostgreSQL"
2. Railway erstellt automatisch die `DATABASE_URL` Environment Variable
3. Diese wird automatisch mit deinem Service verlinkt

### Schritt 4: Environment Variables setzen
Setze folgende Variables in Railway:

**Erforderlich:**
```
DISCORD_TOKEN=dein_discord_bot_token
DISCORD_GUILD_ID=deine_guild_id
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=dein_bcrypt_hash
JWT_SECRET=dein_jwt_secret_min_32_chars
```

**Optional (für Discord OAuth):**
```
DISCORD_CLIENT_ID=deine_client_id
DISCORD_CLIENT_SECRET=dein_client_secret
DISCORD_REDIRECT_URI=https://deine-app.railway.app/auth/callback
DASHBOARD_URL=https://dein-dashboard.railway.app/
```

**Wichtig:** `DATABASE_URL` wird automatisch von Railway gesetzt!

### Schritt 5: Deploy & Schema Push
1. Railway baut automatisch mit `npm run build`
2. Startet mit `npm start`
3. **Wichtig:** Nach dem ersten Deploy, Schema pushen:
   ```bash
   # In Railway CLI oder über Railway Dashboard
   railway run npx prisma db push --accept-data-loss
   ```

### Schritt 6: Daten migrieren (optional)
Falls du Daten aus Google Sheets migrieren möchtest:
```bash
# Lokal ausführen mit Railway DATABASE_URL
railway run npx tsx scripts/migrate-all-data.ts
```

---

## 📋 Deployment Checkliste

### Vor dem Push:
- [x] PORT flexibel gemacht
- [x] Build-Script angepasst
- [x] postinstall Script hinzugefügt
- [x] .env.example bereinigt
- [x] Build erfolgreich getestet
- [x] Keine Google Sheets Abhängigkeiten mehr

### In Railway:
- [ ] Projekt aus GitHub erstellt
- [ ] PostgreSQL Datenbank hinzugefügt
- [ ] Environment Variables gesetzt
- [ ] Erster Deploy erfolgreich
- [ ] Prisma Schema gepusht (`prisma db push`)
- [ ] Health Check funktioniert (`/api/health`)
- [ ] Bot verbindet sich zu Discord
- [ ] API Server erreichbar

---

## 🎯 Was Railway automatisch macht

### Build Phase:
1. `npm install` → triggert `postinstall` → `prisma generate`
2. `npm run build` → `prisma generate && tsc`
3. Kompiliert TypeScript nach `dist/`

### Start Phase:
1. `npm start` → `node dist/index.js`
2. App startet und verbindet zu PostgreSQL
3. Lädt Settings aus PostgreSQL
4. Startet Discord Bot
5. Startet API Server auf Railway's PORT

### Automatische Features:
- ✅ HTTPS automatisch
- ✅ Custom Domain möglich
- ✅ Auto-Deploy bei Git Push
- ✅ Environment Variables verschlüsselt
- ✅ PostgreSQL Backups
- ✅ Logs & Monitoring

---

## 🔍 Troubleshooting

### Build schlägt fehl:
```bash
# Prüfe Railway Logs
railway logs

# Häufige Ursachen:
# - DATABASE_URL nicht gesetzt (automatisch von Railway)
# - Prisma Client Generation fehlgeschlagen
# - TypeScript Fehler
```

### App startet nicht:
```bash
# Prüfe ob alle Environment Variables gesetzt sind
# Prüfe ob PostgreSQL Datenbank läuft
# Prüfe Railway Logs für Fehler
```

### Prisma Schema nicht synchronisiert:
```bash
# Manuell Schema pushen
railway run npx prisma db push --accept-data-loss

# Oder für Production (mit Migrations):
railway run npx prisma migrate deploy
```

### Bot verbindet nicht zu Discord:
```bash
# Prüfe DISCORD_TOKEN
# Prüfe ob Bot in Guild ist
# Prüfe Railway Logs für Discord Fehler
```

---

## 📊 Erwartetes Verhalten nach Deployment

### Console Output:
```
✅ Database connected successfully
✅ Settings loaded from PostgreSQL
✅ Discord bot ready - Logged in as Schedule Bot#...
✅ API Server started - Listening on port XXXX
✅ All schedulers running
✅ 14 dates preloaded in cache
```

### Health Check:
```bash
curl https://deine-app.railway.app/api/health
# Response: {"status":"ok"}
```

### Bot Status:
- Online in Discord
- Slash Commands registriert
- Reagiert auf Commands

---

## 🎉 Zusammenfassung

**Das Projekt ist jetzt zu 100% bereit für Railway Deployment!**

**Durchgeführte Änderungen:**
1. ✅ PORT flexibel gemacht für Railway
2. ✅ Build-Script optimiert mit Prisma
3. ✅ postinstall Script hinzugefügt
4. ✅ .env.example bereinigt

**Nächste Schritte:**
1. Code zu GitHub pushen
2. Railway Projekt erstellen
3. PostgreSQL Datenbank hinzufügen
4. Environment Variables setzen
5. Deploy & genießen! 🚀

---

**Bereit für Production-Grade Deployment auf Railway!** ✅
