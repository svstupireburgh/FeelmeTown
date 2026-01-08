import { NextResponse } from 'next/server';
import { db } from '@/lib/mock-db';

// GET /api/theaters - Get all theaters
export async function GET() {
  try {
    const theaters = db.getTheaters();
    
    return NextResponse.json({
      success: true,
      theaters: theaters,
      total: theaters.length
    });

  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch theaters' 
      },
      { status: 500 }
    );
  }
}

