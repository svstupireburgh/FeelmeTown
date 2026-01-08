# 🎯 AUTOMATIC CLEANUP - COMPLETE SETUP

## ✅ SOLUTION: Node-Cron Background Scheduler

This will run automatically in the background every 5 minutes without any manual intervention.

---

## 📦 Step 1: Install node-cron

```bash
npm install node-cron
npm install --save-dev @types/node-cron
```

---

## 🔧 Step 2: Files Already Created

### 1. API Endpoints (Already Done ✅)
- `/api/admin/auto-complete-expired` - Main cleanup logic
- `/api/cron/cleanup` - Cron-friendly wrapper
- `/api/test-auto-complete` - Manual testing

### 2. Scheduler Files (Need to Create)
- `src/lib/background-scheduler.ts` - Background cron job
- Import in `src/app/layout.tsx` - Auto-start on server

---

## 🚀 Step 3: Implementation

### File 1: `src/lib/background-scheduler.ts`

```typescript
import cron from 'node-cron';

let schedulerStarted = false;

export function startBackgroundScheduler() {
  if (schedulerStarted) {
    console.log('⚠️ Background scheduler already running');
    return;
  }

  console.log('🚀 Starting background cleanup scheduler...');
  schedulerStarted = true;

  // Run every 5 minutes: */5 * * * *
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('⏰ [CRON] Running automatic cleanup...');
      
      const response = await fetch('http://localhost:3000/api/cron/cleanup');
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ [CRON] Cleanup completed successfully');
      } else {
        console.error('❌ [CRON] Cleanup failed:', result.error);
      }
    } catch (error) {
      console.error('❌ [CRON] Error:', error);
    }
  });

  console.log('✅ Background scheduler started (runs every 5 minutes)');
  console.log('📅 Cron pattern: */5 * * * * (every 5 minutes)');
}

// Auto-start on server (not in browser)
if (typeof window === 'undefined') {
  startBackgroundScheduler();
}
```

### File 2: Update `src/app/layout.tsx`

Add this import at the top:
```typescript
// Auto-start background cleanup scheduler
import '@/lib/background-scheduler';
```

---

## ⏰ Cron Schedule Patterns

```
*/5 * * * *  = Every 5 minutes
*/10 * * * * = Every 10 minutes
*/15 * * * * = Every 15 minutes
0 * * * *    = Every hour (at minute 0)
0 */2 * * *  = Every 2 hours
```

**Current:** Every 5 minutes

---

## 🧪 Testing

### Test 1: Check Scheduler Started
```bash
# Start dev server
npm run dev

# Look for in console:
🚀 Starting background cleanup scheduler...
✅ Background scheduler started (runs every 5 minutes)
```

### Test 2: Wait 5 Minutes
```bash
# After 5 minutes, you'll see:
⏰ [CRON] Running automatic cleanup...
🔄 CRON: Auto-cleanup triggered
✅ [CRON] Cleanup completed successfully
```

### Test 3: Create Expired Booking
```
1. Create booking with past time
2. Wait maximum 5 minutes
3. Booking will auto-delete and move to SQL
```

---

## 📊 What Happens Automatically

```
Server Starts
     ↓
Background Scheduler Starts
     ↓
Every 5 Minutes:
     ↓
1. Check all confirmed bookings
2. Find expired ones (End + 5 min)
3. Sync to GoDaddy SQL
4. Delete from MongoDB
5. Increment counter
6. Log results
     ↓
Repeat Forever ♾️
```

---

## 🎯 Your Booking Example

```
bookingId: "FMT-2025-1030-003-516605-95"
time: "9:50 PM - 12:50 AM"
date: "Thursday, October 30, 2025"

Timeline:
- Tonight 9:50 PM: Booking starts
- Tomorrow 12:50 AM: Booking ends
- Tomorrow 12:55 AM: Booking expires (End + 5 min)
- Tomorrow 1:00 AM: Next cron run (auto-deletes)

Status: Will auto-delete tomorrow at 1:00 AM! ✅
```

---

## ✅ Benefits

1. **Fully Automatic**: No manual intervention needed
2. **Background Process**: Runs independently
3. **Reliable**: Node-cron is production-ready
4. **Configurable**: Easy to change schedule
5. **Logged**: All activity logged to console
6. **Persistent**: Runs as long as server is running

---

## 🔧 Production Deployment

### Option A: Keep Node-Cron (Recommended)
- Works on any Node.js server
- No external dependencies
- Runs in your application

### Option B: External Cron (Alternative)
- Use server's cron (Linux/Windows Task Scheduler)
- Call: `curl http://your-domain.com/api/cron/cleanup`
- More reliable for production

---

## 📝 Summary

**Install:**
```bash
npm install node-cron @types/node-cron
```

**Create:**
- `src/lib/background-scheduler.ts` (cron job)

**Import:**
- Add to `src/app/layout.tsx`

**Result:**
- ✅ Automatic cleanup every 5 minutes
- ✅ No manual intervention needed
- ✅ Runs in background forever
- ✅ Logs all activity

**Ab bas install karo aur files create karo - automatic ho jayega!** 🎯✨
