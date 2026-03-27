# Abwesenheiten API

## Abwesenheiten abrufen

```http
GET /api/absences
Authorization: Bearer <token>
```

Admins sehen alle Abwesenheiten, User nur ihre eigenen.

**Erfolg (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": "123456789012345678",
      "startDate": "01.04.2026",
      "endDate": "07.04.2026",
      "reason": "Urlaub",
      "createdAt": "2026-03-27T12:00:00.000Z"
    }
  ]
}
```

## Abwesenheit erstellen

```http
POST /api/absences
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "startDate": "01.04.2026",
  "endDate": "07.04.2026",
  "reason": "Urlaub"
}
```

::: info Datumsformat
Daten muessen im Format `DD.MM.YYYY` angegeben werden. Das Enddatum ist inklusive.
:::

## Abwesenheit bearbeiten

```http
PUT /api/absences/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Body (alle Felder optional):**
```json
{
  "startDate": "02.04.2026",
  "endDate": "08.04.2026",
  "reason": "Urlaub verlaengert"
}
```

Nur der Ersteller oder ein Admin kann bearbeiten.

## Abwesenheit loeschen

```http
DELETE /api/absences/:id
Authorization: Bearer <token>
```

Nur der Ersteller oder ein Admin kann loeschen.
