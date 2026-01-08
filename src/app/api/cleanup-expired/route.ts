import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';
import { ExportsStorage } from '@/lib/exports-storage';

export async function POST(request: NextRequest) {
  try {
    
    
    // Connect to database
    const db = await database;
    if (!db) {
      throw new Error('Database connection failed');
    }

    // Get current time in IST
    const currentTime = new Date();
    const currentTimeIST = new Date(currentTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    
    

    // Find expired bookings from main booking collection
    const expiredBookingsResult = await database.getAllBookings();
    const expiredBookings = expiredBookingsResult.bookings?.filter(booking => 
      booking.expiredAt && new Date(booking.expiredAt) < currentTimeIST
    ) || [];

    

    // Find expired bookings from incomplete booking collection
    const expiredIncompleteBookingsResult = await database.getAllIncompleteBookings();
    const expiredIncompleteBookings = expiredIncompleteBookingsResult.incompleteBookings?.filter(booking => 
      booking.expiredAt && new Date(booking.expiredAt) < currentTimeIST
    ) || [];

    

    // Save expired bookings to JSON file then delete
    let deletedMainCount = 0;
    for (const booking of expiredBookings) {
      // Save to completed JSON file before deleting
      try {
        // Add new completed booking
        const record = {
          bookingId: booking.bookingId || booking.id,
          name: booking.name,
          email: booking.email,
          phone: booking.phone,
          theaterName: booking.theaterName,
          date: booking.date,
          time: booking.time,
          occasion: booking.occasion,
          numberOfPeople: booking.numberOfPeople,
          advancePayment: booking.advancePayment,
          venuePayment: booking.venuePayment,
          totalAmount: booking.totalAmount,
          status: 'completed',
          completedAt: new Date().toISOString()
        };
        await ExportsStorage.appendToArray('completed-bookings.json', record);
      } catch (err) {
        console.error('❌ Failed to save to JSON (Blob-backed):', err);
      }
      
      // Delete booking from database
      const deleteResult = await database.deleteBooking(booking.bookingId || booking.id);
      if (deleteResult.success) {
        console.log(`✅ Expired booking ${booking.bookingId} saved to JSON and deleted`);
        deletedMainCount++;
      }
    }
    

    // Delete expired bookings from incomplete collection
    let deletedIncompleteCount = 0;
    for (const booking of expiredIncompleteBookings) {
      const deleteResult = await database.deleteIncompleteBooking(booking.bookingId || booking.id);
      if (deleteResult.success) {
        deletedIncompleteCount++;
      }
    }
    

    const totalDeleted = deletedMainCount + deletedIncompleteCount;
    const totalExpired = expiredBookings.length + expiredIncompleteBookings.length;

    // Get remaining bookings count
    const remainingMainBookingsResult = await database.getAllBookings();
    const remainingIncompleteBookingsResult = await database.getAllIncompleteBookings();
    const totalRemaining = (remainingMainBookingsResult.bookings?.length || 0) + (remainingIncompleteBookingsResult.incompleteBookings?.length || 0);

    
    

    return NextResponse.json({
      success: true,
      totalBookings: totalExpired,
      deletedCount: totalDeleted,
      remainingBookings: totalRemaining,
      deletedMainCount,
      deletedIncompleteCount,
      expiredBookings: [...expiredBookings, ...expiredIncompleteBookings].map(booking => ({
        name: booking.name,
        theaterName: booking.theaterName,
        date: booking.date,
        time: booking.time,
        expiredAt: booking.expiredAt
      }))
    });

  } catch (error) {
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

