import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';
import {
  getCancelledBookingHistoryFromSQL,
  getCompletedBookingHistoryFromSQL,
} from '@/lib/godaddy-sql';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
  'Surrogate-Control': 'no-store',
};

const parseDateParam = (value: string | null, fallback: string) => {
  const v = String(value || '').trim();
  if (!v) return fallback;
  return v;
};

const inDateRange = (raw: any, start: string, end: string) => {
  try {
    const t = new Date(raw).getTime();
    if (!Number.isFinite(t)) return false;
    const startT = new Date(`${start}T00:00:00.000Z`).getTime();
    const endT = new Date(`${end}T23:59:59.999Z`).getTime();
    return t >= startT && t <= endT;
  } catch {
    return false;
  }
};

const getResultError = (result: unknown): string | undefined => {
  if (!result || typeof result !== 'object') return undefined;
  return 'error' in result ? String((result as any).error || '') : undefined;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const start = parseDateParam(searchParams.get('start'), new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    const end = parseDateParam(searchParams.get('end'), new Date().toISOString().slice(0, 10));

    const statusParam = String(searchParams.get('status') || '').trim();
    const requested = new Set(
      statusParam
        ? statusParam
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
        : ['completed', 'cancelled', 'manual']
    );

    const [completedRes, cancelledRes] = await Promise.all([
      requested.has('completed') ? getCompletedBookingHistoryFromSQL({ start, end }) : Promise.resolve({ success: true, bookings: [] as any[] }),
      requested.has('cancelled') ? getCancelledBookingHistoryFromSQL({ start, end }) : Promise.resolve({ success: true, bookings: [] as any[] }),
    ]);

    const completed = completedRes.success ? (completedRes.bookings || []) : [];
    const cancelled = cancelledRes.success ? (cancelledRes.bookings || []) : [];

    let manual: any[] = [];
    if (requested.has('manual')) {
      const manualRes = await database.getAllManualBookings();
      const allManual = manualRes?.success && Array.isArray(manualRes.manualBookings) ? manualRes.manualBookings : [];
      manual = allManual
        .filter((b: any) => inDateRange(b.createdAt || b.created_at, start, end))
        .map((b: any) => ({
          bookingId: b.bookingId || b.id || (b._id ? String(b._id) : undefined),
          name: b.name || b.customerName,
          customerName: b.customerName || b.name,
          email: b.email,
          phone: b.phone,
          theaterName: b.theaterName || b.theater,
          theater: b.theater,
          date: b.date,
          time: b.time,
          status: b.status || 'manual',
          totalAmount: b.totalAmount || b.amount,
          createdAt: b.createdAt || b.created_at,
        }));
    }

    if (!completedRes.success || !cancelledRes.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch booking history from SQL',
          details: {
            completed: completedRes.success ? undefined : getResultError(completedRes),
            cancelled: cancelledRes.success ? undefined : getResultError(cancelledRes),
          },
        },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          completed,
          cancelled,
          manual,
        },
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch booking history' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
