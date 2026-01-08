import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// POST /api/update-booking-status - Update booking status to completed
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId } = body;
    
    if (!bookingId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing booking ID' 
        },
        { status: 400 }
      );
    }

    // Update booking status to completed
    const updateData = {
      status: 'completed'
    };

    const result = await database.updateBooking(bookingId, updateData);

    if (result.success) {
      
      return NextResponse.json({
        success: true,
        message: 'Booking status updated successfully',
        bookingId: bookingId,
        status: 'completed'
      }, { status: 200 });
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update booking status. Please try again.' 
      },
      { status: 500 }
    );
  }
}

