import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

export async function POST(req: NextRequest) {
  try {
    const { code, amount } = await req.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Coupon code is required' },
        { status: 400 }
      );
    }

    const baseAmount = typeof amount === 'number' ? amount : 0;

    const result = await database.getAllCoupons();
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to fetch coupons' },
        { status: 500 }
      );
    }

    const coupons = (result.coupons || []) as any[];
    const coupon = coupons.find(
      (c) => String(c.couponCode).toUpperCase() === String(code).toUpperCase()
    );

    if (!coupon) {
      return NextResponse.json(
        { success: false, error: 'Invalid coupon code' },
        { status: 404 }
      );
    }

    // Validate active status
    if (coupon.isActive === false) {
      return NextResponse.json(
        { success: false, error: 'Coupon is inactive' },
        { status: 400 }
      );
    }

    // Validate date range
    const now = new Date();
    const validDate = coupon.validDate ? new Date(coupon.validDate) : null;
    const expireDate = coupon.expireDate ? new Date(coupon.expireDate) : null;

    if (validDate && now < validDate) {
      return NextResponse.json(
        { success: false, error: 'Coupon is not yet valid' },
        { status: 400 }
      );
    }
    if (expireDate && now > expireDate) {
      return NextResponse.json(
        { success: false, error: 'Coupon has expired' },
        { status: 400 }
      );
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      const pct = Number(coupon.discountValue) || 0;
      discountAmount = Math.round((baseAmount * pct) / 100);
    } else {
      // fixed amount
      discountAmount = Number(coupon.discountValue) || 0;
    }

    // Clamp discount to be non-negative and not exceed base amount
    discountAmount = Math.max(0, Math.min(discountAmount, baseAmount));

    return NextResponse.json({
      success: true,
      discountAmount,
      coupon: {
        couponCode: coupon.couponCode,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to validate coupon' },
      { status: 500 }
    );
  }
}
