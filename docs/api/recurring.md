# Wiederkehrende Verfuegbarkeit API

## Eigene Eintraege abrufen

```http
GET /api/recurring-availability
Authorization: Bearer <token>
```

**Erfolg (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": "123456789012345678",
      "dayOfWeek": 1,
      "availability": "18:00-22:00",
      "active": true
    },
    {
      "id": 2,
      "userId": "123456789012345678",
      "dayOfWeek": 3,
      "availability": "18:00-22:00",
      "active": true
    }
  ]
}
```

**Wochentage:**
| Wert | Tag |
|------|-----|
| 0 | Sonntag |
| 1 | Montag |
| 2 | Dienstag |
| 3 | Mittwoch |
| 4 | Donnerstag |
| 5 | Freitag |
| 6 | Samstag |

## Verfuegbarkeit setzen

```http
POST /api/recurring-availability
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "dayOfWeek": 1,
  "availability": "18:00-22:00"
}
```

Erstellt oder aktualisiert den Eintrag fuer den angegebenen Wochentag (Upsert).

## Einzelnen Tag loeschen

```http
DELETE /api/recurring-availability/:dayOfWeek
Authorization: Bearer <token>
```

**Beispiel:** `DELETE /api/recurring-availability/1` loescht den Montag-Eintrag.

## Alle Eintraege loeschen

```http
DELETE /api/recurring-availability
Authorization: Bearer <token>
```

Loescht alle wiederkehrenden Verfuegbarkeiten des aktuellen Users.
