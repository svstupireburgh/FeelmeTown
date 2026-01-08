import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// GET /api/admin/coupons - Get all coupons
export async function GET() {
  try {
    const result = await database.getAllCoupons();
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      coupons: result.coupons,
      total: result.total
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch coupons' },
      { status: 500 }
    );
  }
}

// POST /api/admin/coupons - Create new coupon
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.couponCode || !body.discountType || !body.discountValue) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const result = await database.saveCoupon(body);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Coupon created successfully',
      couponCode: result.couponCode
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to create coupon' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/coupons - Update coupon
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { couponCode, ...couponData } = body;
    
    if (!couponCode) {
      return NextResponse.json(
        { success: false, error: 'Coupon code is required' },
        { status: 400 }
      );
    }
    
    const result = await database.updateCoupon(couponCode, couponData);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Coupon updated successfully'
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to update coupon' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/coupons - Delete coupon
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const couponCode = searchParams.get('couponCode');
    
    if (!couponCode) {
      return NextResponse.json(
        { success: false, error: 'Coupon code is required' },
        { status: 400 }
      );
    }
    
    const result = await database.deleteCoupon(couponCode);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to delete coupon' },
      { status: 500 }
    );
  }
}

