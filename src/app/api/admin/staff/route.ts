import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

export async function GET() {
  try {
    const staff = await database.getAllStaff(); // Get all staff members
    
    return NextResponse.json({
      success: true,
      staff: staff
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch staff' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { name, email, phone, gender, profilePhoto, photoType, password, bookingAccess } = body;
    
    if (!name || !email || !phone || !gender || !profilePhoto || !password) {
      return NextResponse.json(
        { success: false, error: 'All fields including password are required' },
        { status: 400 }
      );
    }

    const staffData = {
      name,
      email,
      phone,
      gender,
      profilePhoto,
      photoType: photoType || 'upload',
      password, // Include password for staff login
      role: 'staff',
      isActive: true,
      bookingAccess: bookingAccess === 'edit' ? 'edit' : 'view'
    };

    const result = await database.saveStaff(staffData); // Save new staff member

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Staff member added successfully',
      staff: result.user
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to add staff' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Staff ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, email, phone, gender, profilePhoto, photoType, isActive, password, bookingAccess } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (gender !== undefined) updateData.gender = gender;
    if (profilePhoto !== undefined) updateData.profilePhoto = profilePhoto;
    if (photoType !== undefined) updateData.photoType = photoType;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password !== undefined && password.trim() !== '') updateData.password = password;
    if (bookingAccess !== undefined) updateData.bookingAccess = bookingAccess === 'edit' ? 'edit' : 'view';

    const result = await database.updateStaff(id, updateData); // Update staff member

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Staff member updated successfully',
      staff: result.user
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to update staff' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Staff ID is required' },
        { status: 400 }
      );
    }

    const result = await database.deleteStaff(id); // Delete staff member

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Staff member deleted successfully'
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to delete staff' },
      { status: 500 }
    );
  }
}

