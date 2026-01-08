import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mock-db';

// GET /api/items - Get all items or filter by category
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    
    const items = db.getItems(category || undefined);
    
    return NextResponse.json({
      success: true,
      items: items,
      total: items.length,
      category: category || 'all'
    });

  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch items' 
      },
      { status: 500 }
    );
  }
}

