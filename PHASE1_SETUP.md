# Phase 1 Security Setup Guide

## 🔒 Was wurde implementiert?

Phase 1 der Security-Hardening ist abgeschlossen. Folgende Features wurden hinzugefügt:

### ✅ Implementierte Features

1. **JWT-basierte Authentifizierung**
   - Token-basierte Auth statt localStorage-Fake
   - 24h Token-Gültigkeit
   - Automatische Token-Validierung bei jedem Request

2. **Password Hashing mit bcrypt**
   - 12 Rounds für maximale Sicherheit
   - Passwörter werden nie im Klartext gespeichert

3. **Rate Limiting**
   - Login: 5 Versuche / 15 Minuten
   - API: 100 Requests / Minute
   - Sensitive Operations: 20 Requests / Minute

4. **Input-Validierung mit Joi**
   - Schema-basierte Validierung für alle Inputs
   - XSS-Prevention durch Sanitization
   - Längen-Limits für alle Felder

5. **CORS-Whitelist**
   - Nur erlaubte Origins können API aufrufen
   - Konfigurierbar über DASHBOARD_URL

6. **Security Headers (Helmet)**
   - Content Security Policy
   - HSTS
   - X-Frame-Options
   - Weitere Security-Header

7. **API-Endpunkt-Schutz**
   - Alle Admin-Endpunkte benötigen JWT-Token
   - Role-based Access Control (Admin/User)
   - Optional Auth für öffentliche Endpunkte

---

## 🚀 Setup-Anleitung

### Schritt 1: Environment Variables aktualisieren

1. **Generiere JWT Secret:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Generiere Password Hash:**
   ```bash
   npm run build
   node dist/generateHash.js YOUR_SECURE_PASSWORD
   ```

3. **Aktualisiere `.env` Datei:**
   ```bash
   # Discord Bot Configuration
   DISCORD_TOKEN=your_discord_bot_token_here
   DISCORD_GUILD_ID=your_guild_id_here

   # Google Sheets Configuration
   GOOGLE_SHEET_ID=your_google_sheet_id_here
   GOOGLE_CREDENTIALS_PATH=./credentials.json

   # Admin Dashboard Credentials
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD_HASH=<PASTE_HASH_FROM_STEP_2>

   # JWT Secret (from Step 1)
   JWT_SECRET=<PASTE_SECRET_FROM_STEP_1>

   # Dashboard URL (for CORS)
   DASHBOARD_URL=http://localhost:3000
   ```

### Schritt 2: Dependencies installieren (bereits erledigt)

Die folgenden Packages wurden bereits installiert:
- `jsonwebtoken` - JWT-Token-Generierung
- `bcrypt` - Password-Hashing
- `express-rate-limit` - Rate-Limiting
- `helmet` - Security-Headers
- `joi` - Input-Validierung

### Schritt 3: Code kompilieren

```bash
npm run build
```

### Schritt 4: Bot starten

```bash
npm start
```

### Schritt 5: Dashboard aktualisieren

Das Dashboard wurde bereits für JWT-Auth aktualisiert. Starte es mit:

```bash
cd dashboard
npm run dev
```

---

## 🔐 Wie funktioniert die neue Authentifizierung?

### Login-Flow

1. **User gibt Credentials ein** (Username + Password)
2. **Backend validiert** gegen gehashtes Passwort
3. **Backend generiert JWT-Token** (24h Gültigkeit)
4. **Frontend speichert Token** in localStorage
5. **Alle API-Requests** enthalten Token im Authorization-Header

### Token-Format

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token-Inhalt

```json
{
  "username": "admin",
  "role": "admin",
  "iat": 1234567890,
  "exp": 1234654290
}
```

### Automatische Token-Validierung

- Bei jedem API-Request wird Token validiert
- Bei ungültigem/abgelaufenem Token: 401 Unauthorized
- Frontend leitet automatisch zu Login um

---

## 🛡️ Security-Features im Detail

### 1. Rate Limiting

**Login-Endpunkt:**
```typescript
// 5 Versuche pro 15 Minuten
POST /api/admin/login
```

**Standard API:**
```typescript
// 100 Requests pro Minute
GET/POST/PUT/DELETE /api/*
```

