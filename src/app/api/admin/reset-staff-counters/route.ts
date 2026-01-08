import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// POST /api/admin/reset-staff-counters - Reset staff booking counters
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { staffId, resetType } = body;
    
    

    // Ensure database connection
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
    
    if (resetType === 'all_staff') {
      // Reset all staff counters by clearing manual_booking collection
      
      
      const manualBookingCollection = db.collection('manual_booking');
      const deleteResult = await manualBookingCollection.deleteMany({});
      
      
      
      // Also clear manual bookings from main booking collection
      const mainBookingCollection = db.collection('booking');
      const mainDeleteResult = await mainBookingCollection.deleteMany({
        $or: [
          { isManualBooking: true },
          { bookingType: 'Manual' },
          { status: 'manual' }
        ]
      });
      
      
      
      // Reset manual booking counters in counters collection
      const countersCollection = db.collection('counters');
      const counterResetResult = await countersCollection.updateOne(
        { type: 'manual' },
        {
          $set: {
            daily: 0,
            weekly: 0,
            monthly: 0,
            yearly: 0,
            total: 0,
            lastReset: new Date()
          }
        },
        { upsert: true }
      );
      
      
      
      return NextResponse.json({
        success: true,
        message: 'All staff booking counters reset successfully',
        deletedManualBookings: deleteResult.deletedCount,
        deletedMainBookings: mainDeleteResult.deletedCount,
        resetCounters: true
      });
      
    } else if (staffId) {
      // Reset specific staff counters
      
      
      // Delete manual bookings for specific staff
      const manualBookingCollection = db.collection('manual_booking');
      const deleteResult = await manualBookingCollection.deleteMany({
        $or: [
          { staffId: staffId },
          { createdBy: staffId }
        ]
      });
      
      
      
      // Delete manual bookings from main collection for specific staff
      const mainBookingCollection = db.collection('booking');
      const mainDeleteResult = await mainBookingCollection.deleteMany({
        $and: [
          {
            $or: [
              { isManualBooking: true },
              { bookingType: 'Manual' },
              { status: 'manual' }
            ]
          },
          {
            $or: [
              { staffId: staffId },
              { createdBy: staffId }
            ]
          }
        ]
      });
      
      
      
      return NextResponse.json({
        success: true,
        message: `Staff ${staffId} booking counters reset successfully`,
        staffId: staffId,
        deletedManualBookings: deleteResult.deletedCount,
        deletedMainBookings: mainDeleteResult.deletedCount
      });
      
    } else {
      return NextResponse.json(
        { success: false, error: 'Either staffId or resetType=all_staff is required' },
        { status: 400 }
      );
    }

  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to reset staff counters' },
      { status: 500 }
    );
  }
}

// GET /api/admin/reset-staff-counters - Get reset options
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Staff Counter Reset API',
    options: {
      resetAllStaff: 'POST with { "resetType": "all_staff" }',
      resetSpecificStaff: 'POST with { "staffId": "STAFF_ID" }'
    },
    examples: [
      {
        description: 'Reset all staff counters',
        method: 'POST',
        body: { resetType: 'all_staff' }
      },
      {
        description: 'Reset specific staff counter',
        method: 'POST', 
        body: { staffId: 'STAFF_ID_HERE' }
      }
    ]
  });
}

