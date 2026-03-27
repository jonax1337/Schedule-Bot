# Authentifizierung API

## Admin Login

```http
POST /api/auth/admin/login
```

**Body:**
```json
{
  "username": "admin",
  "password": "dein_passwort"
}
```

**Erfolg (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "username": "admin",
    "role": "admin"
  }
}
```

**Fehler (401):**
```json
{
  "error": "Invalid credentials"
}
```

## User Login

```http
POST /api/auth/user/login
```

**Body:**
```json
{
  "displayName": "PlayerName"
}
```

**Erfolg (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "username": "PlayerName",
    "role": "user",
    "discordId": "123456789012345678"
  }
}
```

## Discord OAuth starten

```http
GET /api/auth/discord
```

**Response (302):** Redirect zur Discord OAuth URL.

**Query-Parameter der Redirect-URL:**
- `client_id` - Discord Application ID
- `redirect_uri` - Callback URL
- `response_type` - `code`
- `scope` - `identify`
- `state` - CSRF-Schutz Token

## Discord OAuth Callback

```http
GET /api/auth/discord/callback?code=...&state=...
```

**Erfolg (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "username": "PlayerName",
    "role": "user",
    "discordId": "123456789012345678",
    "avatar": "https://cdn.discordapp.com/avatars/..."
  }
}
```

## Aktueller User

```http
GET /api/auth/user
Authorization: Bearer <token>
```

**Erfolg (200):**
```json
{
  "success": true,
  "user": {
    "username": "PlayerName",
    "role": "user",
    "discordId": "123456789012345678"
  }
}
```

## Logout

```http
POST /api/auth/logout
Authorization: Bearer <token>
```

**Erfolg (200):**
```json
{
  "success": true
}
```
