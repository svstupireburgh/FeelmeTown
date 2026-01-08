import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentPassword, newPassword, staffId } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({
        success: false,
        error: 'Current password and new password are required'
      }, { status: 400 });
    }

    if (!staffId) {
      return NextResponse.json({
        success: false,
        error: 'Staff ID is required'
      }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({
        success: false,
        error: 'New password must be at least 6 characters long'
      }, { status: 400 });
    }

    // Verify current password by getting the staff member and checking password
    const staffMemberResult = await database.getStaffById(staffId);
    if (!staffMemberResult.success || !staffMemberResult.staff) {
      return NextResponse.json({
        success: false,
        error: 'Staff member not found'
      }, { status: 404 });
    }
    
    const staffMember = staffMemberResult.staff;

    if (staffMember.password !== currentPassword) {
      return NextResponse.json({
        success: false,
        error: 'Current password is incorrect'
      }, { status: 400 });
    }

    // Update staff password in database
    const updateData = {
      password: newPassword,
      updatedAt: new Date()
    };

    const result = await database.updateUserByUserId(staffId, updateData); // This updates staff password by userId

    if (result) {
      return NextResponse.json({
        success: true,
        message: 'Password updated successfully'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to update password'
      }, { status: 500 });
    }

  } catch (error) {
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

