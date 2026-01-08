import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// GET /api/booking/[id]/decompress - Get full decompressed booking data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Get the booking with full decompressed data
    const result = await database.getBookingById(id);
    
    if (result.success && result.booking) {
      return NextResponse.json({
        success: true,
        booking: result.booking,
        message: 'Full booking data retrieved successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'Booking not found' },
        { status: 404 }
      );
    }

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve booking data' 
      },
      { status: 500 }
    );
  }
}
