# Polls

## Quick Polls

Simple votes using reaction emojis.

### Creating a Poll

**Discord:**
```
/poll question:Which map do we play? options:Ascent,Haven,Bind duration:30
```

**API:**
```bash
POST /api/actions/poll
{
  "question": "Which map do we play?",
  "options": ["Ascent", "Haven", "Bind"],
  "duration": 30
}
```

### How it Works

1. The bot sends an embed containing the question and options.
2. Numbered emoji reactions are added (1️⃣, 2️⃣, 3️⃣, ...).
3. Players click a reaction to cast their vote.
4. Each player may only choose one option (selecting another removes the previous one).
5. Once the timer expires, the results are shown.

### Result Display

When the poll ends:

- The poll message is deleted.
- A new message with the results is posted.
- It shows the vote count per option and the winning choice.

### Recovery

Running polls are restored automatically when the bot restarts:

- Open polls are loaded from internal storage.
- Remaining timers are recalculated.
- Reaction listeners are re-registered.

## Training-Start Polls

A specialized poll type for deciding the training start time.

### Automatic

When `scheduling.trainingPollEnabled` is active, a training poll is automatically created with every schedule post.

### Manual

**Discord:**
```
/send-training-poll
```

**API:**
```bash
POST /api/actions/training-poll
```

### Time Calculation

Poll options are derived automatically from player availability:

```
Player availability:
  Player1: 14:00 - 20:00
  Player2: 16:00 - 22:00
  Player3: 14:00 - 20:00
  Player4: 18:00 - 22:00
  Sub1:    14:00 - 22:00

Calculated options:
  1️⃣ 16:00 (earliest possible start with sub)
  2️⃣ 18:00 (everyone available)
  3️⃣ 19:00 (later start)
```

Options are based on shared time windows and prioritize times with the highest player overlap.

### Toggle

The automatic training poll can be enabled or disabled:

```
/training-start-poll
```

It can also be toggled in the admin settings on the dashboard.

## Poll Architecture

### Base Class (`pollBase.ts`)

Shared logic used by every poll type:

- Per-user vote tracking
- Reaction handlers (add/remove)
- Timer management
- Result aggregation

### Quick Poll (`polls.ts`)

Extends the base class with:

- Freely configurable questions and options
- Flexible duration
- Emoji-based options

### Training Poll (`trainingStartPoll.ts`)

Extends the base class with:

- Automatic option calculation from availabilities
- Integration with the schedule post
- Recovery after restart
