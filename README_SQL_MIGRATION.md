# PostgreSQL Migration - Quick Start Guide

## 🎯 Schnellstart (5 Minuten)

### 1. PostgreSQL installieren & starten

**Option A: Docker (Empfohlen)**
```bash
docker run --name schedule-bot-postgres \
  -e POSTGRES_DB=schedule_bot \
  -e POSTGRES_USER=schedule_bot_user \
  -e POSTGRES_PASSWORD=secure_password_123 \
  -p 5432:5432 \
  -d postgres:16-alpine
```

**Option B: Lokale Installation (Windows)**
```bash
# Via Chocolatey
choco install postgresql

# Oder Download von: https://www.postgresql.org/download/windows/
```

### 2. Dependencies installieren

```bash
npm install
```

### 3. Environment-Variablen setzen

Erstelle `.env` Datei:

```env
# Discord (unverändert)
DISCORD_TOKEN=dein_discord_token
DISCORD_GUILD_ID=deine_guild_id

# NEU: PostgreSQL Database
DATABASE_URL="postgresql://schedule_bot_user:secure_password_123@localhost:5432/schedule_bot?schema=public"

# Admin (unverändert)
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=dein_bcrypt_hash
JWT_SECRET=dein_jwt_secret
DASHBOARD_URL=http://localhost:3000
```

### 4. Datenbank initialisieren

```bash
# Prisma Client generieren
npm run db:generate

# Datenbank-Schema erstellen
npm run db:push
```

### 5. (Optional) Daten aus Google Sheets migrieren

```bash
# Stelle sicher, dass credentials.json und GOOGLE_SHEET_ID noch konfiguriert sind
npm run build
node dist/scripts/migrate-data.js
```

### 6. App starten

```bash
npm run build
npm start
```

## ✅ Fertig!

Die App läuft jetzt mit PostgreSQL statt Google Sheets.

---

## 📊 Datenbank verwalten

### Prisma Studio (Web-GUI)

```bash
npm run db:studio
```

Öffnet Browser auf `http://localhost:5555` - hier kannst du alle Daten sehen und bearbeiten.

### Manuelle SQL-Queries

```bash
# Mit psql verbinden
psql -U schedule_bot_user -d schedule_bot

# Beispiel-Queries
SELECT * FROM schedules ORDER BY date DESC LIMIT 10;
SELECT * FROM user_mappings;
SELECT * FROM absences WHERE "start_date" >= CURRENT_DATE;
```

---

## 🔄 Was hat sich geändert?

### Vorher (Google Sheets)
- ❌ Langsame API-Calls
- ❌ Rate Limits
- ❌ Manuelle Formatierung
- ❌ Keine Transaktionen
- ❌ Begrenzte Zeilen

### Nachher (PostgreSQL)
- ✅ Schnelle lokale Queries
- ✅ Keine Limits
- ✅ Type-Safe mit Prisma
- ✅ ACID-Transaktionen
- ✅ Unbegrenzte Skalierung

### API bleibt gleich!
Alle API-Endpunkte funktionieren identisch. Nur die Datenbank-Schicht wurde ausgetauscht.

---

## 🛠️ Troubleshooting

### "Property 'schedule' does not exist on type 'PrismaClient'"

```bash
# Prisma Client neu generieren
npm run db:generate
npm run build
```

### "Connection refused" / Kann nicht verbinden

```bash
# PostgreSQL Status prüfen
docker ps  # Für Docker
Get-Service postgresql*  # Für Windows-Service

# PostgreSQL starten
docker start schedule-bot-postgres  # Für Docker
Start-Service postgresql-x64-16  # Für Windows
```

### Migration schlägt fehl

```bash
# Datenbank komplett zurücksetzen (WARNUNG: Löscht alle Daten!)
npm run db:push -- --force-reset
```

### TypeScript-Fehler

```bash
# 1. Prisma Client neu generieren
npm run db:generate

# 2. node_modules/.prisma löschen
rm -rf node_modules/.prisma

# 3. Neu kompilieren
npm run build
```

---

## 📦 Backup & Restore

### Backup erstellen

```bash
# Komplettes Backup
pg_dump -U schedule_bot_user -d schedule_bot > backup_$(date +%Y%m%d).sql

# Nur Daten
pg_dump -U schedule_bot_user -d schedule_bot --data-only > data_backup.sql
```

### Backup wiederherstellen

```bash
psql -U schedule_bot_user -d schedule_bot < backup_20260122.sql
```

---

## 🚀 Produktion

### Empfohlene Cloud-Anbieter

1. **Supabase** (Empfohlen)
   - ✅ Kostenloser Tier
   - ✅ Automatische Backups
   - ✅ Einfaches Setup
   - URL: https://supabase.com

2. **Railway**
   - ✅ $5/Monat
   - ✅ Automatische Deployments
   - URL: https://railway.app

3. **Neon**
   - ✅ Serverless PostgreSQL
   - ✅ Kostenloser Tier
   - URL: https://neon.tech

### Environment-Variable für Produktion

```env
# Beispiel Supabase
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"

# Beispiel Railway
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/railway"
```

---

## 📚 Weitere Dokumentation

- **Vollständige Migration-Docs**: `MIGRATION_TO_SQL.md`
- **Prisma Dokumentation**: https://www.prisma.io/docs
- **PostgreSQL Dokumentation**: https://www.postgresql.org/docs/

---

## ❓ Häufige Fragen

**Q: Muss ich Google Sheets Credentials behalten?**
A: Nein, nach erfolgreicher Migration kannst du `credentials.json` und `GOOGLE_SHEET_ID` entfernen.

**Q: Kann ich zurück zu Google Sheets wechseln?**
A: Ja, die alten Module sind noch vorhanden. Ändere einfach die Imports zurück.

**Q: Wie groß kann die Datenbank werden?**
A: PostgreSQL hat praktisch keine Limits. Millionen von Zeilen sind kein Problem.

**Q: Kostet PostgreSQL Geld?**
A: Lokal ist es kostenlos. Cloud-Anbieter haben oft kostenlose Tiers (Supabase, Neon).

**Q: Ist die Migration sicher?**
A: Ja, die alten Google Sheets Daten bleiben unverändert. Du kannst jederzeit zurückwechseln.
