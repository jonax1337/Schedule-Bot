# Environment Variables

## Full Reference

### Required Variables (Backend)

| Variable | Description | Example |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Discord bot token from the Developer Portal | `MTIz...` |
| `DISCORD_GUILD_ID` | ID of the Discord server | `123456789012345678` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/schedule_bot` |
| `ADMIN_USERNAME` | Admin login username | `admin` |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of the admin password | `$2b$10$...` |
| `JWT_SECRET` | Secret used to sign JWTs (min. 32 characters) | `abc123def456...` |

### Optional Variables (Backend)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `3001` |
| `DASHBOARD_URL` | Frontend URL for CORS | `http://localhost:3000` |
| `DISCORD_CLIENT_ID` | Discord OAuth application ID | - |
| `DISCORD_CLIENT_SECRET` | Discord OAuth client secret | - |
| `DISCORD_REDIRECT_URI` | OAuth redirect URI | `http://localhost:3000/auth/callback` |

### Dashboard Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BOT_API_URL` | Backend URL (server-side, internal) | `http://localhost:3001` |
| `NEXT_PUBLIC_BOT_API_URL` | Backend URL (client-side, public) | `http://localhost:3001` |

::: warning NEXT_PUBLIC_ prefix
Variables prefixed with `NEXT_PUBLIC_` are inlined into the client bundle at **build time** and are visible in the browser. Never use this prefix for secrets.
:::

## Environment Configurations

### Local Development

```ini
DISCORD_TOKEN=your_bot_token
DISCORD_GUILD_ID=your_server_id
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schedule_bot
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$...
JWT_SECRET=a_string_at_least_32_characters_long
DASHBOARD_URL=http://localhost:3000
```

### Docker

```ini
DISCORD_TOKEN=your_bot_token
DISCORD_GUILD_ID=your_server_id
DATABASE_URL=postgresql://schedule_bot_user:your_password@db:5432/schedule_bot
DB_PASSWORD=your_password
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$...
JWT_SECRET=a_string_at_least_32_characters_long
DASHBOARD_URL=http://localhost:3000
NEXT_PUBLIC_BOT_API_URL=http://localhost:3001
```

### Production (Railway/Render)

```ini
DISCORD_TOKEN=your_bot_token
DISCORD_GUILD_ID=your_server_id
DATABASE_URL=postgresql://...@host:5432/db  # Provided by the platform
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$...
JWT_SECRET=long_random_string
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_REDIRECT_URI=https://your-dashboard.example.com/auth/callback
DASHBOARD_URL=https://your-dashboard.example.com
NEXT_PUBLIC_BOT_API_URL=https://your-backend.example.com
BOT_API_URL=http://backend-internal:3001
```

## Generating the Admin Password

```bash
# 1. Build the backend
npm run build

# 2. Generate the hash
node dist/generateHash.js
# Input:  your_password
# Output: $2b$10$Xk7yQf...

# 3. Add it to .env
ADMIN_PASSWORD_HASH=$2b$10$Xk7yQf...
```

## Generating a JWT Secret

```bash
# Option 1: OpenSSL
openssl rand -base64 48

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

## Security Notes

- Never commit `.env` files (already listed in `.gitignore`)
- `JWT_SECRET` must be unique per deployment
- Never store `ADMIN_PASSWORD_HASH` in plain text
- If `DISCORD_TOKEN` is compromised, regenerate it immediately in the Developer Portal
- In production, use HTTPS for all public URLs
