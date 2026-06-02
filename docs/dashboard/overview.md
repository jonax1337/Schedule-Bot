# Dashboard Overview

## Tech stack

| Tech | Version | Used for |
| --- | --- | --- |
| Next.js | 16.2 | Framework (App Router) |
| React | 19.2 | UI library |
| Tailwind CSS | 4 | Styling |
| Radix UI | — | Accessible UI primitives |
| TipTap | 3.24 | Rich-text editor (stratbook) |
| Recharts | 3 | Charts |
| dnd-kit | — | Drag-and-drop |
| Sonner | 2 | Toast notifications |
| Lucide React | — | Icons |
| react-youtube | 10 | YouTube embed (VOD review) |

## Routing

```
/                  → User portal (player home)
/login             → User login (roster credentials or Discord OAuth)
/admin             → Admin dashboard
/admin/login       → Admin login
/auth/callback     → Discord OAuth callback
/vod/:scrimId      → VOD review room
```

## Directory layout

```
app/                       # Next.js App Router
├── layout.tsx             # Root layout (fonts, theme, timezone)
├── page.tsx               # User portal
├── globals.css            # Tailwind + globals
├── api/                   # Server-side API proxies
├── admin/                 # Admin area
├── auth/                  # OAuth callbacks
├── login/                 # Login page
└── vod/                   # VOD review

components/
├── admin/                 # Admin-only components
│   ├── layout/
│   └── pages/
├── user/                  # Player-only components
│   ├── layout/
│   └── pages/
├── shared/                # Shared across admin + user
│   ├── matches.tsx
│   ├── statistics.tsx
│   ├── stratbook.tsx
│   ├── vod-review.tsx
│   └── …
├── ui/                    # 35+ Radix UI primitives
├── auth/                  # Login form
└── theme/                 # Dark/light theme

hooks/                     # Custom React hooks
lib/                       # Utilities, API client, types
```

## Theming

- **Dark / light** modes via `next-themes`
- Toggle in the sidebar; system preference is the default
- Tailwind CSS 4 with CSS variables for colours

## Fonts

| Font | Source | Used for |
| --- | --- | --- |
| Chakra Petch | Google Fonts | Headings |
| Space Mono | Google Fonts | Monospace |
| Brier Bold | Local (WOFF2) | Accent text |

## API client

`lib/api.ts` is the only place the dashboard talks to the backend:

```typescript
const schedules = await apiGet<ScheduleDay[]>('/api/schedule/next14');
await apiPost<void>('/api/settings', settings);
```

**Features**

- Retry with exponential backoff (1 s → 2 s → 4 s, max 3 attempts)
- Automatic `401` handling → redirect to login
- Type-safe responses via generics
- Auth header is attached automatically

## Security headers

- Content-Security-Policy
- `X-Frame-Options: DENY`
- Strict-Transport-Security (HSTS)
- `X-Content-Type-Options: nosniff`
- Permissions-Policy (camera / microphone / geolocation disabled)
- `Cache-Control: no-store` for live data
