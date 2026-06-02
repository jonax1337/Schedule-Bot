# VOD Comments API

## Load Comments for a Scrim

```http
GET /api/vod-comments/scrim/:scrimId
Authorization: Bearer <token>
```

**Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "scrimId": "abc123",
      "userName": "Player1",
      "timestamp": 125,
      "content": "Nice smoke here @Player2 #rotation",
      "createdAt": "2026-03-27T12:00:00.000Z",
      "updatedAt": "2026-03-27T12:00:00.000Z"
    }
  ]
}
```

**Note:** `timestamp` is in seconds from the start of the video. Comments are returned sorted by `timestamp`.

## Create Comment

```http
POST /api/vod-comments
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "scrimId": "abc123",
  "timestamp": 125,
  "content": "Nice smoke here @Player2 #rotation"
}
```

The `userName` is taken automatically from the JWT token.

### Formatting

Comments support:
- **@Mentions** - `@PlayerName` to mention a player
- **#Hashtags** - `#rotation`, `#mistake`, `#clutch`, etc. for categorization

## Edit Comment

```http
PUT /api/vod-comments/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "content": "Updated text",
  "timestamp": 130
}
```

Only the creator or an admin can edit.

## Delete Comment

```http
DELETE /api/vod-comments/:id
Authorization: Bearer <token>
```

Only the creator or an admin can delete.
