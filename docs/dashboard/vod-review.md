# VOD-Review

## Uebersicht

Das VOD-Review System (`/vod/:scrimId`) ermoeglicht zeitstempel-basierte Kommentare zu Scrim-Aufnahmen.

## Zugang

VOD-Review ist ueber einen Link aus der Scrim-Detailansicht erreichbar. Voraussetzung: Scrim muss eine `vodUrl` (YouTube-Link) haben.

## Features

### Video-Player

- **YouTube-Einbettung** via `react-youtube`
- Unterstuetzte Formate:
  - `https://youtube.com/watch?v=...`
  - `https://youtu.be/...`
  - Direkte Video-IDs

### Zeitstempel-Kommentare

Jeder Kommentar hat einen Zeitstempel (Sekunden ab Videobeginn):

```
[1:25] Player1: Guter Smoke hier @Player2 #rotation
[2:30] Player2: Danke! Timing war perfekt #clutch
[5:15] Coach1:  Hier haetten wir rotieren sollen @alle #mistake
```

### Auto-Scroll

- Kommentarliste scrollt automatisch zum aktuellen Videozeitpunkt
- Deaktiviert sich wenn User manuell scrollt
- Reaktiviert sich bei Klick auf "Auto-Scroll" Button

### Highlighting

- Kommentar wird hervorgehoben wenn Video den Zeitstempel erreicht
- Klick auf Zeitstempel springt zum Zeitpunkt im Video

### @Mentions

- Tippe `@` fuer Autocomplete der Team-Mitglieder
- Erwaehnte Spieler werden farblich hervorgehoben
- User-Liste wird von `/api/user-mappings` geladen

### #Hashtags

- Tippe `#` fuer Tag-Eingabe
- Tags erhalten automatisch eine Farbe (Hash-basiert, 6 Farben)
- Gaengige Tags: `#rotation`, `#mistake`, `#clutch`, `#eco`, `#execute`

### Filtern

- **Nach Autor** - Nur Kommentare eines Spielers
- **Nach Hashtag** - Nur Kommentare mit bestimmtem Tag
- **Nach Mention** - Nur Kommentare die einen Spieler erwaehnen
- Filter sind kombinierbar

### Bearbeiten & Loeschen

- **Eigene Kommentare:** Text und Zeitstempel bearbeitbar
- **Admin:** Kann alle Kommentare bearbeiten und loeschen
- **Loeschen:** Nur Ersteller oder Admin

## Technische Details

### Mention-Input Komponente

`vod-mention-input.tsx` implementiert eine Textarea mit:
- `@`-Trigger fuer User-Autocomplete
- `#`-Trigger fuer Tag-Vorschlaege
- Keyboard-Navigation (Pfeiltasten, Enter, Escape)
- Inline-Ersetzung des ausgewaehlten Vorschlags

### Comment-Text Renderer

`vod-comment-text.tsx` rendert Kommentar-Text mit:
- `@Mentions` als farbige Badges
- `#Hashtags` als klickbare Tags
- Klick auf Tag filtert die Kommentarliste

### Timestamp-Formatierung

```typescript
formatTimestamp(125)   → "2:05"
formatTimestamp(3665)  → "1:01:05"
```

## API

```
GET    /api/vod-comments/scrim/:scrimId  → Kommentare laden
POST   /api/vod-comments                 → Kommentar erstellen
PUT    /api/vod-comments/:id             → Bearbeiten
DELETE /api/vod-comments/:id             → Loeschen
```
