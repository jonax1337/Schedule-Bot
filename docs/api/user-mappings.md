# User Mappings API

## List All Players

```http
GET /api/user-mappings
```

Authentication is optional. Returns all registered players sorted by role and sort order.

**Success (200):**
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

## Add Player

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

## Edit Player

```http
PUT /api/user-mappings/:discordId
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Body (all fields optional):**
```json
{
  "displayName": "NewName",
  "role": "SUB",
  "isAdmin": true,
  "timezone": "America/New_York"
}
```

## Remove Player

```http
DELETE /api/user-mappings/:discordId
Authorization: Bearer <admin-token>
```

## Reorder Players

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

Powers drag-and-drop sorting in the admin dashboard.
