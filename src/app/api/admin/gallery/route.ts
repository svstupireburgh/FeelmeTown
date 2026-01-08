import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// GET /api/admin/gallery - Get all gallery images
export async function GET() {
  try {
    const result = await database.getAllGalleryImages();
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      images: result.images,
      total: result.total
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch gallery images' },
      { status: 500 }
    );
  }
}

// POST /api/admin/gallery - Add new gallery image
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Image URL is required' },
        { status: 400 }
      );
    }
    
    const result = await database.saveGalleryImage(body);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Gallery image added successfully',
      imageId: result.imageId
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to add gallery image' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/gallery - Delete gallery image
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');
    const imageUrl = searchParams.get('imageUrl');
    
    if (!imageId) {
      return NextResponse.json(
        { success: false, error: 'Image ID is required' },
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
    
    // Delete from database
    const result = await database.deleteGalleryImage(imageId);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Gallery image deleted successfully from database and Cloudinary'
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to delete gallery image' },
      { status: 500 }
    );
  }
}

