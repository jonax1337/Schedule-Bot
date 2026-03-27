# Strategien API

## Alle Strategien abrufen

```http
GET /api/strategies
Authorization: Bearer <token>
```

**Erfolg (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "abc123",
      "title": "Ascent A-Site Execute",
      "map": "Ascent",
      "side": "attack",
      "tags": "execute,smoke,flash",
      "agents": "Jett,Omen,Sova",
      "content": { "type": "doc", "content": [...] },
      "folderId": "folder123",
      "authorId": "123456789012345678",
      "authorName": "Player1",
      "images": [],
      "files": []
    }
  ]
}
```

## Strategie erstellen

```http
POST /api/strategies
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Fields:**
| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `title` | string | Ja | Strategie-Titel |
| `map` | string | Nein | Karten-Name |
| `side` | string | Nein | `attack` / `defense` |
| `tags` | string | Nein | Kommagetrennte Tags |
| `agents` | string | Nein | Kommagetrennte Agenten |
| `content` | JSON string | Ja | TipTap JSON Content |
| `folderId` | string | Nein | Ordner-ID |
| `images` | File[] | Nein | Bild-Uploads |
| `files` | File[] | Nein | PDF-Uploads |

::: info Berechtigungen
Wer Strategien erstellen/bearbeiten darf, haengt vom Setting `stratbook.editPermission` ab:
- `admin` - Nur Admins
- `all` - Alle registrierten Spieler
:::

## Strategie bearbeiten

```http
PUT /api/strategies/:id
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Gleiche Felder wie beim Erstellen. Neue Uploads werden hinzugefuegt.

## Strategie loeschen

```http
DELETE /api/strategies/:id
Authorization: Bearer <token>
```

## Ordner-Struktur

### Ordner abrufen

```http
GET /api/strategies/folders
Authorization: Bearer <token>
```

### Ordner erstellen

```http
POST /api/strategies/folders
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Attack Strats",
  "parentId": null,
  "color": "#3498db"
}
```

**Verfuegbare Farben:** 8 vordefinierte Hex-Werte fuer die Ordner-Farbkodierung.

### Ordner bearbeiten / loeschen

```http
PUT /api/strategies/folders/:id
DELETE /api/strategies/folders/:id
```

::: warning Cascade Delete
Beim Loeschen eines Ordners werden alle enthaltenen Strategien und Unterordner mit geloescht.
:::
