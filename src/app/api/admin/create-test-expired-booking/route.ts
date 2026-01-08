import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// POST /api/admin/create-test-expired-booking - Create a test booking with past time
export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await database.connect();
    
    const currentDateTime = new Date();
    const currentIST = new Date(currentDateTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    
    // Create a booking with past time (2 hours ago)
    const pastTime = new Date(currentIST.getTime() - (2 * 60 * 60 * 1000)); // 2 hours ago
    
    // Format date as "Thursday, October 3, 2025"
    const bookingDate = pastTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
    
    // Create time slot that has already expired
    const startHour = pastTime.getHours() - 1; // 1 hour before past time
    const endHour = pastTime.getHours(); // Past time (already expired)
    
    const startTime12 = startHour > 12 ? `${startHour - 12}:00 PM` : startHour === 12 ? '12:00 PM' : startHour === 0 ? '12:00 AM' : `${startHour}:00 AM`;
    const endTime12 = endHour > 12 ? `${endHour - 12}:00 PM` : endHour === 12 ? '12:00 PM' : endHour === 0 ? '12:00 AM' : `${endHour}:00 AM`;
    
    const timeSlot = `${startTime12} - ${endTime12}`;
    
    // Create test booking data
    const testBookingData = {
      // Customer info
      name: 'Test User (Expired)',
      email: 'test.expired@feelme.town',
      phone: '+91 9999999999',
      
      // Booking details
      date: bookingDate,
      time: timeSlot,
      theater: 'Theater 1',
      theaterName: 'Theater 1',
      numberOfPeople: 2,
      occasion: 'birthday',
      
      // Birthday specific
      birthdayName: 'Test Birthday',
      birthdayGender: 'male',
      
      // Pricing
      totalPrice: 2999,
      
      // Status
      status: 'confirmed',
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
      
      // Test marker
      isTestBooking: true,
      testType: 'expired_booking_test',
      
      // Additional info
      specialRequests: 'This is a test booking created for expired booking logic testing'
    };
    
    
    
    // Save the booking
    const result = await database.saveBooking(testBookingData);
    
    if (result.success && result.booking) {
      return NextResponse.json({
        success: true,
        message: 'Test expired booking created successfully!',
        booking: {
          id: result.booking.id,
          name: testBookingData.name,
          date: bookingDate,
          time: timeSlot,
          status: 'confirmed',
          createdAt: currentDateTime.toISOString(),
          currentTime: currentIST.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          isExpired: true
        },
        instructions: {
          step1: 'Booking created with past time slot',
          step2: 'Status is currently "confirmed"',
          step3: 'Go to Admin Dashboard to see the booking',
          step4: 'Use "Test Expired (1min delay)" to trigger auto-completion',
          step5: 'Watch completed counter increase and booking delete after 1 minute'
        }
      });
    } else {
      throw new Error(result.error || 'Failed to create test booking');
    }
    
  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create test expired booking: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}

