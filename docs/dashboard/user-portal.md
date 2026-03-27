# User-Portal

## Uebersicht

Das User-Portal ist die Hauptansicht fuer Spieler. Es ist unter `/` erreichbar und erfordert eine Anmeldung.

## Tabs

### Schedule

14-Tage Kalenderansicht mit Team-Verfuegbarkeit.

**Features:**
- Tageseintraege mit Grund (Training, Premier, Off-Day, etc.)
- Spieler-Matrix mit Verfuegbarkeiten
- Eigene Verfuegbarkeit direkt setzen
- Zeitfenster-Eingabe mit Zeitzonen-Konvertierung
- Farbkodierte Status-Indikatoren
- Abwesende Spieler markiert

**API-Aufrufe:**
- `GET /api/schedule/next14` - Schedule laden
- `POST /api/schedule/update-availability` - Verfuegbarkeit setzen

### Availability

Verfuegbarkeits-Management fuer kommende Tage.

**Features:**
- Schnelle Zeiteingabe fuer mehrere Tage
- Zeitzonen-Konvertierung (User → Bot)
- Visuelle Zeitfenster-Anzeige

### Recurring

Woechentliche Verfuegbarkeits-Muster.

**Features:**
- 7-Tage-Wochen-Matrix
- Pro Tag: Zeitfenster oder "nicht verfuegbar"
- Aenderungen werden auf zukuenftige leere Slots angewendet

**API-Aufrufe:**
- `GET /api/recurring-availability`
- `POST /api/recurring-availability`
- `DELETE /api/recurring-availability/:day`

### Absences

Abwesenheits-Verwaltung.

**Features:**
- Datum-Bereich waehlen (Start + Ende)
- Optionaler Grund
- Liste aller eigenen Abwesenheiten
- Bearbeiten und Loeschen

**API-Aufrufe:**
- `GET /api/absences`
- `POST /api/absences`
- `PUT /api/absences/:id`
- `DELETE /api/absences/:id`

### Matches

Scrim-Uebersicht und -Verwaltung (geteilt mit Admin).

Siehe [Matches & Statistiken](/dashboard/matches).

### Stratbook

Team-Strategien (geteilt mit Admin).

Siehe [Stratbook](/dashboard/stratbook).

### Statistics

Scrim-Statistiken und Charts (geteilt mit Admin).

Siehe [Matches & Statistiken](/dashboard/matches).

## Layout

### Sidebar

Die User-Sidebar zeigt:
- **Team-Branding** (Name, Logo, Tagline)
- **Navigation** (alle Tabs)
- **User-Info** (Name, Rolle, Avatar)
- **Logout-Button**
- **Theme-Toggle** (Dark/Light)

### Responsive Design

- Auf kleinen Bildschirmen (< 768px) wird die Sidebar zu einem Hamburger-Menu
- `useIsMobile()` Hook fuer responsive Logik
- Sheet-basierte mobile Navigation

## Authentifizierung

Beim Laden der Seite wird:
1. Token aus localStorage gepreuft
2. Token gegen Server validiert (`/api/auth/user`)
3. Bei Fehler: Redirect zu `/login`
4. Rolle wird server-seitig synchronisiert (kein localStorage-Vertrauen)
