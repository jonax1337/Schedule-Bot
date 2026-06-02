# Authentication API

## Admin Login

```http
POST /api/auth/admin/login
```

**Body:**
```json
{
  "username": "admin",
  "password": "your_password"
}
```

**Success (200):**
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

**Error (401):**
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

**Success (200):**
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

## Start Discord OAuth

```http
GET /api/auth/discord
```

**Response (302):** Redirect to the Discord OAuth URL.

**Query parameters on the redirect URL:**
- `client_id` - Discord application ID
- `redirect_uri` - Callback URL
- `response_type` - `code`
- `scope` - `identify`
- `state` - CSRF protection token

## Discord OAuth Callback

```http
GET /api/auth/discord/callback?code=...&state=...
```

**Success (200):**
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

## Current User

```http
GET /api/auth/user
Authorization: Bearer <token>
```

**Success (200):**
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

**Success (200):**
```json
{
  "success": true
}
```
