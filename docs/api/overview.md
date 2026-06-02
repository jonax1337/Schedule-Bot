# API Overview

## Base URL

```
http://localhost:3001/api
```

Production: configured via `BOT_API_URL` / `NEXT_PUBLIC_BOT_API_URL`.

## Authentication

Most endpoints require a JWT bearer token:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

Tokens are obtained through the login endpoints. See [Authentication](/guide/authentication).

## Response Format

### Success

```json
{
  "success": true,
  "data": { ... }
}
```

### Error

```json
{
  "error": "Error description"
}
```

### HTTP Status Codes

| Code  | Meaning             |
| ----- | ------------------- |
| `200` | OK                  |
| `201` | Created             |
| `400` | Bad Request         |
| `401` | Unauthenticated     |
| `403` | Forbidden           |
| `404` | Not Found           |
| `429` | Rate Limit Exceeded |
| `500` | Server Error        |

## Rate Limiting

- **Global:** standard limit applied to all endpoints
- **Sensitive:** stricter limit for login and admin actions
- Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Endpoint Overview

### Authentication
| Method | Path                      | Auth | Description           |
| ------ | ------------------------- | ---- | --------------------- |
| `POST` | `/auth/admin/login`       | -    | Admin login           |
| `POST` | `/auth/user/login`        | -    | User login            |
| `GET`  | `/auth/discord`           | -    | Start Discord OAuth   |
| `GET`  | `/auth/discord/callback`  | -    | OAuth callback        |
| `GET`  | `/auth/user`              | JWT  | Current user          |

### Schedule
| Method | Pfad                              | Auth  | Description                       |
| ------ | --------------------------------- | ----- | --------------------------------- |
| `GET`  | `/schedule/next14`                | JWT   | Next 14 days                      |
| `GET`  | `/schedule/paginated`             | Admin | Paginated history                 |
| `POST` | `/schedule/update-reason`         | Admin | Update reason                     |
| `POST` | `/schedule/update-availability`   | JWT   | Set availability                  |
| `GET`  | `/schedule-details`               | JWT   | Analyzed details for a date       |
| `GET`  | `/schedule-details-batch`         | JWT   | Batch query                       |

### User Mappings
| Method   | Path                          | Auth     | Description       |
| -------- | ----------------------------- | -------- | ----------------- |
| `GET`    | `/user-mappings`              | Optional | All players       |
| `POST`   | `/user-mappings`              | Admin    | Add player        |
| `PUT`    | `/user-mappings/reorder`      | Admin    | Reorder players   |
| `PUT`    | `/user-mappings/:discordId`   | Admin    | Edit player       |
| `DELETE` | `/user-mappings/:discordId`   | Admin    | Remove player     |

### Scrims
| Method   | Path                            | Auth  | Description           |
| -------- | ------------------------------- | ----- | --------------------- |
| `GET`    | `/scrims`                       | JWT   | All scrims            |
| `GET`    | `/scrims/stats/summary`         | JWT   | Statistics            |
| `GET`    | `/scrims/range/:start/:end`     | JWT   | Scrims in date range  |
| `GET`    | `/scrims/:id`                   | JWT   | Single scrim          |
| `POST`   | `/scrims`                       | Admin | Create scrim          |
| `PUT`    | `/scrims/:id`                   | Admin | Edit scrim            |
| `DELETE` | `/scrims/:id`                   | Admin | Delete scrim          |

### Absences
| Method   | Path              | Auth | Description    |
| -------- | ----------------- | ---- | -------------- |
| `GET`    | `/absences`       | JWT  | List absences  |
| `POST`   | `/absences`       | JWT  | Create         |
| `PUT`    | `/absences/:id`   | JWT  | Edit           |
| `DELETE` | `/absences/:id`   | JWT  | Delete         |

### Recurring Availability
| Method   | Path                                | Auth | Description       |
| -------- | ----------------------------------- | ---- | ----------------- |
| `GET`    | `/recurring-availability`           | JWT  | Own entries       |
| `POST`   | `/recurring-availability`           | JWT  | Set entry         |
| `DELETE` | `/recurring-availability/:day`      | JWT  | Delete one day    |
| `DELETE` | `/recurring-availability`           | JWT  | Delete all        |

### Strategies
| Method   | Path                       | Auth  | Description                |
| -------- | -------------------------- | ----- | -------------------------- |
| `GET`    | `/strategies`              | JWT   | All strategies             |
| `POST`   | `/strategies`              | JWT*  | Create (with upload)       |
| `PUT`    | `/strategies/:id`          | JWT*  | Edit                       |
| `DELETE` | `/strategies/:id`          | JWT*  | Delete                     |
| `GET`    | `/strategies/folders`      | JWT   | Folder tree                |
| `POST`   | `/strategies/folders`      | JWT*  | Create folder              |

*Permission depends on the `stratbook.editPermission` setting.

### VOD Comments
| Method   | Path                              | Auth | Description       |
| -------- | --------------------------------- | ---- | ----------------- |
| `GET`    | `/vod-comments/scrim/:scrimId`    | JWT  | Load comments     |
| `POST`   | `/vod-comments`                   | JWT  | Create comment    |
| `PUT`    | `/vod-comments/:id`               | JWT  | Edit              |
| `DELETE` | `/vod-comments/:id`               | JWT  | Delete            |

### Actions
| Method | Path                       | Auth  | Description           |
| ------ | -------------------------- | ----- | --------------------- |
| `POST` | `/actions/schedule`        | Admin | Post schedule         |
| `POST` | `/actions/remind`          | Admin | Send reminders        |
| `POST` | `/actions/poll`            | Admin | Create poll           |
| `POST` | `/actions/notify`          | Admin | Send DM               |
| `POST` | `/actions/clear-channel`   | Admin | Clear channel         |
| `POST` | `/actions/training-poll`   | Admin | Training poll         |
| `POST` | `/actions/pin-message`     | Admin | Pin message           |

### Settings
| Method | Path                         | Auth  | Description            |
| ------ | ---------------------------- | ----- | ---------------------- |
| `GET`  | `/settings`                  | -     | Load all settings      |
| `POST` | `/settings`                  | Admin | Update settings        |
| `POST` | `/settings/reload-config`    | Admin | Reload config          |

### System
| Method | Path                  | Auth  | Description       |
| ------ | --------------------- | ----- | ----------------- |
| `GET`  | `/health`             | -     | Health check      |
| `GET`  | `/bot-status`         | -     | Bot status        |
| `GET`  | `/admin/logs`         | Admin | System logs       |
| `GET`  | `/discord/channels`   | Admin | Discord channels  |
| `GET`  | `/discord/roles`      | Admin | Discord roles     |
