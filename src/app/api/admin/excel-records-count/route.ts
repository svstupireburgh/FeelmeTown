import { NextRequest, NextResponse } from 'next/server';
import { ExportsStorage } from '@/lib/exports-storage';

// GET /api/admin/excel-records-count
// Fetch record counts from JSON files
export async function GET(request: NextRequest) {
  try {
    const records = [];
    
    // Completed bookings count
    try {
      const completedBookings = await ExportsStorage.readArray('completed-bookings.json');
      records.push({
        _id: 'completed',
        type: 'completed',
        filename: 'completed_bookings.xlsx',
        totalRecords: completedBookings.length,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (err) {
      records.push({
        _id: 'completed',
        type: 'completed',
        filename: 'completed_bookings.xlsx',
        totalRecords: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Manual bookings count (from JSON file)
    try {
      const manual = await ExportsStorage.readManual('manual-bookings.json');
      const manualCount = manual.records?.length || 0;
      records.push({
        _id: 'manual',
        type: 'manual',
        filename: 'manual_bookings.xlsx',
        totalRecords: manualCount,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (err) {
      records.push({
        _id: 'manual',
        type: 'manual',
        filename: 'manual_bookings.xlsx',
        totalRecords: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Cancelled bookings count
    try {
      const cancelledBookings = await ExportsStorage.readArray('cancelled-bookings.json');
      records.push({
        _id: 'cancelled',
        type: 'cancelled',
        filename: 'cancelled_bookings.xlsx',
        totalRecords: cancelledBookings.length,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (err) {
      records.push({
        _id: 'cancelled',
        type: 'cancelled',
        filename: 'cancelled_bookings.xlsx',
        totalRecords: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    return NextResponse.json({
      success: true,
      records
    });
    
  } catch (error) {
    console.error('❌ Error fetching excel records count:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch records count'
    }, { status: 500 });
  }
}

