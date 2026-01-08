import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// GET /api/admin/theaters - Get all theaters
export async function GET() {
  try {
    const result = await database.getAllTheaters();
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      theaters: result.theaters,
      total: result.total
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch theaters' },
      { status: 500 }
    );
  }
}

// POST /api/admin/theaters - Create new theater
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.price || !body.capacity) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const result = await database.saveTheater(body);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Theater created successfully',
      theaterId: result.theaterId
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to create theater' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/theaters - Update theater
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const theaterIdFromQuery = searchParams.get('theaterId');
    
    const body = await request.json();
    const { theaterId: theaterIdFromBody, ...theaterData } = body;
    
    // Use theaterId from query parameter or body
    const theaterId = theaterIdFromQuery || theaterIdFromBody;
    
    // Debug logging to see what's being received
    console.log('🎭 API PUT /admin/theaters received:');
    console.log('   Theater ID (query):', theaterIdFromQuery);
    console.log('   Theater ID (body):', theaterIdFromBody);
    console.log('   Theater ID (final):', theaterId);
    console.log('   Theater Data:', theaterData);
    
    if (!theaterId) {
      return NextResponse.json(
        { success: false, error: 'Theater ID is required' },
        { status: 400 }
      );
    }
    
    const result = await database.updateTheater(theaterId, theaterData);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Theater updated successfully'
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to update theater' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/theaters - Delete theater
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const theaterId = searchParams.get('theaterId');
    
    if (!theaterId) {
      return NextResponse.json(
        { success: false, error: 'Theater ID is required' },
        { status: 400 }
      );
    }
    
    const result = await database.deleteTheater(theaterId);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
    
    // Delete all images from Cloudinary if they exist
    if (result.imageUrls && result.imageUrls.length > 0) {
      console.log(`🗑️ Deleting ${result.imageUrls.length} images from Cloudinary for theater ${theaterId}`);
      
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        
        // Delete all images in parallel
        const deletePromises = result.imageUrls.map(async (imageUrl: string) => {
          try {
            console.log(`🗑️ Deleting image from Cloudinary: ${imageUrl}`);
            
            const deleteImageResponse = await fetch(`${baseUrl}/api/admin/delete-cloudinary-image`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageUrl })
            });
            
            const deleteResult = await deleteImageResponse.json();
            
            if (deleteImageResponse.ok && deleteResult.success) {
              console.log(`✅ Successfully deleted image from Cloudinary: ${imageUrl}`);
            } else {
              console.error(`❌ Failed to delete image from Cloudinary: ${imageUrl}`, deleteResult);
            }
            
            return { success: deleteImageResponse.ok && deleteResult.success, url: imageUrl };
          } catch (error) {
            console.error(`❌ Error deleting image from Cloudinary: ${imageUrl}`, error);
            return { success: false, url: imageUrl, error: error };
          }
        });
        
        // Wait for all deletions to complete
        const deleteResults = await Promise.all(deletePromises);
        
        const successCount = deleteResults.filter(r => r.success).length;
        const failCount = deleteResults.filter(r => !r.success).length;
        
        console.log(`🗑️ Cloudinary deletion summary: ${successCount} successful, ${failCount} failed`);
        
      } catch (cloudinaryError) {
        console.error('❌ Error during Cloudinary deletion process:', cloudinaryError);
        // Don't fail the whole operation if Cloudinary delete fails
      }
    } else {
      console.log(`ℹ️ No Cloudinary images found to delete for theater ${theaterId}`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Theater deleted successfully'
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to delete theater' },
      { status: 500 }
    );
  }
}

