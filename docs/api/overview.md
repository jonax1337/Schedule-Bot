# API-Uebersicht

## Basis-URL

```
http://localhost:3001/api
```

Production: Konfiguriert ueber `BOT_API_URL` / `NEXT_PUBLIC_BOT_API_URL`.

## Authentifizierung

Die meisten Endpunkte erfordern einen JWT Bearer Token:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

Tokens werden ueber die Login-Endpunkte bezogen. Siehe [Authentifizierung](/guide/authentication).

## Antwort-Format

### Erfolg

```json
{
  "success": true,
  "data": { ... }
}
```

### Fehler

```json
{
  "error": "Fehlerbeschreibung"
}
```

### HTTP Status Codes

| Code | Bedeutung |
|------|-----------|
| `200` | Erfolg |
| `201` | Erstellt |
| `400` | Ungueltige Anfrage |
| `401` | Nicht authentifiziert |
| `403` | Keine Berechtigung |
| `404` | Nicht gefunden |
| `429` | Rate Limit erreicht |
| `500` | Server-Fehler |

## Rate Limiting

- **Global:** Standard-Limit fuer alle Endpunkte
- **Sensitiv:** Strengeres Limit fuer Login und Admin-Aktionen
- Response-Header: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Endpunkt-Uebersicht

### Authentifizierung
| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| `POST` | `/auth/admin/login` | - | Admin-Login |
| `POST` | `/auth/user/login` | - | User-Login |
| `GET` | `/auth/discord` | - | Discord OAuth starten |
| `GET` | `/auth/discord/callback` | - | OAuth Callback |
| `GET` | `/auth/user` | JWT | Aktueller User |

### Schedule
| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| `GET` | `/schedule/next14` | JWT | Naechste 14 Tage |
| `GET` | `/schedule/paginated` | Admin | Paginierte Historie |
| `POST` | `/schedule/update-reason` | Admin | Grund aktualisieren |
| `POST` | `/schedule/update-availability` | JWT | Verfuegbarkeit setzen |
| `GET` | `/schedule-details` | JWT | Analysierte Details fuer Datum |
| `GET` | `/schedule-details-batch` | JWT | Batch-Abfrage |

### User Mappings
| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| `GET` | `/user-mappings` | Optional | Alle Spieler |
| `POST` | `/user-mappings` | Admin | Spieler hinzufuegen |
| `PUT` | `/user-mappings/reorder` | Admin | Reihenfolge aendern |
| `PUT` | `/user-mappings/:discordId` | Admin | Spieler bearbeiten |
| `DELETE` | `/user-mappings/:discordId` | Admin | Spieler entfernen |

### Scrims
| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| `GET` | `/scrims` | JWT | Alle Scrims |
| `GET` | `/scrims/stats/summary` | JWT | Statistiken |
| `GET` | `/scrims/range/:start/:end` | JWT | Scrims im Zeitraum |
| `GET` | `/scrims/:id` | JWT | Einzelner Scrim |
| `POST` | `/scrims` | Admin | Scrim erstellen |
| `PUT` | `/scrims/:id` | Admin | Scrim bearbeiten |
| `DELETE` | `/scrims/:id` | Admin | Scrim loeschen |

### Abwesenheiten
| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| `GET` | `/absences` | JWT | Abwesenheiten |
| `POST` | `/absences` | JWT | Erstellen |
| `PUT` | `/absences/:id` | JWT | Bearbeiten |
| `DELETE` | `/absences/:id` | JWT | Loeschen |

### Wiederkehrende Verfuegbarkeit
| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| `GET` | `/recurring-availability` | JWT | Eigene Eintraege |
| `POST` | `/recurring-availability` | JWT | Setzen |
| `DELETE` | `/recurring-availability/:day` | JWT | Tag loeschen |
| `DELETE` | `/recurring-availability` | JWT | Alle loeschen |

### Strategien
| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| `GET` | `/strategies` | JWT | Alle Strategien |
| `POST` | `/strategies` | JWT* | Erstellen (mit Upload) |
| `PUT` | `/strategies/:id` | JWT* | Bearbeiten |
| `DELETE` | `/strategies/:id` | JWT* | Loeschen |
| `GET` | `/strategies/folders` | JWT | Ordner-Struktur |
| `POST` | `/strategies/folders` | JWT* | Ordner erstellen |

*Berechtigungsabhaengig von `stratbook.editPermission` Setting

### VOD-Kommentare
| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| `GET` | `/vod-comments/scrim/:scrimId` | JWT | Kommentare laden |
| `POST` | `/vod-comments` | JWT | Kommentar erstellen |
| `PUT` | `/vod-comments/:id` | JWT | Bearbeiten |
| `DELETE` | `/vod-comments/:id` | JWT | Loeschen |

### Aktionen
| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| `POST` | `/actions/schedule` | Admin | Schedule posten |
| `POST` | `/actions/remind` | Admin | Erinnerungen senden |
| `POST` | `/actions/poll` | Admin | Poll erstellen |
| `POST` | `/actions/notify` | Admin | DM senden |
| `POST` | `/actions/clear-channel` | Admin | Channel leeren |
| `POST` | `/actions/training-poll` | Admin | Training-Poll |
| `POST` | `/actions/pin-message` | Admin | Nachricht pinnen |

### Settings
| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| `GET` | `/settings` | - | Alle Settings laden |
| `POST` | `/settings` | Admin | Settings aktualisieren |
| `POST` | `/settings/reload-config` | Admin | Config neu laden |

### System
| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| `GET` | `/health` | - | Health Check |
| `GET` | `/bot-status` | - | Bot-Status |
| `GET` | `/admin/logs` | Admin | System-Logs |
| `GET` | `/discord/channels` | Admin | Discord Channels |
| `GET` | `/discord/roles` | Admin | Discord Rollen |
