import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// POST /api/admin/update-password - Update admin password in database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;
    
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Current password and new password are required' 
        },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'New password must be at least 6 characters long' 
        },
        { status: 400 }
      );
    }

    // Update password in database
    const result = await database.updateAdminPassword('ADM0001', currentPassword, newPassword);

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Failed to update password' 
        },
        { status: 401 }
      );
    }

    

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update password' 
      },
      { status: 500 }
    );
  }
}

