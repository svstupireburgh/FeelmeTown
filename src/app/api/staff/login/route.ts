import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// POST /api/staff/login - Verify staff login credentials
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email && !password) {
      return NextResponse.json(
        { success: false, error: 'Email or password is required' },
        { status: 400 }
      );
    }

    // Ensure DB connection (null-safe)
    let dbInstance = database.db();
    if (!dbInstance) {
      const connectionResult = await database.connect();
      if (!connectionResult.success) {
        return NextResponse.json(
          { success: false, error: 'Database connection failed' },
          { status: 500 }
        );
      }
      dbInstance = database.db();
      if (!dbInstance) {
        return NextResponse.json(
          { success: false, error: 'Database instance not available' },
          { status: 500 }
        );
      }
    }

    const settings = await database.getSettings();
    const maxAttempts = Number(settings?.maxLoginAttempts) || 5;

    // Get all staff members and try to locate the candidate
    const staffMembers = await database.getAllStaff();

    let candidate = null as any;
    if (email) {
      candidate = staffMembers.find((m: any) => m.email === email);
    } else if (password) {
      // Fallback: match by password only (legacy)
      candidate = staffMembers.find((m: any) => m.password === password && m.role === 'staff' && m.isActive === true);
    }

    if (!candidate || candidate.role !== 'staff' || candidate.isActive !== true) {
      return NextResponse.json(
        { success: false, error: email ? 'Invalid email or password' : 'Invalid password or staff member not found' },
        { status: 401 }
      );
    }

    // Check lock status
    if (candidate.isLocked) {
      return NextResponse.json(
        { success: false, error: 'Account locked due to too many failed attempts. Contact admin.' },
        { status: 423 }
      );
    }

    const isValid = password && candidate.password === password;
    const userId = candidate.userId || candidate._id;

    // Use db direct update to set counters (null-safe)
    const db = database.db();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database instance not available' },
        { status: 500 }
      );
    }
    const usersCollection = db.collection('staff');

    if (!isValid) {
      const currentAttempts = Number(candidate.failedLoginAttempts || 0) + 1;
      const shouldLock = currentAttempts >= maxAttempts;

      await usersCollection.updateOne(
        { userId: userId },
        { $set: { failedLoginAttempts: currentAttempts, isLocked: shouldLock } }
      );

      const remaining = Math.max(0, maxAttempts - currentAttempts);
      return NextResponse.json(
        {
          success: false,
          error: shouldLock
            ? 'Too many failed attempts. Account locked.'
            : `Invalid credentials. ${remaining} attempt(s) remaining.`
        },
        { status: shouldLock ? 423 : 401 }
      );
    }

    // Reset attempts on success
    await usersCollection.updateOne(
      { userId: userId },
      { $set: { failedLoginAttempts: 0, isLocked: false, lastLogin: new Date() } }
    );

    const { password: _, ...staffInfo } = candidate;
    return NextResponse.json({
      success: true,
      message: 'Staff login successful',
      staff: {
        id: staffInfo._id,
        userId: staffInfo.userId,
        name: staffInfo.name,
        email: staffInfo.email,
        phone: staffInfo.phone,
        gender: staffInfo.gender,
        profilePhoto: staffInfo.profilePhoto,
        photoType: staffInfo.photoType,
        role: staffInfo.role,
        isActive: staffInfo.isActive,
        createdAt: staffInfo.createdAt,
        bookingAccess: staffInfo.bookingAccess === 'edit' ? 'edit' : 'view'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to verify staff login' },
      { status: 500 }
    );
  }
}

