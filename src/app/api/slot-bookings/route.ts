import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// GET /api/slot-bookings - Get bookings for a specific time slot
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const theater = searchParams.get('theater');
    const timeSlot = searchParams.get('timeSlot');

    if (!date || !theater || !timeSlot) {
      return NextResponse.json(
        { success: false, error: 'Date, theater, and timeSlot parameters are required' },
        { status: 400 }
      );
    }

    

    // Get all bookings from main booking collection
    const result = await database.getAllBookings();
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch bookings' },
        { status: 500 }
      );
    }

    const allBookings = result.bookings || [];
    
    // Also get manual bookings
    const manualResult = await database.getAllManualBookings();
    const manualBookings = manualResult.success ? manualResult.manualBookings || [] : [];

    // Combine all bookings
    const combinedBookings = [...allBookings, ...manualBookings];

    // Filter bookings for the specific date, theater, and time slot
    const slotBookings = combinedBookings.filter((booking) => {
      const bookingData = booking as Record<string, unknown>;
      const matchesDate = bookingData.date === date;
      const matchesTime = bookingData.time === timeSlot;
      const matchesTheater = bookingData.theaterName === theater || 
                            bookingData.theater === theater ||
                            (bookingData.theaterName && theater && 
                             bookingData.theaterName.toString().includes(theater.split(' ')[0]));
      const isActiveBooking = ['confirmed', 'pending', 'completed', 'manual'].includes(bookingData.status as string);
      
      
      
      return matchesDate && matchesTime && matchesTheater && isActiveBooking;
    });

    

    return NextResponse.json({
      success: true,
      bookings: slotBookings,
      total: slotBookings.length,
      filters: {
        date,
        theater,
        timeSlot
      }
    });

  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch slot bookings' },
      { status: 500 }
    );
  }
}

