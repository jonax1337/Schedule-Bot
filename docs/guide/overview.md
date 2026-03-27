# Uebersicht

## Was ist Schedule-Bot?

Schedule-Bot ist ein umfassendes Management-Tool fuer Valorant E-Sports Teams. Es besteht aus drei eng verzahnten Komponenten, die in einem einzigen Node.js-Prozess laufen:

1. **Discord Bot** - Kommunikation und Interaktion im Team-Discord
2. **REST API** - Backend-Logik und Datenverwaltung
3. **Web Dashboard** - Visuelle Verwaltung und Uebersicht

## Kernfunktionen

### Scheduling
- **Tages-Schedules** mit Grund (Training, Scrims, Premier, Off-Day)
- **14-Tage-Vorschau** fuer Planungssicherheit
- **Wiederkehrende Verfuegbarkeiten** (woechentliche Muster)
- **Abwesenheits-Tracking** fuer Urlaub und andere Ausfaelle
- **Automatische Posts** und Erinnerungen via Cron-Jobs

### Verfuegbarkeits-System
- Spieler geben Zeitfenster an (z.B. `14:00-20:00`)
- Status: verfuegbar, nicht verfuegbar (`x`), keine Antwort (leer)
- Automatische Roster-Analyse: Full Roster, With Subs, Not Enough
- Sub-Bedarf wird automatisch erkannt und markiert

### Match-Tracking (Scrims)
- Ergebnis-Erfassung (Win/Loss/Draw) mit Scores
- Karten- und Agenten-Tracking fuer beide Teams
- VOD-URLs und Match-Links
- Detaillierte Statistiken und Visualisierungen

### Stratbook
- Rich-Text-Editor (TipTap) fuer Strategien
- Ordner-Struktur mit Farbkodierung
- Karten- und Agenten-Tags
- Bild- und PDF-Upload
- Konfigurierbare Bearbeitungsrechte

### VOD-Review
- YouTube-Integration mit eingebettetem Player
- Zeitstempel-basierte Kommentare
- @Mentions und #Hashtag-System
- Filter- und Suchfunktionen
- Auto-Scroll synchron zum Video

## Architektur auf einen Blick

```
┌─────────────────────────────────────────────┐
│                 Discord Server              │
│         (Slash Commands, Buttons)           │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│              Discord Bot (discord.js)        │
│    Commands │ Events │ Interactions │ Embeds │
├──────────────────────────────────────────────┤
│              Express API (:3001)             │
│   Routes │ Controllers │ Middleware │ Auth   │
├──────────────────────────────────────────────┤
│           Business Logic Layer               │
│     Services │ Repositories │ Scheduler      │
├──────────────────────────────────────────────┤
│           PostgreSQL (Prisma ORM)            │
└──────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│          Next.js Dashboard (:3000)           │
│    Admin Panel │ User Portal │ VOD Review    │
└──────────────────────────────────────────────┘
```

## Rollen-System

| Rolle | Discord | Dashboard | Beschreibung |
|-------|---------|-----------|-------------|
| **MAIN** | Alle Commands | User-Portal | Hauptspieler (5er-Roster) |
| **SUB** | Alle Commands | User-Portal | Ersatzspieler |
| **COACH** | Alle Commands | User-Portal | Trainer (kein Roster-Platz) |
| **Admin** | Admin-Commands | Admin-Panel | Team-Management |

## Projekt-Struktur

```
Schedule-Bot/
├── src/                    # Backend (Bot + API)
│   ├── index.ts            # Entry Point
│   ├── api/                # Express Server & Routes
│   ├── bot/                # Discord Bot
│   ├── jobs/               # Cron-Scheduler
│   ├── repositories/       # Datenbank-Zugriff
│   ├── services/           # Business-Logik
│   └── shared/             # Config, Middleware, Utils
├── dashboard/              # Next.js Frontend
│   ├── app/                # Pages & Routing
│   ├── components/         # UI-Komponenten
│   ├── hooks/              # React Hooks
│   └── lib/                # Utilities
├── prisma/                 # Datenbank-Schema
├── docker-compose.yml      # Container-Orchestrierung
└── docs/                   # Diese Dokumentation
```
