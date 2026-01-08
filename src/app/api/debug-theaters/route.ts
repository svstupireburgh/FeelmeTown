import { NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// GET /api/debug-theaters - Show theater collection data structure
export async function GET() {
  try {
    console.log('🔍 Debugging theater collection data...');
    
    // Get raw theater data from database
    const theatersResult = await database.getAllTheaters();
    
    if (!theatersResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch theaters',
        data: null
      });
    }

    const theaters: any[] = Array.isArray((theatersResult as any).theaters) ? (theatersResult as any).theaters : [];
    
    // Show detailed theater data structure
    const debugData = {
      totalTheaters: theaters.length,
      theaterStructure: theaters.map((theater: any, index: number) => ({
        index: index + 1,
        id: theater._id,
        theaterId: theater.theaterId,
        name: theater.name,
        type: theater.type,
        price: theater.price,
        capacity: theater.capacity,
        features: theater.features,
        description: theater.description,
        images: theater.images,
        isActive: theater.isActive,
        displayOrder: theater.displayOrder,
        createdAt: theater.createdAt,
        updatedAt: theater.updatedAt,
        // Show all available fields
        allFields: Object.keys(theater),
        // Show raw data structure
        rawData: theater
      })),
      // Show data types
      dataTypes: {
        name: typeof theaters[0]?.name,
        price: typeof theaters[0]?.price,
        capacity: typeof theaters[0]?.capacity,
        features: Array.isArray(theaters[0]?.features) ? 'array' : typeof theaters[0]?.features,
        images: Array.isArray(theaters[0]?.images) ? 'array' : typeof theaters[0]?.images,
        isActive: typeof theaters[0]?.isActive,
        displayOrder: typeof theaters[0]?.displayOrder
      },
      // Show sample theater data
      sampleTheater: theaters[0] || null
    };

    console.log('✅ Theater debug data:', {
      totalTheaters: theaters.length,
      sampleTheater: theaters[0] ? {
        name: theaters[0].name,
        price: theaters[0].price,
        capacity: theaters[0].capacity,
        features: theaters[0].features,
        images: theaters[0].images
      } : null
    });

    return NextResponse.json({
      success: true,
      message: 'Theater collection data retrieved successfully',
      data: debugData,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error debugging theater data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to debug theater data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
