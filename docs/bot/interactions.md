# Interaktionen

## Uebersicht

Neben Slash Commands nutzt der Bot interaktive Discord-Elemente:

- **Buttons** - Schnellaktionen (Verfuegbarkeit setzen, navigieren)
- **Modals** - Formular-Eingaben (Zeitfenster, benutzerdefinierte Werte)
- **Select Menus** - Dropdown-Auswahl (Datum, Zeitzone)

Alle Interaktionen werden in `interaction.event.ts` entgegengenommen und an die spezifischen Handler dispatched.

## Verfuegbarkeits-Buttons

Beim `/set` Command erscheinen interaktive Elemente:

### Datumsauswahl
- **Select Menu** mit den naechsten 14 Tagen
- Zeigt Datum + Wochentag + aktuellen Status

### Verfuegbarkeits-Optionen
- **"Zeitfenster eingeben"** Button → Oeffnet Modal
- **"Nicht verfuegbar"** Button → Setzt direkt auf `x`
- **"Zuruecksetzen"** Button → Loescht Verfuegbarkeit

### Zeitfenster-Modal
- **Eingabefeld** fuer `HH:MM-HH:MM` Format
- Validierung: Korrekte Zeitangaben, Start vor Ende
- Zeitzonen-Hinweis im Modal-Text

## Navigations-Buttons

Fuer mehrseitige Embeds (Schedule-Woche, Scrim-Liste):

- **⬅️ Zurueck** - Vorherige Seite
- **➡️ Weiter** - Naechste Seite
- Timeout nach 5 Minuten Inaktivitaet

## Erinnerungs-Buttons

DM-Erinnerungen enthalten Aktions-Buttons:

- **"Verfuegbarkeit setzen"** - Oeffnet Zeitfenster-Modal direkt in der DM
- **"Nicht verfuegbar"** - Setzt Status auf `x`
- **"Zeitzone setzen"** - Erscheint nur wenn keine Zeitzone konfiguriert ist

## Zeitzonen-Auswahl

- **Select Menu** mit gaengigen Zeitzonen
- Gruppiert nach Regionen
- Autocomplete-Unterstuetzung bei `/set-timezone`

## Interaktions-Lifecycle

```
User klickt Button/Select
        │
        ▼
  interaction.event.ts (Dispatcher)
        │
        ├─ Button CustomId pruefen
        │   └─ An Handler weiterleiten
        │
        ├─ Modal Submit
        │   └─ Eingabe validieren & verarbeiten
        │
        └─ Select Menu
            └─ Auswahl verarbeiten
```

### Custom IDs

Interaktionen werden ueber Custom IDs identifiziert:

```
set_availability_date_{userId}
set_availability_time_{userId}_{date}
set_unavailable_{userId}_{date}
reminder_set_{userId}_{date}
poll_vote_{pollId}
training_poll_{date}
```

Die User-ID im Custom ID stellt sicher, dass nur der aufrufende Spieler die Interaktion nutzen kann.

## Timeout-Handling

- Interaktionen haben standardmaessig einen **Timeout von 15 Minuten**
- Nach Timeout werden Buttons deaktiviert
- Collector-basiertes Handling fuer Multi-Step Flows
