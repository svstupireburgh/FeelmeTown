import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// GET /api/admin/bookings - Get all regular bookings
export async function GET() {
  try {
    const result = await database.getAllBookings();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        bookings: result.bookings,
        total: result.total,
        database: result.database,
        collection: result.collection
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch bookings' 
      },
      { status: 500 }
    );
  }
}
