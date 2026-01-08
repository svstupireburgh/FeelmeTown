import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking manual bookings in database...');
    
    // Get recent bookings from database
    const bookingsResult = await database.getAllBookings();
    
    if (!bookingsResult.success) {
      throw new Error(bookingsResult.error || 'Failed to fetch bookings');
    }
    
    const bookings = bookingsResult.bookings || [];
    
    // Filter for manual bookings (created in the last 7 days)
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7);
    
    const recentBookings = bookings.filter((booking: any) => {
      const bookingDate = new Date(booking.createdAt);
      return bookingDate >= recentDate;
    });
    
    // Filter for manual bookings specifically
    const manualBookings = recentBookings.filter((booking: any) => {
      return booking.isManualBooking === true || 
             booking.bookingType === 'Manual' || 
             booking.status === 'manual' ||
             (booking.createdBy && booking.createdBy !== 'Customer');
    });
    
    console.log(`📊 Found ${recentBookings.length} recent bookings`);
    console.log(`📊 Found ${manualBookings.length} manual bookings`);
    
    // Extract relevant information for analysis
    const bookingAnalysis = manualBookings.map((booking: any) => ({
      bookingId: booking.bookingId,
      name: booking.name,
      date: booking.date,
      time: booking.time,
      occasion: booking.occasion,
      createdAt: booking.createdAt,
      isManualBooking: booking.isManualBooking,
      bookingType: booking.bookingType,
      status: booking.status,
      createdBy: booking.createdBy,
      // Check if createdBy is an object (new format) or string (old format)
      createdByType: typeof booking.createdBy,
      createdByDetails: booking.createdBy,
      // Legacy fields
      staffId: booking.staffId,
      staffName: booking.staffName,
      adminName: booking.adminName
    }));
    
    // Group by creator for analysis
    const creatorStats: { [key: string]: number } = {};
    bookingAnalysis.forEach(booking => {
      let creatorKey = 'Unknown';
      
      if (typeof booking.createdBy === 'object' && booking.createdBy) {
        // New format with createdBy object
        if (booking.createdBy.type === 'admin') {
          creatorKey = `Admin: ${booking.createdBy.adminName || 'Unknown'}`;
        } else if (booking.createdBy.type === 'staff') {
          creatorKey = `Staff: ${booking.createdBy.staffName || 'Unknown'} (${booking.createdBy.staffId || 'No ID'})`;
        }
      } else if (typeof booking.createdBy === 'string') {
        // Old format with string
        creatorKey = booking.createdBy;
      } else if (booking.staffName) {
        // Legacy staff field
        creatorKey = `Staff: ${booking.staffName} (${booking.staffId || 'No ID'})`;
      } else if (booking.adminName) {
        // Legacy admin field
        creatorKey = `Admin: ${booking.adminName}`;
      }
      
      creatorStats[creatorKey] = (creatorStats[creatorKey] || 0) + 1;
    });
    
    return NextResponse.json({
      success: true,
      summary: {
        totalRecentBookings: recentBookings.length,
        totalManualBookings: manualBookings.length,
        creatorStats: creatorStats
      },
      manualBookings: bookingAnalysis,
      message: `Found ${manualBookings.length} manual bookings in the last 7 days`
    });
    
  } catch (error) {
    console.error('❌ Error checking manual bookings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check manual bookings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
