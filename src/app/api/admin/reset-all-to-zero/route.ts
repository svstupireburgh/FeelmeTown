import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// POST /api/admin/reset-all-to-zero - Reset ALL counters to 0 (including Total)
export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await database.connect();
    
    const db = database.db();
    if (!db) {
      throw new Error('Database not connected');
    }
    
    const collection = db.collection('counters');
    
    // Get all counter types
    const counterTypes = ['confirmed', 'manual', 'completed', 'cancelled', 'incomplete'];
    
    
    
    // Reset each counter type to 0
    const resetPromises = counterTypes.map(async (counterType) => {
      const counterId = `${counterType}Counter`;
      
      await collection.updateOne(
        { _id: counterId as any },
        {
          $set: {
            dailyCount: 0,        // Reset daily
            weeklyCount: 0,       // Reset weekly  
            monthlyCount: 0,      // Reset monthly
            yearlyCount: 0,       // Reset yearly
            totalCount: 0,        // Reset total (FULL RESET)
            count: 0,             // Reset legacy count
            // Update reset dates to current date
            lastResetDay: new Date().getDate(),
            lastResetMonth: new Date().getMonth(),
            lastResetYear: new Date().getFullYear(),
            lastResetWeekDay: new Date(new Date().setDate(new Date().getDate() - new Date().getDay())).getDate(),
            lastResetWeekMonth: new Date(new Date().setDate(new Date().getDate() - new Date().getDay())).getMonth(),
            lastResetWeekYear: new Date(new Date().setDate(new Date().getDate() - new Date().getDay())).getFullYear()
          }
        },
        { upsert: true }
      );
      
      
    });
    
    await Promise.all(resetPromises);
    
    // Get updated counters to verify
    const countersResult = await database.getAllCounters();
    
    
    
    return NextResponse.json({
      success: true,
      message: 'ALL counters (including totals) have been reset to 0! Fresh start ready.',
      counters: countersResult.counters || {},
      resetType: 'FULL_RESET',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to reset all counters to 0' 
      },
      { status: 500 }
    );
  }
}

