import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// POST /api/contact - Save a contact document
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // Basic validation: require at least one contact method
    const name = (payload.name || '').toString().trim();
    const email = (payload.email || '').toString().trim();
    const whatsappNumber = (payload.whatsappNumber || '').toString().trim();
    const phoneNumber = (payload.phoneNumber || '').toString().trim();

    if (!email && !whatsappNumber && !phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Provide at least one of email, whatsappNumber, or phoneNumber' },
        { status: 400 }
      );
    }

    // Connect to DB
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

    const collectionName = 'contact';
    const collection = db.collection(collectionName);

    // Ensure helpful indexes (unique+sparse so empty fields allowed)
    try {
      await Promise.all([
        collection.createIndex({ email: 1 }, { name: 'email_unique', unique: true, sparse: true, background: true }),
        collection.createIndex({ whatsappNumber: 1 }, { name: 'whatsapp_unique', unique: true, sparse: true, background: true }),
        collection.createIndex({ phoneNumber: 1 }, { name: 'phone_unique', unique: true, sparse: true, background: true }),
        collection.createIndex({ createdAt: -1 }, { name: 'createdAt_desc', background: true })
      ]);
    } catch (error: any) {
      // Ignore index already exists errors
      if (!(error && (error.code === 85 || /already exists/i.test(error.message)))) {
        console.warn('Index creation warning for contact collection:', error);
      }
    }

    const now = new Date();
    const doc = {
      name: name || undefined,
      email: email || undefined,
      whatsappNumber: whatsappNumber || undefined,
      phoneNumber: phoneNumber || undefined,
      notes: payload.notes || undefined,
      tags: Array.isArray(payload.tags) ? payload.tags.slice(0, 20) : [],
      isActive: payload.isActive === false ? false : true,
      source: payload.source || 'webapp',
      createdAt: now,
      updatedAt: now
    };

    const result = await collection.insertOne(doc);
    return NextResponse.json({ success: true, insertedId: result.insertedId, collection: collectionName });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET /api/contact - List contacts (optional search and limit)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const limitParam = searchParams.get('limit');
    const limit = Math.min(Math.max(parseInt(limitParam || '50', 10) || 50, 1), 200);

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

    const collectionName = 'contact';
    const collection = db.collection(collectionName);

    let filter: any = {};
    if (q) {
      const regex = new RegExp(q.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
      const digits = q.replace(/\D/g, '');
      filter = {
        $or: [
          { name: { $regex: regex } },
          { email: { $regex: regex } },
          ...(digits ? [{ whatsappNumber: { $regex: new RegExp(digits) } }, { phoneNumber: { $regex: new RegExp(digits) } }] : [])
        ]
      };
    }

    const contacts = await collection
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({ success: true, contacts, total: contacts.length });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}