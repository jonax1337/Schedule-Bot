# 🎮 Interaktives Discord System - Anleitung

## Übersicht

Der Bot unterstützt jetzt vollständig interaktive Verfügbarkeitsverwaltung direkt aus Discord! Spieler können ihre Zeiten über Commands, Buttons und Modals setzen - alles per DM (Direct Message).

---

## 🚀 Neue Features

### ✅ Verfügbarkeit direkt in Discord setzen
- Keine manuelle Google Sheets Bearbeitung mehr nötig
- Interaktive Buttons und Dropdown-Menüs
- Zeit-Eingabe über benutzerfreundliche Modals
- Alle Änderungen werden sofort im Google Sheet gespeichert

### 📱 DM-basiertes System
- Alle Verfügbarkeitsabfragen werden per DM geschickt
- Keine Spam-Nachrichten im Haupt-Channel
- Privatsphäre für jeden Spieler

### 🗓️ Erweiterte Schedule-Ansichten
- Wochenübersicht für die nächsten 7 Tage
- Persönliche Verfügbarkeitsübersicht
- Navigation zwischen Tagen mit Buttons

---

## 📋 Setup

### 1. Google Sheet erweitern

Dein Google Sheet benötigt jetzt ein zusätzliches Tab für User-Mappings:

1. Öffne dein Google Sheet
2. Erstelle ein neues Tab namens **"UserMapping"**
3. Füge folgende Header in die erste Zeile ein:
   ```
   Discord ID | Discord Username | Sheet Column Name | Role
   ```

**Hinweis:** Das Tab wird automatisch erstellt, wenn der Bot startet, falls es nicht existiert.

### 2. Bot-Permissions

Stelle sicher, dass der Bot folgende Permissions hat:
- `Send Messages` (bereits vorhanden)
- `Embed Links` (bereits vorhanden)
- `Use Slash Commands` (bereits vorhanden)
- **NEU:** `Send Messages in Threads` (für DMs)

---

## 🎯 Commands

### Für alle Spieler

#### `/schedule [datum]`
Zeigt die Verfügbarkeit für ein bestimmtes Datum an.
- **Optional:** Datum im Format DD.MM.YYYY
- **Standard:** Heute
- **Neu:** Mit Navigation-Buttons zwischen Tagen wechseln

**Beispiel:**
```
/schedule
/schedule 20.01.2026
```

#### `/availability`
Öffnet ein interaktives Menü zum Setzen deiner Verfügbarkeit.
- Wähle ein Datum aus dem Dropdown
- Klicke auf "✅ Verfügbar", "❌ Nicht verfügbar" oder "⏰ Zeit angeben"
- Bei "Zeit angeben" öffnet sich ein Modal für Start- und Endzeit

**Workflow:**
1. `/availability` eingeben
2. Datum aus Dropdown wählen
3. Verfügbarkeit setzen:
   - **✅ Verfügbar:** Öffnet Modal für Zeitangabe
   - **❌ Nicht verfügbar:** Setzt dich als nicht verfügbar
   - **⏰ Zeit angeben:** Öffnet Modal für Zeitangabe

**Zeitformat:** HH:MM (z.B. 14:00 bis 20:00)

#### `/schedule-week`
Zeigt eine kompakte Übersicht der nächsten 7 Tage.
- Status für jeden Tag (✅ Full Roster, ⚠️ Mit Subs, ❌ Nicht genug, 🟣 Off-Day)
- Anzahl verfügbarer Spieler
- Gemeinsame Trainingszeit

**Beispiel-Output:**
```
📅 Wochenübersicht

✅ 16.01.2026
Spieler: 5/5
Zeit: 15:00-21:00

⚠️ 17.01.2026
Spieler: 4/5
Zeit: 16:00-20:00

🟣 18.01.2026
Off-Day
```

#### `/my-schedule`
Zeigt deine persönliche Verfügbarkeit für die nächsten 14 Tage.
- Übersicht über alle deine eingetragenen Zeiten
- Zeigt auch Tage ohne Eintrag an

---

### Für Admins

#### `/register <user> <column> <role>`
Registriert einen Discord-User für die Verfügbarkeitsverwaltung.

**Parameter:**
- `user`: Der Discord User (@mention oder auswählen)
- `column`: Der exakte Name der Spalte im Google Sheet (z.B. "TenZ", "Shroud")
- `role`: Die Rolle des Spielers
  - `Main Roster` - Hauptspieler
  - `Sub` - Ersatzspieler
  - `Coach` - Coach

**Beispiel:**
```
/register @TenZ TenZ Main Roster
/register @Demon1 Demon1 Sub
/register @FNS FNS Coach
```

**Was passiert:**
1. User wird in der UserMapping-Tabelle gespeichert
2. User erhält eine DM mit Bestätigung
3. User kann jetzt `/availability` nutzen

**Wichtig:** Der `column`-Name muss **exakt** mit dem Header im Google Sheet übereinstimmen!

#### `/unregister <user>`
Entfernt einen User aus dem System.

**Beispiel:**
```
/unregister @TenZ
```

---

## 🔄 Interaktive Elemente

### Navigation-Buttons
Bei jedem `/schedule` Command erscheinen Buttons:
- **← Vorheriger Tag:** Zeigt den vorherigen Tag
- **Heute:** Springt zum heutigen Datum
- **Nächster Tag →:** Zeigt den nächsten Tag

