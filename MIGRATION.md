# Settings Migration zu Google Sheets

## 📋 Übersicht

Mit diesem Update werden die Bot-Settings von `settings.json` ins Google Sheet verschoben. Admin-Credentials werden aus Sicherheitsgründen in `.env` Umgebungsvariablen gespeichert.

## 🔄 Was hat sich geändert?

### Vorher (settings.json):
```json
{
  "discord": { ... },
  "scheduling": { ... },
  "admin": {
    "username": "admin",
    "password": "password123"
  }
}
```

### Nachher:

**Google Sheet (neuer "Settings" Tab):**
- `discord.channelId`
- `discord.pingRoleId`
- `scheduling.dailyPostTime`
- `scheduling.reminderHoursBefore`
- `scheduling.trainingStartPollEnabled`
- `scheduling.timezone`
- `scheduling.cleanChannelBeforePost`

**.env Datei:**
```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=dein_sicheres_passwort
```

## 🚀 Migrations-Schritte

### 1. .env aktualisieren

Füge diese Zeilen zu deiner `.env` Datei hinzu:

```env
# Admin Dashboard Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_this_password
```

⚠️ **WICHTIG:** Ändere das Passwort zu einem sicheren Wert!

### 2. Bot starten

Beim ersten Start:
1. Bot liest die alten Settings aus `settings.json`
2. Migriert sie automatisch ins Google Sheet (neuer "Settings" Tab wird erstellt)
3. Admin-Credentials kommen ab jetzt aus `.env`

### 3. Überprüfen

1. Öffne dein Google Sheet
2. Du solltest einen neuen Tab **"Settings"** sehen mit:
   - Spalte A: Setting-Namen (z.B. `discord.channelId`)
   - Spalte B: Werte

3. Teste das Dashboard:
   - Login sollte mit den `.env` Credentials funktionieren
   - Settings können geladen und gespeichert werden
   - Änderungen werden im Google Sheet gespeichert

### 4. Aufräumen (optional)

Nach erfolgreicher Migration kannst du `settings.json` archivieren oder löschen.

⚠️ **Backup erstellen:** Sichere vorher die Datei, falls du zurück musst!

## 🔒 Sicherheit

### Vorteile der neuen Lösung:

✅ **Admin-Passwort nicht mehr im Git:** `.env` sollte in `.gitignore` sein
✅ **Settings in Google Sheet:** Einfachere Verwaltung, Versionierung durch Google
✅ **Getrennte Concerns:** Credentials vs. Konfiguration

### .gitignore prüfen:

Stelle sicher, dass folgende Einträge in `.gitignore` stehen:
```
.env
settings.json
credentials.json
```

## 🛠️ Troubleshooting

### Problem: "Settings missing required fields"

**Lösung:** 
- Prüfe ob `.env` die Admin-Credentials enthält
- Starte den Bot neu

### Problem: "Failed to save settings"

**Lösung:**
- Prüfe Google Sheets API Credentials
- Stelle sicher, dass das Service Account Schreibrechte auf dem Sheet hat

### Problem: Settings werden nicht geladen

**Lösung:**
1. Bot-Logs prüfen
2. Google Sheet öffnen und "Settings" Tab prüfen
3. Manuell Settings im Sheet eingeben (siehe Format oben)

## 🔄 Rollback (Notfall)

Falls etwas schief geht:

1. Branch wechseln: `git checkout main`
2. `.env` Admin-Einträge entfernen
3. Alte `settings.json` wiederherstellen
4. Bot neu starten

## 📝 Technische Details

### Geänderte Dateien:

- ✏️ `src/sheets.ts` - Neue Funktionen: `getSettingsFromSheet()`, `saveSettingsToSheet()`
- ✏️ `src/settingsManager.ts` - Liest jetzt aus Google Sheet, Admin aus `.env`
- ✏️ `src/config.ts` - `reloadConfig()` ist jetzt async
- ✏️ `src/apiServer.ts` - API-Endpoints verwenden async Settings
- ✏️ `dashboard/lib/types.ts` - `admin` ist jetzt optional
- ✏️ `dashboard/components/settings-panel.tsx` - Validierung angepasst
- ✏️ `.env.example` - Neue Admin-Felder dokumentiert

### Google Sheet Format:

Der "Settings" Tab wird automatisch erstellt mit:

| Setting | Value |
|---------|-------|
| discord.channelId | 1234567890 |
| discord.pingRoleId | 0987654321 |
| scheduling.dailyPostTime | 13:00 |
| scheduling.reminderHoursBefore | 3 |
| scheduling.trainingStartPollEnabled | true |
| scheduling.timezone | Europe/London |
| scheduling.cleanChannelBeforePost | true |

## ✅ Checkliste

- [ ] `.env` mit `ADMIN_USERNAME` und `ADMIN_PASSWORD` aktualisiert
- [ ] Bot gestartet und Migrations-Log geprüft
- [ ] Google Sheet "Settings" Tab existiert und enthält Daten
- [ ] Dashboard-Login funktioniert mit neuen Credentials
- [ ] Settings können im Dashboard geladen werden
- [ ] Settings können im Dashboard gespeichert werden
- [ ] Änderungen werden im Google Sheet sichtbar
- [ ] (Optional) Alte `settings.json` archiviert

## 📞 Support

Bei Problemen:
1. Bot-Logs prüfen (`npm start`)
2. Google Sheet API Credentials überprüfen
3. `.env` Datei auf Tippfehler prüfen
