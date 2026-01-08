import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

export async function GET(request: NextRequest) {
  try {
    const requests = await database.getAllPasswordChangeRequests();
    
    return NextResponse.json({
      success: true,
      requests: requests
    });

  } catch (error) {
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, action, adminComments, adminName } = body;

    if (!requestId || !action || !adminName) {
      return NextResponse.json({
        success: false,
        error: 'Request ID, action, and admin name are required'
      }, { status: 400 });
    }

    if (!['approved', 'denied'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Must be approved or denied'
      }, { status: 400 });
    }

    // Update request status
    const updateData = {
      status: action,
      adminApprovedBy: adminName,
      adminApprovedAt: new Date(),
      adminComments: adminComments || null
    };

    const updated = await database.updatePasswordChangeRequest(requestId, updateData);

    if (!updated) {
      
      return NextResponse.json({
        success: false,
        error: 'Request not found or update failed'
      }, { status: 404 });
    }

    // If approved, also update the staff password
    if (action === 'approved') {
      // Get the request details to update staff password
      const requests = await database.getAllPasswordChangeRequests();
      const request = requests.find(r => r._id.toString() === requestId);
      
      if (request) {
        // Update staff password using userId (FMT0001, etc.)
        const passwordUpdateResult = await database.updateUserByUserId(request.staffId, {
          password: request.newPassword
        });
        
        if (!passwordUpdateResult.success) {
          
          return NextResponse.json({
            success: false,
            error: 'Request approved but failed to update staff password: ' + passwordUpdateResult.error
          }, { status: 500 });
        }
      } else {
        
        return NextResponse.json({
          success: false,
          error: 'Request not found for password update'
        }, { status: 404 });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Request ${action} successfully`
    });

  } catch (error) {
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

