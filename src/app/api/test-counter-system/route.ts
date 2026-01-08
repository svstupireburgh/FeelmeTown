import { NextRequest, NextResponse } from 'next/server';
import { getAllCounters, incrementCounter, getTimeBasedCounters } from '@/lib/counter-system';
import { ExportsStorage } from '@/lib/exports-storage';

export async function GET() {
  try {
    console.log('🧪 Testing counter system...');
    
    // Check if counters.json exists in blob storage
    let countersJson = null;
    try {
      countersJson = await ExportsStorage.readRaw('counters.json');
      console.log('📄 counters.json exists:', !!countersJson);
    } catch (error) {
      console.log('📄 counters.json does not exist or error reading:', error);
    }
    
    // Get time-based counters directly
    const timeBasedCounters = await getTimeBasedCounters();
    console.log('⏰ Time-based counters:', timeBasedCounters);
    
    // Get all counters (combined)
    const allCountersResult = await getAllCounters();
    console.log('📊 All counters result:', allCountersResult);
    
    return NextResponse.json({
      success: true,
      message: 'Counter system test completed',
      results: {
        countersJsonExists: !!countersJson,
        countersJsonContent: countersJson,
        timeBasedCounters: timeBasedCounters,
        allCountersResult: allCountersResult,
        currentTime: new Date().toISOString(),
        istTime: new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
      }
    });
  } catch (error) {
    console.error('❌ Counter system test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    console.log('🧪 Testing counter increment...');
    
    // Test incrementing a confirmed booking counter
    await incrementCounter('confirmed');
    console.log('✅ Incremented confirmed counter');
    
    // Get updated counters
    const updatedCounters = await getAllCounters();
    
    return NextResponse.json({
      success: true,
      message: 'Counter increment test completed',
      updatedCounters: updatedCounters
    });
  } catch (error) {
    console.error('❌ Counter increment test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
