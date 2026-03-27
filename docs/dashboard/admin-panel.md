# Admin-Panel

## Uebersicht

Das Admin-Panel ist unter `/admin` erreichbar und erfordert Admin-Authentifizierung.

## Tabs

### Dashboard

Admin-Uebersichtsseite mit Widgets:

**Status-Karten (4er Grid):**
- **Bot Status** - Online/Offline Indikator (Polling alle 10s)
- **Uptime** - Bot-Laufzeit
- **API Server** - Server-Status
- **Discord Connection** - Gateway-Verbindung

**Informations-Karten:**
- **Team Overview** - Roster-Anzahl (Main/Sub/Coach Aufschluesselung)
- **Win Rate** - Gesamt-Win-Rate mit W/L/D
- **Upcoming Schedules** - Naechste 14 Tage mit Status-Zusammenfassung

**Quick Actions** - Links zu: Statistics, Users, Schedule, Matches, Actions, Settings, Logs

### Statistics

Geteilte Komponente - siehe [Matches & Statistiken](/dashboard/matches).

### Settings

Konfigurationsseite mit Sektionen:

**Discord-Konfiguration:**
- Schedule-Channel (Dropdown aus Server-Channels)
- Ping-Rolle (Dropdown aus Server-Rollen)
- Discord OAuth ein-/ausschalten
- Client ID / Secret / Redirect URI

**Scheduling:**
- Taegliche Post-Zeit (HH:MM)
- Bot-Zeitzone (Timezone Picker)
- Erinnerung #1 (Stunden vor Post)
- Erinnerung #2 (Toggle + Stunden)
- Training-Poll (Toggle)

**Branding:**
- Team-Name
- Tagline
- Logo-URL

**Stratbook:**
- Bearbeitungsrechte (Admin-only / Alle)

### Users

User-Mapping Verwaltung:

**Features:**
- Tabelle aller registrierten Spieler
- Spalten: Discord-ID, Display Name, Rolle, Avatar
- Hinzufuegen / Bearbeiten / Loeschen
- Drag-and-Drop Sortierung (dnd-kit)
- Rollen-Zuweisung (MAIN / SUB / COACH)
- Admin-Flag Toggle

### Schedule

Schedule-Editor fuer Admins:

**Features:**
- Tages-Gruende bearbeiten (Training, Scrims, Premier, Off-Day, etc.)
- Fokus-Text setzen
- Paginierte Historie vergangener Tage

### Matches

Geteilte Komponente - siehe [Matches & Statistiken](/dashboard/matches).

### Stratbook

Geteilte Komponente - siehe [Stratbook](/dashboard/stratbook).

### Actions

Manuelle Bot-Aktionen:

| Aktion | Beschreibung |
|--------|-------------|
| **Schedule posten** | Heutigen Schedule in Discord posten |
| **Erinnerung senden** | Spieler ohne Verfuegbarkeit erinnern |
| **Poll erstellen** | Quick Poll mit Frage und Optionen |
| **Training-Poll** | Training-Start-Abstimmung |
| **Benachrichtigung** | DM an Spieler (Info/Warnung/Alert) |
| **Channel leeren** | Alle Nachrichten im Schedule-Channel loeschen |
| **Nachricht pinnen** | Nachricht senden und anpinnen |

### Security

Sicherheits-Einstellungen und -Informationen.

### Logs

System-Logs mit Filterung:

**Features:**
- Log-Level Filter (Info, Warn, Error)
- Einstellbare Anzahl (1-1000)
- Farbkodierte Log-Eintraege
- Auto-Refresh Option

**API:** `GET /api/admin/logs?limit=100&level=error`

## Layout

### Admin-Sidebar

- **Navigation** zu allen Tabs
- **Admin-Info** (Username)
- **Logout** Button
- **Theme-Toggle**

### Breadcrumbs

Dynamische Breadcrumb-Navigation basierend auf dem aktiven Tab, verwaltet ueber `BreadcrumbProvider` Context.
