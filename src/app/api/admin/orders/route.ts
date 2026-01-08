import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

const sanitizeNumberParam = (value: string | null, fallback: number, options?: { min?: number; max?: number }) => {
  if (!value) return fallback;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  const clampedMin = options?.min ?? 1;
  const clampedMax = options?.max ?? 500;
  return Math.min(Math.max(parsed, clampedMin), clampedMax);
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId')?.trim();
    const ticketNumber = searchParams.get('ticketNumber')?.trim();
    const serviceName = searchParams.get('serviceName')?.trim();
    const status = searchParams.get('status')?.trim();
    const search = searchParams.get('search')?.trim();
    const limit = sanitizeNumberParam(searchParams.get('limit'), 200, { min: 25, max: 500 });
    const mode = searchParams.get('mode')?.trim().toLowerCase();
    const includeCompletedBookings = searchParams.get('includeCompletedBookings') === 'true';

    const filter: Record<string, any> = {};

    if (bookingId) {
      filter.bookingId = bookingId;
    }
    if (ticketNumber) {
      filter.ticketNumber = ticketNumber;
    }
    if (serviceName) {
      filter.serviceName = { $regex: serviceName, $options: 'i' };
    }
    if (status) {
      filter.status = status.toLowerCase();
    }
    if (search) {
      const regex = { $regex: search, $options: 'i' };
      filter.$or = [
        { bookingId: regex },
        { ticketNumber: regex },
        { customerName: regex },
        { serviceName: regex },
        { performedBy: regex },
      ];
    }

    if (!includeCompletedBookings) {
      const activeBookingClause = {
        $or: [
          { bookingStatus: { $exists: false } },
          { bookingStatus: { $nin: ['completed', 'cancelled', 'archived'] } },
        ],
      };

      if (filter.$and) {
        filter.$and.push(activeBookingClause);
      } else {
        filter.$and = [activeBookingClause];
      }
    }

    if (mode === 'count') {
      const countResult = await (database as any).getOrderCounts?.(filter);
      if (!countResult || !countResult.success) {
        return NextResponse.json(
          { success: false, error: countResult?.error || 'Failed to count order records' },
          { status: 500 },
        );
      }
      return NextResponse.json({
        success: true,
        total: countResult.total,
        byStatus: countResult.byStatus,
      });
    }

    const result = await (database as any).getOrders?.(filter, limit);

    if (!result || !result.success) {
      return NextResponse.json(
        { success: false, error: result?.error || 'Failed to fetch order records' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      orders: result.orders,
      total: result.total,
    });
  } catch (error) {
    console.error('❌ [admin][orders][GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to fetch orders at this moment' },
      { status: 500 },
    );
  }
}
