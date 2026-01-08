import { NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// GET /api/admin/pricing - Get all pricing data from database
export async function GET() {
  try {
    console.log('📊 Fetching pricing data from database...');
    
    // Get all pricing data from database
    const result = await (database as any).getAllPricing();
    
    if (!result.success) {
      console.error('❌ Failed to fetch pricing from database:', result.error);
      return NextResponse.json({ 
        success: false, 
        error: result.error || 'Failed to fetch pricing data' 
      }, { status: 500 });
    }

    console.log(`✅ Retrieved ${result.total} pricing records from database`);

    return NextResponse.json({ 
      success: true, 
      pricing: result.pricing,
      total: result.total,
      source: 'database'
    });
  } catch (error) {
    console.error('❌ GET Admin Pricing API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch pricing data' 
    }, { status: 500 });
  }
}

// POST /api/admin/pricing - Create new pricing data
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, slotBookingFee, extraGuestFee, convenienceFee, decorationFees, isActive } = body;

    if (!name) {
      return NextResponse.json({ 
        success: false, 
        error: 'Pricing name is required' 
      }, { status: 400 });
    }

    console.log('💰 Creating new pricing data:', name);

    // Save pricing data to database
    const result = await (database as any).savePricing({
      name,
      description: description || '',
      slotBookingFee: Number(slotBookingFee) || 0,
      extraGuestFee: Number(extraGuestFee) || 0,
      convenienceFee: Number(convenienceFee) || 0,
      decorationFees: Number(decorationFees) || 0,
      isActive: isActive !== undefined ? isActive : true
    });

    if (!result.success) {
      console.error('❌ Failed to save pricing to database:', result.error);
      return NextResponse.json({ 
        success: false, 
        error: result.error || 'Failed to save pricing data' 
      }, { status: 500 });
    }

    console.log('✅ Pricing data saved successfully:', result.pricing.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Pricing data created successfully!', 
      pricing: result.pricing,
      source: 'database'
    });
  } catch (error) {
    console.error('❌ POST Pricing API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create pricing data' 
    }, { status: 500 });
  }
}

// PUT /api/admin/pricing - Update pricing data
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, description, slotBookingFee, extraGuestFee, convenienceFee, decorationFees, isActive } = body;

    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Pricing ID is required for update' 
      }, { status: 400 });
    }

    console.log('📝 Updating pricing data:', id);

    // Update pricing data in database
    const result = await (database as any).updatePricing(id, {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(slotBookingFee !== undefined && { slotBookingFee: Number(slotBookingFee) }),
      ...(extraGuestFee !== undefined && { extraGuestFee: Number(extraGuestFee) }),
      ...(convenienceFee !== undefined && { convenienceFee: Number(convenienceFee) }),
      ...(decorationFees !== undefined && { decorationFees: Number(decorationFees) }),
      ...(isActive !== undefined && { isActive })
    });

    if (!result.success) {
      console.error('❌ Failed to update pricing in database:', result.error);
      return NextResponse.json({ 
        success: false, 
        error: result.error || 'Failed to update pricing data' 
      }, { status: 500 });
    }

    console.log('✅ Pricing data updated successfully:', id);

    return NextResponse.json({ 
      success: true, 
      message: 'Pricing data updated successfully!', 
      source: 'database'
    });
  } catch (error) {
    console.error('❌ PUT Pricing API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update pricing data' 
    }, { status: 500 });
  }
}

// DELETE /api/admin/pricing - Delete pricing data
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Pricing ID is required for deletion' 
      }, { status: 400 });
    }

    console.log('🗑️ Deleting pricing data:', id);

    // Delete pricing data from database
    const result = await (database as any).deletePricing(id);

    if (!result.success) {
      console.error('❌ Failed to delete pricing from database:', result.error);
      return NextResponse.json({ 
        success: false, 
        error: result.error || 'Failed to delete pricing data' 
      }, { status: 500 });
    }

    console.log('✅ Pricing data deleted successfully:', id);

    return NextResponse.json({ 
      success: true, 
      message: 'Pricing data deleted successfully!', 
      source: 'database'
    });
  } catch (error) {
    console.error('❌ DELETE Pricing API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete pricing data' 
    }, { status: 500 });
  }
}