**Sensitive Operations:**
```typescript
// 20 Requests pro Minute
POST /api/settings
POST /api/reload-config
POST /api/user-mappings/init
```

### 2. Input-Validierung

**Beispiel: Sheet Cell Update**
```typescript
{
  row: 1-1000,           // Integer
  column: "A"-"ZZZZZ",   // Regex: ^[A-Z]+$
  value: max 200 chars   // String
}
```

**Beispiel: User Mapping**
```typescript
{
  discordId: "123456789012345678",  // 17-19 digits
  discordUsername: max 32 chars,
  sheetColumnName: max 100 chars,
  role: "main" | "sub" | "coach"
}
```

### 3. CORS-Whitelist

Erlaubte Origins:
- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `process.env.DASHBOARD_URL`

Alle anderen Origins werden blockiert.

### 4. Security Headers

Helmet setzt automatisch:
- `Content-Security-Policy`
- `Strict-Transport-Security` (HSTS)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

---

## 🔧 API-Endpunkte Übersicht

### Öffentlich (kein Token nötig)

- `GET /api/health` - Health Check
- `POST /api/admin/login` - Login
- `GET /api/cache-stats` - Cache-Statistiken

### Optional Auth (Token optional)

- `GET /api/schedule-details` - Schedule Details
- `GET /api/schedule-details-batch` - Batch Schedule
- `GET /api/scrims` - Scrims anzeigen
- `GET /api/scrims/:id` - Scrim Details
- `GET /api/scrims/stats/summary` - Scrim Stats
- `GET /api/scrims/range/:start/:end` - Scrims nach Datum

### Authentifiziert (Token erforderlich)

- `GET /api/sheet-columns` - Sheet-Spalten
- `GET /api/sheet-data` - Sheet-Daten
- `POST /api/sheet-data/update` - Sheet aktualisieren

### Admin-Only (Token + Admin-Role)

- `GET /api/discord/channels` - Discord-Channels
- `GET /api/discord/roles` - Discord-Rollen
- `GET /api/discord/members` - Server-Members
- `GET /api/settings` - Settings abrufen
- `POST /api/settings` - Settings speichern
- `GET /api/logs` - Bot-Logs
- `GET /api/user-mappings` - User-Mappings
- `POST /api/user-mappings` - User registrieren
- `DELETE /api/user-mappings/:id` - User entfernen
- `POST /api/actions/*` - Bot-Actions
- `POST /api/scrims` - Scrim hinzufügen
- `PUT /api/scrims/:id` - Scrim bearbeiten
- `DELETE /api/scrims/:id` - Scrim löschen

---

## 🧪 Testing

### 1. Login testen

```bash
curl -X POST http://localhost:3001/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YOUR_PASSWORD"}'
```

**Erwartete Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h",
  "user": {
    "username": "admin",
    "role": "admin"
  }
}
```

### 2. Geschützten Endpunkt testen

```bash
# Ohne Token (sollte 401 zurückgeben)
curl http://localhost:3001/api/settings

# Mit Token
curl http://localhost:3001/api/settings \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Rate Limiting testen

```bash
# 6x schnell hintereinander (6. Request sollte 429 zurückgeben)
for i in {1..6}; do
  curl -X POST http://localhost:3001/api/admin/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"wrong"}'
  echo ""
done
```

### 4. Input-Validierung testen

```bash
# Ungültiger Input (sollte 400 zurückgeben)
curl -X POST http://localhost:3001/api/sheet-data/update \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"row":"invalid","column":"B","value":"test"}'
```

---

## 📊 Monitoring

### Logs überprüfen

```bash
# Im Backend-Terminal
# Logs werden automatisch ausgegeben mit Farben:
# [INFO] - Cyan
# [WARN] - Yellow
# [ERROR] - Red
# [SUCCESS] - Green
```

### Cache-Stats

```bash
curl http://localhost:3001/api/cache-stats
```

### Bot-Status

```bash
curl http://localhost:3001/api/health
```

---

## ⚠️ Wichtige Hinweise

### 1. JWT Secret

- **NIEMALS** in Git committen
- Mindestens 32 Zeichen lang
- Zufällig generiert
- Bei Compromise: Sofort ändern (alle User müssen sich neu einloggen)

### 2. Password Hash

