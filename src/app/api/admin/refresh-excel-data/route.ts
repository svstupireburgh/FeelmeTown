import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// POST /api/admin/refresh-excel-data
// Body: { type?: 'completed' | 'manual' | 'cancelled' }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const requestedType = (body?.type || 'all').toLowerCase();
    const types: Array<'completed' | 'manual' | 'cancelled'> = ['completed', 'manual', 'cancelled'];

    const toProcess = requestedType === 'all' ? types : (types.includes(requestedType as any) ? [requestedType as any] : ['completed']);

    const results: any[] = [];
    const allBookingsResult = await database.getAllBookings();
    const allBookings = allBookingsResult.bookings || [];

    for (const type of toProcess) {
      let bookings: any[] = [];

      if (type === 'completed') {
        bookings = allBookings.filter((b: any) => b.status === 'completed');
      } else if (type === 'manual') {
        const manualResult = await database.getAllManualBookings();
        const manualColl = manualResult.manualBookings || [];
        const manualMain = allBookings.filter((b: any) => (
          b.isManualBooking === true || b.bookingType === 'Manual' || b.status === 'manual'
        ));
        const combined = [...manualColl, ...manualMain];
        const seen = new Set<string>();
        bookings = combined.filter((b: any) => {
          const id = (b.bookingId || b.id || b._id || '').toString();
          if (!id) return true;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
      } else if (type === 'cancelled') {
        const mainCancelled = allBookings.filter((b: any) => b.status === 'cancelled');
        let collCancelled: any[] = [];
        try {
          const cancelledResult = await (database as any).getAllCancelledBookings?.();
          collCancelled = (cancelledResult && cancelledResult.cancelledBookings) || [];
        } catch {
          collCancelled = [];
        }
        bookings = [...mainCancelled, ...collCancelled];
      }

      // Update excelRecords metadata
      try {
        const filename = `${type}_bookings_${new Date().toISOString().split('T')[0]}.xlsx`;
        const res = await (database as any).saveExcelRecord?.({
          type,
          filename,
          totalRecords: bookings.length,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        results.push({ type, success: !!res?.success, totalRecords: bookings.length });
      } catch (e) {
        results.push({ type, success: false, error: 'save_failed' });
      }
    }

    const success = results.every(r => r.success);
    return NextResponse.json({ success, results });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to refresh excel data' },
      { status: 500 }
    );
  }
}


