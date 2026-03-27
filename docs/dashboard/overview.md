# Dashboard Uebersicht

## Technologie-Stack

| Technologie | Version | Verwendung |
|-------------|---------|-----------|
| Next.js | 16.1.4 | Framework (App Router) |
| React | 19.2.3 | UI-Library |
| Tailwind CSS | 4 | Styling |
| Radix UI | - | Barrierefreie UI-Primitives |
| TipTap | 3.18.0 | Rich-Text Editor |
| Recharts | 3.7.0 | Diagramme & Charts |
| dnd-kit | - | Drag & Drop |
| Sonner | 2.0.7 | Toast-Benachrichtigungen |
| Lucide React | - | Icons |
| react-youtube | 10.1.0 | YouTube-Einbettung |

## Routing-Struktur

```
/                       → User-Portal (Haupt-Dashboard)
/login                  → User-Login (Roster oder Discord OAuth)
/admin                  → Admin-Dashboard
/admin/login            → Admin-Login
/auth/callback          → Discord OAuth Callback
/vod/:scrimId           → VOD-Review Raum
```

## Architektur

```
app/                    # Next.js App Router
├── layout.tsx          # Root Layout (Fonts, Theme, Timezone)
├── page.tsx            # User-Portal
├── globals.css         # Globale Styles + Tailwind
├── api/                # Server-seitige API-Proxies
├── admin/              # Admin-Bereich
├── auth/               # OAuth-Callbacks
├── login/              # Login-Seite
└── vod/                # VOD-Review

components/
├── admin/              # Admin-spezifische Komponenten
│   ├── layout/         # Admin-Sidebar + Layout
│   └── pages/          # Admin-Seiten
├── user/               # User-spezifische Komponenten
│   ├── layout/         # User-Sidebar + Layout
│   └── pages/          # User-Seiten
├── shared/             # Geteilte Komponenten
│   ├── matches.tsx     # Scrim-Verwaltung
│   ├── statistics.tsx  # Statistik-Charts
│   ├── stratbook.tsx   # Strategie-Buch
│   ├── vod-review.tsx  # VOD-Review
│   └── ...
├── ui/                 # 35 Radix UI Primitives
├── auth/               # Login-Formular
└── theme/              # Dark/Light Theme

hooks/                  # Custom React Hooks
lib/                    # Utilities, API-Client, Types
```

## Theming

- **Dark/Light Mode** via `next-themes`
- Umschaltbar per Button (ThemeToggle-Komponente)
- System-Praeferenz als Default
- Tailwind CSS 4 mit CSS-Variablen fuer Farben

## Fonts

| Font | Typ | Verwendung |
|------|-----|-----------|
| Chakra Petch | Google Font | Ueberschriften |
| Space Mono | Google Font | Monospace-Text |
| Brier Bold | Lokal (WOFF2) | Akzent-Text |

## API-Kommunikation

Das Dashboard kommuniziert ueber `lib/api.ts` mit dem Backend:

```typescript
// Typisierte API-Aufrufe
const schedules = await apiGet<ScheduleDay[]>('/api/schedule/next14');
const result = await apiPost<void>('/api/settings', settings);
```

### Features
- **Retry mit Exponential Backoff** (1s, 2s, 4s - max 3 Versuche)
- **Automatische 401-Behandlung** → Redirect zum Login
- **Typsichere Responses** via Generics
- **Auth-Header** werden automatisch angehaengt

## Security

- Content Security Policy (CSP) Headers
- X-Frame-Options: DENY
- Strict-Transport-Security (HSTS)
- X-Content-Type-Options: nosniff
- Permissions-Policy (kein Kamera/Mikrofon/Geo)
- Cache-Control: no-store (Live-Daten)
