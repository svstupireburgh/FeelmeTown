import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, gender, staffId } = body;

    if (!name || !email) {
      return NextResponse.json({
        success: false,
        error: 'Name and email are required'
      }, { status: 400 });
    }

    if (!staffId) {
      return NextResponse.json({
        success: false,
        error: 'Staff ID is required'
      }, { status: 400 });
    }

    // Update staff profile in database
    const updateData = {
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim() || '',
      gender: gender || '',
      updatedAt: new Date()
    };

    const result = await database.updateUserByUserId(staffId, updateData); // This updates staff data by userId

    if (result) {
      return NextResponse.json({
        success: true,
        message: 'Staff profile updated successfully',
        staff: updateData
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to update staff profile'
      }, { status: 500 });
    }

  } catch (error) {
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

