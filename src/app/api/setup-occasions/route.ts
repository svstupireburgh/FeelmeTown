import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

export async function POST(request: NextRequest) {
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

    // Complete occasions data with required fields
    const occasionsData = [
      {
        occasionId: 'anniversary',
        name: 'Anniversary',
        imageUrl: '/images/occasions/anniversary.jpg',
        popular: true,
        isActive: true,
        requiredFields: ['wifeName', 'husbandName'],
        fieldLabels: {
          'wifeName': 'Wife Name',
          'husbandName': 'Husband Name'
        }
      },
      {
        occasionId: 'birthday',
        name: 'Birthday Party',
        imageUrl: '/images/occasions/birthday.jpg',
        popular: true,
        isActive: true,
        requiredFields: ['birthdayPersonName'],
        fieldLabels: {
          'birthdayPersonName': 'Birthday Person Name'
        }
      },
      {
        occasionId: 'proposal',
        name: 'Marriage Proposal',
        imageUrl: '/images/occasions/proposal.jpg',
        popular: true,
        isActive: true,
        requiredFields: ['proposerName', 'partnerName'],
        fieldLabels: {
          'proposerName': 'Proposer Name',
          'partnerName': 'Partner Name'
        }
      },
      {
        occasionId: 'valentine',
        name: 'Valentine',
        imageUrl: '/images/occasions/valentine.jpg',
        popular: true,
        isActive: true,
        requiredFields: ['valentinePersonName'],
        fieldLabels: {
          'valentinePersonName': 'Valentine Person Name'
        }
      },
      {
        occasionId: 'baby-shower',
        name: 'Baby Shower',
        imageUrl: '/images/occasions/baby-shower.jpg',
        popular: false,
        isActive: true,
        requiredFields: ['motherName'],
        fieldLabels: {
          'motherName': 'Mother Name'
        }
      },
      {
        occasionId: 'bride-to-be',
        name: 'Bride to be',
        imageUrl: '/images/occasions/bride-to-be.jpg',
        popular: false,
        isActive: true,
        requiredFields: ['brideName'],
        fieldLabels: {
          'brideName': 'Bride Name'
        }
      },
      {
        occasionId: 'congratulations',
        name: 'Congratulations',
        imageUrl: '/images/occasions/congratulations.jpg',
        popular: false,
        isActive: true,
        requiredFields: ['personName'],
        fieldLabels: {
          'personName': 'Person Name'
        }
      },
      {
        occasionId: 'farewell',
        name: 'Farewell',
        imageUrl: '/images/occasions/farewell.jpg',
        popular: false,
        isActive: true,
        requiredFields: ['personName'],
        fieldLabels: {
          'personName': 'Person Name'
        }
      },
      {
        occasionId: 'romantic-date',
        name: 'Romantic Date',
        imageUrl: '/images/occasions/romantic-date.jpg',
        popular: true,
        isActive: true,
        requiredFields: ['partner1Name', 'partner2Name'],
        fieldLabels: {
          'partner1Name': 'Partner 1 Name',
          'partner2Name': 'Partner 2 Name'
        }
      },
      {
        occasionId: 'custom',
        name: 'Custom Celebration',
        imageUrl: '/images/occasions/custom.jpg',
        popular: false,
        isActive: true,
        requiredFields: ['celebrationDetails'],
        fieldLabels: {
          'celebrationDetails': 'Celebration Details'
        }
      }
    ];

    const collection = db.collection('occasions');
    
    // Clear existing occasions
    await collection.deleteMany({});
    

    // Insert new occasions with required fields
    const result = await collection.insertMany(occasionsData);
    

    // Log each occasion for verification
    
    occasionsData.forEach((occasion, index) => {
      
      
      
    });

    return NextResponse.json({
      success: true,
      message: 'All occasions with required fields added to database successfully',
      occasionsCount: result.insertedCount,
      occasions: occasionsData.map(occ => ({
        name: occ.name,
        requiredFields: occ.requiredFields,
        fieldLabels: occ.fieldLabels
      }))
    });

  } catch (error: any) {
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to setup occasions'
    }, { status: 500 });
  }
}

