import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// GET /api/admin/staff-overview - Get staff overview with booking counts
export async function GET(request: NextRequest) {
  try {
    

    // Initialize counters and check for resets
    await database.initializeCounters();
    await database.checkAndResetCounters();

    // Get all staff from database
    const staffResult = await database.getAllStaff();
    
    if (!staffResult || !Array.isArray(staffResult)) {
      
      
      // Fallback staff data with real counter fetching
      const fallbackStaff = [
        {
          _id: 'FMT0001',
          userId: 'FMT0001', 
          name: 'Nishant Mogahaa',
          email: 'rajpurohit4u4@gmail.com',
          role: 'Senior Staff',
          isActive: true,
          profilePhoto: null,
          photoType: null
        },
        {
          _id: 'FMT0002',
          userId: 'FMT0002',
          name: 'Harshit', 
          email: 'rajpurohit4u2@gmail.com',
          role: 'Staff',
          isActive: true,
          profilePhoto: null,
          photoType: null
        }
      ];
      
      const staffWithCounts = await Promise.all(
        fallbackStaff.map(async (staff) => {
          const counters = await getStaffBookingCounts(staff._id);
          return {
            id: staff._id,
            userId: staff.userId,
            name: staff.name,
            email: staff.email,
            phone: 'N/A',
            role: staff.role,
            isActive: staff.isActive,
            createdAt: new Date().toISOString(),
            profilePhoto: staff.profilePhoto,
            photoType: staff.photoType,
            ...counters
          };
        })
      );
      
      return NextResponse.json({
        success: true,
        staff: staffWithCounts,
        totalStaff: staffWithCounts.length,
        source: 'fallback_data',
        timestamp: new Date().toISOString()
      });
    }

    

    // Get booking counts for each staff member
    const staffWithCounts = await Promise.all(
      staffResult.map(async (staff: any) => {
        try {
          const counters = await getStaffBookingCounts(staff._id);
          
          return {
            id: staff._id,
            userId: staff.userId || staff._id,
            name: staff.name || 'Unknown Staff',
            email: staff.email || 'N/A',
            phone: staff.phone || 'N/A', 
            role: staff.role || 'Staff',
            isActive: staff.isActive !== false,
            createdAt: staff.createdAt || new Date().toISOString(),
            profilePhoto: staff.profilePhoto,
            photoType: staff.photoType,
            ...counters
          };
        } catch (error) {
          
          return {
            id: staff._id,
            userId: staff.userId || staff._id,
            name: staff.name || 'Unknown Staff',
            email: staff.email || 'N/A',
            phone: staff.phone || 'N/A',
            role: staff.role || 'Staff', 
            isActive: staff.isActive !== false,
            createdAt: staff.createdAt || new Date().toISOString(),
            profilePhoto: staff.profilePhoto,
            photoType: staff.photoType,
            totalBookings: 0,
            todayBookings: 0,
            thisWeekBookings: 0,
            thisMonthBookings: 0,
            thisYearBookings: 0
          };
        }
      })
    );

    

    return NextResponse.json({
      success: true,
      staff: staffWithCounts,
      totalStaff: staffWithCounts.length,
      source: 'database',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch staff overview data',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Helper function to get staff booking counts
async function getStaffBookingCounts(staffId: string) {
  try {
    // Try to get staff counter from counters collection
    const staffCounterId = `staff_${staffId}`;
    const staffCounterResult = await database.getCounterValue(staffCounterId);
    
    if (staffCounterResult.success && staffCounterResult.count) {
      // Use stored counter data
      const counter = staffCounterResult.count;
      
      
      return {
        totalBookings: counter.totalCount || 0,
        todayBookings: counter.dailyCount || 0,
        thisWeekBookings: counter.weeklyCount || 0,
        thisMonthBookings: counter.monthlyCount || 0,
        thisYearBookings: counter.yearlyCount || 0
      };
    } else {
      // Fallback to manual calculation
      
      
      // Get manual bookings for this staff
      const manualBookingsResult = await database.getAllManualBookings();
      const allManualBookings = manualBookingsResult.manualBookings || [];
      
      // Get main bookings for this staff (manual bookings in main collection)
      const allBookingsResult = await database.getAllBookings();
      const allBookings = allBookingsResult.bookings || [];
      
      // Filter bookings by staff ID
      const staffManualBookings = allManualBookings.filter((booking: any) => {
        return booking.staffId === staffId || booking.createdBy === staffId;
      });
      
      const staffMainBookings = allBookings.filter((booking: any) => {
        const isManual = booking.isManualBooking === true || booking.bookingType === 'Manual' || booking.status === 'manual';
        const matchesStaff = booking.staffId === staffId || booking.createdBy === staffId;
        return isManual && matchesStaff;
      });
      
      // Combine and remove duplicates
      const allStaffBookings = [...staffManualBookings, ...staffMainBookings];
      const uniqueBookingIds = new Set();
      const staffBookings = allStaffBookings.filter((booking: any) => {
        const bookingId = booking.bookingId || booking.id;
        if (uniqueBookingIds.has(bookingId)) {
          return false;
        }
        uniqueBookingIds.add(bookingId);
        return true;
      });
      
      // Calculate time-based counts
      const now = new Date();
      const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const today = new Date(istNow.getFullYear(), istNow.getMonth(), istNow.getDate());
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      
      const parseBookingDate = (dateStr: string): Date | null => {
        if (!dateStr) return null;
        
        if (dateStr.includes(',')) {
          const parts = dateStr.split(', ');
          if (parts.length >= 2) {
            const dateOnly = parts[1];
            const parsed = new Date(dateOnly);
            return isNaN(parsed.getTime()) ? null : parsed;
          }
        }
        
        const parsed = new Date(dateStr);
        return isNaN(parsed.getTime()) ? null : parsed;
      };
      
      const isToday = (booking: any) => {
        if (!booking.date) return false;
        const bookingDate = parseBookingDate(booking.date);
        if (!bookingDate) return false;
        const bookingDay = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
        return bookingDay.getTime() === today.getTime();
      };
      
      const isThisWeek = (booking: any) => {
        if (!booking.date) return false;
        const bookingDate = parseBookingDate(booking.date);
        if (!bookingDate) return false;
        const bookingDay = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
        return bookingDay >= startOfWeek && bookingDay <= today;
      };
      
      const isThisMonth = (booking: any) => {
        if (!booking.date) return false;
        const bookingDate = parseBookingDate(booking.date);
        if (!bookingDate) return false;
        const bookingDay = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
        return bookingDay >= startOfMonth && bookingDay <= today;
      };
      
      const isThisYear = (booking: any) => {
        if (!booking.date) return false;
        const bookingDate = parseBookingDate(booking.date);
        if (!bookingDate) return false;
        const bookingYear = bookingDate.getFullYear();
        const currentYear = istNow.getFullYear();
        return bookingYear === currentYear;
      };
      
      return {
        totalBookings: staffBookings.length,
        todayBookings: staffBookings.filter(isToday).length,
        thisWeekBookings: staffBookings.filter(isThisWeek).length,
        thisMonthBookings: staffBookings.filter(isThisMonth).length,
        thisYearBookings: staffBookings.filter(isThisYear).length
      };
    }
  } catch (error) {
    
    return {
      totalBookings: 0,
      todayBookings: 0,
      thisWeekBookings: 0,
      thisMonthBookings: 0,
      thisYearBookings: 0
    };
  }
}

