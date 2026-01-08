import { NextRequest, NextResponse } from 'next/server';
import GoDaddySQL from '@/lib/godaddy-sql';

// POST /api/sync-to-godaddy - Sync JSON data to GoDaddy SQL database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action = 'sync', createTables = false } = body;
    
    console.log(`🔄 GoDaddy SQL sync requested: ${action}`);
    
    const results: any = {
      timestamp: new Date().toISOString(),
      action: action,
      steps: []
    };
    
    // Step 1: Test database connection
    results.steps.push('🔍 Testing GoDaddy SQL database connection...');
    const connectionTest = await GoDaddySQL.testConnection();
    results.connectionTest = connectionTest;
    
    if (!connectionTest.success) {
      results.steps.push(`❌ Database connection failed: ${connectionTest.error}`);
      return NextResponse.json({
        success: false,
        message: 'GoDaddy SQL database connection failed',
        results: results
      }, { status: 500 });
    }
    
    results.steps.push('✅ Database connection successful');
    
    // Step 2: Create tables if requested
    if (createTables) {
      results.steps.push('🔧 Creating database tables...');
      const tablesResult = await GoDaddySQL.createTables();
      results.tablesResult = tablesResult;
      
      if (tablesResult.success) {
        results.steps.push('✅ Database tables created/verified');
      } else {
        results.steps.push(`❌ Failed to create tables: ${tablesResult.error}`);
        return NextResponse.json({
          success: false,
          message: 'Failed to create database tables',
          results: results
        }, { status: 500 });
      }
    }
    
    if (action === 'test') {
      // Just test connection and return
      results.steps.push('✅ Connection test completed');
      return NextResponse.json({
        success: true,
        message: 'GoDaddy SQL database connection test successful',
        results: results
      });
    }
    
    if (action === 'sync') {
      // Step 3: Sync JSON data to SQL
      results.steps.push('📊 Syncing JSON data to GoDaddy SQL database...');
      const syncResult = await GoDaddySQL.syncJSONToSQL();
      results.syncResult = syncResult;
      
      if (syncResult.success && syncResult.results) {
        results.steps.push('✅ JSON data synced successfully');
        results.steps.push(`📊 Cancelled bookings synced: ${syncResult.results.cancelledBookings.synced}`);
        results.steps.push(`📊 Completed bookings synced: ${syncResult.results.completedBookings.synced}`);
        
        if (syncResult.results.cancelledBookings.errors > 0) {
          results.steps.push(`⚠️ Cancelled bookings errors: ${syncResult.results.cancelledBookings.errors}`);
        }
        
        if (syncResult.results.completedBookings.errors > 0) {
          results.steps.push(`⚠️ Completed bookings errors: ${syncResult.results.completedBookings.errors}`);
        }
      } else {
        const errorMessage = (syncResult as any)?.error || 'Unknown error';
        results.steps.push(`❌ Sync failed: ${errorMessage}`);
        return NextResponse.json({
          success: false,
          message: 'Failed to sync JSON data to GoDaddy SQL',
          results: results
        }, { status: 500 });
      }
      
      // Step 4: Get updated statistics
      results.steps.push('📈 Getting updated booking statistics...');
      const statsResult = await GoDaddySQL.getBookingStats();
      results.statsResult = statsResult;
      
      if (statsResult.success) {
        results.steps.push('✅ Statistics retrieved successfully');
        results.finalStats = statsResult.stats;
      } else {
        results.steps.push(`⚠️ Failed to get statistics: ${statsResult.error}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'GoDaddy SQL sync completed successfully',
      results: results
    });
    
  } catch (error) {
    console.error('❌ GoDaddy SQL sync failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'GoDaddy SQL sync failed'
    }, { status: 500 });
  }
}

// GET /api/sync-to-godaddy - Get sync status and statistics
export async function GET() {
  try {
    console.log('📊 Getting GoDaddy SQL sync status...');
    
    const results: any = {
      timestamp: new Date().toISOString(),
      steps: []
    };
    
    // Test connection
    results.steps.push('🔍 Testing database connection...');
    const connectionTest = await GoDaddySQL.testConnection();
    results.connectionTest = connectionTest;
    
    if (connectionTest.success) {
      results.steps.push('✅ Database connection working');
      
      // Get statistics
      results.steps.push('📈 Getting booking statistics...');
      const statsResult = await GoDaddySQL.getBookingStats();
      results.statsResult = statsResult;
      
      if (statsResult.success) {
        results.steps.push('✅ Statistics retrieved');
        results.stats = statsResult.stats;
      } else {
        results.steps.push(`❌ Failed to get statistics: ${statsResult.error}`);
      }
    } else {
      results.steps.push(`❌ Database connection failed: ${connectionTest.error}`);
    }
    
    return NextResponse.json({
      success: connectionTest.success,
      message: connectionTest.success ? 'GoDaddy SQL status retrieved' : 'Database connection failed',
      results: results
    });
    
  } catch (error) {
    console.error('❌ Failed to get GoDaddy SQL status:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
