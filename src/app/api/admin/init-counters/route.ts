import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// POST /api/admin/init-counters - Initialize counter system
export async function POST() {
  try {
    
    
    // Initialize counters
    const initResult = await database.initializeCounters();
    
    if (!initResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to initialize counters' 
        },
        { status: 500 }
      );
    }
    
    // Check and reset counters
    await database.checkAndResetCounters();
    
    // Get current counter values
    const countersResult = await database.getAllCounters();
    
    return NextResponse.json({
      success: true,
      message: 'Counter system initialized successfully',
      counters: countersResult.counters || {}
    });
    
  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to initialize counter system' 
      },
      { status: 500 }
    );
  }
}

// GET /api/admin/init-counters - Get current counter values
export async function GET() {
  try {
    // Get current counter values
    const countersResult = await database.getAllCounters();
    
    if (!countersResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to get counters' 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      counters: countersResult.counters || {}
    });
    
  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get counter values' 
      },
      { status: 500 }
    );
  }
}

