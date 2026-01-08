import { NextRequest, NextResponse } from 'next/server';
import { getConnectionPool } from '@/lib/godaddy-sql';

 const decompressJSON = (compressedData: unknown): any => {
   try {
     if (compressedData === null || compressedData === undefined) return null;
     if (typeof compressedData !== 'string') return compressedData;
     let trimmed = compressedData.trim();
     if (!trimmed) return null;

     // MySQL JSON columns may return a quoted JSON string (e.g. "<base64>")
     // Unwrap once so we can decode the underlying payload.
     if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
       try {
         const unwrapped = JSON.parse(trimmed);
         if (typeof unwrapped === 'string') trimmed = unwrapped.trim();
       } catch {}
     }
     try {
       const jsonString = Buffer.from(trimmed, 'base64').toString('utf-8');
       return JSON.parse(jsonString);
     } catch {
       return JSON.parse(trimmed);
     }
   } catch {
     return null;
   }
 };

// GET /api/admin/export-bookings-json?type=completed|manual|cancelled
// Now fetches from GoDaddy SQL database instead of blob storage
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const typeParam = (searchParams.get('type') || 'completed').toLowerCase();
    const type = (['completed', 'manual', 'cancelled'] as const).includes(typeParam as any)
      ? (typeParam as 'completed' | 'manual' | 'cancelled')
      : 'completed';

    let bookings: any[] = [];

    // Fetch from GoDaddy SQL database
    try {
      const pool = getConnectionPool();
      const connection = await pool.getConnection();
      
      if (type === 'completed') {
        const [rows] = await connection.execute(`
          SELECT 
            booking_id, name, email, phone, theater_name,
            DATE_FORMAT(booking_date, '%Y-%m-%d') as date,
            booking_time as time, occasion, number_of_people as numberOfPeople,
            total_amount as totalAmount,
            DATE_FORMAT(completed_at, '%Y-%m-%d %H:%i:%s') as completedAt,
            booking_status as status, payment_status as paymentStatus
          FROM completed_bookings
          ORDER BY completed_at DESC
        `);
        bookings = rows as any[];
        console.log(`📊 Fetched ${bookings.length} completed bookings from GoDaddy SQL`);
        
      } else if (type === 'cancelled') {
        const [rows] = await connection.execute(`
          SELECT 
            booking_id AS bookingId,
            name,
            email,
            phone,
            theater_name AS theaterName,
            DATE_FORMAT(booking_date, '%Y-%m-%d') as date,
            booking_time AS time,
            occasion,
            number_of_people AS numberOfPeople,
            total_amount AS totalAmount,
            DATE_FORMAT(cancelled_at, '%Y-%m-%d %H:%i:%s') AS cancelledAt,
            cancellation_reason AS cancellationReason,
            refund_amount AS refundAmount,
            refund_status AS refundStatus,
            original_booking_data AS originalBookingData
          FROM cancelled_bookings
          ORDER BY cancelled_at DESC
        `);

        const cancelledRows = rows as any[];
        bookings = cancelledRows.map((row: any) => {
          const decoded = decompressJSON(row?.originalBookingData) || null;
          const source = decoded && typeof decoded === 'object' ? decoded : {};

          const nestedOriginal =
            source &&
            typeof source === 'object' &&
            (source as any)._originalBooking &&
            typeof (source as any)._originalBooking === 'object'
              ? (source as any)._originalBooking
              : null;

          const flattenedSource = nestedOriginal
            ? { ...(nestedOriginal as any), ...(source as any), _originalBooking: undefined }
            : source;

          const bookingId =
            (flattenedSource as any)?.bookingId ||
            (flattenedSource as any)?.id ||
            row?.bookingId ||
            row?.booking_id;

          return {
            ...flattenedSource,
            bookingId,
            id: (flattenedSource as any)?.id || bookingId,
            name: (flattenedSource as any)?.name || row?.name,
            email: (flattenedSource as any)?.email || row?.email,
            phone: (flattenedSource as any)?.phone || row?.phone,
            theaterName: (flattenedSource as any)?.theaterName || row?.theaterName,
            date: (flattenedSource as any)?.date || row?.date,
            time: (flattenedSource as any)?.time || row?.time,
            occasion: (flattenedSource as any)?.occasion || row?.occasion,
            numberOfPeople: (flattenedSource as any)?.numberOfPeople ?? row?.numberOfPeople,
            totalAmount: (flattenedSource as any)?.totalAmount ?? row?.totalAmount,
            status: 'cancelled',
            cancelledAt: (flattenedSource as any)?.cancelledAt || row?.cancelledAt,
            cancellationReason:
              (flattenedSource as any)?.cancellationReason ||
              (flattenedSource as any)?.cancelReason ||
              row?.cancellationReason ||
              row?.cancelReason,
            refundAmount: (flattenedSource as any)?.refundAmount ?? row?.refundAmount,
            refundStatus: (flattenedSource as any)?.refundStatus ?? row?.refundStatus,
          };
        });
        console.log(`📊 Fetched ${bookings.length} cancelled bookings from GoDaddy SQL`);
        
      } else if (type === 'manual') {
        // Manual bookings are not stored in SQL, return empty array
        console.log(`⚠️ Manual bookings are not stored in GoDaddy SQL`);
        bookings = [];
      }
      
      connection.release();
      
    } catch (sqlError) {
      console.error('❌ Failed to fetch from GoDaddy SQL:', sqlError);
      // Return empty array if SQL fails
      bookings = [];
    }

    return NextResponse.json({
      success: true,
      bookings: bookings,
      type: type,
      count: bookings.length,
      source: 'godaddy-sql'
    });

  } catch (error) {
    console.error('❌ Error in export-bookings-json API:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch bookings',
      bookings: []
    }, { status: 500 });
  }
}
