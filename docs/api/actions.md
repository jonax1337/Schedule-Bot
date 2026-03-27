# Bot-Aktionen API

Alle Aktions-Endpunkte erfordern Admin-Authentifizierung.

## Schedule posten

```http
POST /api/actions/schedule
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Body (optional):**
```json
{
  "date": "27.03.2026"
}
```

Ohne `date` wird der heutige Tag gepostet. Postet den Schedule-Embed in den konfigurierten Discord-Channel.

## Erinnerungen senden

```http
POST /api/actions/remind
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Body (optional):**
```json
{
  "date": "27.03.2026"
}
```

Sendet DM-Erinnerungen an alle Spieler ohne Verfuegbarkeits-Angabe fuer das Datum. Abwesende und Coaches werden uebersprungen.

## Poll erstellen

```http
POST /api/actions/poll
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Body:**
```json
{
  "question": "Wann koennt ihr heute?",
  "options": ["18:00", "19:00", "20:00"],
  "duration": 60
}
```

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `question` | string | Ja | Poll-Frage |
| `options` | string[] | Ja | Antwortmoeglichkeiten (2-10) |
| `duration` | number | Nein | Dauer in Minuten (Default: 60) |

## Benachrichtigung senden

```http
POST /api/actions/notify
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Body:**
```json
{
  "type": "info",
  "message": "Training faellt heute aus!",
  "target": "all"
}
```

| Feld | Typ | Werte | Beschreibung |
|------|-----|-------|-------------|
| `type` | string | `info`, `warning`, `alert` | Nachrichtentyp |
| `message` | string | - | Nachrichtentext |
| `target` | string | `all`, `mains`, `subs`, Discord-ID | Empfaenger |

## Channel leeren

```http
POST /api/actions/clear-channel
Authorization: Bearer <admin-token>
```

Loescht alle Nachrichten im konfigurierten Schedule-Channel.

::: danger Vorsicht
Diese Aktion ist nicht umkehrbar. Alle Nachrichten im Channel werden geloescht.
:::

## Training-Poll erstellen

```http
POST /api/actions/training-poll
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Body (optional):**
```json
{
  "date": "27.03.2026"
}
```

Erstellt einen Training-Start-Poll basierend auf den verfuegbaren Zeitfenstern der Spieler.

## Nachricht pinnen

```http
POST /api/actions/pin-message
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Body:**
```json
{
  "content": "Wichtige Ankuendigung: ..."
}
```

Sendet eine Nachricht in den Schedule-Channel und pinnt sie an.
