import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';
import { ExportsStorage } from '@/lib/exports-storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'completed';
    
    let bookings: any[] = [];
    
    // Fetch data based on type
    const allBookings = (await database.getAllBookings()).bookings || [];
    
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

    // Return JSON data for client-side PDF generation
    return NextResponse.json({
      success: true,
      bookings,
      type,
      total: bookings.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching bookings for PDF:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bookings data' },
      { status: 500 }
    );
  }
}
