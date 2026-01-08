import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentPassword, newPassword, staffId, staffName } = body;

    if (!currentPassword || !newPassword || !staffId || !staffName) {
      return NextResponse.json({
        success: false,
        error: 'All fields are required'
      }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({
        success: false,
        error: 'New password must be at least 6 characters long'
      }, { status: 400 });
    }

    // Check for 24-hour cooldown period
    const existingRequests = await database.getPasswordChangeRequestsByStaffId(staffId);
    
    if (existingRequests && existingRequests.length > 0) {
      // Find the most recent request
      const mostRecentRequest = existingRequests[0];
      const lastRequestTime = new Date(mostRecentRequest.requestedAt);
      const currentTime = new Date();
      const timeDifference = currentTime.getTime() - lastRequestTime.getTime();
      const hoursDifference = timeDifference / (1000 * 60 * 60); // Convert to hours
      
      // If less than 24 hours have passed
      if (hoursDifference < 24) {
        const remainingHours = Math.ceil(24 - hoursDifference);
        return NextResponse.json({
          success: false,
          error: `You can only submit one password change request every 24 hours. Please wait ${remainingHours} more hour(s).`,
          cooldownRemaining: remainingHours
        }, { status: 429 }); // 429 = Too Many Requests
      }
    }

    // Create password change request
    const requestData = {
      type: 'password_change',
      staffId: staffId,
      staffName: staffName,
      currentPassword: currentPassword,
      newPassword: newPassword,
      status: 'pending', // pending, approved, denied
      requestedAt: new Date(),
      requestedBy: staffName,
      adminApprovedBy: null,
      adminApprovedAt: null,
      adminComments: null
    };

    // Save to database
    const requestId = await database.savePasswordChangeRequest(requestData);

    return NextResponse.json({
      success: true,
      message: 'Password change request sent to administrator for approval',
      requestId: requestId
    });

  } catch (error) {
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

