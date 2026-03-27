# Scrims API

## Alle Scrims abrufen

```http
GET /api/scrims
Authorization: Bearer <token>
```

**Erfolg (200):**
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
      "notes": "Gute CT-Side",
      "comments": []
    }
  ]
}
```

## Scrim-Statistiken

```http
GET /api/scrims/stats/summary
Authorization: Bearer <token>
```

**Erfolg (200):**
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

## Scrims nach Zeitraum

```http
GET /api/scrims/range/01.03.2026/31.03.2026
Authorization: Bearer <token>
```

## Einzelner Scrim

```http
GET /api/scrims/:id
Authorization: Bearer <token>
```

## Scrim erstellen

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

**Ergebnis-Werte:** `WIN`, `LOSS`, `DRAW`

**Match-Typen:** `Scrim`, `Tournament`, `Premier`, `Custom`

**Verfuegbare Maps:** Abyss, Ascent, Bind, Breeze, Corrode, Fracture, Haven, Icebox, Lotus, Pearl, Split, Sunset

## Scrim bearbeiten

```http
PUT /api/scrims/:id
Authorization: Bearer <admin-token>
Content-Type: application/json
```

Body wie beim Erstellen (alle Felder optional).

## Scrim loeschen

```http
DELETE /api/scrims/:id
Authorization: Bearer <admin-token>
```

::: warning Cascade Delete
Beim Loeschen eines Scrims werden alle zugehoerigen VOD-Kommentare automatisch mit geloescht.
:::