### Datum-Dropdown
Bei `/availability` erscheint ein Dropdown mit allen verfügbaren Daten (nächste 14 Tage).

### Zeit-Modal
Wenn du deine Verfügbarkeit setzt, öffnet sich ein Modal mit zwei Feldern:
- **Von (HH:MM):** Startzeit (z.B. 14:00)
- **Bis (HH:MM):** Endzeit (z.B. 20:00)

---

## 📊 Workflow-Beispiele

### Beispiel 1: Spieler setzt Verfügbarkeit

1. Spieler tippt `/availability`
2. Bot sendet DM mit Datum-Dropdown
3. Spieler wählt "17.01.2026"
4. Bot zeigt Buttons: ✅ Verfügbar | ❌ Nicht verfügbar | ⏰ Zeit angeben
5. Spieler klickt "⏰ Zeit angeben"
6. Modal öffnet sich
7. Spieler gibt ein: Von: 14:00, Bis: 20:00
8. Bot bestätigt: "✅ Deine Verfügbarkeit für 17.01.2026 wurde auf 14:00-20:00 gesetzt."
9. Google Sheet wird automatisch aktualisiert

### Beispiel 2: Admin registriert neuen Spieler

1. Admin tippt `/register @NewPlayer yay Main Roster`
2. Bot bestätigt: "✅ NewPlayer wurde erfolgreich als yay (main) registriert."
3. NewPlayer erhält DM: "✅ Du wurdest für den Schedule Bot registriert! ..."
4. NewPlayer kann jetzt `/availability` nutzen

### Beispiel 3: Spieler checkt Wochenübersicht

1. Spieler tippt `/schedule-week`
2. Bot sendet DM mit kompakter Übersicht der nächsten 7 Tage
3. Spieler sieht sofort, an welchen Tagen Training stattfindet

---

## ⚙️ Technische Details

### Datenspeicherung

**UserMapping Tab im Google Sheet:**
```
Discord ID          | Discord Username | Sheet Column Name | Role
123456789012345678 | TenZ             | TenZ              | main
234567890123456789 | Shroud           | Shroud            | main
345678901234567890 | Demon1           | Demon1            | sub
```

### Verfügbarkeitsformate im Sheet

- **Verfügbar mit Zeit:** `14:00-20:00`
- **Nicht verfügbar:** `x` oder leer
- **Ganztägig verfügbar:** `14:00` (bis 23:59)

### Automatische Updates

Wenn ein Spieler seine Verfügbarkeit über Discord setzt:
1. Bot findet die richtige Zeile (Datum)
2. Bot findet die richtige Spalte (Spielername aus UserMapping)
3. Bot aktualisiert die Zelle
4. Änderung ist sofort im Sheet sichtbar

---

## 🛠️ Troubleshooting

### "Du bist noch nicht registriert"
**Problem:** User ist nicht im UserMapping-System.
**Lösung:** Admin muss `/register` ausführen.

### "Column not found in header row"
**Problem:** Der Spaltenname im UserMapping stimmt nicht mit dem Google Sheet überein.
**Lösung:** 
1. Prüfe den exakten Namen im Google Sheet Header
2. Admin muss User neu registrieren mit korrektem Namen

### "No row found for date"
**Problem:** Das Datum existiert nicht im Sheet.
**Lösung:** 
- Warte bis Mitternacht (automatisches Cleanup fügt fehlende Tage hinzu)
- Oder füge das Datum manuell im Sheet hinzu

### Bot sendet keine DMs
**Problem:** User hat DMs von Server-Mitgliedern deaktiviert.
**Lösung:** User muss in Discord-Einstellungen DMs erlauben:
1. Rechtsklick auf Server
2. Privatsphäre-Einstellungen
3. "Direktnachrichten von Servermitgliedern" aktivieren

---

## 🎨 Best Practices

### Für Spieler
- ✅ Setze deine Verfügbarkeit so früh wie möglich
- ✅ Aktualisiere deine Zeiten, wenn sich etwas ändert
- ✅ Nutze `/my-schedule` um deine Einträge zu überprüfen
- ❌ Bearbeite das Google Sheet nicht manuell (nutze Discord!)

### Für Admins
- ✅ Registriere alle Spieler beim ersten Setup
- ✅ Verwende exakt die gleichen Namen wie im Google Sheet
- ✅ Teste mit einem Test-User vor dem Rollout
- ✅ Erkläre den Spielern den `/availability` Workflow

---

## 🔮 Zukünftige Features (Optional)

Mögliche Erweiterungen:
- Bulk-Update: Verfügbarkeit für mehrere Tage auf einmal setzen
- Reminder-System: Automatische DMs an Spieler ohne Eintrag
- Statistiken: Wer ist am häufigsten verfügbar?
- Voice Channel Integration: Automatisches Erstellen von Voice Channels
- Web-Dashboard: Browser-basierte Übersicht

---

## 📞 Support

Bei Problemen:
1. Prüfe die Console-Logs des Bots
2. Verifiziere Google Sheet Permissions
3. Teste mit `/schedule` ob der Bot grundsätzlich funktioniert
4. Prüfe ob das UserMapping Tab existiert

---

**Viel Spaß mit dem interaktiven System! 🎮**
