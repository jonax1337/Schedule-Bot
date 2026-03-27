# Schedule API

## Naechste 14 Tage abrufen

```http
GET /api/schedule/next14
Authorization: Bearer <token>
```

**Erfolg (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "date": "27.03.2026",
      "reason": "Training",
      "focus": "Aim Drills",
      "players": [
        {
          "id": 1,
          "userId": "123456789012345678",
          "displayName": "Player1",
          "role": "MAIN",
          "availability": "14:00-20:00",
          "sortOrder": 0
        }
      ]
    }
  ]
}
```

## Paginierte Schedule-Historie

```http
GET /api/schedule/paginated?page=1&limit=14
Authorization: Bearer <admin-token>
```

**Query-Parameter:**
| Parameter | Typ | Default | Beschreibung |
|-----------|-----|---------|-------------|
| `page` | number | 1 | Seitennummer |
| `limit` | number | 14 | Eintraege pro Seite |

## Verfuegbarkeit aktualisieren

```http
POST /api/schedule/update-availability
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "date": "27.03.2026",
  "userId": "123456789012345678",
  "availability": "14:00-20:00"
}
```

**Erfolg (200):**
```json
{
  "success": true,
  "data": {
    "date": "27.03.2026",
    "userId": "123456789012345678",
    "availability": "14:00-20:00"
  }
}
```

::: info Verfuegbarkeits-Werte
- `"14:00-20:00"` - Zeitfenster
- `"x"` - Nicht verfuegbar
- `""` - Keine Angabe (zuruecksetzen)
:::

## Schedule-Grund aktualisieren

```http
POST /api/schedule/update-reason
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Body:**
```json
{
  "date": "27.03.2026",
  "reason": "Premier",
  "focus": "Map-Pool Vorbereitung"
}
```

## Analysierte Schedule-Details

```http
GET /api/schedule-details?date=27.03.2026
Authorization: Bearer <token>
```

**Erfolg (200):**
```json
{
  "success": true,
  "data": {
    "date": "27.03.2026",
    "reason": "Training",
    "status": "FULL_ROSTER",
    "canProceed": true,
    "availableMainCount": 5,
    "availableSubCount": 1,
    "availableCoachCount": 1,
    "commonTimeRange": {
      "start": "16:00",
      "end": "20:00"
    },
    "statusMessage": "Full roster available",
    "players": [...]
  }
}
```

## Batch Schedule-Details

```http
GET /api/schedule-details-batch?dates=27.03.2026,28.03.2026,29.03.2026
Authorization: Bearer <token>
```

Liefert Details fuer mehrere Daten in einem Request.