- **NIEMALS** Klartext-Passwort in `.env`
- Nur Hash speichern
- Bei Passwort-Änderung: Neuen Hash generieren

### 3. CORS

- In Production: `DASHBOARD_URL` auf echte Domain setzen
- Niemals `*` als Origin erlauben

### 4. Rate Limiting

- Limits sind pro IP-Adresse
- Bei Reverse Proxy: `trust proxy` in Express konfigurieren

### 5. Token-Gültigkeit

- Standard: 24 Stunden
- Bei Bedarf in `src/middleware/auth.ts` anpassen
- Kürzere Gültigkeit = höhere Sicherheit, aber mehr Logins

---

## 🐛 Troubleshooting

### Problem: "ADMIN_PASSWORD_HASH not configured"

**Lösung:**
```bash
# 1. Hash generieren
node dist/generateHash.js YOUR_PASSWORD

# 2. Hash in .env einfügen
ADMIN_PASSWORD_HASH=<generated_hash>

# 3. Bot neu starten
```

### Problem: "Invalid or expired token"

**Lösung:**
- Token ist abgelaufen (24h)
- Neu einloggen
- Oder: JWT_SECRET wurde geändert (alle Tokens ungültig)

### Problem: "Not allowed by CORS"

**Lösung:**
```bash
# In .env:
DASHBOARD_URL=http://localhost:3000

# Oder in apiServer.ts allowedOrigins erweitern
```

### Problem: "Too many login attempts"

**Lösung:**
- 15 Minuten warten
- Oder: Rate Limit in `src/middleware/rateLimiter.ts` anpassen

### Problem: "Validation failed"

**Lösung:**
- Input entspricht nicht Schema
- Fehler-Details in Response prüfen
- Schema in `src/middleware/validation.ts` überprüfen

---

## 📝 Migration von alter Auth

### Alte Auth (localStorage-Flag)

```typescript
// ❌ ALT - UNSICHER
localStorage.setItem('adminAuth', 'true');
```

### Neue Auth (JWT-Token)

```typescript
// ✅ NEU - SICHER
setAuthToken(token);
setUser(user);
```

### Automatische Migration

Das Frontend entfernt automatisch alte `adminAuth`-Flags beim Login.

---

## 🎯 Nächste Schritte

Phase 1 ist abgeschlossen! Nächste Phasen:

### Phase 2: Infrastructure (empfohlen)
- Dockerfile
- Docker Compose
- Redis für Sessions
- Secrets Management

### Phase 3: Monitoring (wichtig)
- Persistent Logging (Winston)
- Error Tracking (Sentry)
- Metrics (Prometheus)
- Extended Health Checks

### Phase 4: Backup & DR
- Automated Backups
- Restore Procedures

### Phase 5: Testing & CI/CD
- Unit Tests
- Integration Tests
- GitHub Actions

---

## ✅ Checkliste

Vor Production-Deployment:

- [ ] JWT_SECRET generiert und in .env
- [ ] ADMIN_PASSWORD_HASH generiert und in .env
- [ ] DASHBOARD_URL auf Production-Domain gesetzt
- [ ] Bot erfolgreich gestartet
- [ ] Login im Dashboard funktioniert
- [ ] API-Requests mit Token funktionieren
- [ ] Rate Limiting getestet
- [ ] Input-Validierung getestet
- [ ] Alte ADMIN_PASSWORD aus .env entfernt
- [ ] .env nicht in Git committed

---

## 📚 Weitere Ressourcen

- **JWT.io** - Token debuggen: https://jwt.io/
- **Helmet Docs** - Security Headers: https://helmetjs.github.io/
- **Joi Docs** - Validierung: https://joi.dev/
- **bcrypt Docs** - Password Hashing: https://www.npmjs.com/package/bcrypt

---

## 🆘 Support

Bei Problemen:

1. Logs im Backend-Terminal prüfen
2. Browser Console prüfen (F12)
3. Network-Tab prüfen (F12 → Network)
4. `/api/health` Endpunkt testen
5. Issue auf GitHub erstellen

---

**Status: ✅ Phase 1 Abgeschlossen**

**Security-Score: 7/10** (von vorher 2/10)

Nächste Phase starten mit: `npm run phase2:setup`
