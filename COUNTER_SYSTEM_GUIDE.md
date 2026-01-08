# Counter System Guide - Dashboard Counters Fix

## Current Issue
Dashboard counters are not working properly. User wants:
- **Today**: Count from `counters.json` in blob storage
- **Week**: Weekly counter (resets every Sunday) from blob storage
- **Month**: Monthly counter (resets on 1st of month) from blob storage  
- **Year**: Yearly counter (resets on 1st January) from blob storage
- **Total**: Total count from database

## Counter System Architecture

### 1. **Time-Based Counters** (Blob Storage)
- **File**: `counters.json` in Vercel Blob storage
- **Structure**:
```json
{
  "confirmed": {
    "today": 5,
    "week": 12,
    "month": 45,
    "year": 234,
    "lastResetDate": "2025-10-29",
    "lastResetWeek": "2025-10-27", 
    "lastResetMonth": "2025-10-01",
    "lastResetYear": "2025-01-01"
  },
  "manual": { ... },
  "completed": { ... },
  "cancelled": { ... },
  "incomplete": { ... }
}
```

### 2. **Total Counters** (Database)
- **Collection**: `settings` in MongoDB
- **Fields**: `totalConfirmedBookings`, `totalManualBookings`, etc.

### 3. **Auto-Reset Logic**
- **Daily**: Resets at midnight IST (Asia/Kolkata)
- **Weekly**: Resets every Sunday
- **Monthly**: Resets on 1st of each month
- **Yearly**: Resets on 1st January

## API Endpoints

### Diagnostic APIs (Created)
1. **`/api/test-counter-system`** - Test counter system
2. **`/api/fix-counter-system`** - Fix and diagnose counter issues
   - `POST { "action": "diagnose" }` - Full system diagnosis
   - `POST { "action": "initialize" }` - Initialize/fix counters
   - `POST { "action": "test-increment" }` - Test counter increments

### Existing APIs
1. **`/api/admin/dashboard-stats`** - Get dashboard statistics (uses counter system)
2. **`/api/admin/reset-counters`** - Reset time-based counters only
3. **`/api/admin/reset-all-counters`** - Reset all counters (including totals)

## Counter Integration Points

### Booking Creation
- **Confirmed Booking**: `incrementCounter('confirmed')`
- **Manual Booking**: `incrementCounter('manual')`
- **Incomplete Booking**: `incrementCounter('incomplete')`

### Booking Status Changes
- **Cancelled**: `incrementCounter('cancelled')`
- **Completed**: `incrementCounter('completed')`

### Auto-Cleanup Scheduler
- **Auto-completion**: Increments `completed` counter
- **Runs every 5 minutes**: Processes expired bookings

## Troubleshooting Steps

### 1. **Check Counter System Health**
```bash
# Test the counter system
curl -X GET http://localhost:3000/api/test-counter-system

# Diagnose issues
curl -X POST http://localhost:3000/api/fix-counter-system \
  -H "Content-Type: application/json" \
  -d '{"action": "diagnose"}'
```

### 2. **Initialize Counter System**
```bash
# Initialize/fix counters
curl -X POST http://localhost:3000/api/fix-counter-system \
  -H "Content-Type: application/json" \
  -d '{"action": "initialize"}'
```

### 3. **Test Counter Increments**
```bash
# Test increment functionality
curl -X POST http://localhost:3000/api/fix-counter-system \
  -H "Content-Type: application/json" \
  -d '{"action": "test-increment"}'
```

## Dashboard Reset Button

The dashboard has a "Reset Counters" button that:
- Calls `/api/admin/reset-counters`
- Resets **only** time-based counters (today/week/month/year)
- **Preserves** database total counters
- Shows confirmation modal before reset

## Expected Behavior

### Dashboard Display
```
Online Bookings:
- Today: 3 (from counters.json)
- This Week: 8 (from counters.json)  
- This Month: 25 (from counters.json)
- This Year: 156 (from counters.json)
- Total: 1,234 (from database)

Manual Bookings:
- Today: 1 (from counters.json)
- This Week: 3 (from counters.json)
- This Month: 12 (from counters.json)
- This Year: 89 (from counters.json)
- Total: 567 (from database)
```

### Auto-Reset Schedule
- **Daily**: Every day at 00:00 IST
- **Weekly**: Every Sunday at 00:00 IST
- **Monthly**: 1st of every month at 00:00 IST
- **Yearly**: 1st January at 00:00 IST

## Files Modified/Created

### New Files
- `/src/app/api/test-counter-system/route.ts` - Counter system testing
- `/src/app/api/fix-counter-system/route.ts` - Counter system diagnostics and fixes

### Existing Files (Already Integrated)
- `/src/lib/counter-system.ts` - Core counter system logic
- `/src/app/api/admin/dashboard-stats/route.ts` - Dashboard statistics API
- `/src/components/AdminDashboard.tsx` - Dashboard component
- `/src/app/Administrator/page.tsx` - Administrator page

## Next Steps

1. **Run Diagnostics**: Use `/api/fix-counter-system` with `"action": "diagnose"`
2. **Initialize System**: Use `/api/fix-counter-system` with `"action": "initialize"`
3. **Test Functionality**: Create test bookings and verify counters increment
4. **Verify Reset Logic**: Check that counters reset properly at scheduled times
5. **Monitor Dashboard**: Ensure dashboard shows correct values from blob storage and database
