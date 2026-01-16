# 🚀 Quick Start - Interaktives System

## Sofort loslegen in 3 Schritten

### 1️⃣ Bot neu starten

```bash
npm run build
npm start
```

Der Bot erstellt automatisch das "UserMapping" Tab im Google Sheet.

### 2️⃣ Spieler registrieren (als Admin)

```
/register @TenZ TenZ main
/register @Shroud Shroud main
/register @Asuna Asuna main
/register @yay yay main
/register @Marved Marved main
/register @Demon1 Demon1 sub
/register @Zekken Zekken sub
/register @FNS FNS coach
```

**Wichtig:** Der zweite Parameter (z.B. "TenZ") muss **exakt** mit dem Spaltennamen im Google Sheet übereinstimmen!

### 3️⃣ Spieler nutzen das System

Jeder registrierte Spieler kann jetzt:

```
/availability
```

Dann:
1. Datum aus Dropdown wählen
2. Button klicken (✅ Verfügbar / ❌ Nicht verfügbar / ⏰ Zeit angeben)
3. Bei Zeit angeben: Modal ausfüllen (z.B. Von: 14:00, Bis: 20:00)
4. Fertig! ✅

---

## 📱 Alle Commands auf einen Blick

### Für Spieler
- `/schedule` - Heutiger Schedule mit Navigation
- `/availability` - Verfügbarkeit setzen (DM)
- `/schedule-week` - Nächste 7 Tage (DM)
- `/my-schedule` - Meine Einträge (DM)

### Für Admins
- `/register @user Spaltenname rolle` - User registrieren
- `/unregister @user` - User entfernen

---

## ✅ Checkliste

- [ ] Bot läuft und ist online
- [ ] "UserMapping" Tab existiert im Google Sheet
- [ ] Alle Spieler sind mit `/register` registriert
- [ ] Spaltennamen stimmen exakt mit Sheet überein
- [ ] Spieler haben DMs vom Server aktiviert
- [ ] Test mit `/availability` durchgeführt
- [ ] Google Sheet zeigt die Änderung an

---

## 🎯 Beispiel-Workflow

**Admin registriert Spieler:**
```
/register @TenZ TenZ main
```
→ TenZ erhält DM: "✅ Du wurdest registriert..."

**TenZ setzt Verfügbarkeit:**
```
/availability
```
→ Bot sendet DM mit Datum-Dropdown
→ TenZ wählt "17.01.2026"
→ TenZ klickt "⏰ Zeit angeben"
→ Modal: Von 14:00, Bis 20:00
→ Bot bestätigt: "✅ Deine Verfügbarkeit wurde gesetzt"
→ Google Sheet wird automatisch aktualisiert!

**Alle checken Schedule:**
```
/schedule-week
```
→ Kompakte Übersicht der nächsten 7 Tage per DM

---

## 🔧 Häufige Probleme

### "Du bist noch nicht registriert"
→ Admin muss `/register` ausführen

### "Column not found"
→ Spaltenname bei `/register` muss exakt mit Sheet übereinstimmen (Groß-/Kleinschreibung beachten!)

### Bot sendet keine DMs
→ User muss DMs vom Server aktivieren:
   Rechtsklick Server → Privatsphäre → "Direktnachrichten" aktivieren

### Änderung nicht im Sheet
→ Prüfe Console-Logs
→ Verifiziere Google Sheets API Permissions
→ Stelle sicher, dass das Datum im Sheet existiert

---

## 📖 Mehr Infos

Detaillierte Anleitung: [INTERACTIVE_GUIDE.md](INTERACTIVE_GUIDE.md)

---

**Das war's! Viel Erfolg! 🎮**
