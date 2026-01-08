import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';
import { ExcelExportService } from '@/lib/excel-export';
import { ExportsStorage } from '@/lib/exports-storage';

// GET /api/admin/export-bookings?type=completed|manual|cancelled
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const typeParam = (searchParams.get('type') || 'completed').toLowerCase();
    const type = (['completed', 'manual', 'cancelled'] as const).includes(typeParam as any)
      ? (typeParam as 'completed' | 'manual' | 'cancelled')
      : 'completed';

    // Fetch bookings based on type
    const allBookingsResult = await database.getAllBookings();
    const allBookings = allBookingsResult.bookings || [];

    let bookings: any[] = [];
    if (type === 'completed') {
      bookings = await ExportsStorage.readArray('completed-bookings.json');
      console.log(`📊 Fetched ${bookings.length} completed bookings from JSON/Blob`);
    } else if (type === 'manual') {
      const manual = await ExportsStorage.readManual('manual-bookings.json');
      bookings = manual.records || [];
      console.log(`📊 Fetched ${bookings.length} manual bookings from JSON/Blob`);
    } else if (type === 'cancelled') {
      bookings = await ExportsStorage.readArray('cancelled-bookings.json');
      console.log(`📊 Fetched ${bookings.length} cancelled bookings from JSON/Blob`);
    }

    // Generate Excel buffer
    let buffer: Buffer;
    if (type === 'completed') {
      buffer = await ExcelExportService.exportCompletedBookings(bookings);
    } else if (type === 'manual') {
      buffer = await ExcelExportService.exportManualBookings(bookings);
    } else {
      buffer = await ExcelExportService.exportCancelledBookings(bookings);
    }

    // Save/update excelRecords metadata (best-effort)
    try {
      const filename = `${type}_bookings_${new Date().toISOString().split('T')[0]}.xlsx`;
      await (database as any).saveExcelRecord?.({
        type,
        filename,
        totalRecords: bookings.length,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch {}

    // Return file response
    const filename = `${type}_bookings_${new Date().toISOString().split('T')[0]}.xlsx`;
    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to export bookings' },
      { status: 500 }
    );
  }
}


