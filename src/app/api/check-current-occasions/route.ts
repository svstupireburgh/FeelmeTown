import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

export async function GET(request: NextRequest) {
  try {
    
    
    // Connect to database
    const connectionResult = await database.connect();
    if (!connectionResult.success) {
      throw new Error('Database connection failed');
    }

    const db = database.db();
    if (!db) {
      throw new Error('Database instance not available');
    }

    // Get all occasions from database
    const collection = db.collection('occasions');
    const occasions = await collection.find({}).toArray();

    

    // Analyze each occasion
    const occasionAnalysis = occasions.map((occasion, index) => {
      
      
      
      
      

      return {
        name: occasion.name,
        occasionId: occasion.occasionId,
        requiredFields: occasion.requiredFields || [],
        fieldLabels: occasion.fieldLabels || {},
        isActive: occasion.isActive,
        popular: occasion.popular,
        hasRequiredFields: !!(occasion.requiredFields && occasion.requiredFields.length > 0),
        hasFieldLabels: !!(occasion.fieldLabels && Object.keys(occasion.fieldLabels).length > 0)
      };
    });

    // Summary statistics
    const summary = {
      totalOccasions: occasions.length,
      occasionsWithRequiredFields: occasionAnalysis.filter(occ => occ.hasRequiredFields).length,
      occasionsWithFieldLabels: occasionAnalysis.filter(occ => occ.hasFieldLabels).length,
      activeOccasions: occasionAnalysis.filter(occ => occ.isActive).length,
      popularOccasions: occasionAnalysis.filter(occ => occ.popular).length
    };

    
    
    
    
    
    

    return NextResponse.json({
      success: true,
      message: 'Current occasions analysis complete',
      summary,
      occasions: occasionAnalysis,
      rawOccasions: occasions
    });

  } catch (error: any) {
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to check current occasions'
    }, { status: 500 });
  }
}

