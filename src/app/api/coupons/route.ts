import { NextResponse } from 'next/server';
import database from '@/lib/db-connect';

export async function GET() {
  try {
    const result = await database.getAllCoupons();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to fetch coupons' },
        { status: 500 }
      );
    }

    const now = new Date();
    const coupons = (result.coupons || [])
      .filter((coupon: any) => {
        if (coupon.isActive === false) return false;

        const validDate = coupon.validDate ? new Date(coupon.validDate) : null;
        const expireDate = coupon.expireDate ? new Date(coupon.expireDate) : null;

        if (validDate && now < validDate) return false;
        if (expireDate && now > expireDate) return false;

        return true;
      })
      .map((coupon: any) => ({
        couponCode: coupon.couponCode,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        usageLimit: coupon.usageLimit ?? null,
        validDate: coupon.validDate,
        expireDate: coupon.expireDate,
      }));

    return NextResponse.json({
      success: true,
      coupons,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch coupons' },
      { status: 500 }
    );
  }
}
