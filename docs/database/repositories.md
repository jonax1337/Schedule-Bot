# Repositories

## Uebersicht

Alle Datenbank-Zugriffe laufen ueber Repository-Dateien in `src/repositories/`. Kein direkter Prisma-Zugriff in Routes, Commands oder Services.

## database.repository.ts

Singleton Prisma-Client mit PostgreSQL Adapter.

```typescript
import { prisma } from '../repositories/database.repository.js';
```

**Funktionen:**
- `connectDatabase()` - Verbindung herstellen
- `disconnectDatabase()` - Verbindung trennen und Pool schliessen

## schedule.repository.ts

| Funktion | Beschreibung |
|----------|-------------|
| `getScheduleForDate(date)` | Vollstaendigen Schedule fuer ein Datum laden |
| `getNext14DaysSchedule()` | Batch: Naechste 14 Tage |
| `getSchedulesForDates(dates)` | Multi-Datum Abfrage |
| `updatePlayerAvailability(date, userId, availability)` | Verfuegbarkeit setzen |
| `upsertSchedule(date, reason, focus)` | Schedule erstellen/aktualisieren |
| `addMissingDays()` | Fehlende Tage auffuellen |
| `applyRecurringToEmptySchedules()` | Recurring auf leere Slots anwenden |
| `syncUserMappingsToSchedules()` | Roster-Aenderungen synchronisieren |
| `getSchedulesPaginated(offset)` | Paginierte Historie |
| `updateScheduleReason(date, reason, focus)` | Grund/Fokus aendern |

## user-mapping.repository.ts

| Funktion | Beschreibung |
|----------|-------------|
| `getUserMappings()` | Alle Mappings (sortiert nach Rolle + Order) |
| `addUserMapping(mapping)` | Neues Mapping erstellen |
| `updateUserMapping(discordId, updates)` | Mapping aktualisieren |
| `removeUserMapping(discordId)` | Mapping loeschen |
| `reorderUserMappingsBatch(orderings)` | Batch-Reorder (Drag-Drop) |

## absence.repository.ts

| Funktion | Beschreibung |
|----------|-------------|
| `getAbsencesForUser(userId)` | Abwesenheiten eines Spielers |
| `getAllAbsences()` | Alle Abwesenheiten |
| `createAbsence(userId, startDate, endDate, reason)` | Erstellen |
| `updateAbsence(id, data)` | Aktualisieren |
| `deleteAbsence(id)` | Loeschen |
| `isUserAbsentOnDate(userId, date)` | Pruefen ob abwesend |
| `getAbsentUserIdsForDate(date)` | Alle Abwesenden fuer Datum |
| `getAbsentUserIdsForDates(dates)` | Batch-Pruefung |

## recurring-availability.repository.ts

| Funktion | Beschreibung |
|----------|-------------|
| `getRecurringForUser(userId)` | Eintraege eines Spielers |
| `getAllActiveRecurring()` | Alle aktiven Eintraege |
| `setRecurring(userId, dayOfWeek, availability)` | Setzen (Upsert) |
| `clearRecurringDay(userId, dayOfWeek)` | Tag loeschen |
| `clearRecurringAll(userId)` | Alle loeschen |

## scrim.repository.ts

| Funktion | Beschreibung |
|----------|-------------|
| `getAllScrims()` | Alle Scrims (neueste zuerst) |
| `getScrimById(id)` | Einzelner Scrim mit Kommentaren |
| `addScrim(data)` | Erstellen |
| `updateScrim(id, data)` | Aktualisieren |
| `deleteScrim(id)` | Loeschen (Cascade: Kommentare) |
| `getScrimStats()` | Win/Loss/Draw Statistiken |
| `getScrimsByDateRange(start, end)` | Zeitraum-Abfrage |

## vod-comment.repository.ts

| Funktion | Beschreibung |
|----------|-------------|
| `getCommentsForScrim(scrimId)` | Kommentare laden (nach Timestamp sortiert) |
| `addComment(scrimId, userName, timestamp, content)` | Erstellen |
| `deleteComment(id)` | Loeschen |

## strategy.repository.ts

| Funktion | Beschreibung |
|----------|-------------|
| Ordner CRUD | Erstellen, Lesen, Aktualisieren, Loeschen, Sortieren |
| Strategie CRUD | Erstellen, Lesen, Aktualisieren, Loeschen |
| Bild-Management | Upload, Loeschen |
| Datei-Management | Upload, Loeschen |

## database-initializer.ts

| Funktion | Beschreibung |
|----------|-------------|
| `initializeDatabaseIfEmpty()` | Tabellen und Defaults anlegen |
| `checkTablesExist()` | Schema-Pruefung |
| `checkForMissingTables()` | Fehlende Tabellen erkennen |
