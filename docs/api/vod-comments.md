# VOD-Kommentare API

## Kommentare fuer Scrim laden

```http
GET /api/vod-comments/scrim/:scrimId
Authorization: Bearer <token>
```

**Erfolg (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "scrimId": "abc123",
      "userName": "Player1",
      "timestamp": 125,
      "content": "Guter Smoke hier @Player2 #rotation",
      "createdAt": "2026-03-27T12:00:00.000Z",
      "updatedAt": "2026-03-27T12:00:00.000Z"
    }
  ]
}
```

**Hinweis:** `timestamp` ist in Sekunden ab Videobeginn. Kommentare werden nach `timestamp` sortiert zurueckgegeben.

## Kommentar erstellen

```http
POST /api/vod-comments
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "scrimId": "abc123",
  "timestamp": 125,
  "content": "Guter Smoke hier @Player2 #rotation"
}
```

Der `userName` wird automatisch aus dem JWT Token uebernommen.

### Formatierung

Kommentare unterstuetzen:
- **@Mentions** - `@PlayerName` fuer Spieler-Erwaehnung
- **#Hashtags** - `#rotation`, `#mistake`, `#clutch` etc. fuer Kategorisierung

## Kommentar bearbeiten

```http
PUT /api/vod-comments/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "content": "Aktualisierter Text",
  "timestamp": 130
}
```

Nur der Ersteller oder ein Admin kann bearbeiten.

## Kommentar loeschen

```http
DELETE /api/vod-comments/:id
Authorization: Bearer <token>
```

Nur der Ersteller oder ein Admin kann loeschen.
