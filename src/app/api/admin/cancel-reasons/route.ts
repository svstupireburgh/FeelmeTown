import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// GET /api/admin/cancel-reasons - Get all cancel reasons from database
export async function GET() {
  try {
    console.log('📝 Fetching cancel reasons from database...');
    
    // Get all cancel reasons from database
    const result = await (database as any).getAllCancelReasons();
    
    if (!result.success) {
      console.error('❌ Failed to fetch cancel reasons from database:', result.error);
      return NextResponse.json({ 
        success: false, 
        error: result.error || 'Failed to fetch cancel reasons' 
      }, { status: 500 });
    }

    console.log(`✅ Retrieved ${result.total} cancel reasons from database`);

    return NextResponse.json({
      success: true,
      cancelReasons: result.cancelReasons,
      total: result.total,
      source: 'database'
    });
  } catch (error) {
    console.error('❌ GET Cancel Reasons API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch cancel reasons' 
    }, { status: 500 });
  }
}

// POST /api/admin/cancel-reasons - Create new cancel reason
export async function POST(request: NextRequest) {
  try {
    console.log('📝 Creating new cancel reason...');
    const body = await request.json();
    const { reason, category = 'General', description, isActive = true } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Cancel reason is required'
      }, { status: 400 });
    }

    console.log('📝 Creating new cancel reason:', reason.trim());

    // Save cancel reason to database
    const result = await (database as any).saveCancelReason({
      reason: reason.trim(),
      category: category.trim(),
      description: description || '',
      isActive
    });

    if (!result.success) {
      console.error('❌ Failed to save cancel reason to database:', result.error);
      return NextResponse.json({ 
        success: false, 
        error: result.error || 'Failed to save cancel reason' 
      }, { status: 500 });
    }

    console.log('✅ Cancel reason saved successfully:', result.cancelReason.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Cancel reason created successfully!',
      cancelReason: result.cancelReason,
      source: 'database'
    });
  } catch (error) {
    console.error('❌ POST Cancel Reasons API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create cancel reason' 
    }, { status: 500 });
  }
}

// PUT /api/admin/cancel-reasons - Update cancel reason
export async function PUT(request: NextRequest) {
  try {
    console.log('📝 Updating cancel reason...');
    const body = await request.json();
    const { id, reason, category, description, isActive } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Cancel reason ID is required for update'
      }, { status: 400 });
    }

    console.log('📝 Updating cancel reason:', id);

    // Update cancel reason in database
    const result = await (database as any).updateCancelReason(id, {
      ...(reason && { reason: reason.trim() }),
      ...(category && { category: category.trim() }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive })
    });

    if (!result.success) {
      console.error('❌ Failed to update cancel reason in database:', result.error);
      return NextResponse.json({ 
        success: false, 
        error: result.error || 'Failed to update cancel reason' 
      }, { status: 500 });
    }

    console.log('✅ Cancel reason updated successfully:', id);

    return NextResponse.json({
      success: true,
      message: 'Cancel reason updated successfully!',
      source: 'database'
    });
  } catch (error) {
    console.error('❌ PUT Cancel Reasons API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update cancel reason' 
    }, { status: 500 });
  }
}

// DELETE /api/admin/cancel-reasons - Delete cancel reason
export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ Deleting cancel reason...');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Cancel reason ID is required for deletion'
      }, { status: 400 });
    }

    console.log('🗑️ Deleting cancel reason:', id);

    // Delete cancel reason from database
    const result = await (database as any).deleteCancelReason(id);

    if (!result.success) {
      console.error('❌ Failed to delete cancel reason from database:', result.error);
      return NextResponse.json({ 
        success: false, 
        error: result.error || 'Failed to delete cancel reason' 
      }, { status: 500 });
    }

    console.log('✅ Cancel reason deleted successfully:', id);

    return NextResponse.json({
      success: true,
      message: 'Cancel reason deleted successfully!',
      source: 'database'
    });
  } catch (error) {
    console.error('❌ DELETE Cancel Reasons API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete cancel reason' 
    }, { status: 500 });
  }
}
