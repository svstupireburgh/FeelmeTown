import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// POST /api/admin/init-staff-counters - Initialize staff counters in database
export async function POST(request: NextRequest) {
  try {
    

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

    // Get all staff from database
    const staffResult = await database.getAllStaff();
    const allStaff = staffResult || [];
    
    

    // Create staff_counters collection
    const staffCountersCollection = db.collection('staff_counters');
    
    // Initialize counters for each staff
    const initPromises = allStaff.map(async (staff: any) => {
      const staffId = staff._id || staff.id;
      const staffName = staff.name || 'Unknown Staff';
      
      // Check if counter already exists
      const existingCounter = await staffCountersCollection.findOne({ staffId: staffId });
      
      if (!existingCounter) {
        // Create new counter for this staff
        const counterDoc = {
          staffId: staffId,
          staffName: staffName,
          staffEmail: staff.email || '',
          staffUserId: staff.userId || '',
          counters: {
            today: 0,
            thisWeek: 0,
            thisMonth: 0,
            thisYear: 0,
            total: 0
          },
          lastUpdated: new Date(),
          createdAt: new Date()
        };
        
        await staffCountersCollection.insertOne(counterDoc);
        
        return { staffId, staffName, action: 'created' };
      } else {
        
        return { staffId, staffName, action: 'exists' };
      }
    });

    const results = await Promise.all(initPromises);
    
    const created = results.filter(r => r.action === 'created').length;
    const existing = results.filter(r => r.action === 'exists').length;

    

    return NextResponse.json({
      success: true,
      message: 'Staff counters initialized successfully',
      totalStaff: allStaff.length,
      countersCreated: created,
      countersExisting: existing,
      results: results
    });

  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to initialize staff counters' },
      { status: 500 }
    );
  }
}

// GET /api/admin/init-staff-counters - Get staff counters info
export async function GET() {
  try {
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

    // Get all staff counters
    const staffCountersCollection = db.collection('staff_counters');
    const allCounters = await staffCountersCollection.find({}).toArray();
    
    // Get all staff
    const staffResult = await database.getAllStaff();
    const allStaff = staffResult || [];

    return NextResponse.json({
      success: true,
      totalStaff: allStaff.length,
      totalCounters: allCounters.length,
      counters: allCounters.map(counter => ({
        staffId: counter.staffId,
        staffName: counter.staffName,
        counters: counter.counters,
        lastUpdated: counter.lastUpdated
      })),
      message: 'Staff counters retrieved successfully'
    });

  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to get staff counters' },
      { status: 500 }
    );
  }
}

