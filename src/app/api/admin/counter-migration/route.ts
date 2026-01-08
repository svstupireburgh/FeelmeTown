import { NextResponse } from 'next/server';
import { ExportsStorage } from '@/lib/exports-storage';
import { 
  getTimeBasedCounters, 
  getTotalCounters, 
  saveTotalCounters,
  checkAndResetTimeBasedCounters 
} from '@/lib/counter-system';
import database from '@/lib/db-connect';

// POST /api/admin/counter-migration - Migrate counters to new system
export async function POST() {
  try {
    console.log('🔄 Starting counter migration to new system...');
    
    // Get existing counters from old system
    const oldCountersResult = await database.getAllCounters();
    
    if (oldCountersResult.success && oldCountersResult.counters) {
      const oldCounters = oldCountersResult.counters;
      console.log('📊 Old counters found:', oldCounters);
      
      // Extract total counters for database storage
      const totalCounters = {
        confirmed: oldCounters.confirmed?.total || 0,
        manual: oldCounters.manual?.total || 0,
        completed: oldCounters.completed?.total || 0,
        cancelled: oldCounters.cancelled?.total || 0,
        incomplete: oldCounters.incomplete?.total || 0
      };
      
      // Save total counters to database
      await saveTotalCounters(totalCounters);
      console.log('✅ Total counters saved to database:', totalCounters);
      
      // Initialize time-based counters in JSON
      const timeBasedCounters = await getTimeBasedCounters();
      console.log('✅ Time-based counters initialized in JSON:', timeBasedCounters);
      
      return NextResponse.json({
        success: true,
        message: 'Counter migration completed successfully',
        totalCounters,
        timeBasedCounters,
        migrationDate: new Date().toISOString()
      });
    } else {
      console.log('⚠️ No old counters found, initializing fresh system...');
      
      // Initialize fresh system
      const totalCounters = await getTotalCounters();
      const timeBasedCounters = await getTimeBasedCounters();
      
      return NextResponse.json({
        success: true,
        message: 'Fresh counter system initialized',
        totalCounters,
        timeBasedCounters,
        migrationDate: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('❌ Counter migration failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to migrate counters',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/admin/counter-migration - Check migration status
export async function GET() {
  try {
    // Check if counters.json exists
    const timeBasedCounters = await ExportsStorage.readRaw('counters.json');
    const totalCounters = await getTotalCounters();
    
    return NextResponse.json({
      success: true,
      migrationStatus: {
        timeBasedCountersExists: !!timeBasedCounters,
        totalCountersInDatabase: totalCounters,
        lastCheck: new Date().toISOString()
      },
      counters: {
        timeBased: timeBasedCounters,
        totals: totalCounters
      }
    });
    
  } catch (error) {
    console.error('❌ Migration status check failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check migration status'
    }, { status: 500 });
  }
}
