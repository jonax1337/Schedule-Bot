# User Portal

## Overview

The user portal is the main view for players. It is available at `/` and requires authentication.

## Tabs

### Schedule

14-day calendar view of the team's availability.

**Features:**
- Daily entries with a reason (Training, Premier, Off-Day, etc.)
- Player matrix with availabilities
- Set your own availability directly
- Time window input with timezone conversion
- Color-coded status indicators
- Absent players are marked

**API calls:**
- `GET /api/schedule/next14` - load the schedule
- `POST /api/schedule/update-availability` - update availability

### Availability

Manage availability for upcoming days.

**Features:**
- Quickly enter times across multiple days
- Timezone conversion (user → bot)
- Visual display of time windows

### Recurring

Weekly availability patterns.

**Features:**
- 7-day weekly matrix
- Per day: a time window or "unavailable"
- Changes are applied to future empty slots

**API calls:**
- `GET /api/recurring-availability`
- `POST /api/recurring-availability`
- `DELETE /api/recurring-availability/:day`

### Absences

Manage absences.

**Features:**
- Choose a date range (start + end)
- Optional reason
- List of all your own absences
- Edit and delete

**API calls:**
- `GET /api/absences`
- `POST /api/absences`
- `PUT /api/absences/:id`
- `DELETE /api/absences/:id`

### Matches

Scrim overview and management (shared with admin).

See [Matches & Statistics](/dashboard/matches).

### Stratbook

Team strategies (shared with admin).

See [Stratbook](/dashboard/stratbook).

### Statistics

Scrim statistics and charts (shared with admin).

See [Matches & Statistics](/dashboard/matches).

## Layout

### Sidebar

The user sidebar displays:
- **Team branding** (name, logo, tagline)
- **Navigation** (all tabs)
- **User info** (name, role, avatar)
- **Logout button**
- **Theme toggle** (dark/light)

### Responsive Design

- On small screens (< 768px) the sidebar collapses into a hamburger menu.
- The `useIsMobile()` hook drives responsive logic.
- Mobile navigation uses a `Sheet`-based drawer.

## Authentication

When the page loads, the portal:

1. Reads the token from localStorage.
2. Validates it against the server (`/api/auth/user`).
3. Redirects to `/login` on failure.
4. Synchronizes the role server-side (localStorage is not trusted).
