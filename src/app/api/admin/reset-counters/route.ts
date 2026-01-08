import { NextRequest, NextResponse } from 'next/server';
import { resetTimeBasedCounters, getAllCounters } from '@/lib/counter-system';

// POST /api/admin/reset-counters - Reset only time-based counters (JSON), preserve database totals
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resetAll = true } = body; // Default to true for admin reset
    
    console.log('🔄 Admin reset counters requested...');
    
    if (resetAll) {
      // Reset only time-based counters (JSON) - NOT database totals
      await resetTimeBasedCounters();
      console.log('✅ Time-based counters reset by admin');
      
      // Get updated counters to show result
      const updatedCountersResult = await getAllCounters();
      
      return NextResponse.json({
        success: true,
        message: 'Time-based counters (Today/Week/Month/Year) reset to 0. Total counters preserved in database!',
        counters: updatedCountersResult.counters,
        resetType: 'time-based-only',
        note: 'Database total counters were NOT affected by this reset'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Only manual reset (resetAll=true) is supported for admin reset',
        message: 'Use resetAll=true to reset time-based counters only'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ Reset counters error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to reset time-based counters',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

