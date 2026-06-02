# Embeds & Messages

## Schedule Embed

The main embed displays the team's daily availability:

```
┌──────────────────────────────────────────┐
│  📅 Schedule - 27.03.2026 (Friday)       │
│  Training                                 │
│                                           │
│  ── Main Players ──                       │
│  ✅ Player1  │ 14:00 - 20:00             │
│  ✅ Player2  │ 16:00 - 22:00             │
│  ✅ Player3  │ 14:00 - 20:00             │
│  ✅ Player4  │ 18:00 - 22:00             │
│  ❌ Player5  │ Unavailable                │
│                                           │
│  ── Subs ──                               │
│  ✅ Sub1     │ 14:00 - 22:00    🔄       │
│                                           │
│  ── Coach ──                              │
│  ✅ Coach1   │ 16:00 - 20:00             │
│                                           │
│  ─────────────────────────────            │
│  Status: With Subs                        │
│  Shared time: 18:00 - 20:00               │
│  Overlap: 2 hours                         │
└──────────────────────────────────────────┘
```

### Color Coding

The embed color reflects the current roster status:

| Status | Color | Meaning |
|--------|-------|---------|
| `FULL_ROSTER` | 🟢 Green | All 5 mains available |
| `WITH_SUBS` | 🟠 Orange | Enough players with subs |
| `NOT_ENOUGH` | 🔴 Red | Not enough players |
| `OFF_DAY` | 🟣 Purple | No training scheduled |

### Time Display

- Discord timestamps for automatic local conversion:
  ```
  <t:1711540800:t> → "14:00" (in the viewer's local timezone)
  ```
- The overlap calculation shows the shared available time window.

### Sub Indicator

When a main player is unavailable and a sub fills in, this is marked with 🔄.

## Reminder Embed

```
┌──────────────────────────────────────────┐
│  ⏰ Reminder                              │
│                                           │
│  Hey Player5! You haven't set your        │
│  availability for today yet.              │
│                                           │
│  [Set time window] [Unavailable]          │
│  [Set timezone]                           │
└──────────────────────────────────────────┘
```

The "Set timezone" button only appears if the player has not yet configured a timezone.

## Notification Embeds

### Info

```
┌──────────────────────────────────────────┐
│  ℹ️ Information                           │
│  Training is cancelled today!             │
└──────────────────────────────────────────┘
```

### Warning

```
┌──────────────────────────────────────────┐
│  ⚠️ Warning                               │
│  Only 3 players available tomorrow!       │
└──────────────────────────────────────────┘
```

### Alert

```
┌──────────────────────────────────────────┐
│  🚨 Important                             │
│  Premier match in 1 hour!                 │
└──────────────────────────────────────────┘
```

## Poll Embeds

### Quick Poll

```
┌──────────────────────────────────────────┐
│  📊 Poll                                  │
│  When can you play today?                 │
│                                           │
│  1️⃣ 18:00                                │
│  2️⃣ 19:00                                │
│  3️⃣ 20:00                                │
│                                           │
│  Ends: <t:1711555200:R>                   │
└──────────────────────────────────────────┘
```

### Training-Start Poll

```
┌──────────────────────────────────────────┐
│  🎮 Training Start                        │
│  When should training start?              │
│                                           │
│  Based on your availability:              │
│  1️⃣ 16:00 (earliest slot)                │
│  2️⃣ 17:00                                │
│  3️⃣ 18:00 (maximum overlap)              │
│                                           │
│  Ends: <t:1711555200:R>                   │
└──────────────────────────────────────────┘
```

Time options are calculated automatically from the available time windows.

## Status Change Message

When the roster status changes (e.g. a player drops out):

```
📢 Schedule update: status changed
   NOT_ENOUGH → WITH_SUBS
```

This message is only posted when:

- The change is for today
- The daily post time has already passed
- The status has actually changed
