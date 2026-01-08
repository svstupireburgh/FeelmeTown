import { NextRequest, NextResponse } from 'next/server';
import { resetAllCounters, getAllCounters } from '@/lib/counter-system';

// POST /api/admin/reset-all-counters - Reset ALL counters (both JSON and database)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { confirmReset = false } = body;
    
    console.log('🔄 Admin reset ALL counters requested...');
    
    if (!confirmReset) {
      return NextResponse.json({
        success: false,
        error: 'Confirmation required',
        message: 'This will reset ALL counters including database totals. Set confirmReset=true to proceed.'
      }, { status: 400 });
    }
    
    // Reset ALL counters (both JSON and database)
    await resetAllCounters();
    console.log('✅ ALL counters reset by admin');
    
    // Get updated counters to show result
    const updatedCountersResult = await getAllCounters();
    
    return NextResponse.json({
      success: true,
      message: 'ALL counters (time-based AND database totals) have been reset to 0',
      counters: updatedCountersResult.counters,
      resetType: 'all-counters',
      note: 'This reset affected both JSON time-based counters and database total counters'
    });
  } catch (error) {
    console.error('❌ Reset ALL counters error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to reset all counters',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
