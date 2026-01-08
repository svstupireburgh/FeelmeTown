import { NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// GET /api/theaters-dynamic - Get real-time theater and time slot data from database
export async function GET() {
  try {
    console.log('🎭 Fetching dynamic theater and time slot data...');
    
    // Fetch theaters and time slots from database
    const [theatersResult, timeSlotsResult] = await Promise.all([
      database.getAllTheaters().catch(() => ({ success: false, theaters: [] })),
      database.getAllTimeSlots().catch(() => ({ success: false, timeSlots: [] }))
    ]);

    // Process theater data with all available fields
    const theaterList: any[] = Array.isArray((theatersResult as any).theaters) ? (theatersResult as any).theaters : [];
    const theaters = theatersResult.success && theaterList.length > 0 
      ? theaterList.map((theater: any) => ({
          id: theater.theaterId || theater.id,
          name: theater.name,
          type: theater.type,
          price: theater.price,
          capacity: theater.capacity,
          features: theater.features || [],
          description: theater.description,
          images: theater.images || [],
          isActive: theater.isActive,
          displayOrder: theater.displayOrder,
          createdAt: theater.createdAt,
          updatedAt: theater.updatedAt,
          // Include all available fields
          allFields: Object.keys(theater),
          rawData: theater
        }))
      : [];

    // Process time slots data
    const timeSlotList: any[] = Array.isArray((timeSlotsResult as any).timeSlots) ? (timeSlotsResult as any).timeSlots : [];
    const timeSlots = timeSlotsResult.success && timeSlotList.length > 0
      ? timeSlotList.map((slot: any) => ({
          id: slot._id,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isActive: slot.isActive,
          price: slot.price,
          description: slot.description
        }))
      : [];

    console.log('✅ Dynamic data fetched:', {
      theaters: theaters.length,
      timeSlots: timeSlots.length,
      theaterDetails: theaters.map((theater: any) => ({
        id: theater.id,
        name: theater.name,
        type: theater.type,
        price: theater.price,
        capacity: theater.capacity,
        features: theater.features,
        description: theater.description,
        images: theater.images,
        isActive: theater.isActive,
        displayOrder: theater.displayOrder,
        allFields: theater.allFields,
        hasRawData: !!theater.rawData
      }))
    });

    return NextResponse.json({
      success: true,
      data: {
        theaters,
        timeSlots,
        lastUpdated: new Date().toISOString(),
        source: 'database'
      },
      total: {
        theaters: theaters.length,
        timeSlots: timeSlots.length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching dynamic theater data:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch dynamic theater data',
        data: null
      },
      { status: 500 }
    );
  }
}
