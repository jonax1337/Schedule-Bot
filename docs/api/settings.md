# Settings API

## Alle Settings laden

```http
GET /api/settings
```

Keine Authentifizierung erforderlich (oeffentlich).

**Erfolg (200):**
```json
{
  "success": true,
  "data": {
    "discord.channelId": "123456789012345678",
    "discord.pingRoleId": "123456789012345678",
    "discord.authEnabled": "true",
    "scheduling.dailyPostTime": "18:00",
    "scheduling.timezone": "Europe/Berlin",
    "scheduling.reminderHoursBefore": "3",
    "scheduling.duplicateReminderEnabled": "true",
    "scheduling.duplicateReminderHoursBefore": "1",
    "scheduling.trainingPollEnabled": "false",
    "branding.teamName": "Team Name",
    "branding.tagline": "Subtitle",
    "branding.logoUrl": "",
    "stratbook.editPermission": "admin"
  }
}
```

::: info Alle Werte sind Strings
Settings werden als Key-Value Strings gespeichert. Boolean und numerische Werte muessen im Client gecastet werden.
:::

## Settings aktualisieren

```http
POST /api/settings
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Body:**
```json
{
  "scheduling.dailyPostTime": "19:00",
  "scheduling.timezone": "Europe/Berlin",
  "branding.teamName": "Neuer Name"
}
```

Es koennen ein oder mehrere Settings gleichzeitig aktualisiert werden. Nur die angegebenen Keys werden geaendert.

**Seiteneffekte:**
1. Werte werden in der Datenbank gespeichert
2. `reloadConfig()` wird aufgerufen
3. `restartScheduler()` wird aufgerufen (bei Scheduling-Aenderungen)

## Config neu laden

```http
POST /api/settings/reload-config
Authorization: Bearer <admin-token>
```

Laedt die Konfiguration aus der Datenbank neu und startet den Scheduler, ohne Settings zu aendern. Nuetzlich nach manuellen Datenbank-Aenderungen.
