import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// PUT /api/admin/theaters/reorder - Bulk update displayOrder for theaters
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderUpdates } = body || {};

    // Validate payload
    if (!Array.isArray(orderUpdates) || orderUpdates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'orderUpdates array is required' },
        { status: 400 }
      );
    }

    // Basic schema validation
    for (const item of orderUpdates) {
      if (
        !item ||
        typeof item.theaterId !== 'string' ||
        typeof item.displayOrder !== 'number' ||
        item.displayOrder < 1
      ) {
        return NextResponse.json(
          { success: false, error: 'Invalid orderUpdates item format' },
          { status: 400 }
        );
      }
    }

    const result = await database.reorderTheaters(orderUpdates);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to reorder theaters' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Theater order updated' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to process reorder request' },
      { status: 500 }
    );
  }
}