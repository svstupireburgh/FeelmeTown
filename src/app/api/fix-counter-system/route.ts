import { NextRequest, NextResponse } from 'next/server';
import { getAllCounters, resetTimeBasedCounters, incrementCounter, getTotalCounters } from '@/lib/counter-system';
import { ExportsStorage } from '@/lib/exports-storage';
import database from '@/lib/db-connect';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action = 'diagnose' } = body;
    
    console.log(`🔧 Counter system fix requested: ${action}`);
    
    if (action === 'diagnose') {
      // Comprehensive diagnosis
      const results: any = {
        timestamp: new Date().toISOString(),
        istTime: new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
        steps: []
      };
      
      // Step 1: Check blob storage connection
      results.steps.push('🔍 Checking blob storage connection...');
      try {
        const testWrite = await ExportsStorage.writeRaw('test-counter-connection.json', { test: true, timestamp: new Date().toISOString() });
        const testRead = await ExportsStorage.readRaw('test-counter-connection.json');
        results.blobStorageWorking = !!testRead;
        results.steps.push('✅ Blob storage working');
      } catch (error) {
        results.blobStorageWorking = false;
        results.blobStorageError = error instanceof Error ? error.message : 'Unknown error';
        results.steps.push('❌ Blob storage error: ' + results.blobStorageError);
      }
      
      // Step 2: Check database connection
      results.steps.push('🔍 Checking database connection...');
      try {
        const dbConnection = await database.connect();
        results.databaseWorking = dbConnection.success;
        results.databaseStats = dbConnection;
        results.steps.push('✅ Database working');
      } catch (error) {
        results.databaseWorking = false;
        results.databaseError = error instanceof Error ? error.message : 'Unknown error';
        results.steps.push('❌ Database error: ' + results.databaseError);
      }
      
      // Step 3: Check counters.json
      results.steps.push('🔍 Checking counters.json in blob storage...');
      try {
        const countersJson = await ExportsStorage.readRaw('counters.json');
        results.countersJsonExists = !!countersJson;
        results.countersJsonContent = countersJson;
        results.steps.push('✅ counters.json found');
      } catch (error) {
        results.countersJsonExists = false;
        results.countersJsonError = error instanceof Error ? error.message : 'Unknown error';
        results.steps.push('❌ counters.json not found or error reading');
      }
      
      // Step 4: Check database settings
      results.steps.push('🔍 Checking database settings for total counters...');
      try {
        const settings = await database.getSystemSettings();
        results.settingsWorking = settings.success;
        results.totalCountersInDb = {
          totalConfirmedBookings: settings.settings?.totalConfirmedBookings || 0,
          totalManualBookings: settings.settings?.totalManualBookings || 0,
          totalCompletedBookings: settings.settings?.totalCompletedBookings || 0,
          totalCancelledBookings: settings.settings?.totalCancelledBookings || 0,
          totalIncompleteBookings: settings.settings?.totalIncompleteBookings || 0
        };
        results.steps.push('✅ Database settings accessible');
      } catch (error) {
        results.settingsWorking = false;
        results.settingsError = error instanceof Error ? error.message : 'Unknown error';
        results.steps.push('❌ Database settings error: ' + results.settingsError);
      }
      
      // Step 5: Test counter system functions
      results.steps.push('🔍 Testing counter system functions...');
      try {
        const allCounters = await getAllCounters();
        results.counterSystemWorking = allCounters.success;
        results.currentCounters = allCounters.counters;
        results.steps.push('✅ Counter system functions working');
      } catch (error) {
        results.counterSystemWorking = false;
        results.counterSystemError = error instanceof Error ? error.message : 'Unknown error';
        results.steps.push('❌ Counter system error: ' + results.counterSystemError);
      }
      
      return NextResponse.json({
        success: true,
        message: 'Counter system diagnosis completed',
        results: results
      });
      
    } else if (action === 'initialize') {
      // Initialize/fix the counter system
      const results: any = {
        timestamp: new Date().toISOString(),
        steps: []
      };
      
      results.steps.push('🔧 Initializing counter system...');
      
      // Reset time-based counters to ensure proper structure
      await resetTimeBasedCounters();
      results.steps.push('✅ Time-based counters initialized');
      
      // Initialize database totals if needed
      const totalCounters = await getTotalCounters();
      results.steps.push('✅ Database total counters initialized');
      
      // Get final state
      const finalCounters = await getAllCounters();
      results.finalCounters = finalCounters;
      results.steps.push('✅ Counter system initialization complete');
      
      return NextResponse.json({
        success: true,
        message: 'Counter system initialized successfully',
        results: results
      });
      
    } else if (action === 'test-increment') {
      // Test incrementing counters
      const results: any = {
        timestamp: new Date().toISOString(),
        steps: []
      };
      
      results.steps.push('🧪 Testing counter increments...');
      
      // Get initial state
      const initialCounters = await getAllCounters();
      results.initialCounters = initialCounters.counters;
      
      // Test increment confirmed
      await incrementCounter('confirmed');
      results.steps.push('✅ Incremented confirmed counter');
      
      // Test increment manual
      await incrementCounter('manual');
      results.steps.push('✅ Incremented manual counter');
      
      // Get final state
      const finalCounters = await getAllCounters();
      results.finalCounters = finalCounters.counters;
      results.steps.push('✅ Counter increment test complete');
      
      return NextResponse.json({
        success: true,
        message: 'Counter increment test completed',
        results: results
      });
      
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action',
        validActions: ['diagnose', 'initialize', 'test-increment']
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('❌ Counter system fix failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}
