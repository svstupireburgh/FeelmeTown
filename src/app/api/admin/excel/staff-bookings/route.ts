import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// GET /api/admin/excel/staff-bookings - Export staff bookings to Excel format
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId');
    const format = searchParams.get('format') || 'json'; // json or csv
    
    

    // Get all manual bookings
    const manualBookingsResult = await database.getAllManualBookings();
    const allManualBookings = manualBookingsResult.manualBookings || [];
    
    // Get main bookings (manual ones)
    const allBookingsResult = await database.getAllBookings();
    const allBookings = allBookingsResult.bookings || [];
    
    // Filter manual bookings from main collection
    const manualMainBookings = allBookings.filter((booking: any) => {
      const isManual = booking.isManualBooking === true || 
                      booking.bookingType === 'Manual' || 
                      booking.status === 'manual';
      return isManual;
    });
    
    // Combine all staff bookings
    let allStaffBookings = [...allManualBookings, ...manualMainBookings];
    
    // Remove duplicates based on bookingId
    const uniqueBookingIds = new Set();
    allStaffBookings = allStaffBookings.filter((booking: any) => {
      const bookingId = booking.bookingId || booking.id || booking._id;
      if (uniqueBookingIds.has(bookingId)) {
        return false;
      }
      uniqueBookingIds.add(bookingId);
      return true;
    });
    
    // Filter by staff ID if provided
    if (staffId && staffId !== 'all') {
      allStaffBookings = allStaffBookings.filter((booking: any) => {
        return booking.staffId === staffId || booking.createdBy === staffId;
      });
    }
    
    // Sort by date (newest first)
    allStaffBookings.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || a.date || 0);
      const dateB = new Date(b.createdAt || b.date || 0);
      return dateB.getTime() - dateA.getTime();
    });
    
    // Transform data for Excel format
    const excelData = allStaffBookings.map((booking: any, index: number) => ({
      'S.No': index + 1,
      'Booking ID': booking.bookingId || booking.id || 'N/A',
      'Staff ID': booking.staffId || booking.createdBy || 'N/A',
      'Staff Name': booking.staffName || booking.createdByName || 'Unknown Staff',
      'Customer Name': booking.name || booking.customerName || 'N/A',
      'Email': booking.email || 'N/A',
      'Phone': booking.phone || 'N/A',
      'Theater': booking.theaterName || booking.theater || 'N/A',
      'Date': booking.date || 'N/A',
      'Time': booking.time || 'N/A',
      'Occasion': booking.occasion || 'N/A',
      'People Count': booking.numberOfPeople || booking.peopleCount || 0,
      'Total Amount': booking.totalAmount || 0,
      'Status': booking.status || 'manual',
      'Booking Type': 'Manual Booking',
      'Created At': booking.createdAt ? new Date(booking.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A',
      'Updated At': booking.updatedAt ? new Date(booking.updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'
    }));
    
    if (format === 'csv') {
      // Generate CSV format
      if (excelData.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No staff bookings found for export'
        });
      }
      
      const headers = Object.keys(excelData[0]);
      const csvContent = [
        headers.join(','),
        ...excelData.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row];
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="staff-bookings-${staffId || 'all'}-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }
    
    // Return JSON format for frontend processing
    return NextResponse.json({
      success: true,
      data: excelData,
      totalBookings: excelData.length,
      staffId: staffId || 'all',
      exportedAt: new Date().toISOString(),
      summary: {
        totalBookings: excelData.length,
        uniqueStaff: [...new Set(excelData.map(booking => booking['Staff ID']))].length,
        dateRange: excelData.length > 0 ? {
          from: excelData[excelData.length - 1]['Created At'],
          to: excelData[0]['Created At']
        } : null
      }
    });

  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to export staff bookings' },
      { status: 500 }
    );
  }
}

// POST /api/admin/excel/staff-bookings - Save Excel data to database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingData, staffId, action } = body;
    
    
    
    if (action === 'save_to_excel_db') {
      // Save booking data to Excel tracking collection
      if (!database.db) {
        const connectionResult = await database.connect();
        if (!connectionResult.success) {
          throw new Error('Failed to connect to database');
        }
      }
      
      const db = database.db();
      if (!db) {
        throw new Error('Database connection failed');
      }
      
      const excelCollection = db.collection('excel_staff_bookings');
      
      // Create Excel entry
      const excelEntry = {
        bookingId: bookingData.bookingId || bookingData.id,
        staffId: staffId,
        staffName: bookingData.staffName || bookingData.createdByName,
        customerName: bookingData.name || bookingData.customerName,
        email: bookingData.email,
        phone: bookingData.phone,
        theaterName: bookingData.theaterName || bookingData.theater,
        date: bookingData.date,
        time: bookingData.time,
        occasion: bookingData.occasion,
        numberOfPeople: bookingData.numberOfPeople || bookingData.peopleCount,
        totalAmount: bookingData.totalAmount,
        status: bookingData.status || 'manual',
        bookingType: 'Manual Booking',
        originalBookingData: bookingData,
        excelCreatedAt: new Date(),
        excelUpdatedAt: new Date(),
        isExported: true
      };
      
      // Check if already exists
      const existingEntry = await excelCollection.findOne({
        bookingId: excelEntry.bookingId,
        staffId: staffId
      });
      
      if (existingEntry) {
        // Update existing entry
        await excelCollection.updateOne(
          { _id: existingEntry._id },
          { 
            $set: {
              ...excelEntry,
              excelUpdatedAt: new Date()
            }
          }
        );
        
        
      } else {
        // Create new entry
        const result = await excelCollection.insertOne(excelEntry);
        
      }
      
      return NextResponse.json({
        success: true,
        message: 'Booking data saved to Excel database',
        bookingId: excelEntry.bookingId,
        staffId: staffId
      });
    }
    
    if (action === 'get_excel_stats') {
      // Get Excel database statistics
      if (!database.db) {
        await database.connect();
      }
      
      const db = database.db();
      const excelCollection = db!.collection('excel_staff_bookings');
      
      const totalEntries = await excelCollection.countDocuments();
      const staffStats = await excelCollection.aggregate([
        {
          $group: {
            _id: '$staffId',
            count: { $sum: 1 },
            staffName: { $first: '$staffName' },
            totalAmount: { $sum: '$totalAmount' }
          }
        },
        { $sort: { count: -1 } }
      ]).toArray();
      
      return NextResponse.json({
        success: true,
        stats: {
          totalEntries,
          uniqueStaff: staffStats.length,
          staffBreakdown: staffStats
        }
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action specified' },
      { status: 400 }
    );

  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to process Excel booking data' },
      { status: 500 }
    );
  }
}

