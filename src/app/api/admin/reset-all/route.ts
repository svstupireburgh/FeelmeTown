import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// POST /api/admin/reset-all - Reset all counters and delete all data (for testing)
export async function POST(request: NextRequest) {
  try {
    
    
    // Get database connection
    if (!database.db) {
      await database.connectToDatabase();
    }
    
    const db = database.db();
    if (!db) {
      throw new Error('Database connection failed');
    }

    // Delete all collections
    const collections = [
      'booking',           // Main bookings
      'manual_booking',    // Manual bookings
      'cancelled_booking', // Cancelled bookings
      'incomplete_booking', // Incomplete bookings
      'counters'           // Counter data
    ];

    const deletedCounts: Record<string, number> = {};

    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const deleteResult = await collection.deleteMany({});
        deletedCounts[collectionName] = deleteResult.deletedCount;
        
      } catch (error) {
        
        deletedCounts[collectionName] = 0;
      }
    }

    // Reset all counters to zero
    
    
    const countersCollection = db.collection('counters');
    const resetCounters = {
      confirmed: {
        daily: 0,
        weekly: 0,
        monthly: 0,
        total: 0,
        lastResetDate: new Date().toISOString().split('T')[0]
      },
      manual: {
        daily: 0,
        weekly: 0,
        monthly: 0,
        total: 0,
        lastResetDate: new Date().toISOString().split('T')[0]
      },
      cancelled: {
        daily: 0,
        weekly: 0,
        monthly: 0,
        total: 0,
        lastResetDate: new Date().toISOString().split('T')[0]
      },
      completed: {
        daily: 0,
        weekly: 0,
        monthly: 0,
        total: 0,
        lastResetDate: new Date().toISOString().split('T')[0]
      }
    };

    await countersCollection.insertOne({
      _id: 'booking_counters',
      ...resetCounters,
      resetAt: new Date(),
      resetBy: 'admin'
    } as any);

    

    const totalDeleted = Object.values(deletedCounts).reduce((sum: number, count: number) => sum + count, 0);

    

    return NextResponse.json({
      success: true,
      message: 'Complete system reset successful',
      deletedCounts,
      totalDeleted,
      countersReset: true,
      timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    });

  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to reset system',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

