import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing manual booking flow...');
    
    // Create a test manual booking
    const testBookingData = {
      name: 'Test Manual Booking',
      email: 'test@example.com',
      phone: '1234567890',
      theaterName: 'Test Theater',
      date: 'Monday, December 30, 2024',
      time: '9:00 AM - 12:00 PM',
      occasion: 'Birthday',
      numberOfPeople: 4,
      totalAmount: 2000,
      advancePayment: 500,
      venuePayment: 1500,
      selectedMovies: [{ id: 'movie-1', name: 'Test Movie', price: 0, quantity: 1 }],
      selectedCakes: [{ id: 'cake-1', name: 'Chocolate Cake', price: 0, quantity: 1 }],
      selectedDecorItems: [{ id: 'decor-1', name: 'Balloons', price: 0, quantity: 1 }],
      selectedGifts: [{ id: 'gift-1', name: 'Gift Box', price: 0, quantity: 1 }],
      staffId: 'test-staff-001',
      staffName: 'Test Staff',
      notes: 'Test manual booking for flow verification',
      paymentStatus: 'unpaid'
    };
    
    // Save manual booking
    const saveResult = await database.saveManualBooking(testBookingData);
    
    if (saveResult.success) {
      console.log('✅ Test manual booking saved successfully');
      
      // Verify it exists in both collections
      const allBookings = await database.getAllBookings();
      const allManualBookings = await database.getAllManualBookings();
      
      const foundInMain = allBookings.bookings?.find((b: any) => 
        b.bookingId === saveResult.booking?.bookingId || b.name === 'Test Manual Booking'
      );
      
      const foundInManual = allManualBookings.manualBookings?.find((b: any) => 
        b.bookingId === saveResult.booking?.bookingId || b.name === 'Test Manual Booking'
      );
      
      return NextResponse.json({
        success: true,
        message: 'Manual booking flow test completed',
        results: {
          bookingId: saveResult.booking?.bookingId,
          savedToMainCollection: !!foundInMain,
          savedToManualCollection: !!foundInManual,
          mainCollectionStatus: foundInMain?.status,
          manualCollectionStatus: foundInManual?.status,
          isManualBooking: foundInMain?.isManualBooking,
          sourceCollection: foundInMain?.sourceCollection
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to save test manual booking',
        details: saveResult.error
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Manual booking flow test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('🧹 Cleaning up test manual bookings...');
    
    // Get all bookings and find test ones
    const allBookings = await database.getAllBookings();
    const allManualBookings = await database.getAllManualBookings();
    
    let deletedCount = 0;
    
    // Delete from main collection
    for (const booking of allBookings.bookings || []) {
      const doc: any = booking;
      if (doc.name === 'Test Manual Booking') {
        await database.deleteBooking(doc.bookingId);
        deletedCount++;
      }
    }
    
    // Delete from manual collection
    for (const booking of allManualBookings.manualBookings || []) {
      const doc: any = booking;
      if (doc.name === 'Test Manual Booking') {
        await database.deleteManualBooking(doc.bookingId);
        deletedCount++;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} test manual bookings`
    });
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
