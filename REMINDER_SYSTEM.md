# 🔔 Automatic Reminder System

## Overview

The bot now automatically sends DM reminders to players who haven't set their availability yet - **3 hours before the daily schedule post**.

---

## How It Works

### Automatic Reminders

**Timing:** 3 hours before the configured daily post time

**Example:**
- Daily post time: `12:00`
- Reminder time: `09:00`

**Who gets reminded:**
- All registered players (main roster + subs)
- Only those who have **no entry** for today's date (empty cell in Google Sheet)
- Coaches are excluded from reminders

**What they receive:**
A DM with:
- Reminder message
- Interactive buttons to set availability immediately
- Date for which they need to set availability

---

## Configuration

The reminder time is automatically calculated based on your `DAILY_POST_TIME` in `.env`:

```env
DAILY_POST_TIME=12:00  # Reminders will be sent at 09:00
```

**Examples:**
- Post at `10:00` → Reminders at `07:00`
- Post at `18:00` → Reminders at `15:00`
- Post at `02:00` → Reminders at `23:00` (previous day)

---

## Manual Testing

Admins can manually trigger reminders with:

```
/send-reminders [date]
```

**Examples:**
```
/send-reminders              # Send reminders for today
/send-reminders 17.01.2026   # Send reminders for specific date
```

This is useful for:
- Testing the reminder system
- Sending reminders at custom times
- Re-sending reminders if needed

---

## Privacy & User Experience

### All Commands are Private (Ephemeral)

To avoid cluttering channels, **all player-related commands are now only visible to the user**:

✅ **Private (only you see it):**
- `/schedule` - View schedule
- `/availability` - Set your availability
- `/schedule-week` - Week overview
- `/my-schedule` - Your personal schedule
- `/register` - Admin command
- `/unregister` - Admin command
- `/send-reminders` - Admin command

❌ **Public (everyone sees it):**
- None! All commands are private now.

**Note:** The automatic daily schedule post to the channel is still public.

---

## Example Workflow

### Scenario: Daily Reminder Flow

**09:00 AM** (3h before post)
- Bot checks Google Sheet for today's date
- Finds that "TenZ" and "Shroud" have no entry
- Sends DM to both:
  ```
  ⏰ Reminder: Availability for 16.01.2026
  
  Hey TenZ! You haven't set your availability for today yet.
  
  Please set your availability now:
  [✅ Available] [❌ Not Available] [⏰ Set Time]
  ```

**09:15 AM**
- TenZ clicks "⏰ Set Time"
- Modal opens: From: 14:00, To: 20:00
- Submits → Google Sheet updated

**12:00 PM**
- Bot posts daily schedule to channel
- TenZ's availability is included
- Shroud still shows as "no entry" (if he didn't respond)

---

## Console Logs

The bot logs reminder activity:

```
[2026-01-16T09:00:00.000Z] Running scheduled reminders...
Checking for users without availability entry for 16.01.2026...
Sent reminder to TenZ (TenZ)
Sent reminder to Shroud (Shroud)
Reminders sent: 2/5 players
Reminders sent successfully.
```

---

## Troubleshooting

### Reminders not being sent

**Check:**
1. Bot is running and scheduler is active
2. Users are registered with `/register`
3. Users have DMs enabled from server members
4. Console shows no errors

**Test manually:**
```
/send-reminders
```

### User doesn't receive DM

**Possible reasons:**
1. User has DMs disabled
2. User blocked the bot
3. User is not registered

**Solution:**
- User must enable DMs: Server → Privacy Settings → "Direct Messages from server members"
- Check registration with console logs

### Wrong reminder time

**Check `.env` file:**
```env
DAILY_POST_TIME=12:00
TIMEZONE=Europe/London
```

Reminder time = Post time - 3 hours (in the configured timezone)

---

## Benefits

✅ **Automatic reminders** - No manual pinging needed
✅ **3h advance notice** - Players have time to respond
✅ **Interactive** - Players can set availability directly from DM
✅ **No channel spam** - All interactions are private
✅ **Selective** - Only reminds players without entries
✅ **Flexible** - Manual override available for admins

---

## Files Added/Modified

**New Files:**
- `src/reminder.ts` - Reminder system logic

**Modified Files:**
- `src/scheduler.ts` - Added reminder cron job
- `src/bot.ts` - Added `/send-reminders` command, made all commands ephemeral

---

**The reminder system is now active! 🎮**
