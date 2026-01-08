import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';
import { ExportsStorage } from '@/lib/exports-storage'; // Dummy - no longer used

// POST /api/cancel-booking - Cancel booking and process refund
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 [CANCEL API] Cancel booking API called');
    const body = await request.json();
    console.log('📝 [CANCEL API] Request body:', JSON.stringify(body, null, 2));
    
    // Validate required fields
    const { bookingId, email, reason } = body;
    console.log(`📋 [CANCEL API] Booking ID: ${bookingId}, Email: ${email}`);
    
    if (!bookingId || !email) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: bookingId and email' 
        },
        { status: 400 }
      );
    }

    // Get booking details from database
    const bookingResult = await database.getBookingById(bookingId);
    
    if (!bookingResult.success || !bookingResult.booking) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Booking not found' 
        },
        { status: 404 }
      );
    }

    const booking = bookingResult.booking;

    // Verify email matches
    if (booking.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email does not match booking' 
        },
        { status: 403 }
      );
    }

    // Check if booking is already cancelled (optional check since we're deleting)
    if (booking.status === 'cancelled') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Booking is already cancelled' 
        },
        { status: 400 }
      );
    }

    // Calculate refund amount based on 72-hour policy
    const bookingDate = new Date(booking.date);
    const now = new Date();
    const hoursUntilBooking = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    let refundAmount = 0;
    let refundStatus = 'non-refundable';
    
    if (hoursUntilBooking > 72) {
      // Full refund of advance payment (25% of total)
      refundAmount = Math.round(booking.totalAmount * 0.25);
      refundStatus = 'refundable';
    }

    // Update status in booking collection, then delete the booking
    const statusResult = await database.updateBookingStatus(bookingId, 'cancelled');
    if (!statusResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: statusResult.error || 'Failed to update booking status'
        },
        { status: 500 }
      );
    }

    // Prepare cancelled booking record - Include ALL fields from MongoDB
    const record = {
      // Basic booking info
      bookingId: booking.bookingId || booking.id || booking._id,
      name: booking.name,
      email: booking.email,
      phone: booking.phone,
      theaterName: booking.theaterName,
      date: booking.date,
      time: booking.time,
      occasion: booking.occasion,
      numberOfPeople: booking.numberOfPeople,
      
      // Payment info
      advancePayment: Math.round((booking.totalAmount || 0) * 0.25),
      venuePayment: Math.round((booking.totalAmount || 0) * 0.75),
      totalAmount: booking.totalAmount,
      
      // Cancellation info
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelReason: (typeof reason === 'string' && reason.trim()) ? reason.trim() : 'Cancelled by Customer',
      refundAmount,
      refundStatus,
      
      // Additional MongoDB fields - Pass everything to SQL
      occasionPersonName: booking.occasionPersonName,
      bookingType: booking.bookingType,
      createdBy: booking.createdBy,
      isManualBooking: booking.isManualBooking,
      staffId: booking.staffId,
      staffName: booking.staffName,
      notes: booking.notes,
      createdAt: booking.createdAt,
      
      // Custom fields (Your Nickname, Partner Name, etc.)
      ...(booking['Your Nickname'] && { 'Your Nickname': booking['Your Nickname'] }),
      ...(booking['Your Nickname_label'] && { 'Your Nickname_label': booking['Your Nickname_label'] }),
      ...(booking['Your Nickname_value'] && { 'Your Nickname_value': booking['Your Nickname_value'] }),
      ...(booking["Your Partner's Name"] && { "Your Partner's Name": booking["Your Partner's Name"] }),
      ...(booking["Your Partner's Name_label"] && { "Your Partner's Name_label": booking["Your Partner's Name_label"] }),
      ...(booking["Your Partner's Name_value"] && { "Your Partner's Name_value": booking["Your Partner's Name_value"] }),
      
      // Arrays (movies, cakes, decor, gifts)
      selectedMovies: booking.selectedMovies || [],
      selectedCakes: booking.selectedCakes || [],
      selectedDecorItems: booking.selectedDecorItems || [],
      selectedGifts: booking.selectedGifts || [],
      
      // Complete original booking data (everything from MongoDB)
      _originalBooking: booking
    };
    
    console.log(`📝 Cancelled booking record:`, JSON.stringify(record, null, 2));
    
    // Sync to GoDaddy SQL database (PRIORITY - Always run this first)
    try {
      console.log(`🔄 [GODADDY SQL] Starting sync for cancelled booking: ${record.bookingId}`);
      console.log(`🔄 [GODADDY SQL] Record data:`, JSON.stringify(record, null, 2));
      
      const { syncCancelledBookingToSQL } = await import('@/lib/godaddy-sql');
      const result = await syncCancelledBookingToSQL(record);
      
      if (result.success) {
        console.log(`✅ [GODADDY SQL] Successfully synced cancelled booking to GoDaddy SQL: ${record.bookingId}`);
      } else {
        console.error(`❌ [GODADDY SQL] Sync failed:`, result.error);
      }
    } catch (sqlError) {
      console.error('❌ [GODADDY SQL] Exception during sync:', sqlError);
      console.error('❌ [GODADDY SQL] Error stack:', (sqlError as Error).stack);
    }
    
    // Save cancelled booking to blob storage JSON (optional backup)
    try {
      console.log(`🗑️ Saving cancelled booking ${bookingId} to cancelled-bookings.json`);
      await ExportsStorage.appendToArray('cancelled-bookings.json', record);
      console.log(`✅ Successfully saved cancelled booking to blob storage`);
    } catch (blobError) {
      console.error(`❌ Failed to save cancelled booking to blob storage:`, blobError);
      // Don't fail the cancellation if blob storage fails
    }

    const deleteResult = await database.deleteBooking(bookingId);
    if (!deleteResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: deleteResult.error || 'Failed to delete booking'
        },
        { status: 500 }
      );
    }


    // Send cancellation email
    try {
      const emailService = await import('@/lib/email-service');
      await emailService.default.sendBookingCancelled({
        id: booking.bookingId || '',
        name: booking.name || '',
        email: booking.email || '',
        phone: booking.phone || '',
        theaterName: booking.theaterName || '',
        date: booking.date || '',
        time: booking.time || '',
        occasion: booking.occasion || '',
        numberOfPeople: booking.numberOfPeople || 0,
        totalAmount: booking.totalAmount || 0,
        refundAmount: refundAmount,
        refundStatus: refundStatus,
        cancelledAt: new Date()
      });
      
    } catch (emailError) {
      
    }

    // TODO: Integrate with payment gateway for actual refund processing
    // For now, we'll just log the refund details
    if (refundAmount > 0) {
      
    }

    // Refresh excelRecords metadata for cancelled type
    try {
      await fetch(`${request.nextUrl.origin}/api/admin/refresh-excel-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'cancelled' })
      });
      console.log('✅ Excel records refreshed for cancelled bookings');
    } catch (syncError) {
      console.error('⚠️ Failed to refresh Excel records:', syncError);
      // Don't fail the cancellation if refresh fails
    }

    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully',
      bookingId: booking.bookingId || booking._id || booking.id,
      refundAmount: refundAmount,
      refundStatus: refundStatus,
      refundMessage: refundAmount > 0 
        ? `Refund of ₹${refundAmount} will be processed within 5-7 business days`
        : 'No refund applicable as per cancellation policy',
      hoursUntilBooking: Math.round(hoursUntilBooking),
      cancelledAt: new Date().toISOString(),
      database: 'FeelME Town',
      collection: 'booking'
    }, { status: 200 });

  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to cancel booking. Please try again.' 
      },
      { status: 500 }
    );
  }
}

