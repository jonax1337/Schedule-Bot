# Excel Import Instructions

## 📋 Vorbereitung

1. **Exportiere deine Google Sheets Daten** als Excel-Datei (.xlsx)
2. **Speichere die Datei** als `import-data.xlsx` im Projekt-Root (`e:\DEV\schedule-bot\`)

## 📊 Excel-Struktur

Die Excel-Datei muss **3 Sheets** enthalten:

### 1. Sheet: "UserMapping"

**Spalten:**
- `DiscordId` - Discord User ID (17-19 Ziffern, z.B. `123456789012345678`)
- `DisplayName` - Anzeigename (z.B. `Player1`, `Sub1`, `Coach`)
- `Role` - Rolle: `main`, `sub`, oder `coach`

**Beispiel:**
```
DiscordId           | DisplayName | Role
--------------------|-------------|------
123456789012345678  | Player1     | main
234567890123456789  | Player2     | main
345678901234567890  | Player3     | main
456789012345678901  | Player4     | main
567890123456789012  | Player5     | main
678901234567890123  | Sub1        | sub
789012345678901234  | Sub2        | sub
890123456789012345  | Coach       | coach
```

### 2. Sheet: "Schedule"

**Spalten:**
- `Date` - Datum im Format `DD.MM.YYYY` (z.B. `21.01.2026`)
- `Player1` bis `Player5` - Verfügbarkeit der Main-Spieler
- `Sub1`, `Sub2` - Verfügbarkeit der Subs
- `Coach` - Verfügbarkeit des Coaches
- `Reason` - Optional (z.B. `Off-Day`, `Training`)
- `Focus` - Optional (z.B. `Aim`, `Tactics`)

**Verfügbarkeits-Format:**
- Zeitbereich: `14:00-20:00` (HH:MM-HH:MM)
- Nicht verfügbar: `x`
- Nicht gesetzt: leer lassen

**Beispiel:**
```
Date       | Player1      | Player2      | Player3 | Player4      | Player5      | Sub1         | Sub2 | Coach | Reason   | Focus
-----------|--------------|--------------|---------|--------------|--------------|--------------|------|-------|----------|-------
21.01.2026 | 14:00-20:00  | x            | 15:00-19:00 | 14:00-20:00 |          | 16:00-20:00  |      |       | Training | Aim
22.01.2026 | 14:00-20:00  | 14:00-20:00  | x       | 14:00-20:00  | 14:00-20:00  |              |      |       |          |
23.01.2026 |              |              |         |              |              |              |      |       | Off-Day  |
```

### 3. Sheet: "Settings" (Optional)

**Spalten:**
- `Key` - Setting-Schlüssel (z.B. `discord.channelId`)
- `Value` - Setting-Wert

**Beispiel:**
```
Key                              | Value
---------------------------------|------------------------
discord.channelId                | 1463848420967190643
discord.pingRoleId               | 1461324999888736368
scheduling.dailyPostTime         | 12:00
scheduling.timezone              | Europe/Berlin
scheduling.reminderHoursBefore   | 3
scheduling.cleanChannelBeforePost| true
scheduling.trainingStartPollEnabled | true
```

## 🚀 Import ausführen

1. **Stelle sicher, dass die Excel-Datei bereit ist:**
   ```
   e:\DEV\schedule-bot\import-data.xlsx
   ```

2. **Führe das Import-Script aus:**
   ```bash
   npm run import
   ```

   Oder direkt:
   ```bash
   node dist/importFromExcel.js
   ```

3. **Überprüfe die Ausgabe:**
   - Das Script zeigt dir genau, was importiert wurde
   - Fehler werden rot markiert
   - Erfolge werden grün markiert

## ⚠️ Wichtige Hinweise

- **Discord IDs müssen korrekt sein** - Überprüfe sie in Discord (Rechtsklick → ID kopieren)
- **DisplayNames müssen exakt mit den Spaltennamen übereinstimmen** (Player1, Player2, etc.)
- **Datumsformat muss DD.MM.YYYY sein** (z.B. 21.01.2026, nicht 21.1.2026)
- **Zeitformat muss HH:MM-HH:MM sein** (z.B. 14:00-20:00, nicht 14:00 - 20:00)
- **Bestehende Daten werden überschrieben** - Mache vorher ein Backup falls nötig

## 🔍 Troubleshooting

**Problem: "File not found"**
- Stelle sicher, dass die Datei `import-data.xlsx` im Projekt-Root liegt
- Überprüfe den Dateinamen (Groß-/Kleinschreibung beachten)

**Problem: "No Discord ID found for PlayerX"**
- Überprüfe, ob die DisplayNames im UserMapping-Sheet exakt mit den Spaltennamen übereinstimmen
- Achte auf Leerzeichen und Groß-/Kleinschreibung

**Problem: "Invalid date format"**
- Stelle sicher, dass Datumsangaben im Format DD.MM.YYYY sind
- Excel konvertiert manchmal Daten automatisch - prüfe die Zellformatierung

**Problem: "Type 'string' is not assignable to type 'UserRole'"**
- Role muss `main`, `sub`, oder `coach` sein (Kleinbuchstaben)
- Das Script konvertiert automatisch zu Großbuchstaben

## 📝 Nach dem Import

1. **Starte den Bot neu:**
   ```bash
   npm start
   ```

2. **Überprüfe die Daten im Dashboard:**
   - Öffne http://localhost:3000
   - Prüfe den Kalender auf der Startseite
   - Prüfe deine Verfügbarkeit unter /user

3. **Teste die Bot-Funktionen:**
   - `/schedule` Command in Discord
   - Daily Posts sollten funktionieren
   - Reminders sollten funktionieren

## 🎉 Fertig!

Deine Daten sind jetzt in PostgreSQL und der Bot ist bereit! 🚀
