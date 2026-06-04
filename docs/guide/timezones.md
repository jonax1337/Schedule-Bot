# Timezones

## Concept

Synqed supports per-player timezones. All times are stored internally in the **bot timezone** (default: `Europe/Berlin`) and converted on display.

## Architecture

```
Player input (user TZ)
        │
        ▼
  Convert → bot timezone
        │
        ▼
   Database (bot TZ)
        │
        ├──▶ Discord: <t:TIMESTAMP:t> (auto-local)
        └──▶ Dashboard: TimezoneProvider (user TZ)
```

## Setting a Player Timezone

### Via Discord

```
/set-timezone timezone:America/New_York
```

Autocomplete suggests common timezones.

### Removing

```
/remove-timezone
```

After removal, the bot timezone is used.

### Storage

The timezone is stored in `user_mappings.user_timezone` as an IANA string:
- `Europe/Berlin`
- `America/New_York`
- `Asia/Tokyo`
- etc.

## Conversion Logic

### Backend (`timezoneConverter.ts`)

```typescript
// Validation
isValidTimezone('Europe/Berlin')     // true
isValidTimezone('Invalid/Zone')      // false

// Conversion
convertTimeInTimezone('14:00', 'America/New_York', 'Europe/Berlin')
// → '20:00' (in winter, +6h)

// All timezones
getSupportedTimezones()              // Array of all IANA timezones

// Abbreviation
getTimezoneAbbreviation('Europe/Berlin')  // 'CET' or 'CEST'
```

### Frontend (`lib/timezone.ts`)

```typescript
// Convert a single time
convertTime('14:00', 'Europe/Berlin', 'America/New_York')

// Convert a time range
convertTimeRange('14:00-20:00', 'Europe/Berlin', 'America/New_York')

// Abbreviation
getTimezoneAbbr('Europe/Berlin')  // 'CET'
```

## TimezoneProvider (Dashboard)

The dashboard uses a React context for global timezone management:

```tsx
const { userTimezone, botTimezone, botTimezoneLoaded } = useTimezone();
```

### How it Works

1. **User timezone:** read from localStorage or detected from the browser.
2. **Bot timezone:** fetched from `/api/settings` on load.
3. **Auto-refresh:** the bot timezone is refreshed every 5 minutes.
4. **Version counter:** incremented on changes (for dependency tracking).

### Usage in Components

```tsx
function ScheduleView() {
  const { userTimezone, botTimezone } = useTimezone();

  // Displayed time = converted from bot TZ to user TZ
  const localTime = convertTimeRange(
    schedule.availability,
    botTimezone,
    userTimezone
  );

  // Stored time = converted from user TZ to bot TZ
  const botTime = convertTimeRange(
    userInput,
    userTimezone,
    botTimezone
  );
}
```

## Discord Timestamps

In Discord, Unix timestamps are used to render times automatically in the viewer's local timezone:

```typescript
// Discord timestamp format
`<t:${unixTimestamp}:t>`  // Short time (14:00)
`<t:${unixTimestamp}:T>`  // Long time (14:00:00)
`<t:${unixTimestamp}:d>`  // Short date (27.03.2026)
`<t:${unixTimestamp}:D>`  // Long date (27 March 2026)
`<t:${unixTimestamp}:f>`  // Date + time
`<t:${unixTimestamp}:R>`  // Relative ("in 3 hours")
```

Discord converts these automatically into the viewer's local timezone — no manual conversion is required.

## Important Notes

::: warning Daylight Saving Time
Conversion automatically accounts for daylight saving time (DST) because IANA timezones are used. `Europe/Berlin` switches automatically between CET (+1) and CEST (+2).
:::

::: tip Default Timezone
If a player has not set a timezone, the bot timezone (`Europe/Berlin`) is assumed. We recommend that every player configure their own timezone.
:::
