import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';
import emailService from '@/lib/email-service';

// GET /api/booking/[id] - Get booking by ID with email verification
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const email = request.nextUrl.searchParams.get('email');

    if (!bookingId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing booking ID' 
        },
        { status: 400 }
      );
    }

    // Email is optional - if provided, it will be verified for security

    // Get booking from database
    const result = await database.getBookingById(bookingId);

    if (!result.success || !result.booking) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Booking not found' 
        },
        { status: 404 }
      );
    }

    const booking = result.booking;

    // Verify email matches if email is provided
    if (email && booking.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email does not match booking' 
        },
        { status: 403 }
      );
    }

    // Check if booking is already cancelled
    if (booking.status === 'cancelled') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Booking is already cancelled' 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.bookingId || booking._id,
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        theaterName: booking.theaterName,
        date: booking.date,
        time: booking.time,
        occasion: booking.occasion,
        numberOfPeople: booking.numberOfPeople,
        totalAmount: booking.totalAmount,
        advancePayment: booking.advancePayment,
        venuePayment: booking.venuePayment,
        status: booking.status || 'completed',
        paymentStatus: booking.paymentStatus || booking.payment_status || 'pending',
        invoiceDriveUrl: booking.invoiceDriveUrl || null,
        createdAt: booking.createdAt
      }
    }, { status: 200 });

  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get booking. Please try again.' 
      },
      { status: 500 }
    );
  }
}

