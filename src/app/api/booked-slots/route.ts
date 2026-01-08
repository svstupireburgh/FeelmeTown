import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

const normalizeStatus = (value: unknown) =>
  String(value || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, '')
    .trim();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const theaterName = searchParams.get('theater');

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    // Use optimized function to get only bookings for specific date and theater
    const result = await (database as any).getBookingsByDateAndTheater(date, theaterName || undefined);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch bookings' },
        { status: 500 }
      );
    }

    const allBookings = result.bookings || [];
    
    // Also get incomplete bookings for the same date (optimized query)
    const incompleteResult = await (database as any).getIncompleteBookingsByDateAndTheater(date, theaterName || undefined);
    const incompleteBookings = incompleteResult.success ? incompleteResult.incompleteBookings || [] : [];

    // Combine bookings (main + incomplete)
    const combinedBookings = [...allBookings, ...incompleteBookings];

    const allowedStatuses = new Set(['completed', 'pending', 'manual', 'confirmed']);

    // Filter by status
    const bookedSlots = combinedBookings.filter((booking) => {
      const bookingData = booking as Record<string, unknown>;
      const status = normalizeStatus(bookingData.status);
      return allowedStatuses.has(status);
    });

    // Extract time slots from booked slots
    const bookedTimeSlots = bookedSlots.map((booking) => (booking as Record<string, unknown>).time);

    return NextResponse.json({
      success: true,
      bookedTimeSlots,
      totalBookings: bookedSlots.length
    });

  } catch (error) {
    console.error('❌ Error in booked-slots API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch booked slots' },
      { status: 500 }
    );
  }
}

