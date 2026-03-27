# Umgebungsvariablen

## Vollstaendige Referenz

### Pflicht-Variablen (Backend)

| Variable | Beschreibung | Beispiel |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Discord Bot Token aus dem Developer Portal | `MTIz...` |
| `DISCORD_GUILD_ID` | ID des Discord Servers | `123456789012345678` |
| `DATABASE_URL` | PostgreSQL Connection String | `postgresql://user:pass@localhost:5432/schedule_bot` |
| `ADMIN_USERNAME` | Admin-Login Benutzername | `admin` |
| `ADMIN_PASSWORD_HASH` | bcrypt-Hash des Admin-Passworts | `$2b$10$...` |
| `JWT_SECRET` | Secret fuer JWT-Signierung (min. 32 Zeichen) | `abc123def456...` |

### Optionale Variablen (Backend)

| Variable | Beschreibung | Default |
|----------|-------------|---------|
| `PORT` | API Server Port | `3001` |
| `DASHBOARD_URL` | Frontend-URL fuer CORS | `http://localhost:3000` |
| `DISCORD_CLIENT_ID` | Discord OAuth Application ID | - |
| `DISCORD_CLIENT_SECRET` | Discord OAuth Client Secret | - |
| `DISCORD_REDIRECT_URI` | OAuth Redirect URI | `http://localhost:3000/auth/callback` |

### Dashboard-Variablen

| Variable | Beschreibung | Default |
|----------|-------------|---------|
| `BOT_API_URL` | Backend-URL (Server-seitig, intern) | `http://localhost:3001` |
| `NEXT_PUBLIC_BOT_API_URL` | Backend-URL (Client-seitig, oeffentlich) | `http://localhost:3001` |

::: warning NEXT_PUBLIC_ Praefix
Variablen mit `NEXT_PUBLIC_` werden zur **Build-Zeit** in den Client-Code eingebettet und sind im Browser sichtbar. Niemals Secrets mit diesem Praefix verwenden!
:::

## Umgebungs-Konfigurationen

### Lokale Entwicklung

```env
DISCORD_TOKEN=dein_bot_token
DISCORD_GUILD_ID=deine_server_id
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schedule_bot
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$...
JWT_SECRET=ein_mindestens_32_zeichen_langer_string
DASHBOARD_URL=http://localhost:3000
```

### Docker

```env
DISCORD_TOKEN=dein_bot_token
DISCORD_GUILD_ID=deine_server_id
DATABASE_URL=postgresql://schedule_bot_user:dein_passwort@db:5432/schedule_bot
DB_PASSWORD=dein_passwort
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$...
JWT_SECRET=ein_mindestens_32_zeichen_langer_string
DASHBOARD_URL=http://localhost:3000
NEXT_PUBLIC_BOT_API_URL=http://localhost:3001
```

### Produktion (Railway/Render)

```env
DISCORD_TOKEN=dein_bot_token
DISCORD_GUILD_ID=deine_server_id
DATABASE_URL=postgresql://...@host:5432/db  # Von Platform bereitgestellt
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$...
JWT_SECRET=langer_zufaelliger_string
DISCORD_CLIENT_ID=deine_client_id
DISCORD_CLIENT_SECRET=dein_client_secret
DISCORD_REDIRECT_URI=https://dein-dashboard.example.com/auth/callback
DASHBOARD_URL=https://dein-dashboard.example.com
NEXT_PUBLIC_BOT_API_URL=https://dein-backend.example.com
BOT_API_URL=http://backend-internal:3001
```

## Admin-Passwort generieren

```bash
# 1. Backend bauen
npm run build

# 2. Hash generieren
node dist/generateHash.js
# Eingabe: dein_passwort
# Ausgabe: $2b$10$Xk7yQf...

# 3. In .env eintragen
ADMIN_PASSWORD_HASH=$2b$10$Xk7yQf...
```

## JWT Secret generieren

```bash
# Option 1: OpenSSL
openssl rand -base64 48

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

## Sicherheitshinweise

- `.env` Dateien niemals committen (ist in `.gitignore`)
- `JWT_SECRET` muss einzigartig pro Deployment sein
- `ADMIN_PASSWORD_HASH` niemals im Klartext speichern
- `DISCORD_TOKEN` bei Kompromittierung sofort im Developer Portal regenerieren
- In Produktion: HTTPS fuer alle oeffentlichen URLs verwenden
