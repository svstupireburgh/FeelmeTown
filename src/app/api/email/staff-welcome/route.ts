import { NextRequest, NextResponse } from 'next/server';
import emailService from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, profilePhoto } = body;

    if (!name || !email || !profilePhoto) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await emailService.sendStaffWelcomeEmail({
      name,
      email,
      profilePhoto
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Welcome email sent successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to send email' },
      { status: 500 }
    );
  }
}

