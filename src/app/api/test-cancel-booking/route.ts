import { NextRequest, NextResponse } from 'next/server';
import { ExportsStorage } from '@/lib/exports-storage';

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'test-cancel-save') {
      console.log(`🧪 Testing cancelled booking save to blob storage`);
      
      // Create a test cancelled booking record
      const testRecord = {
        bookingId: `TEST_${Date.now()}`,
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '9999999999',
        theaterName: 'Test Theater',
        date: 'Monday, October 28, 2024',
        time: '7:00 PM - 10:00 PM',
        occasion: 'Birthday',
        numberOfPeople: 4,
        advancePayment: 500,
        venuePayment: 1500,
        totalAmount: 2000,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelReason: 'Test cancellation from API test'
      };

      console.log(`📝 Test cancelled booking record:`, JSON.stringify(testRecord, null, 2));
      await ExportsStorage.appendToArray('cancelled-bookings.json', testRecord);
      console.log(`✅ Test cancelled booking saved to blob storage`);

      return NextResponse.json({
        success: true,
        message: 'Test cancelled booking saved successfully',
        record: testRecord
      });
    }

    if (action === 'read-cancelled') {
      console.log(`📖 Reading cancelled-bookings.json from blob storage`);
      const cancelledBookings = await ExportsStorage.readArray('cancelled-bookings.json');
      
      return NextResponse.json({
        success: true,
        message: 'Cancelled bookings read successfully',
        count: cancelledBookings.length,
        data: cancelledBookings.slice(-5) // Show last 5 records
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use: test-cancel-save or read-cancelled'
    });

  } catch (error) {
    console.error('❌ Test cancel booking error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
