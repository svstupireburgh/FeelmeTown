import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

export async function GET() {
  try {
    const occasions = await database.getAllOccasions();
    
    return NextResponse.json({
      success: true,
      occasions: occasions
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch occasions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { name, imageUrl, requiredFields, includeInDecoration } = body;
    
    if (!name || !imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Name and image are required' },
        { status: 400 }
      );
    }

    const occasionData = {
      name,
      imageUrl,
      requiredFields: requiredFields || [],
      isActive: true,
      includeInDecoration: includeInDecoration === true
    };

    
    

    const result = await database.saveOccasion(occasionData);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Occasion added successfully',
      occasion: result.occasion
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to add occasion' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Occasion ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, imageUrl, requiredFields, isActive, includeInDecoration } = body;

    const updateData = {
      name,
      imageUrl,
      requiredFields: requiredFields || [],
      isActive: isActive !== undefined ? isActive : true,
      includeInDecoration: includeInDecoration === true
    };

    const result = await database.updateOccasion(id, updateData);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Occasion updated successfully',
      occasion: result.occasion
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to update occasion' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const imageUrl = searchParams.get('imageUrl');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Occasion ID is required' },
        { status: 400 }
      );
    }

    // Delete from Cloudinary if URL provided
    if (imageUrl) {
      try {
        const cloudinaryResponse = await fetch(`${request.nextUrl.origin}/api/admin/delete-cloudinary-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: imageUrl })
        });

        const cloudinaryData = await cloudinaryResponse.json();
        if (!cloudinaryData.success) {
          
        }
      } catch (error) {
        
      }
    }

    // Delete from database (soft delete)
    const result = await database.deleteOccasion(id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Occasion deleted successfully from database and Cloudinary'
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to delete occasion' },
      { status: 500 }
    );
  }
}

