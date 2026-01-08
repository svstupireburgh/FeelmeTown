# Manual Booking Flow - Updated

## Current Flow (After Changes)

### 1. Manual Booking Creation
- **Status**: `manual` (keeps manual status)
- **Storage**: Database only (both `manual_booking` and `booking` collections)
- **NO JSON**: Manual bookings do NOT go to `manual-bookings.json` anymore

### 2. Manual Booking Lifecycle
```
Create Manual Booking
       ↓
Save to Database (status: 'manual')
       ↓
Booking remains active during time slot
       ↓
Time slot ends + 5 minutes
       ↓
Auto-cleanup scheduler detects expiry
       ↓
Archive to completed-bookings.json
       ↓
Delete from database (both collections)
       ↓
Increment 'completed' counter
```

### 3. Auto-Cleanup Processing
- **Frequency**: Every 5 minutes
- **Condition**: `status === 'confirmed'` OR `status === 'manual'` AND time expired
- **Action**: 
  1. Save to `completed-bookings.json`
  2. Delete from `manual_booking` collection
  3. Delete from `booking` collection
  4. Increment completed counter

### 4. Key Changes Made
- ✅ Manual bookings default status: `'manual'` (keeps manual status)
- ✅ Manual bookings saved to both database collections
- ✅ Auto-cleanup processes manual bookings same as regular bookings
- ❌ Removed all `manual-bookings.json` writing logic
- ❌ Removed all `manual-bookings.json` cleanup logic

### 5. Files Modified
- `src/lib/db-connect.ts` - Changed default status and dual collection save
- `src/app/api/auto-cleanup-scheduler/route.ts` - Added manual booking cleanup
- `src/app/api/new-booking/route.ts` - Removed JSON writing
- `src/app/api/booking/route.ts` - Removed JSON writing  
- `src/app/api/admin/update-booking/route.ts` - Removed JSON cleanup

### 6. Result
Manual bookings now behave exactly like confirmed bookings:
- Database storage only
- Auto-completion after time expires
- Archive to completed-bookings.json
- No separate JSON file management
