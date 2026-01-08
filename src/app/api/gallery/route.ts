import { NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// GET /api/gallery - Get all gallery images for public use
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
