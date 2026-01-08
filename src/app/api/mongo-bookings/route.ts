import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// GET /api/mongo-bookings - Get booking data from MongoDB collections
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'cancelled' | 'completed' | 'all'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;
    const search = searchParams.get('search');
    
    console.log(`📋 Fetching ${type || 'all'} bookings from MongoDB...`);
    
    const results: any = {};
    
    // Get cancelled bookings
    if (!type || type === 'cancelled' || type === 'all') {
      const cancelledResult = await database.getAllCancelledBookings();
      if (cancelledResult.success) {
        let bookings = cancelledResult.cancelledBookings || [];
        
        // Apply search filter
        if (search) {
          bookings = bookings.filter((booking: any) => 
            booking.bookingId?.toLowerCase().includes(search.toLowerCase()) ||
            booking.email?.toLowerCase().includes(search.toLowerCase()) ||
            booking.name?.toLowerCase().includes(search.toLowerCase()) ||
            booking.phone?.includes(search)
          );
        }
        
        // Apply pagination
        const total = bookings.length;
        if (offset !== undefined) {
          bookings = bookings.slice(offset);
        }
        if (limit !== undefined) {
          bookings = bookings.slice(0, limit);
        }
        
        results.cancelled = {
          bookings: bookings,
          total: total,
          count: bookings.length
        };
        
        console.log(`✅ Found ${total} cancelled bookings in MongoDB`);
      }
    }
    
    // Get completed bookings
    if (!type || type === 'completed' || type === 'all') {
      const completedResult = await database.getAllCompletedBookings();
      if (completedResult.success) {
        let bookings = completedResult.completedBookings || [];
        
        // Apply search filter
        if (search) {
          bookings = bookings.filter((booking: any) => 
            booking.bookingId?.toLowerCase().includes(search.toLowerCase()) ||
            booking.email?.toLowerCase().includes(search.toLowerCase()) ||
            booking.name?.toLowerCase().includes(search.toLowerCase()) ||
            booking.phone?.includes(search)
          );
        }
        
        // Apply pagination
        const total = bookings.length;
        if (offset !== undefined) {
          bookings = bookings.slice(offset);
        }
        if (limit !== undefined) {
          bookings = bookings.slice(0, limit);
        }
        
        results.completed = {
          bookings: bookings,
          total: total,
          count: bookings.length
        };
        
        console.log(`✅ Found ${total} completed bookings in MongoDB`);
      }
    }
    
    return NextResponse.json({
      success: true,
      data: results,
      source: 'mongodb',
      filters: {
        type: type || 'all',
        limit,
        offset,
        search
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching bookings from MongoDB:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/mongo-bookings - Search or get statistics
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, query, type } = body;
    
    if (action === 'search') {
      console.log(`🔍 Searching bookings in MongoDB for: ${query}`);
      
      const results: any = {};
      
      // Search cancelled bookings
      if (!type || type === 'cancelled') {
        const cancelledResult = await database.getAllCancelledBookings();
        if (cancelledResult.success) {
          results.cancelled = (cancelledResult.cancelledBookings || []).filter((booking: any) => 
            booking.bookingId?.toLowerCase().includes(query.toLowerCase()) ||
            booking.email?.toLowerCase().includes(query.toLowerCase()) ||
            booking.name?.toLowerCase().includes(query.toLowerCase()) ||
            booking.phone?.includes(query)
          );
        }
      }
      
      // Search completed bookings
      if (!type || type === 'completed') {
        const completedResult = await database.getAllCompletedBookings();
        if (completedResult.success) {
          results.completed = (completedResult.completedBookings || []).filter((booking: any) => 
            booking.bookingId?.toLowerCase().includes(query.toLowerCase()) ||
            booking.email?.toLowerCase().includes(query.toLowerCase()) ||
            booking.name?.toLowerCase().includes(query.toLowerCase()) ||
            booking.phone?.includes(query)
          );
        }
      }
      
      console.log(`✅ Search completed in MongoDB`);
      return NextResponse.json({
        success: true,
        results: results,
        query: query,
        type: type || 'all'
      });
      
    } else if (action === 'stats') {
      console.log('📊 Getting booking statistics from MongoDB...');
      
      // Get all bookings for statistics
      const [cancelledResult, completedResult] = await Promise.all([
        database.getAllCancelledBookings(),
        database.getAllCompletedBookings()
      ]);
      
      const cancelledBookings = cancelledResult.success ? cancelledResult.cancelledBookings || [] : [];
      const completedBookings = completedResult.success ? completedResult.completedBookings || [] : [];
      
      // Calculate date-based statistics
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      
      const getDateStats = (bookings: any[], dateField: string) => {
        return {
          today: bookings.filter(b => {
            const bookingDate = new Date(b[dateField]);
            return bookingDate >= today;
          }).length,
          this_week: bookings.filter(b => {
            const bookingDate = new Date(b[dateField]);
            return bookingDate >= startOfWeek;
          }).length,
          this_month: bookings.filter(b => {
            const bookingDate = new Date(b[dateField]);
            return bookingDate >= startOfMonth;
          }).length,
          this_year: bookings.filter(b => {
            const bookingDate = new Date(b[dateField]);
            return bookingDate >= startOfYear;
          }).length,
          total: bookings.length
        };
      };
      
      const stats = {
        cancelled: getDateStats(cancelledBookings, 'cancelledAt'),
        completed: getDateStats(completedBookings, 'completedAt')
      };
      
      console.log('✅ Statistics calculated from MongoDB');
      return NextResponse.json({
        success: true,
        stats: stats,
        source: 'mongodb'
      });
      
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action'
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('❌ Error processing booking request:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
