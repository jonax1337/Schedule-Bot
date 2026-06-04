# Authentication

## Overview

Synqed uses a multi-tier authentication system:

| Method | Credentials | Used for |
|--------|-------------|----------|
| **Admin login** | Username + password | Admin dashboard |
| **User login** | Name from the roster | User portal |
| **Discord OAuth** | Discord account | User portal (optional) |
| **JWT token** | Bearer token | API access |

## Admin Authentication

### Login Flow

```
Admin → /admin/login
  │
  ├─ Enter username + password
  │
  ├─ POST /api/auth/admin/login
  │     Body: { username, password }
  │
  ├─ Server: bcrypt.compare(password, ADMIN_PASSWORD_HASH)
  │
  ├─ Generate JWT token (role: 'admin', 24h expiry)
  │
  └─ Store token in localStorage → /admin
```

### Generating a Password Hash

```bash
npm run build
node dist/generateHash.js
# Input:  your_password
# Output: $2b$10$...
```

Set the hash as `ADMIN_PASSWORD_HASH` in `.env`.

## User Authentication

### Roster-based Login

```
User → /login
  │
  ├─ Pick a name from the dropdown (sourced from user_mappings)
  │
  ├─ POST /api/auth/user/login
  │     Body: { displayName }
  │
  ├─ Generate JWT token (role: 'user', 24h expiry)
  │
  └─ Store token in localStorage → /
```

### Discord OAuth (optional)

When `discord.authEnabled` is turned on in settings:

```
User → /login → "Sign in with Discord"
  │
  ├─ GET /api/auth/discord → Discord OAuth URL
  │
  ├─ User authorizes the app on discord.com
  │
  ├─ Discord redirects to /auth/callback?code=...
  │
  ├─ Callback: GET /api/auth/discord/callback?code=...&state=...
  │
  ├─ Server: exchange code for token, fetch user info
  │
  ├─ Match Discord ID against user_mappings
  │
  ├─ Generate JWT token
  │
  └─ Store token → /
```

**OAuth requirements:**
- `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` are set
- `DISCORD_REDIRECT_URI` is configured
- `discord.authEnabled` in settings is `true`

## JWT Tokens

### Structure

```json
{
  "username": "PlayerName",
  "role": "admin" | "user",
  "discordId": "123456789012345678",
  "iat": 1711540800,
  "exp": 1711627200
}
```

### Lifetime

- Expiry: **24 hours** after creation
- No refresh-token mechanism
- On expiry: redirect to the login page

### Usage

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## Middleware

### `verifyToken()`

Mandatory authentication. Returns 401 when:
- No token is present
- The token has expired
- The token is invalid

### `optionalAuth()`

Verifies the token if one is present, but does not require it. Useful for endpoints whose behavior differs between authenticated and anonymous requests.

### `requireAdmin()`

Requires `verifyToken()` plus the `admin` role. Returns 403 when the admin role is missing.

### `resolveCurrentUser()`

Resolves the current user to a Discord ID. Used for ownership checks.

### `requireOwnershipOrAdmin()`

Factory function: returns middleware that requires either ownership of the record or the admin role.

```typescript
// Example: only the owner of an absence, or an admin
router.delete('/absences/:id',
  verifyToken,
  requireOwnershipOrAdmin(getAbsenceOwner),
  deleteAbsence
);
```

## Security Features

- **bcrypt** — password hashing with salt
- **Rate limiting** — caps login attempts per time window
- **CORS** — only allowed origins
- **Helmet** — security headers
- **No token caching** — tokens are validated on every request
- **Server-side role checks** — prevents localStorage tampering
