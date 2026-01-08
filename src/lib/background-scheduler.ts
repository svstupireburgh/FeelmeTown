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
      console.log('⏰ [CRON] Running automatic cleanup at:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
      
      const response = await fetch('http://localhost:3000/api/cron/cleanup');
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ [CRON] Cleanup completed successfully');
        if (result.result?.completedCount > 0) {
          console.log(`📋 [CRON] Completed ${result.result.completedCount} expired bookings`);
        }
      } else {
        console.error('❌ [CRON] Cleanup failed:', result.error);
      }
    } catch (error) {
      console.error('❌ [CRON] Error during cleanup:', error);
    }
  });

  console.log('✅ Background scheduler started successfully');
  console.log('📅 Schedule: Every 5 minutes (*/5 * * * *)');
  console.log('⏰ Next run: In 5 minutes');
}

// Auto-start on server (not in browser)
// Disabled: use Vercel Cron (/api/cron/cleanup) as the only scheduler.
