# Absence Management System Documentation

## Overview

The Absence Management System allows users to plan their absences in advance. The system automatically marks users as unavailable ("x") in the schedule table during their absence periods.

## Architecture

### Database Schema (Google Sheets - "Absences" Tab)

| Column | Type | Description |
|--------|------|-------------|
| ID | String | Unique identifier (format: `abs_timestamp_random`) |
| Discord ID | String | User's Discord ID |
| Username | String | User's display name |
| Start Date | String | Absence start date (format: DD.MM.YYYY) |
| End Date | String | Absence end date (format: DD.MM.YYYY) |
| Reason | String | Optional reason for absence |
| Created At | String | ISO timestamp of creation |

### Backend Components

#### 1. `src/absences.ts`
Core module for absence management with CRUD operations:
- `ensureAbsencesSheetExists()` - Creates Absences sheet if it doesn't exist
- `getAllAbsences()` - Retrieves all absences
- `getAbsencesByUser(discordId)` - Gets absences for specific user
- `getAbsenceById(id)` - Gets single absence by ID
- `addAbsence(absence)` - Creates new absence
- `updateAbsence(id, updates)` - Updates existing absence
- `deleteAbsence(id)` - Deletes absence
- `isDateInAbsence(date, absence)` - Checks if date falls within absence period
- `getActiveAbsencesForDate(date)` - Gets all active absences for specific date
- `getUsersAbsentOnDate(date)` - Gets Discord IDs of absent users for date

#### 2. `src/absenceProcessor.ts`
Scheduled job processor:
- `processAbsencesForDate(date)` - Marks absences for specific date
- `processAbsencesForNext14Days()` - Processes absences for 14-day window

#### 3. `src/scheduler.ts` (Modified)
Added hourly cron job:
```typescript
// Runs every hour at minute 0
cron.schedule('0 * * * *', async () => {
  await processAbsencesForNext14Days();
});
```

#### 4. `src/apiServer.ts` (Modified)
New API endpoints:
- `GET /api/absences` - Get all absences (optional auth)
- `GET /api/absences/user/:discordId` - Get user's absences (optional auth)
- `GET /api/absences/:id` - Get specific absence (optional auth)
- `POST /api/absences` - Create absence (protected, users can create own)
- `PUT /api/absences/:id` - Update absence (protected, users can update own)
- `DELETE /api/absences/:id` - Delete absence (protected, users can delete own)
- `GET /api/absences/date/:date` - Get active absences for date (optional auth)

#### 5. `src/middleware/validation.ts` (Modified)
Added validation schemas:
- `addAbsenceSchema` - Validates absence creation
- `updateAbsenceSchema` - Validates absence updates

### Frontend Components

#### 1. `dashboard/components/absence-manager.tsx`
React component for absence management UI:
- Add new absences with date picker
- View all absences in table format
- Edit existing absences
- Delete absences
- Visual indication of active absences
- Reason field for absence context

#### 2. `dashboard/app/user/page.tsx` (Modified)
Integrated absence manager:
- Loads user's Discord ID from user mappings
- Displays `<AbsenceManager>` component above availability table
- Passes user context to component

## How It Works

### 1. User Creates Absence
1. User navigates to `/user` page (Availability page)
2. Clicks "Add Absence" button in Absence Planning card
3. Selects start date, end date, and optional reason
4. System validates dates (end must be after start)
5. Absence is saved to Google Sheets "Absences" tab
6. Users can only create absences for themselves (admins can create for anyone)

### 2. Automatic Processing
1. Scheduled job runs every hour (at minute 0)
2. Checks next 14 days for active absences
3. For each date with absences:
   - Finds users with active absences
   - Looks up their column in schedule sheet
   - Marks their availability as "x" if not already marked
4. Logs all updates to console

### 3. User Management
- Users can view all their absences
- Active absences are highlighted in orange
- Edit button opens dialog to modify dates/reason
- Delete button removes absence (with confirmation)
- Changes take effect on next hourly processing run

