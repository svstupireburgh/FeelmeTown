import { NextResponse } from 'next/server';

// GET /api/test-auto-complete - Manually trigger auto-complete check
export async function GET() {
  try {
    return NextResponse.json(
      {
        success: false,
        message: 'Disabled. Auto-complete expired bookings is turned off.',
      },
      { status: 410 },
    );

    const isProd = process.env.NODE_ENV === 'production';
    const isVercel = Boolean(process.env.VERCEL);
    if (isProd && isVercel) {
      return NextResponse.json(
        { success: false, error: 'Disabled in production' },
        { status: 410 }
      );
    }

    console.log('🧪 TEST: Manually triggering auto-complete check...');
    
    // Call the auto-complete-expired API
    const response = await fetch('http://localhost:3000/api/bookings/auto-complete-expired', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    console.log('🧪 TEST: Auto-complete result:', result);
    
    return NextResponse.json({
      success: true,
      message: 'Auto-complete check triggered',
      result
    });
  } catch (error) {
    console.error('❌ TEST: Error triggering auto-complete:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
