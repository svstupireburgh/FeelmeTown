import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// POST /api/admin/reset-excel-data
// Regenerates all Excel/JSON snapshots for completed, manual, and cancelled
export async function POST(request: NextRequest) {
  try {
    // Optional body: { mode?: 'rebuild' | 'zero' }
    const body = await request.json().catch(() => ({}));
    const mode = (body?.mode || 'rebuild').toLowerCase();
    const types: Array<'completed' | 'manual' | 'cancelled'> = ['completed', 'manual', 'cancelled'];
    const results: any[] = [];

    for (const type of types) {
      let bookings: any[] = [];
      let totalRecords = 0;

      try {
        if (mode === 'zero') {
          // Zero mode: force 0 records and update excelRecords accordingly
          totalRecords = 0;
        } else if (type === 'completed') {
          const completedResult = await database.getAllBookings();
          bookings = (completedResult.success && completedResult.bookings)
            ? completedResult.bookings.filter((b: any) => b.status === 'completed')
            : [];
        } else if (type === 'manual') {
          const manualResult = await database.getAllManualBookings();
          bookings = (manualResult.success && manualResult.manualBookings)
            ? manualResult.manualBookings
            : [];
        } else if (type === 'cancelled') {
          const [cancelledMain, cancelledColl] = await Promise.all([
            database.getAllBookings(),
            (database as any).getAllCancelledBookings?.()
          ]);
          const mainCancelled = (cancelledMain.success && cancelledMain.bookings)
            ? cancelledMain.bookings.filter((b: any) => b.status === 'cancelled')
            : [];
          const collCancelled = (cancelledColl && cancelledColl.success && cancelledColl.cancelledBookings)
            ? cancelledColl.cancelledBookings
            : [];
          bookings = [...mainCancelled, ...collCancelled];
        }
        if (mode !== 'zero') {
          totalRecords = bookings.length;
        }

        // Save excel record meta
        const filename = `${type}_bookings_${new Date().toISOString().split('T')[0]}.xlsx`;
        const recordResult = await (database as any).saveExcelRecord({
          type,
          filename,
          totalRecords,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        results.push({ type, success: !!recordResult.success, totalRecords });
      } catch (e) {
        results.push({ type, success: false, error: 'reset_failed' });
      }
    }

    const allOk = results.every(r => r.success);
    return NextResponse.json({ success: allOk, results, mode });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to reset excel data' }, { status: 500 });
  }
}


