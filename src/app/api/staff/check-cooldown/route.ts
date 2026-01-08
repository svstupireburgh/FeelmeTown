import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId');

    if (!staffId) {
      return NextResponse.json({
        success: false,
        error: 'Staff ID is required'
      }, { status: 400 });
    }

    // Get existing requests for this staff member
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
          success: true,
          cooldownRemaining: remainingHours,
          lastRequestTime: lastRequestTime
        });
      }
    }

    // No cooldown active
    return NextResponse.json({
      success: true,
      cooldownRemaining: 0
    });

  } catch (error) {
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

