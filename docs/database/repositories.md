# Repositories

## Overview

All database access goes through repository files in `src/repositories/`. There is no direct Prisma access from routes, commands, or services.

## database.repository.ts

Singleton Prisma client with the PostgreSQL adapter.

```typescript
import { prisma } from '../repositories/database.repository.js';
```

**Functions:**
- `connectDatabase()` - Open the connection
- `disconnectDatabase()` - Close the connection and the pool

## schedule.repository.ts

| Function | Description |
|----------|-------------|
| `getScheduleForDate(date)` | Load the full schedule for a given date |
| `getNext14DaysSchedule()` | Batch: load the next 14 days |
| `getSchedulesForDates(dates)` | Multi-date lookup |
| `updatePlayerAvailability(date, userId, availability)` | Set a player's availability |
| `upsertSchedule(date, reason, focus)` | Create or update a schedule |
| `addMissingDays()` | Fill in missing days |
| `applyRecurringToEmptySchedules()` | Apply recurring availability to empty slots |
| `syncUserMappingsToSchedules()` | Sync roster changes |
| `getSchedulesPaginated(offset)` | Paginated history |
| `updateScheduleReason(date, reason, focus)` | Update reason/focus |

## user-mapping.repository.ts

| Function | Description |
|----------|-------------|
| `getUserMappings()` | All mappings (sorted by role + order) |
| `addUserMapping(mapping)` | Create a new mapping |
| `updateUserMapping(discordId, updates)` | Update a mapping |
| `removeUserMapping(discordId)` | Delete a mapping |
| `reorderUserMappingsBatch(orderings)` | Batch reorder (drag-and-drop) |

## absence.repository.ts

| Function | Description |
|----------|-------------|
| `getAbsencesForUser(userId)` | A player's absences |
| `getAllAbsences()` | All absences |
| `createAbsence(userId, startDate, endDate, reason)` | Create |
| `updateAbsence(id, data)` | Update |
| `deleteAbsence(id)` | Delete |
| `isUserAbsentOnDate(userId, date)` | Check whether a user is absent |
| `getAbsentUserIdsForDate(date)` | All absent users for a date |
| `getAbsentUserIdsForDates(dates)` | Batch check |

## recurring-availability.repository.ts

| Function | Description |
|----------|-------------|
| `getRecurringForUser(userId)` | A player's entries |
| `getAllActiveRecurring()` | All active entries |
| `setRecurring(userId, dayOfWeek, availability)` | Set (upsert) |
| `clearRecurringDay(userId, dayOfWeek)` | Clear a single day |
| `clearRecurringAll(userId)` | Clear all entries |

## scrim.repository.ts

| Function | Description |
|----------|-------------|
| `getAllScrims()` | All scrims (newest first) |
| `getScrimById(id)` | A single scrim with its comments |
| `addScrim(data)` | Create |
| `updateScrim(id, data)` | Update |
| `deleteScrim(id)` | Delete (cascades to comments) |
| `getScrimStats()` | Win/loss/draw statistics |
| `getScrimsByDateRange(start, end)` | Date-range query |

## vod-comment.repository.ts

| Function | Description |
|----------|-------------|
| `getCommentsForScrim(scrimId)` | Load comments (sorted by timestamp) |
| `addComment(scrimId, userName, timestamp, content)` | Create |
| `deleteComment(id)` | Delete |

## strategy.repository.ts

| Function | Description |
|----------|-------------|
| Folder CRUD | Create, read, update, delete, sort |
| Strategy CRUD | Create, read, update, delete |
| Image management | Upload, delete |
| File management | Upload, delete |

## database-initializer.ts

| Function | Description |
|----------|-------------|
| `initializeDatabaseIfEmpty()` | Create tables and defaults |
| `checkTablesExist()` | Schema check |
| `checkForMissingTables()` | Detect missing tables |
