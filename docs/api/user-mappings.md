# User Mappings API

## Alle Spieler abrufen

```http
GET /api/user-mappings
```

Auth ist optional. Liefert alle registrierten Spieler sortiert nach Rolle und Reihenfolge.

**Erfolg (200):**
```json
{
  "success": true,
  "data": [
    {
      "discordId": "123456789012345678",
      "discordUsername": "player1",
      "displayName": "Player1",
      "role": "MAIN",
      "timezone": "Europe/Berlin",
      "isAdmin": false,
      "sortOrder": 0
    }
  ]
}
```

## Spieler hinzufuegen

```http
POST /api/user-mappings
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Body:**
```json
{
  "discordId": "123456789012345678",
  "discordUsername": "player1",
  "displayName": "Player1",
  "role": "MAIN"
}
```

## Spieler bearbeiten

```http
PUT /api/user-mappings/:discordId
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Body (alle Felder optional):**
```json
{
  "displayName": "NeuerName",
  "role": "SUB",
  "isAdmin": true,
  "timezone": "America/New_York"
}
```

## Spieler entfernen

```http
DELETE /api/user-mappings/:discordId
Authorization: Bearer <admin-token>
```

## Reihenfolge aendern

```http
PUT /api/user-mappings/reorder
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Body:**
```json
{
  "orderings": [
    { "discordId": "123...", "sortOrder": 0 },
    { "discordId": "456...", "sortOrder": 1 },
    { "discordId": "789...", "sortOrder": 2 }
  ]
}
```

Unterstuetzt Drag-and-Drop Sortierung im Admin-Dashboard.
