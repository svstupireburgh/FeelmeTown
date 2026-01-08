import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

export async function GET(request: NextRequest) {
  try {
    
    
    // Connect to database
    const connectionResult = await database.connect();
    if (!connectionResult.success) {
      throw new Error('Database connection failed');
    }

    // Get latest 10 bookings to check occasion fields
    const db = database.db();
    if (!db) {
      throw new Error('Database instance not available');
    }

    const collection = db.collection('booking');
    
    // Fetch latest bookings
    const latestBookings = await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    

    // Analyze each booking for occasion fields
    const analysisResults = [];

    for (const booking of latestBookings) {
      
      
      const analysis: {
        bookingId?: string;
        name: any;
        occasion: any;
        createdAt: any;
        hasCompressedData: boolean;
        occasionFields: Record<string, any>;
        dynamicFields: Record<string, { label: unknown; value: unknown }>;
        legacyFields: Record<string, unknown>;
        allFields: string[];
      } = {
        bookingId: booking.bookingId || booking._id?.toString(),
        name: booking.name,
        occasion: booking.occasion,
        createdAt: booking.createdAt,
        hasCompressedData: !!booking.compressedData,
        occasionFields: {},
        dynamicFields: {},
        legacyFields: {},
        allFields: Object.keys(booking)
      };

      // Check for occasion-specific fields in uncompressed data
      const occasionFieldKeys = Object.keys(booking).filter(key => 
        key.endsWith('_label') || 
        key.endsWith('_value') ||
        (key !== 'occasion' && key.includes('Name') && !['name', 'theaterName', 'staffName'].includes(key)) ||
        key.includes('Gender') ||
        key.includes('Partner') ||
        key.includes('Proposer') ||
        key.includes('Birthday') ||
        key.includes('Valentine') ||
        key.includes('Celebration')
      );

      // Categorize fields
      occasionFieldKeys.forEach(key => {
        const value = booking[key];
        if (key.endsWith('_label')) {
          const baseKey = key.replace('_label', '');
          analysis.dynamicFields[key] = {
            label: value,
            value: booking[baseKey] || booking[`${baseKey}_value`] || 'Not found'
          };
        } else if (!key.endsWith('_value')) {
          analysis.legacyFields[key] = value;
        }
      });

      // Check compressed data if available
      if (booking.compressedData) {
        try {
          // Note: We can't easily decompress here without the decompression function
          // But we can check if compressed data exists
          analysis.occasionFields.compressedDataSize = booking.compressedData.length;
        } catch (error) {
          
        }
      }

      
      
      
      
      analysisResults.push(analysis);
    }

    // Get occasions from database to compare expected vs actual fields
    const occasions = await database.getAllOccasions();
    const occasionFieldMap: Record<string, { requiredFields: any[]; fieldLabels: Record<string, any> }> = {};
    
    occasions.forEach(occ => {
      occasionFieldMap[occ.name] = {
        requiredFields: occ.requiredFields || [],
        fieldLabels: occ.fieldLabels || {}
      };
    });

    

    return NextResponse.json({
      success: true,
      message: 'Database occasion fields verification complete',
      totalBookings: latestBookings.length,
      occasionFieldMap,
      bookingAnalysis: analysisResults,
      summary: {
        bookingsWithDynamicFields: analysisResults.filter(b => Object.keys(b.dynamicFields).length > 0).length,
        bookingsWithLegacyFields: analysisResults.filter(b => Object.keys(b.legacyFields).length > 0).length,
        bookingsWithCompressedData: analysisResults.filter(b => b.hasCompressedData).length
      }
    });

  } catch (error) {
    
    const err = error as any;
    return NextResponse.json({
      success: false,
      error: (err && err.message) ? err.message : 'Failed to check occasion fields'
    }, { status: 500 });
  }
}

