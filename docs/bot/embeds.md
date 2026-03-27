# Embeds & Nachrichten

## Schedule-Embed

Der Haupt-Embed zeigt die taegliche Teamverfuegbarkeit:

```
┌──────────────────────────────────────────┐
│  📅 Schedule - 27.03.2026 (Freitag)     │
│  Training                                 │
│                                           │
│  ── Main Players ──                       │
│  ✅ Player1  │ 14:00 - 20:00            │
│  ✅ Player2  │ 16:00 - 22:00            │
│  ✅ Player3  │ 14:00 - 20:00            │
│  ✅ Player4  │ 18:00 - 22:00            │
│  ❌ Player5  │ Nicht verfuegbar          │
│                                           │
│  ── Subs ──                               │
│  ✅ Sub1     │ 14:00 - 22:00    🔄      │
│                                           │
│  ── Coach ──                              │
│  ✅ Coach1   │ 16:00 - 20:00            │
│                                           │
│  ─────────────────────────────            │
│  Status: With Subs                        │
│  Gemeinsame Zeit: 18:00 - 20:00          │
│  Ueberlappung: 2 Stunden                 │
└──────────────────────────────────────────┘
```

### Farbkodierung

Die Embed-Farbe spiegelt den Roster-Status wider:

| Status | Farbe | Bedeutung |
|--------|-------|-----------|
| `FULL_ROSTER` | 🟢 Gruen | Alle 5 Mains verfuegbar |
| `WITH_SUBS` | 🟠 Orange | Genuegend mit Subs |
| `NOT_ENOUGH` | 🔴 Rot | Nicht genuegend Spieler |
| `OFF_DAY` | 🟣 Lila | Trainings-frei |

### Zeitanzeige

- Discord-Timestamps fuer automatische lokale Konvertierung:
  ```
  <t:1711540800:t> → "14:00" (in lokaler Zeitzone des Betrachters)
  ```
- Ueberlappungs-Berechnung zeigt die gemeinsame verfuegbare Zeit

### Sub-Markierung

Wenn ein Main-Spieler fehlt und ein Sub einspringt, wird dies mit 🔄 markiert.

## Erinnerungs-Embed

```
┌──────────────────────────────────────────┐
│  ⏰ Erinnerung                           │
│                                           │
│  Hey Player5! Du hast noch keine          │
│  Verfuegbarkeit fuer heute angegeben.     │
│                                           │
│  [Zeitfenster setzen] [Nicht verfuegbar]  │
│  [Zeitzone setzen]                        │
└──────────────────────────────────────────┘
```

Der "Zeitzone setzen"-Button erscheint nur, wenn der Spieler keine Zeitzone konfiguriert hat.

## Benachrichtigungs-Embeds

### Info

```
┌──────────────────────────────────────────┐
│  ℹ️ Information                           │
│  Training faellt heute aus!               │
└──────────────────────────────────────────┘
```

### Warnung

```
┌──────────────────────────────────────────┐
│  ⚠️ Warnung                              │
│  Nur 3 Spieler verfuegbar morgen!         │
└──────────────────────────────────────────┘
```

### Alert

```
┌──────────────────────────────────────────┐
│  🚨 Wichtig                              │
│  Premier Match in 1 Stunde!              │
└──────────────────────────────────────────┘
```

## Poll-Embeds

### Quick Poll

```
┌──────────────────────────────────────────┐
│  📊 Umfrage                              │
│  Wann koennt ihr heute?                   │
│                                           │
│  1️⃣ 18:00                                │
│  2️⃣ 19:00                                │
│  3️⃣ 20:00                                │
│                                           │
│  Endet: <t:1711555200:R>                 │
└──────────────────────────────────────────┘
```

### Training-Start Poll

```
┌──────────────────────────────────────────┐
│  🎮 Training-Start                        │
│  Wann soll das Training starten?          │
│                                           │
│  Basierend auf eurer Verfuegbarkeit:      │
│  1️⃣ 16:00 (fruehester Slot)              │
│  2️⃣ 17:00                                │
│  3️⃣ 18:00 (meiste Ueberlappung)          │
│                                           │
│  Endet: <t:1711555200:R>                 │
└──────────────────────────────────────────┘
```

Zeitoptionen werden automatisch aus den verfuegbaren Zeitfenstern berechnet.

## Status-Aenderungs-Nachricht

Wenn sich der Roster-Status aendert (z.B. ein Spieler meldet sich ab):

```
📢 Schedule-Update: Status hat sich geaendert
   NOT_ENOUGH → WITH_SUBS
```

Wird nur gepostet:
- Fuer den heutigen Tag
- Nach der taeglichen Post-Zeit
- Wenn sich der Status tatsaechlich geaendert hat
