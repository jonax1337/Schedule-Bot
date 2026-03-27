# Polls

## Quick Polls

Einfache Abstimmungen mit Reaktions-Emojis.

### Erstellen

**Discord:**
```
/poll question:Welche Map spielen wir? options:Ascent,Haven,Bind duration:30
```

**API:**
```bash
POST /api/actions/poll
{
  "question": "Welche Map spielen wir?",
  "options": ["Ascent", "Haven", "Bind"],
  "duration": 30
}
```

### Funktionsweise

1. Bot sendet Embed mit Frage und Optionen
2. Nummerierte Emoji-Reaktionen werden hinzugefuegt (1️⃣, 2️⃣, 3️⃣, ...)
3. Spieler klicken auf Reaktionen zum Abstimmen
4. Jeder Spieler kann nur eine Option waehlen (bei Mehrfach-Reaktion wird die alte entfernt)
5. Nach Ablauf der Zeit werden die Ergebnisse angezeigt

### Ergebnis-Anzeige

Nach Ablauf:
- Poll-Nachricht wird geloescht
- Neue Nachricht mit Ergebnissen wird gepostet
- Zeigt Stimmenanzahl pro Option und Gewinner

### Wiederherstellung

Bei Bot-Neustart werden laufende Polls automatisch wiederhergestellt:
- Offene Polls werden aus dem internen Speicher geladen
- Remaining-Timer werden neu berechnet
- Reaction-Listener werden neu registriert

## Training-Start Polls

Spezieller Poll-Typ zur Abstimmung ueber die Trainings-Startzeit.

### Automatisch

Wenn `scheduling.trainingPollEnabled` aktiv ist, wird bei jedem Schedule-Post automatisch ein Training-Poll erstellt.

### Manuell

**Discord:**
```
/send-training-poll
```

**API:**
```bash
POST /api/actions/training-poll
```

### Zeitberechnung

Die Poll-Optionen werden automatisch aus den Verfuegbarkeiten berechnet:

```
Spieler-Verfuegbarkeiten:
  Player1: 14:00 - 20:00
  Player2: 16:00 - 22:00
  Player3: 14:00 - 20:00
  Player4: 18:00 - 22:00
  Sub1:    14:00 - 22:00

Berechnete Optionen:
  1️⃣ 16:00 (fruehest moeglicher Start mit Sub)
  2️⃣ 18:00 (alle verfuegbar)
  3️⃣ 19:00 (spaeterer Start)
```

Die Optionen basieren auf den gemeinsamen Zeitfenstern und priorisieren Zeiten mit maximaler Spieler-Ueberlappung.

### Toggle

Der automatische Training-Poll kann ein-/ausgeschaltet werden:

```
/training-start-poll
```

Oder ueber die Admin-Settings im Dashboard.

## Poll-Architektur

### Basis-Klasse (pollBase.ts)

Gemeinsame Logik fuer alle Poll-Typen:
- Vote-Tracking pro User
- Reaktions-Handler (Add/Remove)
- Timer-Management
- Ergebnis-Berechnung

### Quick Poll (polls.ts)

Erweitert die Basis um:
- Frei konfigurierbare Fragen und Optionen
- Flexible Dauer
- Emoji-basierte Optionen

### Training Poll (trainingStartPoll.ts)

Erweitert die Basis um:
- Automatische Optionsberechnung aus Verfuegbarkeiten
- Integration mit Schedule-Post
- Wiederherstellung nach Neustart