## Security & Permissions

### User Role
- Can view own absences
- Can create absences for themselves only
- Can edit own absences only
- Can delete own absences only

### Admin Role
- Can view all absences
- Can create absences for any user
- Can edit any absence
- Can delete any absence

## API Request Examples

### Create Absence
```bash
POST /api/absences
Authorization: Bearer <token>
Content-Type: application/json

{
  "discordId": "123456789012345678",
  "username": "PlayerName",
  "startDate": "25.01.2026",
  "endDate": "30.01.2026",
  "reason": "Vacation"
}
```

### Get User's Absences
```bash
GET /api/absences/user/123456789012345678
```

### Update Absence
```bash
PUT /api/absences/abs_1234567890_abc123
Authorization: Bearer <token>
Content-Type: application/json

{
  "endDate": "31.01.2026",
  "reason": "Extended vacation"
}
```

### Delete Absence
```bash
DELETE /api/absences/abs_1234567890_abc123
Authorization: Bearer <token>
```

## Testing the System

### Manual Testing Steps

1. **Start the backend:**
   ```bash
   npm run dev
   ```

2. **Start the dashboard:**
   ```bash
   cd dashboard
   npm run dev
   ```

3. **Test absence creation:**
   - Navigate to http://localhost:3000/user
   - Login as a user
   - Click "Add Absence"
   - Select dates and add reason
   - Verify absence appears in table

4. **Test automatic marking:**
   - Create an absence for today
   - Wait for next hourly run (or trigger manually via API)
   - Check schedule sheet - user should be marked as "x"

5. **Test editing:**
   - Click edit button on an absence
   - Modify dates or reason
   - Verify changes are saved

6. **Test deletion:**
   - Click delete button
   - Confirm deletion
   - Verify absence is removed

### API Testing with curl

```bash
# Get all absences
curl http://localhost:3001/api/absences

# Get absences for specific date
curl http://localhost:3001/api/absences/date/25.01.2026

# Create absence (requires auth token)
curl -X POST http://localhost:3001/api/absences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "discordId": "123456789012345678",
    "username": "PlayerName",
    "startDate": "25.01.2026",
    "endDate": "30.01.2026",
    "reason": "Vacation"
  }'
```

## Troubleshooting

### Absences not being marked in schedule
1. Check if scheduler is running: `GET /api/bot-status`
2. Check console logs for absence processor messages
3. Verify user has correct Discord ID in UserMapping sheet
4. Verify user's column exists in schedule sheet
5. Check if absence dates are within 14-day window

### Cannot create absence
1. Verify user is logged in (has valid JWT token)
2. Check date format is DD.MM.YYYY
3. Ensure end date is after start date
4. Verify Discord ID matches logged-in user

### Absence not appearing in UI
1. Check browser console for errors
2. Verify API endpoint is accessible
3. Check user's Discord ID is correctly loaded
4. Refresh the page

## Future Enhancements

Potential improvements:
1. Email/Discord notifications when absence is approaching
2. Bulk absence import from calendar
3. Recurring absences (e.g., every Friday)
4. Absence approval workflow for admins
5. Export absences to iCal format
6. Absence statistics and reports
7. Conflict detection (team too small during absence period)

## File Structure

```
schedule-bot/
├── src/
│   ├── absences.ts              # Core absence management
│   ├── absenceProcessor.ts      # Scheduled processing
│   ├── scheduler.ts             # Modified: added absence job
│   ├── apiServer.ts             # Modified: added absence endpoints
│   └── middleware/
│       └── validation.ts        # Modified: added absence schemas
└── dashboard/
    ├── components/
    │   └── absence-manager.tsx  # Absence UI component
    └── app/
        └── user/
            └── page.tsx         # Modified: integrated absence manager
```

## Notes

- Absence processing runs every hour to minimize API calls
- System only processes next 14 days (matches schedule window)
- Absences are stored separately from schedule to maintain history
- Users marked as "x" can still manually change their availability
- Next hourly run will re-mark them if absence is still active
