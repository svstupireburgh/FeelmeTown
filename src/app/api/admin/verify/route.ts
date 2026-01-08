import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// POST /api/admin/verify - Verify admin password from database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password is required'
        },
        { status: 400 }
      );
    }

    // Ensure database connection (null-safe)
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

    // Get settings for max login attempts
    const settings = await database.getSettings();
    const maxAttempts = Number(settings?.maxLoginAttempts) || 5;

    // Fetch admin by fixed id and verify password manually to track attempts
    const adminUser = await database.getAdminById('ADM0001');
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Check if account is locked
    if (adminUser.isLocked) {
      return NextResponse.json(
        {
          success: false,
          error: 'Account locked due to too many failed attempts. Contact support.'
        },
        { status: 423 }
      );
    }

    // Compare password
    const isValid = adminUser.password === password;

    const db = database.db();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database instance not available' },
        { status: 500 }
      );
    }
    const adminsCollection = db.collection('admin');
    const adminId = adminUser.adminId || adminUser._id;

    if (!isValid) {
      const currentAttempts = Number(adminUser.failedLoginAttempts || 0) + 1;
      const shouldLock = currentAttempts >= maxAttempts;

      await adminsCollection.updateOne(
        { adminId: adminUser.adminId || adminUser._id },
        {
          $set: {
            failedLoginAttempts: currentAttempts,
            isLocked: shouldLock
          }
        }
      );

      const remaining = Math.max(0, maxAttempts - currentAttempts);
      return NextResponse.json(
        {
          success: false,
          error: shouldLock
            ? 'Too many failed attempts. Account locked.'
            : `Invalid admin password. ${remaining} attempt(s) remaining.`
        },
        { status: shouldLock ? 423 : 401 }
      );
    }

    // Reset attempts on successful login
    await adminsCollection.updateOne(
      { adminId: adminUser.adminId || adminUser._id },
      { $set: { failedLoginAttempts: 0, isLocked: false, lastLogin: new Date() } }
    );

    const { password: _, ...adminInfo } = adminUser;

    // Create HTTP-only cookie for server-side auth (middleware)
    const response = NextResponse.json({
      success: true,
      message: 'Admin authentication successful',
      admin: {
        id: adminId,
        name: adminInfo.fullName,
        email: adminInfo.email,
        role: adminInfo.role
      }
    });

    // 30 days
    const maxAge = 30 * 24 * 60 * 60;
    response.cookies.set('adminToken', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify admin password'
      },
      { status: 500 }
    );
  }
}

