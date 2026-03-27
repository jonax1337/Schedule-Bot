# Konfiguration

## Umgebungsvariablen

### Pflicht-Variablen

| Variable | Beschreibung | Beispiel |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Discord Bot Token | `MTIz...` |
| `DISCORD_GUILD_ID` | Server-ID | `123456789012345678` |
| `DATABASE_URL` | PostgreSQL Connection String | `postgresql://user:pass@localhost:5432/db` |
| `ADMIN_USERNAME` | Dashboard Admin-Benutzername | `admin` |
| `ADMIN_PASSWORD_HASH` | bcrypt-Hash des Admin-Passworts | `$2b$10$...` |
| `JWT_SECRET` | JWT Signing Secret (min. 32 Zeichen) | `ein_sehr_langer_zufaelliger_string` |

### Optionale Variablen

| Variable | Beschreibung | Default |
|----------|-------------|---------|
| `DISCORD_CLIENT_ID` | Fuer Discord OAuth | - |
| `DISCORD_CLIENT_SECRET` | Fuer Discord OAuth | - |
| `DISCORD_REDIRECT_URI` | OAuth Redirect URL | `http://localhost:3000/auth/callback` |
| `DASHBOARD_URL` | Frontend-URL (CORS) | `http://localhost:3000` |
| `PORT` | API Server Port | `3001` |
| `BOT_API_URL` | API-URL (Server-seitig) | `http://localhost:3001` |
| `NEXT_PUBLIC_BOT_API_URL` | API-URL (Client-seitig) | `http://localhost:3001` |

## Runtime-Settings

Alle zur Laufzeit aenderbaren Einstellungen werden in der `settings`-Tabelle der Datenbank als Key-Value-Paare gespeichert. Sie sind ueber das Admin-Dashboard oder die API konfigurierbar.

### Discord-Konfiguration

| Setting Key | Beschreibung | Beispiel |
|-------------|-------------|---------|
| `discord.channelId` | Channel fuer Schedule-Posts | `123456789012345678` |
| `discord.pingRoleId` | Rolle fuer Benachrichtigungen | `123456789012345678` |
| `discord.clientId` | OAuth Client ID | `123456789012345678` |
| `discord.clientSecret` | OAuth Client Secret | `abc123...` |
| `discord.redirectUri` | OAuth Redirect URI | `http://localhost:3000/auth/callback` |
| `discord.authEnabled` | Discord-Login aktiviert | `true` |

### Scheduling

| Setting Key | Beschreibung | Default |
|-------------|-------------|---------|
| `scheduling.dailyPostTime` | Uhrzeit fuer taeglichen Post | `18:00` |
| `scheduling.timezone` | Bot-Zeitzone (IANA) | `Europe/Berlin` |
| `scheduling.reminderHoursBefore` | Stunden vor Post fuer Erinnerung | `3` |
| `scheduling.duplicateReminderEnabled` | Zweite Erinnerung aktiv | `true` |
| `scheduling.duplicateReminderHoursBefore` | Stunden vor Post fuer 2. Erinnerung | `1` |
| `scheduling.trainingPollEnabled` | Training-Poll bei Schedule-Post | `false` |

### Branding

| Setting Key | Beschreibung | Default |
|-------------|-------------|---------|
| `branding.teamName` | Team-Name im Dashboard | `Team` |
| `branding.tagline` | Untertitel | - |
| `branding.logoUrl` | Logo-URL | - |

### Stratbook

| Setting Key | Beschreibung | Default |
|-------------|-------------|---------|
| `stratbook.editPermission` | Wer darf bearbeiten? | `admin` |

::: info Werte: `admin` oder `all`
- `admin` - Nur Admins koennen Strategien bearbeiten
- `all` - Alle registrierten Spieler koennen bearbeiten
:::

## Settings aendern

### Via Dashboard

1. Admin-Dashboard oeffnen: `/admin`
2. Tab **Settings** waehlen
3. Werte anpassen und speichern
4. Config wird automatisch neu geladen und Scheduler neu gestartet

### Via API

```bash
curl -X POST http://localhost:3001/api/settings \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "scheduling.dailyPostTime": "19:00",
    "scheduling.timezone": "Europe/Berlin"
  }'
```

### Via Config Reload

```bash
curl -X POST http://localhost:3001/api/settings/reload-config \
  -H "Authorization: Bearer YOUR_JWT"
```
