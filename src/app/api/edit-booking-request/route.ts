import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// POST /api/edit-booking-request
// Saves an edit booking request document to the database collection
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // Ensure database connection
    const connectionResult = await database.connect();
    if (!connectionResult.success) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const db = database.db();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database instance not available' },
        { status: 500 }
      );
    }

    const collectionName = 'edit_booking_request';

    const doc = {
      ...payload,
      requestType: 'edit_booking_request',
      status: payload.status || 'pending',
      requestedAt: payload.requestedAt ? new Date(payload.requestedAt) : new Date(),
      createdAt: new Date(),
      source: payload.source || 'BookingPopup'
    };

    const result = await db.collection(collectionName).insertOne(doc);

    // Also mark original booking as pending and flag edit request
    try {
      if (payload.bookingId) {
        await database.updateBooking(String(payload.bookingId), {
          status: 'pending',
          isEditRequested: true,
          updatedAt: new Date()
        });
      } else {
        // Fallback: try to locate booking by phone/email + theater/date/time
        const phoneCandidates = [
          payload.customerPhone,
          payload.whatsappNumber,
          payload.phone,
          payload.contactNumber
        ].filter(Boolean);
        const emailCandidates = [payload.email, payload.emailAddress].filter(Boolean);
        const theaterId = payload.theaterId;
        const date = payload.date;
        const time = payload.time;

        const orFilters: any[] = [];
        if (phoneCandidates.length > 0) {
          phoneCandidates.forEach((p: string) => {
            orFilters.push({ whatsappNumber: p });
            orFilters.push({ phone: p });
            orFilters.push({ contactNumber: p });
          });
        }
        if (emailCandidates.length > 0) {
          emailCandidates.forEach((e: string) => {
            orFilters.push({ email: e });
          });
        }

        let query: any = {};
        if (orFilters.length > 0) {
          query.$or = orFilters;
        }
        if (theaterId) {
          query.theaterId = theaterId;
        }
        if (date) {
          query.date = date;
        }
        if (time) {
          query.time = time;
        }

        if (Object.keys(query).length > 0) {
          const candidate = await db.collection('booking')
            .find(query)
            .sort({ createdAt: -1 })
            .limit(1)
            .toArray();
          if (candidate && candidate[0]?._id) {
            await db.collection('booking').updateOne(
              { _id: candidate[0]._id },
              { $set: { status: 'pending', isEditRequested: true, updatedAt: new Date() } }
            );
          }
        }
      }
    } catch (e) {
      // Non-fatal: continue even if booking update fails
      console.warn('Failed to mark booking as pending for edit request', e);
    }

    return NextResponse.json({
      success: true,
      insertedId: result.insertedId,
      collection: collectionName
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Optional: GET handler to list recent edit booking requests
export async function GET() {
  try {
    const connectionResult = await database.connect();
    if (!connectionResult.success) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const db = database.db();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database instance not available' },
        { status: 500 }
      );
    }

    const collectionName = 'edit_booking_request';
    const requests = await db.collection(collectionName)
      .find({})
      .sort({ requestedAt: -1 })
      .toArray();

    return NextResponse.json({ success: true, requests, total: requests.length });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch edit booking requests' },
      { status: 500 }
    );
  }
}