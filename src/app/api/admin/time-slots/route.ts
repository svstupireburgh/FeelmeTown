import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// GET /api/admin/time-slots - Get all time slots
export async function GET() {
  try {
    const result = await database.getAllTimeSlots();
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      timeSlots: result.timeSlots,
      total: result.total
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch time slots' },
      { status: 500 }
    );
  }
}

// POST /api/admin/time-slots - Create new time slot
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.startTime || !body.endTime || !body.duration) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const result = await database.saveTimeSlot(body);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      timeSlot: result.timeSlot
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to create time slot' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/time-slots - Update time slot
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.slotId) {
      return NextResponse.json(
        { success: false, error: 'Slot ID is required' },
        { status: 400 }
      );
    }
    
    const result = await database.updateTimeSlot(body.slotId, body);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      timeSlot: result.timeSlot
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to update time slot' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/time-slots - Delete time slot
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slotId = searchParams.get('slotId');
    
    if (!slotId) {
      return NextResponse.json(
        { success: false, error: 'Slot ID is required' },
        { status: 400 }
      );
    }
    
    const result = await database.deleteTimeSlot(slotId);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Time slot deleted successfully'
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to delete time slot' },
      { status: 500 }
    );
  }
}


