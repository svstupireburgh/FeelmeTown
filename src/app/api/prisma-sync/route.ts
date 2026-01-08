import { NextRequest, NextResponse } from 'next/server';

// POST /api/prisma-sync - Fast Prisma-based sync to GoDaddy SQL
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action = 'sync' } = body;
    
    console.log(`🚀 Prisma sync requested: ${action}`);
    
    const results: any = {
      timestamp: new Date().toISOString(),
      action: action,
      steps: []
    };
    
    // Dynamic import to handle Prisma client
    let PrismaGoDaddyService;
    try {
      const prismaModule = await import('@/lib/prisma-godaddy');
      PrismaGoDaddyService = prismaModule.default;
      results.steps.push('✅ Prisma service loaded');
    } catch (error) {
      results.steps.push('❌ Failed to load Prisma service - make sure to run "npx prisma generate" first');
      return NextResponse.json({
        success: false,
        message: 'Prisma client not generated. Run "npx prisma generate" first.',
        results: results
      }, { status: 500 });
    }
    
    if (action === 'test') {
      // Test Prisma connection
      results.steps.push('🔍 Testing Prisma database connection...');
      const connectionTest = await PrismaGoDaddyService.testConnection();
      results.connectionTest = connectionTest;
      
      if (connectionTest.success) {
        results.steps.push('✅ Prisma database connection successful');
      } else {
        results.steps.push(`❌ Prisma connection failed: ${connectionTest.error}`);
      }
      
      return NextResponse.json({
        success: connectionTest.success,
        message: connectionTest.success ? 'Prisma connection test successful' : 'Prisma connection failed',
        results: results
      });
    }
    
    if (action === 'sync') {
      // Step 1: Test connection
      results.steps.push('🔍 Testing Prisma database connection...');
      const connectionTest = await PrismaGoDaddyService.testConnection();
      results.connectionTest = connectionTest;
      
      if (!connectionTest.success) {
        results.steps.push(`❌ Database connection failed: ${connectionTest.error}`);
        return NextResponse.json({
          success: false,
          message: 'Database connection failed',
          results: results
        }, { status: 500 });
      }
      
      results.steps.push('✅ Database connection successful');
      
      // Step 2: Fast bulk sync
      results.steps.push('🚀 Starting fast Prisma bulk sync...');
      const syncResult = await PrismaGoDaddyService.bulkSyncJSONData();
      results.syncResult = syncResult;
      
      if (syncResult.success && syncResult.results) {
        results.steps.push('✅ Fast bulk sync completed');
        results.steps.push(`📊 Cancelled bookings synced: ${syncResult.results.cancelledBookings.synced}`);
        results.steps.push(`📊 Completed bookings synced: ${syncResult.results.completedBookings.synced}`);
        
        if (syncResult.results.cancelledBookings.errors > 0) {
          results.steps.push(`⚠️ Cancelled bookings errors: ${syncResult.results.cancelledBookings.errors}`);
        }
        
        if (syncResult.results.completedBookings.errors > 0) {
          results.steps.push(`⚠️ Completed bookings errors: ${syncResult.results.completedBookings.errors}`);
        }
      } else {
        results.steps.push(`❌ Sync failed: ${syncResult.error}`);
        return NextResponse.json({
          success: false,
          message: 'Fast sync failed',
          results: results
        }, { status: 500 });
      }
      
      // Step 3: Get fast statistics
      results.steps.push('⚡ Getting fast booking statistics...');
      const statsResult = await PrismaGoDaddyService.getFastBookingStats();
      results.statsResult = statsResult;
      
      if (statsResult.success) {
        results.steps.push('✅ Fast statistics retrieved');
        results.finalStats = statsResult.stats;
      } else {
        results.steps.push(`⚠️ Failed to get statistics: ${statsResult.error}`);
      }
    }
    
    if (action === 'stats') {
      // Just get fast statistics
      results.steps.push('⚡ Getting fast booking statistics...');
      const statsResult = await PrismaGoDaddyService.getFastBookingStats();
      results.statsResult = statsResult;
      
      if (statsResult.success) {
        results.steps.push('✅ Fast statistics retrieved');
        results.finalStats = statsResult.stats;
      } else {
        results.steps.push(`❌ Failed to get statistics: ${statsResult.error}`);
        return NextResponse.json({
          success: false,
          message: 'Failed to get statistics',
          results: results
        }, { status: 500 });
      }
    }
    
    if (action === 'search') {
      // Search bookings
      const { query, type } = body;
      if (!query) {
        return NextResponse.json({
          success: false,
          message: 'Search query is required'
        }, { status: 400 });
      }
      
      results.steps.push(`🔍 Searching bookings for: ${query}`);
      const searchResult = await PrismaGoDaddyService.searchBookings(query, type);
      results.searchResult = searchResult;
      
      if (searchResult.success) {
        results.steps.push('✅ Search completed');
        results.searchResults = searchResult.results;
      } else {
        results.steps.push(`❌ Search failed: ${searchResult.error}`);
        return NextResponse.json({
          success: false,
          message: 'Search failed',
          results: results
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Prisma operation completed successfully',
      results: results
    });
    
  } catch (error) {
    console.error('❌ Prisma sync failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Prisma sync failed'
    }, { status: 500 });
  }
}

// GET /api/prisma-sync - Get Prisma sync status and fast statistics
export async function GET() {
  try {
    console.log('⚡ Getting Prisma fast statistics...');
    
    const results: any = {
      timestamp: new Date().toISOString(),
      steps: []
    };
    
    // Dynamic import to handle Prisma client
    let PrismaGoDaddyService;
    try {
      const prismaModule = await import('@/lib/prisma-godaddy');
      PrismaGoDaddyService = prismaModule.default;
      results.steps.push('✅ Prisma service loaded');
    } catch (error) {
      results.steps.push('❌ Prisma service not available - run "npx prisma generate" first');
      return NextResponse.json({
        success: false,
        message: 'Prisma client not generated',
        results: results
      }, { status: 500 });
    }
    
    // Test connection
    results.steps.push('🔍 Testing database connection...');
    const connectionTest = await PrismaGoDaddyService.testConnection();
    results.connectionTest = connectionTest;
    
    if (connectionTest.success) {
      results.steps.push('✅ Database connection working');
      
      // Get fast statistics
      results.steps.push('⚡ Getting fast statistics...');
      const statsResult = await PrismaGoDaddyService.getFastBookingStats();
      results.statsResult = statsResult;
      
      if (statsResult.success) {
        results.steps.push('✅ Fast statistics retrieved');
        results.stats = statsResult.stats;
      } else {
        results.steps.push(`❌ Failed to get statistics: ${statsResult.error}`);
      }
    } else {
      results.steps.push(`❌ Database connection failed: ${connectionTest.error}`);
    }
    
    return NextResponse.json({
      success: connectionTest.success,
      message: connectionTest.success ? 'Prisma status retrieved' : 'Database connection failed',
      results: results
    });
    
  } catch (error) {
    console.error('❌ Failed to get Prisma status:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
