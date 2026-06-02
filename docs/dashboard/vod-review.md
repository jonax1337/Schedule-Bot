# VOD Review

## Overview

The VOD review system (`/vod/:scrimId`) enables timestamp-based comments on scrim recordings.

## Access

VOD review is reached through a link in the scrim detail view. Requirement: the scrim must have a `vodUrl` (YouTube link).

## Features

### Video Player

- **YouTube embed** via `react-youtube`
- Supported formats:
  - `https://youtube.com/watch?v=...`
  - `https://youtu.be/...`
  - Raw video IDs

### Timestamped Comments

Every comment carries a timestamp (seconds from the start of the video):

```
[1:25] Player1: Nice smoke here @Player2 #rotation
[2:30] Player2: Thanks! Timing was perfect #clutch
[5:15] Coach1:  We should have rotated here @everyone #mistake
```

### Auto-Scroll

- The comment list scrolls automatically to the current playback position.
- Disables itself when the user scrolls manually.
- Re-enables on click of the "Auto-Scroll" button.

### Highlighting

- A comment is highlighted when the video reaches its timestamp.
- Clicking a timestamp jumps to that point in the video.

### @Mentions

- Type `@` to autocomplete team members.
- Mentioned players are highlighted in color.
- The user list is loaded from `/api/user-mappings`.

### #Hashtags

- Type `#` to add a tag.
- Tags are automatically assigned a color (hash-based, 6 colors).
- Common tags: `#rotation`, `#mistake`, `#clutch`, `#eco`, `#execute`

### Filtering

- **By author** — only comments from a specific player
- **By hashtag** — only comments with a given tag
- **By mention** — only comments that mention a specific player
- Filters can be combined

### Editing & Deleting

- **Own comments:** text and timestamp are editable.
- **Admins:** can edit and delete any comment.
- **Delete:** only the author or an admin.

## Technical Details

### Mention Input Component

`vod-mention-input.tsx` implements a textarea with:
- `@` trigger for user autocomplete
- `#` trigger for tag suggestions
- Keyboard navigation (arrow keys, Enter, Escape)
- Inline replacement of the selected suggestion

### Comment Text Renderer

`vod-comment-text.tsx` renders comment text with:
- `@mentions` as colored badges
- `#hashtags` as clickable tags
- Clicking a tag filters the comment list

### Timestamp Formatting

```typescript
formatTimestamp(125)   → "2:05"
formatTimestamp(3665)  → "1:01:05"
```

## API

```
GET    /api/vod-comments/scrim/:scrimId  → Load comments
POST   /api/vod-comments                 → Create comment
PUT    /api/vod-comments/:id             → Update
DELETE /api/vod-comments/:id             → Delete
```
