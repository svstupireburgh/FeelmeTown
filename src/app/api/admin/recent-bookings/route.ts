import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// GET /api/admin/recent-bookings - Get recent bookings for dashboard
export async function GET() {
  try {
    // Get all bookings and manual bookings
    const [bookingsResult, manualBookingsResult] = await Promise.all([
      database.getAllBookings(),
      database.getAllManualBookings()
    ]);

    if (!bookingsResult.success || !manualBookingsResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch booking data' 
        },
        { status: 500 }
      );
    }

    const allBookings: any[] = [
      ...(bookingsResult.bookings || []),
      ...(manualBookingsResult.manualBookings || [])
    ];
    
    // Sort by creation date and take first 5
    const recentBookings = allBookings
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(booking => ({
        id: booking.bookingId || booking.id,
        customerName: booking.name || booking.customerName,
        email: booking.email,
        phone: booking.phone,
        theater: booking.theaterName || booking.theater,
        date: booking.date,
        time: booking.time,
        status: booking.status,
        amount: booking.totalAmount || booking.amount,
        numberOfPeople: booking.numberOfPeople,
        extraGuestsCount: booking.extraGuestsCount,
        totalAmount: booking.totalAmount,
        advancePayment: booking.advancePayment,
        venuePayment: booking.venuePayment,
        pricingData: booking.pricingData,
        extraGuestCharges: booking.extraGuestCharges,
        occasion: booking.occasion,
        occasionPersonName: booking.occasionPersonName,
        birthdayName: booking.birthdayName,
        birthdayGender: booking.birthdayGender,
        partner1Name: booking.partner1Name,
        partner1Gender: booking.partner1Gender,
        partner2Name: booking.partner2Name,
        partner2Gender: booking.partner2Gender,
        dateNightName: booking.dateNightName,
        proposerName: booking.proposerName,
        proposalPartnerName: booking.proposalPartnerName,
        valentineName: booking.valentineName,
        customCelebration: booking.customCelebration,
        createdBy: booking.createdBy,
        createdAt: booking.createdAt,
        // Payment tracking fields
        paymentStatus: booking.paymentStatus,
        venuePaymentMethod: booking.venuePaymentMethod,
        paidBy: booking.paidBy,
        staffName: booking.staffName,
        userId: booking.userId,
        paidAt: booking.paidAt
      }));

    return NextResponse.json({
      success: true,
      bookings: recentBookings,
      total: allBookings.length
    });

  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch recent bookings' 
      },
      { status: 500 }
    );
  }
}

