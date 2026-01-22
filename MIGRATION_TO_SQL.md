# Migration von Google Sheets zu PostgreSQL

## Übersicht

Die App wurde von Google Sheets auf PostgreSQL migriert, um bessere Performance, Skalierbarkeit und Zuverlässigkeit zu gewährleisten.

## Änderungen

### Datenbankstruktur

**Vorher:** Google Sheets mit mehreren Tabs
- Sheet1 (Main Schedule)
- UserMapping
- Settings
- Matches
- Absences

**Nachher:** PostgreSQL mit Prisma ORM
- `schedules` - Haupttabelle für tägliche Verfügbarkeit
- `user_mappings` - Discord-User zu Spalten-Mapping
- `settings` - Bot-Konfiguration
- `scrims` - Match-Tracking
- `absences` - Geplante Abwesenheiten

### Code-Änderungen

#### Neue Module
- `src/database/client.ts` - Prisma Client Setup
- `src/database/schedules.ts` - Ersatz für `sheets.ts`
- `src/database/userMappings.ts` - Ersatz für `userMapping.ts`
- `src/database/absences.ts` - Ersatz für `absences.ts`
- `src/database/scrims.ts` - Ersatz für `scrims.ts`

#### Alte Module (können entfernt werden)
- `src/sheets.ts` ❌
- `src/userMapping.ts` ❌
- `src/absences.ts` ❌
- `src/scrims.ts` ❌

**Wichtig:** Die alten Module wurden NICHT gelöscht, um Referenzen zu zeigen. Nach erfolgreicher Migration können diese entfernt werden.

## Setup-Anleitung

### 1. Dependencies installieren

```bash
npm install
```

Dies installiert:
- `@prisma/client` - Prisma Client für Datenbankzugriff
- `pg` - PostgreSQL Driver
- `prisma` (dev) - Prisma CLI

### 2. PostgreSQL Datenbank einrichten

#### Option A: Lokale PostgreSQL Installation

1. PostgreSQL installieren (Windows):
   - Download von https://www.postgresql.org/download/windows/
   - Oder via Chocolatey: `choco install postgresql`

2. Datenbank erstellen:
```sql
CREATE DATABASE schedule_bot;
CREATE USER schedule_bot_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE schedule_bot TO schedule_bot_user;
```

#### Option B: Docker (empfohlen für Entwicklung)

```bash
docker run --name schedule-bot-postgres \
  -e POSTGRES_DB=schedule_bot \
  -e POSTGRES_USER=schedule_bot_user \
  -e POSTGRES_PASSWORD=your_secure_password \
  -p 5432:5432 \
  -d postgres:16-alpine
```

#### Option C: Cloud-Hosting (empfohlen für Produktion)

Empfohlene Anbieter:
- **Supabase** (kostenloser Tier verfügbar)
- **Railway** (einfaches Setup)
- **Neon** (serverless PostgreSQL)
- **Render** (managed PostgreSQL)

### 3. Environment-Variablen konfigurieren

Erstelle `.env` Datei (basierend auf `.env.example`):

```env
# Discord Bot
DISCORD_TOKEN=your_discord_bot_token
DISCORD_GUILD_ID=your_guild_id

# PostgreSQL Database
DATABASE_URL="postgresql://schedule_bot_user:your_secure_password@localhost:5432/schedule_bot?schema=public"

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_admin_password_hash

# Optional: Google Sheets (nur für Migration)
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_CREDENTIALS_PATH=./credentials.json
```

**DATABASE_URL Format:**
```
postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]?schema=public
```

Beispiele:
- Lokal: `postgresql://schedule_bot_user:password@localhost:5432/schedule_bot?schema=public`
- Supabase: `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`
- Railway: `postgresql://postgres:[PASSWORD]@[HOST]:5432/railway`

### 4. Datenbank-Schema erstellen

```bash
# Prisma Client generieren
npm run db:generate

# Datenbank-Schema pushen (für Entwicklung)
npm run db:push

# ODER: Migration erstellen (für Produktion)
npm run db:migrate
```

