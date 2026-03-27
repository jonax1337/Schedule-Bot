# Stratbook

## Uebersicht

Das Stratbook (`components/shared/stratbook.tsx`) ist ein Team-internes Wiki fuer Valorant-Strategien. Es wird sowohl im User-Portal als auch im Admin-Panel angezeigt.

## Features

### Ordner-Struktur

- Hierarchische Ordner (verschachtelbar)
- Farbkodierung (8 Farben)
- Drag-and-Drop Sortierung
- Erstellen, Umbenennen, Loeschen

### Strategie-Dokumente

Jede Strategie umfasst:

| Feld | Beschreibung |
|------|-------------|
| **Titel** | Name der Strategie |
| **Map** | Zugehoerige Karte (optional) |
| **Side** | Attack / Defense (optional) |
| **Tags** | Kommagetrennte Tags |
| **Agents** | Beteiligte Agenten |
| **Content** | Rich-Text Inhalt (TipTap JSON) |
| **Images** | Hochgeladene Bilder |
| **Files** | Hochgeladene PDFs |

### Rich-Text Editor

Der Editor (`strategy-editor.tsx`) basiert auf TipTap und bietet:

- **Formatierung:** Bold, Italic, Underline, Strikethrough
- **Ueberschriften:** H1, H2, H3
- **Listen:** Numeriert und Aufzaehlungen
- **Links:** Verlinkte Texte
- **Bilder:** Inline-Bilder (Upload oder URL)
- **Code-Bloecke:** Syntax-Highlighting (lowlight)
- **Text-Ausrichtung:** Links, Zentriert, Rechts

### Suche & Filter

- Volltextsuche in Titeln
- Filter nach Map
- Filter nach Tags
- Filter nach Agenten

## Berechtigungen

Gesteuert ueber `stratbook.editPermission` Setting:

| Wert | Lesen | Erstellen/Bearbeiten | Loeschen |
|------|-------|---------------------|---------|
| `admin` | Alle | Nur Admins | Nur Admins |
| `all` | Alle | Alle Spieler | Nur Admins |

## API-Endpunkte

```
GET    /api/strategies           → Alle Strategien
POST   /api/strategies           → Erstellen (multipart/form-data)
PUT    /api/strategies/:id       → Bearbeiten
DELETE /api/strategies/:id       → Loeschen

GET    /api/strategies/folders   → Ordner-Struktur
POST   /api/strategies/folders   → Ordner erstellen
PUT    /api/strategies/folders/:id → Ordner bearbeiten
DELETE /api/strategies/folders/:id → Ordner loeschen (Cascade!)
```

## PDF-Vorschau

Hochgeladene PDFs koennen ueber die `pdf-preview-dialog.tsx` Komponente direkt im Browser angesehen werden.
