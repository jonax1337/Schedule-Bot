-- Migration Script: Alte Schedule Daten zu dynamischen SchedulePlayer migrieren
-- WICHTIG: Dieses Script muss NACH der Prisma Migration ausgeführt werden!

-- Schritt 1: Backup der alten Schedules Tabelle erstellen
CREATE TABLE IF NOT EXISTS schedules_backup AS 
SELECT * FROM schedules;

-- Schritt 2: Alte Columns temporär behalten für Migration
-- (Prisma Migration wird neue Tabelle erstellen, alte bleibt als schedules_backup)

-- Schritt 3: Daten migrieren - wird in TypeScript Script gemacht
-- Siehe: scripts/migrate-schedule-data.ts

-- Schritt 4: Nach erfolgreicher Migration kann schedules_backup gelöscht werden
-- DROP TABLE schedules_backup;
