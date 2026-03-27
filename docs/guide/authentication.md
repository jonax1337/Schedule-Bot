# Authentifizierung

## Uebersicht

Schedule-Bot verwendet ein mehrstufiges Authentifizierungs-System:

| Methode | Zugang | Verwendung |
|---------|--------|-----------|
| **Admin Login** | Username + Passwort | Admin-Dashboard |
| **User Login** | Name aus Roster | User-Portal |
| **Discord OAuth** | Discord-Konto | User-Portal (optional) |
| **JWT Token** | Bearer Token | API-Zugriff |

## Admin-Authentifizierung

### Login-Flow

```
Admin → /admin/login
  │
  ├─ Username + Passwort eingeben
  │
  ├─ POST /api/auth/admin/login
  │     Body: { username, password }
  │
  ├─ Server: bcrypt.compare(password, ADMIN_PASSWORD_HASH)
  │
  ├─ JWT Token generieren (role: 'admin', 24h Ablauf)
  │
  └─ Token in localStorage speichern → /admin
```

### Passwort-Hash generieren

```bash
npm run build
node dist/generateHash.js
# Eingabe: dein_passwort
# Ausgabe: $2b$10$...
```

Den Hash als `ADMIN_PASSWORD_HASH` in `.env` setzen.

## User-Authentifizierung

### Roster-basierter Login

```
User → /login
  │
  ├─ Name aus Dropdown waehlen (aus user_mappings)
  │
  ├─ POST /api/auth/user/login
  │     Body: { displayName }
  │
  ├─ JWT Token generieren (role: 'user', 24h Ablauf)
  │
  └─ Token in localStorage speichern → /
```

### Discord OAuth (optional)

Wenn `discord.authEnabled` in den Settings aktiviert ist:

```
User → /login → "Mit Discord anmelden"
  │
  ├─ GET /api/auth/discord → Discord OAuth URL
  │
  ├─ User autorisiert auf discord.com
  │
  ├─ Discord redirected zu /auth/callback?code=...
  │
  ├─ Callback: GET /api/auth/discord/callback?code=...&state=...
  │
  ├─ Server: Code gegen Token tauschen, User-Info laden
  │
  ├─ Discord-ID mit user_mappings abgleichen
  │
  ├─ JWT Token generieren
  │
  └─ Token speichern → /
```

**Voraussetzungen fuer OAuth:**
- `DISCORD_CLIENT_ID` und `DISCORD_CLIENT_SECRET` gesetzt
- `DISCORD_REDIRECT_URI` konfiguriert
- `discord.authEnabled` in Settings auf `true`

## JWT Tokens

### Struktur

```json
{
  "username": "PlayerName",
  "role": "admin" | "user",
  "discordId": "123456789012345678",
  "iat": 1711540800,
  "exp": 1711627200
}
```

### Lebensdauer

- Ablauf: **24 Stunden** nach Erstellung
- Kein Refresh-Token-Mechanismus
- Bei Ablauf: Redirect zum Login

### Verwendung

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## Middleware

### `verifyToken()`

Pflicht-Authentifizierung. Gibt 401 zurueck wenn:
- Kein Token vorhanden
- Token abgelaufen
- Token ungueltig

### `optionalAuth()`

Token wird geprueft falls vorhanden, aber nicht erforderlich. Nuetzlich fuer Endpunkte mit unterschiedlichem Verhalten fuer authentifizierte vs. anonyme Requests.

### `requireAdmin()`

Erfordert `verifyToken()` + Rolle `admin`. Gibt 403 zurueck bei fehlendem Admin-Status.

### `resolveCurrentUser()`

Löst den aktuellen Benutzer zur Discord-ID auf. Wird fuer Ownership-Checks verwendet.

### `requireOwnershipOrAdmin()`

Factory-Funktion: Erstellt Middleware, die entweder Besitz des Datensatzes oder Admin-Rolle erfordert.

```typescript
// Beispiel: Nur eigene Abwesenheit oder Admin
router.delete('/absences/:id',
  verifyToken,
  requireOwnershipOrAdmin(getAbsenceOwner),
  deleteAbsence
);
```

## Sicherheitsfeatures

- **bcrypt** - Passwort-Hashing mit Salt
- **Rate Limiting** - Max. Login-Versuche pro Zeitfenster
- **CORS** - Nur erlaubte Origins
- **Helmet** - Security Headers
- **Kein Token-Caching** - Tokens werden bei jedem Request validiert
- **Server-seitige Rollen-Pruefung** - localStorage-Manipulation wird verhindert