**Unterschied:**
- `db:push` - Schnell, direkt Schema synchronisieren (Dev)
- `db:migrate` - Erstellt Migration-Files, versioniert (Prod)

### 5. Initiale Daten einfügen (optional)

Falls du Daten aus Google Sheets migrieren möchtest, erstelle ein Migrations-Script:

```typescript
// scripts/migrate-from-sheets.ts
import { prisma } from './src/database/client.js';
// Import alte Google Sheets Funktionen
// Daten auslesen und in PostgreSQL schreiben
```

### 6. App starten

```bash
# Build
npm run build

# Start
npm start

# Oder Development-Modus
npm run dev
```

## Prisma Studio (Datenbank-GUI)

Prisma bietet eine Web-GUI zum Verwalten der Datenbank:

```bash
npm run db:studio
```

Öffnet Browser auf `http://localhost:5555`

## API-Änderungen

### Keine Breaking Changes für API-Endpunkte

Alle API-Endpunkte bleiben identisch. Die Datenbank-Schicht wurde transparent ausgetauscht.

### Interne Änderungen

**Vorher:**
```typescript
import { getScheduleForDate } from './sheets.js';
```

**Nachher:**
```typescript
import { getScheduleForDate } from './database/schedules.js';
```

## Vorteile der Migration

### Performance
- ✅ Schnellere Queries (indexierte Suchen)
- ✅ Keine API-Rate-Limits (Google Sheets API)
- ✅ Parallele Zugriffe ohne Konflikte

### Skalierbarkeit
- ✅ Unbegrenzte Zeilen (Google Sheets: max 10M Zellen)
- ✅ Komplexe Queries möglich (JOINs, Aggregationen)
- ✅ Transaktionen für Datenkonsistenz

### Entwicklung
- ✅ Type-Safety mit Prisma
- ✅ Automatische Migrations
- ✅ Einfaches Seeding und Testing

### Zuverlässigkeit
- ✅ Keine Netzwerk-Abhängigkeit zu Google
- ✅ Backup-Strategien (pg_dump)
- ✅ Point-in-time Recovery möglich

## Backup & Restore

### Backup erstellen

```bash
# Gesamte Datenbank
pg_dump -U schedule_bot_user -d schedule_bot > backup.sql

# Nur Daten (ohne Schema)
pg_dump -U schedule_bot_user -d schedule_bot --data-only > data_backup.sql
```

### Restore

```bash
psql -U schedule_bot_user -d schedule_bot < backup.sql
```

### Automatische Backups (Empfehlung)

Für Produktion: Nutze Cloud-Provider Backup-Features
- Supabase: Automatische tägliche Backups
- Railway: Point-in-time Recovery
- Render: Automatische Backups

## Troubleshooting

### Prisma Client Fehler

```bash
# Prisma Client neu generieren
npm run db:generate

# Cache löschen
rm -rf node_modules/.prisma
npm run db:generate
```

### Verbindungsfehler

```bash
# PostgreSQL Status prüfen (Windows)
Get-Service postgresql*

# PostgreSQL starten
Start-Service postgresql-x64-16

# Verbindung testen
psql -U schedule_bot_user -d schedule_bot
```

### Migration-Fehler

```bash
# Migration zurücksetzen
npm run db:push -- --force-reset

# WARNUNG: Löscht alle Daten!
```

### TypeScript-Fehler nach Schema-Änderungen

```bash
# 1. Prisma Client neu generieren
npm run db:generate

# 2. TypeScript neu kompilieren
npm run build
```

## Nächste Schritte

1. ✅ Dependencies installieren (`npm install`)
2. ✅ PostgreSQL einrichten (lokal oder Cloud)
3. ✅ `.env` Datei konfigurieren
4. ✅ Datenbank-Schema erstellen (`npm run db:push`)
5. ✅ App testen (`npm run dev`)
6. 🔄 Alte Google Sheets Module entfernen (optional)
7. 🔄 Daten aus Google Sheets migrieren (falls gewünscht)

## Unterstützung

Bei Fragen oder Problemen:
- Prisma Dokumentation: https://www.prisma.io/docs
- PostgreSQL Dokumentation: https://www.postgresql.org/docs/
