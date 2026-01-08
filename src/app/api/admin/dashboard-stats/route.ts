import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';
import { getAllCounters, checkAndResetTimeBasedCounters } from '@/lib/counter-system';

// GET /api/admin/dashboard-stats - Get dashboard statistics
export async function GET() {
  try {
    // Check and reset time-based counters first
    await checkAndResetTimeBasedCounters();

    // Get counter data from new counter system
    const countersResult = await getAllCounters();
    
    if (!countersResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch counter data' 
        },
        { status: 500 }
      );
    }

    const counters = countersResult.counters || {};
    
    // Also get booking data for fallback calculations
    const [bookingsResult, manualBookingsResult, cancelledBookingsResult, incompleteBookingsResult] = await Promise.all([
      database.getAllBookings(),
      database.getAllManualBookings(),
      database.getAllCancelledBookings(),
      database.getAllIncompleteBookings()
    ]);

    const allBookings: any[] = bookingsResult.bookings || [];
    const manualBookings: any[] = manualBookingsResult.manualBookings || [];
    const cancelledBookings: any[] = cancelledBookingsResult.cancelledBookings || [];
    const incompleteBookings: any[] = incompleteBookingsResult.incompleteBookings || [];

    // Get current date and calculate date ranges (IST timezone)
    const now = new Date();
    const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    
    const today = new Date(istNow.getFullYear(), istNow.getMonth(), istNow.getDate());
    
    // Start of current week (Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    // Start of current month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Start of current year
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    
    
    
    

    // Simple date parser with debug
    const parseBookingDate = (dateStr: string): Date | null => {
      if (!dateStr) return null;
      
      
      
      // Handle "Friday, October 3, 2025" format
      if (dateStr.includes(',')) {
        const parts = dateStr.split(', ');
        if (parts.length >= 3) {
          // "Friday, October 3, 2025" -> ["Friday", "October 3", "2025"]
          const monthDay = parts[1]; // "October 3"
          const year = parts[2]; // "2025"
          const fullDate = `${monthDay}, ${year}`; // "October 3, 2025"
          const parsed = new Date(fullDate);
          
          return parsed;
        } else if (parts.length >= 2) {
          const dateOnly = parts[1]; // "October 3, 2025"
          const parsed = new Date(dateOnly);
          
          return parsed;
        }
      }
      
      // Handle other formats
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        
        return parsed;
      }
      
      
      return null;
    };

    // Date comparison functions
    const isToday = (booking: any) => {
      if (!booking.date) return false;
      const bookingDate = parseBookingDate(booking.date);
      if (!bookingDate) return false;
      
      const bookingDay = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
      const isMatch = bookingDay.getTime() === today.getTime();
      
      
      
      return isMatch;
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
      
      // Check if booking is from current year (2025, 2026, etc.)
      const bookingYear = bookingDate.getFullYear();
      const currentYear = istNow.getFullYear();
      
      return bookingYear === currentYear;
    };

    // Filter functions for different booking types
    const confirmedBookings = allBookings.filter(b => b.status === 'confirmed');
    const manualFromRegular = allBookings.filter(b => b.status === 'manual');
    const completedBookings = allBookings.filter(b => b.status === 'completed');
    
    
    
    

    
    
    
    
    
    

    // Calculate statistics using new counter system
    const getCounterStats = (counterType: string, fallbackBookings: any[]) => {
      const counter = (counters as any)[counterType];
      
      if (counter && typeof counter === 'object') {
        return {
          today: counter.today || 0,
          thisWeek: counter.week || 0,
          thisMonth: counter.month || 0,
          thisYear: counter.year || 0,
          total: counter.total || 0
        };
      }
      
      // Fallback to booking calculations
      return {
        today: fallbackBookings.filter(isToday).length,
        thisWeek: fallbackBookings.filter(isThisWeek).length,
        thisMonth: fallbackBookings.filter(isThisMonth).length,
        thisYear: fallbackBookings.filter(isThisYear).length,
        total: fallbackBookings.length
      };
    };

    // Online Bookings = confirmed status bookings only
    const onlineBookingsStats = getCounterStats('confirmed', confirmedBookings);
    
    // Manual Bookings = manual bookings collection + manual status from regular bookings
    const allManualBookings = [...manualBookings, ...manualFromRegular];
    const manualBookingsStats = getCounterStats('manual', allManualBookings);
    
    // Completed Bookings = completed status bookings
    const completedBookingsStats = getCounterStats('completed', completedBookings);
    
    // Cancelled Bookings = cancelled bookings
    const cancelledBookingsStats = getCounterStats('cancelled', cancelledBookings);
    
    // Incomplete Bookings = incomplete bookings
    const incompleteBookingsStats = getCounterStats('incomplete', incompleteBookings);

    // Total Bookings must be cumulative (confirmed + manual) and must never decrease on completion
    const totalBookingsStats = {
      today: (onlineBookingsStats.today || 0) + (manualBookingsStats.today || 0),
      thisWeek: (onlineBookingsStats.thisWeek || 0) + (manualBookingsStats.thisWeek || 0),
      thisMonth: (onlineBookingsStats.thisMonth || 0) + (manualBookingsStats.thisMonth || 0),
      thisYear: (onlineBookingsStats.thisYear || 0) + (manualBookingsStats.thisYear || 0),
      total: (onlineBookingsStats.total || 0) + (manualBookingsStats.total || 0)
    };
    
    const stats = {
      onlineBookings: onlineBookingsStats,
      manualBookings: manualBookingsStats,
      completedBookings: completedBookingsStats,
      cancelledBookings: cancelledBookingsStats,
      incompleteBookings: incompleteBookingsStats,
      allBookings: totalBookingsStats,
      activeHalls: {
        total: 4 // Fixed number of theaters
      },
      confirmedToday: {
        confirmed: onlineBookingsStats.today + manualBookingsStats.today,
        completed: completedBookingsStats.today
      },
      unreadInquiries: {
        total: 0, // Placeholder - no inquiry system yet
        today: 0
      }
    };

    

    return NextResponse.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch dashboard statistics' 
      },
      { status: 500 }
    );
  }
}

