import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId');
    
    if (!staffId) {
      return NextResponse.json(
        { success: false, error: 'Staff ID is required' },
        { status: 400 }
      );
    }

    

    // Initialize counters if needed and check for resets (same as dashboard)
    await database.initializeCounters();
    await database.checkAndResetCounters();
    
    // Get counter data from database (same logic as dashboard)
    const countersResult = await database.getAllCounters();
    
    if (!countersResult.success) {
      
      return NextResponse.json(
        { success: false, error: 'Failed to fetch counter data' },
        { status: 500 }
      );
    }

    const counters = countersResult.counters || {};
    

    // Fetch all manual bookings from manual_booking collection
    const manualBookingsResult = await database.getAllManualBookings();
    const allManualBookings = manualBookingsResult.manualBookings || [];

    // Also fetch from main booking collection (where manual bookings with staffId are stored)
    const allBookingsResult = await database.getAllBookings();
    const allBookings = allBookingsResult.bookings || [];

    

    // Filter manual bookings by staff ID
    const staffManualBookings = allManualBookings.filter((booking: any) => {
      const match = booking.staffId === staffId || booking.createdBy === staffId;
      if (match) {
        
      }
      return match;
    });

    // Filter main bookings by staff ID (for manual bookings stored in main collection)
    const staffMainBookings = allBookings.filter((booking: any) => {
      const isManual = booking.isManualBooking === true || booking.bookingType === 'Manual' || booking.status === 'manual';
      const matchesStaff = booking.staffId === staffId || booking.createdBy === staffId;
      const match = isManual && matchesStaff;
      
      if (match) {
        
      }
      return match;
    });

    // Combine both sources and remove duplicates
    const allStaffBookings = [...staffManualBookings, ...staffMainBookings];
    const uniqueBookingIds = new Set();
    const staffBookings = allStaffBookings.filter((booking: any) => {
      const bookingId = booking.bookingId || booking.id;
      if (uniqueBookingIds.has(bookingId)) {
        return false; // Skip duplicate
      }
      uniqueBookingIds.add(bookingId);
      return true;
    });

    

    // Use the same counter calculation logic as dashboard
    const getStaffCounterStats = (counterType: string, fallbackBookings: any[]) => {
      const counter = counters[counterType];
      
      
      if (counter && typeof counter === 'object') {
        return {
          today: counter.daily || 0,
          thisWeek: counter.weekly || 0,
          thisMonth: counter.monthly || 0,
          thisYear: counter.yearly || 0,
          total: counter.total || 0
        };
      }
      
      // Fallback to manual calculation if counter not found
      const now = new Date();
      const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const today = new Date(istNow.getFullYear(), istNow.getMonth(), istNow.getDate());
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const parseBookingDate = (dateStr: string): Date | null => {
        if (!dateStr) return null;
        
        if (dateStr.includes(',')) {
          const parts = dateStr.split(', ');
          if (parts.length >= 3) {
            const monthDay = parts[1];
            const year = parts[2];
            const fullDate = `${monthDay}, ${year}`;
            const parsed = new Date(fullDate);
            return isNaN(parsed.getTime()) ? null : parsed;
          } else if (parts.length >= 2) {
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
        today: fallbackBookings.filter(isToday).length,
        thisWeek: fallbackBookings.filter(isThisWeek).length,
        thisMonth: fallbackBookings.filter(isThisMonth).length,
        thisYear: fallbackBookings.filter(isThisYear).length,
        total: fallbackBookings.length
      };
    };

    // First try to get staff counter from counters collection
    const staffCounterId = `staff_${staffId}`;
    const staffCounterResult = await database.getCounterValue(staffCounterId);
    
    if (staffCounterResult.success && staffCounterResult.count) {
      // Use stored counter data
      const counter = staffCounterResult.count;
      
      
      return NextResponse.json({
        success: true,
        staffId: staffId,
        today: counter.dailyCount || 0,
        thisWeek: counter.weeklyCount || 0,
        thisMonth: counter.monthlyCount || 0,
        thisYear: counter.yearlyCount || 0,
        total: counter.totalCount || 0,
        source: 'stored_counter'
      });
    } else {
      // Fallback to manual calculation
      
      const staffStats = getStaffCounterStats('manual', staffBookings);
      
      

      return NextResponse.json({
        success: true,
        staffId: staffId,
        today: staffStats.today,
        thisWeek: staffStats.thisWeek,
        thisMonth: staffStats.thisMonth,
        thisYear: staffStats.thisYear,
        total: staffStats.total,
        source: 'manual_calculation'
      });
    }

  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch staff booking counts' },
      { status: 500 }
    );
  }
}

