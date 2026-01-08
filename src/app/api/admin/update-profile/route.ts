import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// POST /api/admin/update-profile - Update admin profile in database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, email, phone, username } = body;
    
    if (!fullName || !email) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Full name and email are required' 
        },
        { status: 400 }
      );
    }

    // Update admin profile in database
    const result = await database.updateAdminProfile('ADM0001', {
      fullName,
      email,
      phone,
      username
    });

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Failed to update profile' 
        },
        { status: 500 }
      );
    }

    

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      admin: {
        id: 'ADM0001',
        name: fullName,
        email,
        phone,
        username,
        role: 'Administrator'
      }
    });
  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update profile' 
      },
      { status: 500 }
    );
  }
}

