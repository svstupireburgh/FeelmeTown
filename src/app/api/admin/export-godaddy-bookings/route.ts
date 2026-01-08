import { NextRequest, NextResponse } from 'next/server';
import godaddySQL from '@/lib/godaddy-sql';

// GET /api/admin/export-godaddy-bookings - Export bookings from GoDaddy SQL to Excel format
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all'; // 'completed', 'cancelled', or 'all'
    const shape = searchParams.get('shape') || 'sql';

    const safeJsonParse = (value: any) => {
      if (value === null || value === undefined) return null;
      if (Array.isArray(value) || (typeof value === 'object' && value !== null)) return value;
      if (typeof value !== 'string') return null;
      const trimmed = value.trim();
      if (!trimmed) return null;
      try {
        return JSON.parse(trimmed);
      } catch {
        return null;
      }
    };

    const toNumberOrNull = (value: any) => {
      if (value === null || value === undefined || value === '') return null;
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    };

    const mapCompletedRowToMongo = (row: any) => {
      const occasionData: Record<string, any> = {};
      if (row?.occasion_field1_label && row?.occasion_field1_value !== null && row?.occasion_field1_value !== undefined) {
        occasionData[String(row.occasion_field1_label)] = String(row.occasion_field1_value);
      }
      if (row?.occasion_field2_label && row?.occasion_field2_value !== null && row?.occasion_field2_value !== undefined) {
        occasionData[String(row.occasion_field2_label)] = String(row.occasion_field2_value);
      }

      const selectedOtherItems = safeJsonParse(row?.selected_other_items);

      const createdByTypeRaw = row?.created_by_type;
      const createdByType = typeof createdByTypeRaw === 'string' ? createdByTypeRaw.trim().toLowerCase() : '';
      const createdByName = typeof row?.created_by_name === 'string' ? row.created_by_name.trim() : '';

      const paymentReceivedRaw = typeof row?.payment_received === 'string' ? row.payment_received.trim() : '';
      const paymentReceiverName = (() => {
        if (!paymentReceivedRaw) return '';
        const parts = paymentReceivedRaw.split(' - ');
        if (parts.length < 2) return '';
        const receiver = parts.slice(1).join(' - ').trim();
        return receiver;
      })();

      const staffNameFromRow = typeof row?.staff_name === 'string' ? row.staff_name.trim() : '';
      const staffName = staffNameFromRow || paymentReceiverName || null;
      const staffId = row?.staff_id || null;

      const createdBy = (() => {
        if (!createdByType) return null;
        if (createdByType === 'staff') {
          return {
            type: 'staff',
            staffName: createdByName || staffName || 'Staff',
            staffId: staffId || row?.user_id || null,
          };
        }
        if (createdByType === 'admin' || createdByType === 'administrator') {
          return {
            type: 'admin',
            adminName: createdByName || row?.admin_name || 'Administrator',
          };
        }
        if (createdByType === 'customer') {
          return { type: 'customer' };
        }
        return null;
      })();

      return {
        _id: row?.mongo_id || null,
        bookingId: row?.booking_id,
        name: row?.name,
        email: row?.email,
        phone: row?.phone,
        theaterName: row?.theater_name,
        date: row?.booking_date,
        time: row?.booking_time,
        occasion: row?.occasion,
        occasionPersonName: row?.occasion_person_name || null,
        numberOfPeople: toNumberOrNull(row?.number_of_people),
        ticketNumber: row?.ticket_number || null,
        bookingType: row?.booking_type || null,
        paymentMode: row?.payment_mode || null,
        paymentMethod: row?.payment_method || null,
        userId: row?.user_id || null,
        adminName: row?.admin_name || null,
        isManualBooking: row?.is_manual_booking === 1 ? true : (row?.is_manual_booking === 0 ? false : null),
        baseCapacity: toNumberOrNull(row?.base_capacity),
        theaterCapacity: (row?.theater_capacity_min || row?.theater_capacity_max) ? {
          min: toNumberOrNull(row?.theater_capacity_min),
          max: toNumberOrNull(row?.theater_capacity_max),
        } : null,
        advancePayment: toNumberOrNull(row?.advance_payment),
        venuePayment: toNumberOrNull(row?.venue_payment),
        totalAmount: toNumberOrNull(row?.total_amount),
        status: row?.booking_status || null,
        completedAt: row?.completed_at || null,
        paymentStatus: row?.payment_status || null,
        venuePaymentMethod: row?.venue_payment_method || null,
        paidBy: row?.paid_by || null,
        paidAt: row?.paid_at || null,
        paymentReceived: row?.payment_received || null,
        advancePaymentMethod: row?.advance_payment_method || null,
        theaterBasePrice: toNumberOrNull(row?.theater_base_price),
        extraGuestFee: toNumberOrNull(row?.extra_guest_fee),
        extraGuestsCount: toNumberOrNull(row?.extra_guests_count),
        extraGuestCharges: toNumberOrNull(row?.extra_guest_charges),
        decorationFee: toNumberOrNull(row?.decoration_fee),
        appliedDecorationFee: toNumberOrNull(row?.applied_decoration_fee),
        slotBookingFee: toNumberOrNull(row?.slot_booking_fee),
        payableAmount: toNumberOrNull(row?.payable_amount),
        specialDiscount: toNumberOrNull(row?.special_discount),
        Discount: toNumberOrNull(row?.generic_discount),
        penaltyCharges: toNumberOrNull(row?.penalty_charges),
        penaltyCharge: toNumberOrNull(row?.penalty_charge),
        penaltyReason: row?.penalty_reason || null,
        couponDiscount: toNumberOrNull(row?.coupon_discount),
        appliedCouponCode: row?.coupon_code || null,
        DiscountByCoupon: toNumberOrNull(row?.discount_by_coupon),
        totalAmountBeforeDiscount: toNumberOrNull(row?.total_before_discount),
        totalAmountAfterDiscount: toNumberOrNull(row?.total_after_discount),
        occasionData: Object.keys(occasionData).length ? occasionData : null,
        selectedMovies: safeJsonParse(row?.selected_movies) || [],
        selectedCakes: safeJsonParse(row?.selected_cakes) || [],
        selectedDecorItems: safeJsonParse(row?.selected_decor_items) || [],
        selectedGifts: safeJsonParse(row?.selected_gifts) || [],
        selectedExtraAddOns: safeJsonParse(row?.selected_extra_add_ons) || [],
        selectedFood: safeJsonParse(row?.selected_food) || [],
        ...(selectedOtherItems ? selectedOtherItems : null),
        notes: row?.notes || null,
        createdBy,
        staffId,
        staffName,
        createdAt: row?.created_at_source || null,
      };
    };
    
    console.log(`📊 Exporting GoDaddy SQL bookings: ${type}`);
    
    // Test connection first
    const connectionTest = await godaddySQL.testConnection();
    if (!connectionTest.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to connect to GoDaddy SQL database',
          details: connectionTest.error
        },
        { status: 500 }
      );
    }
    
    // Get booking data from GoDaddy SQL
    const { getConnectionPool } = await import('@/lib/godaddy-sql');
    const pool = getConnectionPool();
    
    const connection = await pool.getConnection();
    
    let completedBookings: any[] = [];
    let cancelledBookings: any[] = [];
    
    // Fetch completed bookings
    if (type === 'completed' || type === 'all') {
      try {
        const [rows] = await connection.execute(`
          SELECT 
            booking_id,
            mongo_id,
            ticket_number,
            name, email, phone, theater_name,
            DATE_FORMAT(booking_date, '%Y-%m-%d') as booking_date,
            booking_time, occasion, occasion_person_name, number_of_people,
            booking_type,
            payment_mode,
            payment_method,
            user_id,
            admin_name,
            is_manual_booking,
            base_capacity,
            theater_capacity_min,
            theater_capacity_max,
            advance_payment, venue_payment, total_amount,
            DATE_FORMAT(completed_at, '%Y-%m-%d %H:%i:%s') as completed_at,
            booking_status, payment_status,
            venue_payment_method, paid_by,
            DATE_FORMAT(paid_at, '%Y-%m-%d %H:%i:%s') as paid_at,
            payment_received,
            advance_payment_method,
            theater_base_price,
            extra_guest_fee,
            extra_guests_count,
            extra_guest_charges,
            decoration_fee,
            slot_booking_fee,
            payable_amount,
            special_discount,
            generic_discount,
            penalty_charges,
            penalty_reason,
            penalty_charge,
            coupon_discount,
            coupon_code,
            discount_by_coupon,
            applied_decoration_fee,
            total_before_discount,
            total_after_discount,
            occasion_field1_label,
            occasion_field1_value,
            occasion_field2_label,
            occasion_field2_value,
            selected_movies, selected_cakes, selected_decor_items, selected_gifts,
            selected_extra_add_ons, selected_food, selected_other_items,
            notes, created_by_type, created_by_name, staff_id, staff_name,
            DATE_FORMAT(created_at_source, '%Y-%m-%d %H:%i:%s') as created_at_source
          FROM completed_bookings
          ORDER BY completed_at DESC
        `);
        completedBookings = rows as any[];
      } catch (e: any) {
        // Fallback for older schema without the newer columns
        if (e?.code === 'ER_BAD_FIELD_ERROR') {
          const [rows] = await connection.execute(`
            SELECT 
              booking_id, name, email, phone, theater_name, 
              DATE_FORMAT(booking_date, '%Y-%m-%d') as booking_date,
              booking_time, occasion, number_of_people, total_amount,
              DATE_FORMAT(completed_at, '%Y-%m-%d %H:%i:%s') as completed_at,
              booking_status, payment_status
            FROM completed_bookings
            ORDER BY completed_at DESC
          `);
          completedBookings = rows as any[];
        } else {
          throw e;
        }
      }
    }
    
    // Fetch cancelled bookings
    if (type === 'cancelled' || type === 'all') {
      const [rows] = await connection.execute(`
        SELECT 
          booking_id, name, email, phone, theater_name,
          DATE_FORMAT(booking_date, '%Y-%m-%d') as booking_date,
          booking_time, occasion, number_of_people, total_amount,
          DATE_FORMAT(cancelled_at, '%Y-%m-%d %H:%i:%s') as cancelled_at,
          cancellation_reason, refund_amount, refund_status
        FROM cancelled_bookings
        ORDER BY cancelled_at DESC
      `);
      cancelledBookings = rows as any[];
    }
    
    connection.release();

    if (shape === 'mongo') {
      completedBookings = completedBookings.map(mapCompletedRowToMongo);
    }
    
    console.log(`✅ Fetched ${completedBookings.length} completed and ${cancelledBookings.length} cancelled bookings`);
    
    return NextResponse.json({
      success: true,
      data: {
        completed: completedBookings,
        cancelled: cancelledBookings,
        summary: {
          totalCompleted: completedBookings.length,
          totalCancelled: cancelledBookings.length,
          total: completedBookings.length + cancelledBookings.length
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to export GoDaddy SQL bookings:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to export bookings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/export-godaddy-bookings - Initialize GoDaddy SQL tables
export async function POST() {
  try {
    console.log('🔧 Initializing GoDaddy SQL database...');
    
    // Test connection
    const connectionTest = await godaddySQL.testConnection();
    if (!connectionTest.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to connect to GoDaddy SQL database',
          details: connectionTest.error
        },
        { status: 500 }
      );
    }
    
    // Create tables
    const tablesResult = await godaddySQL.createTables();
    if (!tablesResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to create GoDaddy SQL tables',
          details: tablesResult.error
        },
        { status: 500 }
      );
    }
    
    console.log('✅ GoDaddy SQL database initialized successfully');
    
    return NextResponse.json({
      success: true,
      message: 'GoDaddy SQL database initialized successfully',
      connection: connectionTest,
      tables: tablesResult
    });
    
  } catch (error) {
    console.error('❌ Failed to initialize GoDaddy SQL:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to initialize database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
