# Scheduler & Cron-Jobs

## Uebersicht

Der Scheduler (`src/jobs/scheduler.ts`) verwaltet zeitgesteuerte Aufgaben mittels **node-cron**.

## Konfiguration

| Setting | Beschreibung | Default |
|---------|-------------|---------|
| `scheduling.dailyPostTime` | Uhrzeit fuer taeglichen Post | `18:00` |
| `scheduling.timezone` | IANA-Zeitzone | `Europe/Berlin` |
| `scheduling.reminderHoursBefore` | Stunden vor Post fuer 1. Erinnerung | `3` |
| `scheduling.duplicateReminderEnabled` | 2. Erinnerung aktiv | `true` |
| `scheduling.duplicateReminderHoursBefore` | Stunden vor Post fuer 2. Erinnerung | `1` |

## Jobs

### Taeglicher Schedule-Post

```
Zeitpunkt: scheduling.dailyPostTime (z.B. 18:00)
Zeitzone:  scheduling.timezone

Ablauf:
1. Schedule fuer heute laden
2. Status analysieren (FULL_ROSTER / WITH_SUBS / NOT_ENOUGH / OFF_DAY)
3. Embed erstellen
4. In konfigurierten Channel posten
5. (Optional) Training-Start-Poll erstellen
```

### Erinnerung #1

```
Zeitpunkt: dailyPostTime - reminderHoursBefore (z.B. 15:00)

Ablauf:
1. Spieler ohne Verfuegbarkeit fuer heute finden
2. Abwesende Spieler filtern
3. Coaches filtern
4. DM-Erinnerung an verbleibende senden
5. Erinnerung enthaelt Aktions-Buttons
```

### Erinnerung #2 (optional)

```
Zeitpunkt: dailyPostTime - duplicateReminderHoursBefore (z.B. 17:00)
Bedingung: scheduling.duplicateReminderEnabled = true

Ablauf: Identisch zu Erinnerung #1
```

## Zeitberechnung

Die Erinnerungszeiten werden relativ zur Post-Zeit berechnet:

```
Post-Zeit:        18:00
Erinnerung #1:    18:00 - 3h = 15:00
Erinnerung #2:    18:00 - 1h = 17:00
```

::: warning Tagesgrenze
Wenn die Erinnerungszeit vor Mitternacht liegen wuerde (z.B. Post um 02:00, Erinnerung 3h vorher = 23:00 am Vortag), wird die Erinnerung am Vortag geplant.
:::

## Steuerung

### Starten

```typescript
startScheduler()  // Wird beim Bot-Start aufgerufen
```

### Stoppen

```typescript
stopScheduler()  // Wird beim Shutdown aufgerufen
```

### Neustarten

```typescript
restartScheduler()  // Nach Settings-Aenderung
```

Der Neustart wird automatisch nach dem Speichern von Scheduling-Settings ausgefuehrt.

## Manuelles Ausloesen

Ueber die API oder Discord Commands koennen Aktionen auch manuell getriggert werden:

**API:**
```bash
# Schedule posten
POST /api/actions/schedule

# Erinnerung senden
POST /api/actions/remind
```

**Discord:**
```
/post-schedule
/remind
```

## Zeitlicher Ablauf (Beispiel)

```
15:00  ┤ Erinnerung #1 gesendet
       │   → 3 Spieler erinnert
       │
17:00  ┤ Erinnerung #2 gesendet
       │   → 1 Spieler erinnert
       │
18:00  ┤ Schedule gepostet
       │   → Status: WITH_SUBS
       │   → Training-Poll erstellt
       │
18:30  ┤ Spieler setzt Verfuegbarkeit
       │   → checkAndNotifyStatusChange()
       │   → Status: WITH_SUBS → FULL_ROSTER
       │   → Update-Nachricht gepostet
```
