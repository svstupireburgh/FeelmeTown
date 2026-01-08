import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-connect';

export async function GET(request: NextRequest) {
  try {
    
    
    const connectionResult = await connectToDatabase();
    if (!connectionResult.success) {
      
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }
    

    // Get the database instance and use getAllOccasions method
    const db = await import('@/lib/db-connect').then(module => module.default);
    if (!db) {
      
      return NextResponse.json(
        { success: false, error: 'Database instance not available' },
        { status: 500 }
      );
    }
    

    // Fetch occasions from database
    
    const occasions = await db.getAllOccasions();
    

    // If no occasions in database, return empty array with message
    if (!occasions || occasions.length === 0) {
      
      return NextResponse.json({
        success: true,
        occasions: [],
        message: 'No occasions found in database. Please add occasions from admin panel.'
      });
    }

    
    
    // Transform database occasions to match expected format
    const transformedOccasions = occasions.map((occasion, index) => {
      
      
      // Generate field labels from field names if not provided
      let fieldLabels: { [key: string]: string } = occasion.fieldLabels || {};
      let requiredFieldKeys: string[] = [];
      
      // Check if requiredFields exist and process them
      if (occasion.requiredFields && occasion.requiredFields.length > 0) {
        occasion.requiredFields.forEach((fieldName: string) => {
          // Check if fieldName is already camelCase (doesn't have spaces)
          const hasSpaces = fieldName.includes(' ');
          
          if (hasSpaces) {
            // Field name is a full label (e.g., "Nickname of Bride to be")
            // Convert to camelCase for the key
            const camelCaseKey = fieldName
              .split(' ')
              .map((word, index) => 
                index === 0 
                  ? word.toLowerCase() 
                  : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              )
              .join('');
            
            fieldLabels[camelCaseKey] = fieldName;
            requiredFieldKeys.push(camelCaseKey);
          } else {
            // Field name is already a key (e.g., "wifeName")
            // Use it as-is
            requiredFieldKeys.push(fieldName);
            // If label doesn't exist, use the key as label
            if (!fieldLabels[fieldName]) {
              fieldLabels[fieldName] = fieldName;
            }
          }
        });
      }

      const transformed = {
        _id: occasion._id,
        occasionId: occasion.occasionId,
        name: occasion.name,
        icon: occasion.imageUrl || occasion.icon || `/images/occasion/${occasion.name.replace(/\s+/g, '%20')}.jpg`,
        popular: occasion.popular || false,
        requiredFields: requiredFieldKeys, // Use processed camelCase keys
        fieldLabels: fieldLabels,
        isActive: occasion.isActive !== undefined ? occasion.isActive : true,
        includeInDecoration: occasion.includeInDecoration === true
      };
      
      
      
      return transformed;
    });

    
    
    return NextResponse.json({
      success: true,
      occasions: transformedOccasions,
      message: `Successfully loaded ${transformedOccasions.length} occasions from database`,
      debug: {
        totalOccasions: transformedOccasions.length,
        occasionNames: transformedOccasions.map(o => o.name)
      }
    });

  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch occasions' },
      { status: 500 }
    );
  }
}
