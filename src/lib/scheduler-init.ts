// Auto-start scheduler on server initialization
let schedulerInitialized = false;
let cleanupInterval: NodeJS.Timeout | null = null;

export async function initializeScheduler() {
  return;
  if (schedulerInitialized) {
    console.log('⚠️ Scheduler already initialized');
    return;
  }

  console.log('🚀 Initializing auto-cleanup scheduler...');
  schedulerInitialized = true;

  // Import the auto-complete handler
  const performCleanup = async () => {
    try {
      console.log('🔄 Auto-cleanup: Checking for expired bookings...');
      
      // Call the auto-complete-expired API
      const response = await fetch('http://localhost:3000/api/bookings/auto-complete-expired', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Auto-cleanup: Completed ${result.completedCount} expired bookings`);
        if (result.completedCount > 0) {
          console.log('📋 Expired bookings:', result.expiredBookings);
        }
      } else {
        console.error('❌ Auto-cleanup: Failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Auto-cleanup: Error:', error);
    }
  };

  // Run immediately on start
  performCleanup().then(() => {
    console.log('✅ Initial cleanup check completed');
  }).catch(err => {
    console.error('❌ Initial cleanup check failed:', err);
  });

  // Then run every 5 minutes
  cleanupInterval = setInterval(async () => {
    console.log('⏰ Running scheduled cleanup...');
    await performCleanup();
  }, 300000); // 5 minutes = 300000ms

  console.log('✅ Auto-cleanup scheduler started (runs every 5 minutes)');
}

// Auto-initialize when module is imported
// Disabled: use Vercel Cron (/api/cron/cleanup) as the only scheduler.
