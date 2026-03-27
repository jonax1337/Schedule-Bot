# Discord Bot Uebersicht

## Architektur

Der Discord Bot basiert auf **discord.js v14** und verwaltet die Team-Kommunikation direkt im Discord Server.

```
Discord Gateway
      │
      ▼
  Client (client.ts)
      │
      ├─ Events
      │   ├─ ready.event.ts        → Commands registrieren, Polls wiederherstellen
      │   └─ interaction.event.ts  → Dispatching zu Handlers
      │
      ├─ Commands (Slash Commands)
      │   ├─ schedule.commands.ts
      │   ├─ availability.commands.ts
      │   ├─ user-management.commands.ts
      │   ├─ admin.commands.ts
      │   ├─ poll.commands.ts
      │   ├─ scrim.commands.ts
      │   └─ recurring.commands.ts
      │
      ├─ Interactions
      │   ├─ interactive.ts         → Buttons, Modals, Select Menus
      │   ├─ polls.ts               → Quick Polls
      │   ├─ trainingStartPoll.ts   → Training-Start Polls
      │   ├─ reminder.ts            → DM-Erinnerungen
      │   └─ pollBase.ts            → Gemeinsame Poll-Logik
      │
      └─ Utils
          ├─ schedule-poster.ts     → Schedule-Posts & Benachrichtigungen
          └─ command-helpers.ts     → Hilfsfunktionen
```

## Client-Konfiguration

### Intents

| Intent | Verwendung |
|--------|-----------|
| `Guilds` | Server-Events, Channel-Zugriff |
| `GuildMembers` | Mitglieder-Verwaltung |
| `GuildMessageReactions` | Poll-Abstimmungen |

### Partials

| Partial | Verwendung |
|---------|-----------|
| `Message` | Reaktionen auf aeltere Nachrichten |
| `Reaction` | Partielle Reaktionsdaten |

## Berechtigungen

Der Bot benoetigt folgende Discord-Berechtigungen:

- **View Channels** - Channels sehen
- **Send Messages** - Nachrichten senden
- **Embed Links** - Embeds erstellen
- **Add Reactions** - Reaktionen fuer Polls
- **Use Slash Commands** - Slash Commands nutzen
- **Read Message History** - Nachrichten-Verlauf lesen

## Startup

Beim Bot-Ready Event (`ready.event.ts`):

1. **Commands registrieren** - Alle Slash Commands beim Discord API registrieren
2. **Polls wiederherstellen** - Offene Polls aus dem Speicher laden
3. **Training-Polls wiederherstellen** - Laufende Training-Polls laden
4. **Status setzen** - Bot-Aktivitaet anzeigen

## Embed-Farbschema

| Farbe | Hex | Verwendung |
|-------|-----|-----------|
| Gruen | `0x2ecc71` | Erfolg, Full Roster |
| Orange | `0xf39c12` | Warnung, With Subs |
| Rot | `0xe74c3c` | Fehler, Not Enough |
| Lila | `0x9b59b6` | Off Day |
| Blau | `0x3498db` | Info |

## Player-Status Indikatoren

| Symbol | Bedeutung |
|--------|-----------|
| ✅ | Verfuegbar (mit Zeitfenster) |
| ❌ | Nicht verfuegbar |
| ❓ | Keine Antwort |
| ✈️ | Abwesend |
| 🔄 | Sub wird benoetigt |
