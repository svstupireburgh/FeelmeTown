import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// GET /api/admin/manual-bookings - Get all manual bookings
export async function GET() {
  try {
    const result = await database.getAllManualBookings();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        manualBookings: result.manualBookings,
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
        error: 'Failed to fetch manual bookings' 
      },
      { status: 500 }
    );
  }
}