// PUT /api/booking/[id] - Update existing booking
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const body = await request.json();
    
    console.log('📝 PUT /api/booking/[id] - Received:', { bookingId, body });
    
    if (!bookingId) {
      console.error('❌ Missing booking ID');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing booking ID' 
        },
        { status: 400 }
      );
    }

    // Validate required fields
    const requiredFields = ['name', 'email', 'phone', 'theaterName', 'date', 'time', 'occasion'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
      return NextResponse.json(
        { 
          success: false, 
          error: `Missing required fields: ${missingFields.join(', ')}` 
        },
        { status: 400 }
      );
    }
    
    console.log('✅ All required fields present');

    // Calculate total amount
    let totalAmount = 0;
    
    // Add theater base price based on theater name
    let theaterBasePrice = 1399; // Default theater price
    
    // Extract price from theater name or set based on theater type
    if (body.theaterName) {
      if (body.theaterName.includes('PHILIA') || body.theaterName.includes('FRIENDS') || body.theaterName.includes('FMT-Hall-2')) {
        theaterBasePrice = 1999;
      } else if (body.theaterName.includes('PRAGMA') || body.theaterName.includes('LOVE') || body.theaterName.includes('FMT-Hall-3')) {
        theaterBasePrice = 2999;
      } else if (body.theaterName.includes('STORGE') || body.theaterName.includes('FAMILY') || body.theaterName.includes('FMT-Hall-4')) {
        theaterBasePrice = 3999;
      } else if (body.theaterName.includes('EROS') || body.theaterName.includes('COUPLES') || body.theaterName.includes('FMT-Hall-1')) {
        theaterBasePrice = 1399;
      }
    }
    
    totalAmount += theaterBasePrice;
    
    // Add extra guest charges (₹400 per guest beyond 2)
    const numberOfPeople = body.numberOfPeople || 2;
    const extraGuests = Math.max(0, numberOfPeople - 2);
    const extraGuestCharges = extraGuests * 400;
    totalAmount += extraGuestCharges;
    
    // Add cake costs
    if (body.selectedCakes && Array.isArray(body.selectedCakes)) {
      body.selectedCakes.forEach((cake: { price?: number; quantity?: number }) => {
        totalAmount += (cake.price || 0) * (cake.quantity || 1);
      });
    }
    
    // Add decor item costs
    if (body.selectedDecorItems && Array.isArray(body.selectedDecorItems)) {
      body.selectedDecorItems.forEach((item: { price?: number; quantity?: number }) => {
        totalAmount += (item.price || 0) * (item.quantity || 1);
      });
    }
    
    // Add gift costs
    if (body.selectedGifts && Array.isArray(body.selectedGifts)) {
      body.selectedGifts.forEach((gift: { price?: number; quantity?: number }) => {
        totalAmount += (gift.price || 0) * (gift.quantity || 1);
      });
    }
    
    // Add movie costs
    if (body.selectedMovies && Array.isArray(body.selectedMovies)) {
      body.selectedMovies.forEach((movie: { price?: number; quantity?: number }) => {
        totalAmount += (movie.price || 0) * (movie.quantity || 1);
      });
    }

    // Calculate payment breakdown - use pricing data from body if available
    const slotBookingFee = body.pricingData?.slotBookingFee || 600; // Use slot booking fee from pricing data or default to 600
    const advancePayment = slotBookingFee;
    const venuePayment = totalAmount - advancePayment; // Remaining amount to be paid at venue

    // Create updated booking data
    const bookingData: any = {
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone.trim(),
      theaterName: body.theaterName.trim(),
      date: body.date,
      time: body.time,
      occasion: body.occasion.trim(),
      numberOfPeople: body.numberOfPeople || 2,
      selectedCakes: body.selectedCakes || [],
      selectedDecorItems: body.selectedDecorItems || [],
      selectedGifts: body.selectedGifts || [],
      selectedMovies: body.selectedMovies || [],
      totalAmount: totalAmount,
      advancePayment: advancePayment,
      venuePayment: venuePayment,
      status: body.status || 'confirmed', // Keep existing status or set to confirmed
      // Store occasion data dynamically
      occasionData: body.occasionData || {},
      // Store pricing data if provided
      pricingData: body.pricingData || {
        slotBookingFee: slotBookingFee,
        extraGuestFee: 400,
        convenienceFee: 0
      },
      // Store extra guest charges
      extraGuestCharges: extraGuestCharges,
      extraGuestsCount: extraGuests,
      // Store applied coupon info if exists
      appliedCouponCode: body.appliedCouponCode || undefined,
      couponDiscount: body.couponDiscount || 0,
    };

    // Add all dynamic occasion fields from occasionData to root level for backward compatibility
    if (body.occasionData && typeof body.occasionData === 'object') {
      Object.keys(body.occasionData).forEach(key => {
        if (body.occasionData[key]) {
          bookingData[key] = body.occasionData[key];
        }
      });
    }

    // Legacy occasion fields (for backward compatibility)
    if (body.birthdayName) bookingData.birthdayName = body.birthdayName;
    if (body.birthdayGender) bookingData.birthdayGender = body.birthdayGender;
    if (body.partner1Name) bookingData.partner1Name = body.partner1Name;
    if (body.partner1Gender) bookingData.partner1Gender = body.partner1Gender;
    if (body.partner2Name) bookingData.partner2Name = body.partner2Name;
    if (body.partner2Gender) bookingData.partner2Gender = body.partner2Gender;
    if (body.proposerName) bookingData.proposerName = body.proposerName;
    if (body.proposalPartnerName) bookingData.proposalPartnerName = body.proposalPartnerName;
    if (body.valentineName) bookingData.valentineName = body.valentineName;
    if (body.dateNightName) bookingData.dateNightName = body.dateNightName;
    if (body.occasionPersonName) bookingData.occasionPersonName = body.occasionPersonName;

    // Update booking in database
    console.log('💾 Updating booking in database:', { bookingId, bookingData });
    // Provide aliases for manual booking updater
    bookingData.theater = bookingData.theaterName;
    bookingData.amount = bookingData.totalAmount;
    bookingData.customerName = bookingData.name;

    let result = await database.updateBooking(bookingId, bookingData);
    console.log('📊 Database update result (booking):', result);

    // Fallback: if not found in regular bookings, try manual bookings
    if (!result.success && /not found/i.test(result.error || '')) {
      console.log('↩️ Falling back to update manual booking collection');
      // @ts-ignore - function exists in db-connect
      const manualResult = await database.updateManualBooking(bookingId, bookingData);
      console.log('📊 Database update result (manual):', manualResult);
      if (manualResult.success && manualResult.booking) {
        result = manualResult as any;
      } else {
        return NextResponse.json({ success: false, error: manualResult.error || 'Booking not found' }, { status: 404 });
      }
    }

    if (result.success && result.booking) {
      

      // Send confirmation email in background (no invoice attachment)
      emailService.sendBookingConfirmed(result.booking).catch(() => {
        // Email service error handled
      });

      return NextResponse.json({
        success: true,
        message: 'Booking updated successfully!',
        bookingId: result.booking.id,
        booking: result.booking,
        database: 'FeelME Town',
        collection: 'booking'
      }, { status: 200 });
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('❌ PUT /api/booking/[id] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update booking data. Please try again.' 
      },
      { status: 500 }
    );
  }
}