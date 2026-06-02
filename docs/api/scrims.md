# Scrims API

## List All Scrims

```http
GET /api/scrims
Authorization: Bearer <token>
```

**Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "abc123",
      "date": "27.03.2026",
      "opponent": "Team Alpha",
      "result": "WIN",
      "scoreUs": 13,
      "scoreThem": 7,
      "map": "Ascent",
      "matchType": "Scrim",
      "ourAgents": "Jett, Omen, Sova, Killjoy, Sage",
      "theirAgents": "Reyna, Astra, Fade, Cypher, Sage",
      "vodUrl": "https://youtube.com/watch?v=...",
      "matchLink": "",
      "notes": "Strong CT side",
      "comments": []
    }
  ]
}
```

## Scrim Statistics

```http
GET /api/scrims/stats/summary
Authorization: Bearer <token>
```

**Success (200):**
```json
{
  "success": true,
  "data": {
    "total": 42,
    "wins": 25,
    "losses": 14,
    "draws": 3,
    "winRate": 59.5,
    "byMap": {
      "Ascent": { "wins": 8, "losses": 3, "draws": 1 },
      "Haven": { "wins": 5, "losses": 4, "draws": 0 }
    }
  }
}
```

## Scrims by Date Range

```http
GET /api/scrims/range/01.03.2026/31.03.2026
Authorization: Bearer <token>
```

## Single Scrim

```http
GET /api/scrims/:id
Authorization: Bearer <token>
```

## Create Scrim

```http
POST /api/scrims
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Body:**
```json
{
  "date": "27.03.2026",
  "opponent": "Team Alpha",
  "result": "WIN",
  "scoreUs": 13,
  "scoreThem": 7,
  "map": "Ascent",
  "matchType": "Scrim",
  "ourAgents": "Jett, Omen, Sova, Killjoy, Sage",
  "theirAgents": "Reyna, Astra, Fade, Cypher, Sage",
  "vodUrl": "https://youtube.com/watch?v=...",
  "notes": "Optional"
}
```

**Result values:** `WIN`, `LOSS`, `DRAW`

**Match types:** `Scrim`, `Tournament`, `Premier`, `Custom`

**Available maps:** Abyss, Ascent, Bind, Breeze, Corrode, Fracture, Haven, Icebox, Lotus, Pearl, Split, Sunset

## Edit Scrim

```http
PUT /api/scrims/:id
Authorization: Bearer <admin-token>
Content-Type: application/json
```

Same body as create (all fields optional).

## Delete Scrim

```http
DELETE /api/scrims/:id
Authorization: Bearer <admin-token>
```

::: warning Cascade Delete
Deleting a scrim also removes all associated VOD comments.
:::
