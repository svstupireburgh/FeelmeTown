import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// GET /api/fetch-theaters - Fetch theater collection data from database
export async function GET(request: NextRequest) {
  try {
    console.log('🎭 Fetching theater collection from database...');
    
    // Get all theaters from database
    const result = await database.getAllTheaters();
    
    if (!result.success) {
      console.error('❌ Failed to fetch theaters:', result.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch theaters from database',
        details: result.error
      });
    }

    const theaters = result.theaters || [];
    console.log(`🎭 Successfully fetched ${theaters.length} theaters from database`);

    // Log each theater's basic info and time slots
    theaters.forEach((theater: any, index: number) => {
      console.log(`\n🎭 Theater ${index + 1}:`);
      console.log(`   Name: ${theater.name}`);
      console.log(`   ID: ${theater._id || theater.theaterId}`);
      console.log(`   Type: ${theater.type || 'Not specified'}`);
      console.log(`   Time Slots: ${(theater.timeSlots || []).length} slots`);
      
      if (theater.timeSlots && theater.timeSlots.length > 0) {
        console.log(`   Time Slots Data:`, theater.timeSlots);
      }
      
      console.log(`   Capacity: Min ${theater.capacity?.min || 'N/A'}, Max ${theater.capacity?.max || 'N/A'}`);
      console.log(`   Price: ${theater.basePrice || theater.price || 'N/A'}`);
      console.log(`   Features: ${(theater.whatsIncluded || theater.amenities || []).length} items`);
    });

    // Return formatted response
    return NextResponse.json({
      success: true,
      message: `Successfully fetched ${theaters.length} theaters from database`,
      count: theaters.length,
      theaters: theaters.map((theater: any, index: number) => ({
        // Basic Info
        index: index + 1,
        id: theater._id || theater.theaterId || `theater-${index + 1}`,
        name: theater.name || `Theater ${index + 1}`,
        type: theater.type || 'Standard',
        
        // Capacity
        capacity: {
          min: theater.capacity?.min || 2,
          max: theater.capacity?.max || 2
        },
        
        // Pricing
        basePrice: theater.basePrice || theater.price || 1399,
        
        // Time Slots (Raw Data)
        timeSlots: {
          count: (theater.timeSlots || []).length,
          data: theater.timeSlots || [],
          types: (theater.timeSlots || []).map((slot: any) => typeof slot)
        },
        
        // Features
        features: {
          whatsIncluded: theater.whatsIncluded || [],
          amenities: theater.amenities || [],
          count: (theater.whatsIncluded || theater.amenities || []).length
        },
        
        // Images
        images: {
          primary: theater.image || null,
          gallery: theater.images || [],
          hasImages: !!(theater.image || (theater.images && theater.images.length > 0))
        },
        
        // Location & Contact
        location: theater.location || {},
        contact: theater.contact || {},
        
        // Status
        isActive: theater.isActive !== false,
        
        // Timestamps
        createdAt: theater.createdAt,
        updatedAt: theater.updatedAt,
        
        // All available properties (for debugging)
        allProperties: Object.keys(theater),
        
        // Raw theater data (complete)
        rawData: theater
      })),
      
      // Summary statistics
      summary: {
        totalTheaters: theaters.length,
        theatersWithTimeSlots: theaters.filter((t: any) => t.timeSlots && t.timeSlots.length > 0).length,
        theatersWithImages: theaters.filter((t: any) => t.image || (t.images && t.images.length > 0)).length,
        theatersWithFeatures: theaters.filter((t: any) => (t.whatsIncluded && t.whatsIncluded.length > 0) || (t.amenities && t.amenities.length > 0)).length,
        activeTheaters: theaters.filter((t: any) => t.isActive !== false).length
      },
      
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching theater collection:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch theater collection from database',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}

// POST method to fetch specific theater by ID or name
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { theaterId, theaterName } = body;

    console.log('🎭 Fetching specific theater:', { theaterId, theaterName });

    // Get all theaters first
    const result = await database.getAllTheaters();
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch theaters from database'
      });
    }

    const theaters = result.theaters || [];
    
    // Find specific theater
    let targetTheater = null;
    if (theaterId) {
      targetTheater = theaters.find((t: any) => 
        t._id?.toString() === theaterId || 
        t.theaterId === theaterId ||
        t.id === theaterId
      );
    } else if (theaterName) {
      targetTheater = theaters.find((t: any) => 
        t.name === theaterName ||
        t.name.toLowerCase().includes(theaterName.toLowerCase())
      );
    }

    if (!targetTheater) {
      return NextResponse.json({
        success: false,
        error: 'Theater not found',
        availableTheaters: theaters.map((t: any) => ({
          id: t._id || t.theaterId,
          name: t.name
        }))
      });
    }

    console.log(`🎭 Found theater: ${targetTheater.name}`);
    console.log(`🎭 Time slots:`, targetTheater.timeSlots);

    return NextResponse.json({
      success: true,
      message: `Theater found: ${targetTheater.name}`,
      theater: {
        id: targetTheater._id || targetTheater.theaterId,
        name: targetTheater.name,
        type: targetTheater.type,
        capacity: targetTheater.capacity,
        price: targetTheater.basePrice || targetTheater.price,
        timeSlots: targetTheater.timeSlots,
        features: targetTheater.whatsIncluded || targetTheater.amenities,
        images: {
          primary: targetTheater.image,
          gallery: targetTheater.images
        },
        location: targetTheater.location,
        contact: targetTheater.contact,
        isActive: targetTheater.isActive,
        allProperties: Object.keys(targetTheater),
        rawData: targetTheater
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching specific theater:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch specific theater',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
