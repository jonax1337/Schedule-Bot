# Recurring Availability API

## Get Own Entries

```http
GET /api/recurring-availability
Authorization: Bearer <token>
```

**Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": "123456789012345678",
      "dayOfWeek": 1,
      "availability": "18:00-22:00",
      "active": true
    },
    {
      "id": 2,
      "userId": "123456789012345678",
      "dayOfWeek": 3,
      "availability": "18:00-22:00",
      "active": true
    }
  ]
}
```

**Weekdays:**
| Value | Day       |
| ----- | --------- |
| 0     | Sunday    |
| 1     | Monday    |
| 2     | Tuesday   |
| 3     | Wednesday |
| 4     | Thursday  |
| 5     | Friday    |
| 6     | Saturday  |

## Set Availability

```http
POST /api/recurring-availability
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "dayOfWeek": 1,
  "availability": "18:00-22:00"
}
```

Creates or updates the entry for the given weekday (upsert).

## Delete a Single Day

```http
DELETE /api/recurring-availability/:dayOfWeek
Authorization: Bearer <token>
```

**Example:** `DELETE /api/recurring-availability/1` removes the Monday entry.

## Delete All Entries

```http
DELETE /api/recurring-availability
Authorization: Bearer <token>
```

Removes all recurring availability entries for the current user.
