import { NextRequest, NextResponse } from 'next/server';
import { getAllCounters, getTimeBasedCounters, incrementCounter } from '@/lib/counter-system';
import { ExportsStorage } from '@/lib/exports-storage';

export async function GET() {
  try {
    console.log('🔍 DEBUG: Checking counter system...');
    
    const results: any = {
      timestamp: new Date().toISOString(),
      istTime: new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
      tests: []
    };
    
    // Test 1: Check if counters.json exists in blob storage
    results.tests.push('📄 Testing counters.json in blob storage...');
    try {
      const countersJson = await ExportsStorage.readRaw('counters.json');
      results.countersJsonExists = !!countersJson;
      results.countersJsonContent = countersJson;
      if (countersJson) {
        results.tests.push('✅ counters.json found in blob storage');
        results.tests.push(`📊 Today confirmed: ${countersJson.confirmed?.today || 0}`);
        results.tests.push(`📊 Week confirmed: ${countersJson.confirmed?.week || 0}`);
        results.tests.push(`📊 Month confirmed: ${countersJson.confirmed?.month || 0}`);
        results.tests.push(`📊 Year confirmed: ${countersJson.confirmed?.year || 0}`);
      } else {
        results.tests.push('❌ counters.json NOT found in blob storage');
      }
    } catch (error) {
      results.countersJsonExists = false;
      results.countersJsonError = error instanceof Error ? error.message : 'Unknown error';
      results.tests.push(`❌ Error reading counters.json: ${results.countersJsonError}`);
    }
    
    // Test 2: Check getTimeBasedCounters function
    results.tests.push('⏰ Testing getTimeBasedCounters function...');
    try {
      const timeBasedCounters = await getTimeBasedCounters();
      results.timeBasedCounters = timeBasedCounters;
      results.tests.push('✅ getTimeBasedCounters working');
      results.tests.push(`📊 Confirmed today from function: ${timeBasedCounters.confirmed?.today || 0}`);
    } catch (error) {
      results.timeBasedCountersError = error instanceof Error ? error.message : 'Unknown error';
      results.tests.push(`❌ getTimeBasedCounters error: ${results.timeBasedCountersError}`);
    }
    
    // Test 3: Check getAllCounters function
    results.tests.push('📊 Testing getAllCounters function...');
    try {
      const allCountersResult = await getAllCounters();
      results.allCountersResult = allCountersResult;
      if (allCountersResult.success && allCountersResult.counters) {
        results.tests.push('✅ getAllCounters working');
        const counters = allCountersResult.counters;
        results.tests.push(`📊 Confirmed: today=${counters.confirmed?.today || 0}, week=${counters.confirmed?.week || 0}, month=${counters.confirmed?.month || 0}, year=${counters.confirmed?.year || 0}, total=${counters.confirmed?.total || 0}`);
        results.tests.push(`📊 Manual: today=${counters.manual?.today || 0}, week=${counters.manual?.week || 0}, month=${counters.manual?.month || 0}, year=${counters.manual?.year || 0}, total=${counters.manual?.total || 0}`);
      } else {
        results.tests.push(`❌ getAllCounters failed: ${allCountersResult.error || 'No counters returned'}`);
      }
    } catch (error) {
      results.allCountersError = error instanceof Error ? error.message : 'Unknown error';
      results.tests.push(`❌ getAllCounters error: ${results.allCountersError}`);
    }
    
    // Test 4: Check if blob storage is working at all
    results.tests.push('🔧 Testing blob storage write/read...');
    try {
      const testData = { test: true, timestamp: new Date().toISOString() };
      await ExportsStorage.writeRaw('test-debug.json', testData);
      const readBack = await ExportsStorage.readRaw('test-debug.json');
      if (readBack && readBack.test) {
        results.tests.push('✅ Blob storage read/write working');
        results.blobStorageWorking = true;
      } else {
        results.tests.push('❌ Blob storage read/write failed');
        results.blobStorageWorking = false;
      }
    } catch (error) {
      results.blobStorageWorking = false;
      results.blobStorageError = error instanceof Error ? error.message : 'Unknown error';
      results.tests.push(`❌ Blob storage error: ${results.blobStorageError}`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Counter system debug completed',
      results: results
    });
  } catch (error) {
    console.error('❌ Debug counters failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    console.log('🧪 DEBUG: Testing counter increment...');
    
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: []
    };
    
    // Get initial state
    results.tests.push('📊 Getting initial counter state...');
    const initialCounters = await getAllCounters();
    results.initialCounters = initialCounters.counters;
    
    // Test increment
    results.tests.push('⬆️ Testing increment confirmed counter...');
    await incrementCounter('confirmed');
    results.tests.push('✅ Increment completed');
    
    // Get final state
    results.tests.push('📊 Getting final counter state...');
    const finalCounters = await getAllCounters();
    results.finalCounters = finalCounters.counters;
    
    // Compare
    const initialToday = initialCounters.counters?.confirmed?.today || 0;
    const finalToday = finalCounters.counters?.confirmed?.today || 0;
    const difference = finalToday - initialToday;
    
    results.tests.push(`📊 Initial confirmed today: ${initialToday}`);
    results.tests.push(`📊 Final confirmed today: ${finalToday}`);
    results.tests.push(`📊 Difference: ${difference}`);
    
    if (difference === 1) {
      results.tests.push('✅ Counter increment working correctly!');
      results.incrementWorking = true;
    } else {
      results.tests.push('❌ Counter increment not working properly');
      results.incrementWorking = false;
    }
    
    return NextResponse.json({
      success: true,
      message: 'Counter increment test completed',
      results: results
    });
  } catch (error) {
    console.error('❌ Debug increment failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
