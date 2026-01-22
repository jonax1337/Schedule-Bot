# 🚧 Dynamische Players Implementation - Status

## Phase 1: Datenbank Schema ✅ FERTIG

- ✅ Prisma Schema angepasst
  - ✅ `Schedule` Tabelle: player1-5, sub1-2, coach entfernt
  - ✅ `SchedulePlayer` Tabelle erstellt (dynamisch)
  - ✅ `UserMapping` erweitert: displayName, sortOrder
- ✅ Migration Script erstellt (`scripts/migrate-schedule-data.ts`)
- ✅ SQL Backup Script erstellt

**Status:** Bereit für `prisma migrate dev`

---

## Phase 2: Backend Code Anpassungen ⏳ IN ARBEIT

### 2.1 Type Definitions
- ⏳ `src/types.ts` - Neue Interfaces für dynamische Players

### 2.2 Database Layer
- ⏳ `src/database/schedules.ts` - Dynamische Player Queries
- ⏳ `src/database/userMappings.ts` - displayName Support
- ⏳ `src/database/scheduleOperations.ts` - Dynamische Updates

### 2.3 Business Logic
- ⏳ `src/scheduleCache.ts` - Dynamisches Player Loading
- ⏳ `src/analyzer.ts` - Dynamische Roster Analysis
- ⏳ `src/embed.ts` - Dynamische Discord Messages
- ⏳ `src/reminder.ts` - Dynamische Player Iteration

### 2.4 API Layer
- ⏳ `src/apiServer.ts` - Neue Endpoints für dynamische Players

---

## Phase 3: API Endpoints ⏳ PENDING

### Neue Endpoints:
- ⏳ `GET /api/schedule/:date/players` - Alle Players für ein Datum
- ⏳ `POST /api/schedule/:date/players` - Player hinzufügen
- ⏳ `PUT /api/schedule/:date/players/:userId` - Player Availability updaten
- ⏳ `DELETE /api/schedule/:date/players/:userId` - Player entfernen
- ⏳ `PUT /api/user-mappings/:id` - displayName updaten

### Angepasste Endpoints:
- ⏳ `GET /api/sheet-data` - Neue Struktur mit dynamischen Players
- ⏳ `POST /api/sheet-data/update` - Dynamische Player Updates

---

## Phase 4: Frontend Dashboard ⏳ PENDING

### 4.1 Components
- ⏳ `dashboard/components/user-mappings-panel.tsx` - displayName Input
- ⏳ `dashboard/components/schedule-editor.tsx` - Dynamische Columns
- ⏳ `dashboard/components/user-schedule.tsx` - Dynamische Availability

### 4.2 API Client
- ⏳ `dashboard/lib/api.ts` - Neue API Calls

---

## Phase 5: Testing & Deployment ⏳ PENDING

### 5.1 Testing
- ⏳ Lokaler Build Test
- ⏳ Discord Bot Test (Namen in Messages)
- ⏳ Dashboard Test (Neue Subs/Coaches hinzufügen)
- ⏳ API Test (Alle Endpoints)

### 5.2 Deployment
- ⏳ Git Commit & Push
- ⏳ Railway Deployment
- ⏳ Produktions-Test

---

## 📊 Fortschritt

```
Phase 1: ████████████████████ 100% ✅
Phase 2: ░░░░░░░░░░░░░░░░░░░░   0% ⏳
Phase 3: ░░░░░░░░░░░░░░░░░░░░   0% ⏳
Phase 4: ░░░░░░░░░░░░░░░░░░░░   0% ⏳
Phase 5: ░░░░░░░░░░░░░░░░░░░░   0% ⏳

Gesamt: ████░░░░░░░░░░░░░░░░  20%
```

---

## 🎯 Nächste Schritte:

1. **Prisma Migration ausführen** (`npx prisma migrate dev`)
2. **Migration Script ausführen** (`npx tsx scripts/migrate-schedule-data.ts`)
3. **Backend Code anpassen** (types.ts, database/, etc.)
4. **API Endpoints anpassen**
5. **Frontend anpassen**
6. **Testing**
7. **Deployment**

---

**Geschätzte Zeit:** 4-6 Stunden  
**Aktueller Status:** Phase 1 abgeschlossen, bereit für Migration
