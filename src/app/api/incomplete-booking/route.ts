import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// Helper function to get occasion specific fields
async function getOccasionFields(occasionName: string, body: any) {
  try {
    // Fetch occasions from database to get required fields
    const occasions = await database.getAllOccasions();
    const occasion = occasions.find(occ => occ.name === occasionName);
    
    if (!occasion || !occasion.requiredFields) {
      return {};
    }
    
    // Map required fields to body data
    const occasionFields: any = {};
    occasion.requiredFields.forEach((fieldName: string) => {
      if (body[fieldName]) {
        occasionFields[fieldName] = body[fieldName];
      }
    });
    
    return occasionFields;
  } catch (error) {
    
    return {};
  }
}

// POST /api/incomplete-booking - Save incomplete booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.email) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email is required' 
        },
        { status: 400 }
      );
    }

    // Helper function to calculate booking date and time
    const calculateBookingDateTime = (date: string, time: string) => {
      try {
        let bookingDate: Date;
        
        if (date.includes(',')) {
          // Format: "Thursday, October 2, 2025" - parse manually
          const dateParts = date.split(', ');
          if (dateParts.length >= 2) {
            const dateStr = dateParts[1]; // "October 2, 2025"
            
            // Manual parsing to avoid JavaScript date parsing issues
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                              'July', 'August', 'September', 'October', 'November', 'December'];
            
            const parts = dateStr.split(' '); // ["October", "2", "2025"]
            if (parts.length >= 2) {
              const monthName = parts[0]; // "October"
              const dayStr = parts[1].replace(',', ''); // "2"
              const yearStr = parts[2] || new Date().getFullYear(); // "2025" or current year
              
              const monthIndex = monthNames.indexOf(monthName);
              const day = parseInt(dayStr);
              const year = parseInt(String(yearStr));
              
              if (monthIndex !== -1 && !isNaN(day) && !isNaN(year)) {
                bookingDate = new Date(year, monthIndex, day);
              } else {
                throw new Error('Invalid date format');
              }
            } else {
              throw new Error('Invalid date format');
            }
          } else {
            bookingDate = new Date(date);
          }
        } else {
          // Format: "2025-09-27" or similar
          bookingDate = new Date(date);
        }
        
        if (isNaN(bookingDate.getTime())) {
          throw new Error('Invalid date format');
        }
        
        
        
        // Parse time to get hours and minutes
        let hour24 = 18; // Default to 6 PM
        let minutes = 0;
        
        if (time) {
          // Handle different time formats
          if (time.includes(' - ')) {
            // Format: "4:00 PM - 7:00 PM" - extract start time
            const startTime = time.split(' - ')[0].trim();
            const timeMatch = startTime.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
            if (timeMatch) {
              const [, hours, mins, period] = timeMatch;
              hour24 = parseInt(hours);
              minutes = parseInt(mins);
              
              if (period.toLowerCase() === 'pm' && hour24 !== 12) {
                hour24 += 12;
              } else if (period.toLowerCase() === 'am' && hour24 === 12) {
                hour24 = 0;
              }
            }
          } else {
            // Format: "6:00 PM" - direct time
            const timeMatch = time.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
            if (timeMatch) {
              const [, hours, mins, period] = timeMatch;
              hour24 = parseInt(hours);
              minutes = parseInt(mins);
              
              if (period.toLowerCase() === 'pm' && hour24 !== 12) {
                hour24 += 12;
              } else if (period.toLowerCase() === 'am' && hour24 === 12) {
                hour24 = 0;
              }
            }
          }
        }
        
        // Create booking date time in IST
        const bookingDateTime = new Date(bookingDate);
        bookingDateTime.setHours(hour24, minutes, 0, 0);
        
        // Get current IST time to ensure correct date
        const now = new Date();
        const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        
        // Always use booking date if it's provided, otherwise use current IST date
        const istDateTime = bookingDate ? bookingDateTime : istNow;
        
        console.log('📅 Date calculation for incomplete booking:', {
          originalDate: date,
          originalTime: time,
          bookingDateTime: bookingDateTime.toISOString(),
          istNow: istNow.toISOString(),
          finalDateTime: istDateTime.toISOString(),
          isFuture: bookingDateTime >= istNow
        });
        
        
        
        
        
        return istDateTime;
      } catch (error) {
        
        // Fallback: use current time
        return new Date();
      }
    };

    // Log the data being saved
    console.log('📝 Saving incomplete booking with data:', {
      name: body.name,
      email: body.email,
      phone: body.phone,
      theaterName: body.theaterName,
      date: body.date,
      time: body.time,
      occasion: body.occasion,
      numberOfPeople: body.numberOfPeople || 2,
      createdAt: calculateBookingDateTime(body.date, body.time)
    });

    // Save incomplete booking to MongoDB
    const result = await database.saveIncompleteBooking({
      name: body.name,
      email: body.email,
      phone: body.phone,
      theaterName: body.theaterName,
      date: body.date,
      time: body.time,
      occasion: body.occasion,
      numberOfPeople: body.numberOfPeople || 2,
      selectedCakes: body.selectedCakes,
      selectedDecorItems: body.selectedDecorItems,
      selectedGifts: body.selectedGifts,
      totalAmount: body.totalAmount,
      // Add pricing data for proper display
      pricingData: body.pricingData || {},
      advancePayment: body.advancePayment,
      venuePayment: body.venuePayment,
      // Add timestamps based on booking time
      createdAt: calculateBookingDateTime(body.date, body.time),
      // Add occasion specific fields
      ...(await getOccasionFields(body.occasion, body))
    });

    if (result.success && result.booking) {
      const savedBooking = result.booking as any;

      return NextResponse.json({
        success: true,
        message: 'Incomplete booking saved successfully!',
        bookingId: savedBooking.id,
        expiresAt: savedBooking.expiresAt,
        database: 'FeelME Town MongoDB',
        collection: 'incomplete_booking'
      }, { status: 200 });
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to save incomplete booking' 
      },
      { status: 500 }
    );
  }
}

// GET /api/incomplete-booking - Get all incomplete bookings (with automatic cleanup)
export async function GET() {
  try {
    // Always clean up expired bookings first
    const cleanupResult = await database.deleteExpiredIncompleteBookings();
    const deletedCount = cleanupResult.deletedCount || 0;
    
    // Get all remaining incomplete bookings
    const result = await database.getAllIncompleteBookings();
    
    if (result.success) {
      

      return NextResponse.json({
        success: true,
        incompleteBookings: result.incompleteBookings,
        deletedExpiredCount: deletedCount,
        totalCount: result.total,
        database: 'FeelME Town MongoDB',
        collection: 'incomplete_booking',
        message: deletedCount > 0 ? `Cleaned up ${deletedCount} expired bookings` : 'No expired bookings to clean'
      }, { status: 200 });
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve incomplete bookings' 
      },
      { status: 500 }
    );
  }
}

// DELETE /api/incomplete-booking - Clean up expired bookings manually
export async function DELETE() {
  try {
    const result = await database.deleteExpiredIncompleteBookings();
    const deletedCount = result.deletedCount || 0;
    
    

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedCount} expired incomplete bookings`,
      deletedCount,
      database: 'FeelME Town MongoDB',
      collection: 'incomplete_booking',
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to clean up expired bookings' 
      },
      { status: 500 }
    );
  }
}

