# Absences API

## List Absences

```http
GET /api/absences
Authorization: Bearer <token>
```

Admins see all absences; regular users only see their own.

**Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": "123456789012345678",
      "startDate": "01.04.2026",
      "endDate": "07.04.2026",
      "reason": "Vacation",
      "createdAt": "2026-03-27T12:00:00.000Z"
    }
  ]
}
```

## Create Absence

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
  "reason": "Vacation"
}
```

::: info Date Format
Dates must be provided in `DD.MM.YYYY` format. The end date is inclusive.
:::

## Edit Absence

```http
PUT /api/absences/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Body (all fields optional):**
```json
{
  "startDate": "02.04.2026",
  "endDate": "08.04.2026",
  "reason": "Vacation extended"
}
```

Only the creator or an admin can edit.

## Delete Absence

```http
DELETE /api/absences/:id
Authorization: Bearer <token>
```

Only the creator or an admin can delete.
