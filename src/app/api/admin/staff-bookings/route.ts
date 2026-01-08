import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId');

    // Fetch all manual bookings (staff bookings are stored here)
    const manualBookingsResult = await database.getAllManualBookings();
    
    if (!manualBookingsResult.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch manual bookings' },
        { status: 500 }
      );
    }

    const allManualBookings = manualBookingsResult.manualBookings || [];
    
    
    
    // Fetch all staff to get staff details
    const staffResult = await database.getAllStaff();
    const allStaff = staffResult || [];
    
    // Create a staff lookup map
    const staffMap = new Map();
    allStaff.forEach((staff: any) => {
      staffMap.set(staff._id, staff);
      // Also map by userId for better matching
      if (staff.userId) {
        staffMap.set(staff.userId, staff);
      }
      // Also map by name for fallback
      if (staff.name) {
        staffMap.set(staff.name, staff);
      }
    });
    
    

    // Transform manual bookings to staff bookings format
    let staffBookings = allManualBookings.map((booking: any) => {
      // Try multiple ways to find staff info
      let staffInfo = null;
      
      // First try with staffId
      if (booking.staffId) {
        staffInfo = staffMap.get(booking.staffId);
      }
      
      // Then try with createdBy
      if (!staffInfo && booking.createdBy) {
        staffInfo = staffMap.get(booking.createdBy);
      }
      
      // Try to find by name if we have staffName in booking
      if (!staffInfo && booking.staffName) {
        for (const [id, staff] of staffMap) {
          if (staff.name === booking.staffName) {
            staffInfo = staff;
            break;
          }
        }
      }
      
      // Fallback staff info with better defaults
      if (!staffInfo) {
        // Determine staff type based on createdBy field
        let defaultName = 'Unknown Staff';
        let defaultUserId = 'N/A';
        
        if (booking.createdBy === 'Management') {
          // For Management bookings, use the actual staff name from booking
          defaultName = booking.staffName || 'Management User';
          defaultUserId = booking.staffId || 'MGMT_DEFAULT';
        } else if (booking.createdBy === 'Admin') {
          // For Admin bookings, use the actual staff name from booking
          defaultName = booking.staffName || 'Administrator';
          defaultUserId = booking.staffId || 'ADMIN_DEFAULT';
        } else {
          defaultName = booking.staffName || booking.createdBy || 'Unknown Staff';
          defaultUserId = booking.staffId || booking.createdBy || 'N/A';
        }
        
        // Try to get staff email from booking or generate based on staff name
        let defaultEmail = 'unknown@feelmetown.com';
        
        // First priority: Use staffEmail if available (new field)
        if (booking.staffEmail) {
          defaultEmail = booking.staffEmail;
        } else if (booking.staffName) {
          // Generate email based on staff name (convert to lowercase, remove spaces)
          const emailPrefix = booking.staffName.toLowerCase().replace(/\s+/g, '.');
          defaultEmail = `${emailPrefix}@feelmetown.com`;
        } else if (booking.createdBy === 'Management') {
          defaultEmail = 'management@feelmetown.com';
        } else if (booking.createdBy === 'Administrator') {
          defaultEmail = 'admin@feelmetown.com';
        } else if (booking.createdBy === 'Staff') {
          defaultEmail = 'staff@feelmetown.com';
        }
        
        staffInfo = {
          name: defaultName,
          email: defaultEmail,
          phone: 'N/A',
          userId: defaultUserId,
          _id: booking.staffId || booking.createdBy || 'unknown'
        };
      }

      
      return {
        id: booking.bookingId || booking.id,
        staffId: booking.staffId || booking.createdBy || 'unknown',
        staffName: staffInfo.name,
        staffEmail: staffInfo.email,
        staffPhone: staffInfo.phone,
        staffUserId: staffInfo.userId,
        customerName: booking.name || booking.customerName,
        customerEmail: booking.email || booking.customerEmail,
        customerPhone: booking.phone || booking.customerPhone,
        theaterName: booking.theaterName || booking.theater || 'Unknown Theater',
        date: booking.date || 'No Date',
        time: booking.time || 'No Time',
        occasion: booking.occasion || 'No Occasion',
        numberOfPeople: booking.numberOfPeople || 0,
        totalAmount: booking.totalAmount || 0,
        advancePayment: booking.advancePayment || 0,
        venuePayment: booking.venuePayment || 0,
        status: booking.status || 'Unknown',
        bookingType: 'Manual',
        createdBy: booking.createdBy || 'Unknown',
        createdAt: booking.createdAt,
        notes: booking.notes || '',
        // Additional details
        selectedCakes: booking.selectedCakes || [],
        selectedDecorItems: booking.selectedDecorItems || [],
        selectedGifts: booking.selectedGifts || [],
        selectedMovies: booking.selectedMovies || [],
        // Occasion-specific details
        birthdayName: booking.birthdayName || '',
        partner1Name: booking.partner1Name || '',
        partner2Name: booking.partner2Name || '',
        proposerName: booking.proposerName || '',
        // Booking metadata
        isManualBooking: true,
        bookingSource: 'Staff Manual Booking'
      };
    });

    // Filter by specific staff if requested
    if (staffId && staffId !== 'all') {
      staffBookings = staffBookings.filter((booking: any) => booking.staffId === staffId);
    }

    // Sort by creation date (newest first)
    staffBookings.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({
      success: true,
      bookings: staffBookings,
      total: staffBookings.length
    });

  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch staff bookings' },
      { status: 500 }
    );
  }
}

