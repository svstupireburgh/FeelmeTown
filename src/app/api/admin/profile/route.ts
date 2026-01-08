import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

// GET /api/admin/profile - Get admin profile from database
export async function GET() {
  try {
    // Get admin profile from database
    const admin = await database.getAdminById('ADM0001');
    
    if (!admin) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Admin not found' 
        },
        { status: 404 }
      );
    }

    // Return admin profile data (excluding password)
    const { password: _, ...adminProfile } = admin;
    
    return NextResponse.json({
      success: true,
      admin: {
        id: adminProfile.adminId,
        name: adminProfile.fullName,
        email: adminProfile.email,
        role: adminProfile.role,
        username: adminProfile.username,
        phone: adminProfile.phone,
        createdAt: adminProfile.createdAt,
        lastLogin: adminProfile.lastLogin
      }
    });
  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch admin profile' 
      },
      { status: 500 }
    );
  }
}

