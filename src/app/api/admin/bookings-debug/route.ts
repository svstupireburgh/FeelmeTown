import { NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// GET /api/admin/bookings-debug - Quick debug endpoint to verify guest data
export async function GET() {
  try {
    // Fetch latest 10 bookings (regular + manual) sorted by createdAt desc
    const [regular, manual] = await Promise.all([
      database.getAllBookings(),
      database.getAllManualBookings()
    ]);

    // Helper to map minimal fields
    const mapBooking = (b: any) => ({
      id: b.bookingId || b.id,
      createdAt: b.createdAt,
      theater: b.theaterName || b.theater,
      numberOfPeople: b.numberOfPeople,
      extraGuestsCount: b.extraGuestsCount,
      extraGuestFee: b.pricingData?.extraGuestFee,
      extraGuestCharges: b.extraGuestCharges,
      totalAmount: b.totalAmount,
      status: b.status
    });

    return NextResponse.json({
      success: true,
      regular: regular.success && regular.bookings ? regular.bookings.map(mapBooking) : [],
      manual: manual.success && manual.manualBookings ? manual.manualBookings.map(mapBooking) : []
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch debug bookings' }, { status: 500 });
  }
}
