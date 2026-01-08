import { NextRequest, NextResponse } from 'next/server';
import emailService from '@/lib/email-service';
import database from '@/lib/db-connect';

// POST /api/email/incomplete - Send incomplete booking email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.email) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email is required' 
        },
        { status: 400 }
      );
    }

    // Log the data being received
    console.log('📧 Incomplete booking email API received data:', {
      name: body.name,
      email: body.email,
      phone: body.phone,
      theaterName: body.theaterName,
      date: body.date,
      time: body.time,
      occasion: body.occasion
    });

    // Save incomplete booking to database first
    const dbResult = await database.saveIncompleteBooking({
      name: body.name,
      email: body.email,
      phone: body.phone,
      theaterName: body.theaterName,
      date: body.date,
      time: body.time,
      occasion: body.occasion,
      numberOfPeople: body.numberOfPeople || 2,
      selectedCakes: body.selectedCakes,
      selectedDecorItems: body.selectedDecorItems,
      selectedGifts: body.selectedGifts,
      totalAmount: body.totalAmount,
      // Add pricing data for proper display
      pricingData: body.pricingData || {},
      advancePayment: body.advancePayment,
      venuePayment: body.venuePayment,
      // Add occasion specific fields
      ...(body.birthdayName && { birthdayName: body.birthdayName }),
      ...(body.birthdayGender && { birthdayGender: body.birthdayGender }),
      ...(body.partner1Name && { partner1Name: body.partner1Name }),
      ...(body.partner1Gender && { partner1Gender: body.partner1Gender }),
      ...(body.partner2Name && { partner2Name: body.partner2Name }),
      ...(body.partner2Gender && { partner2Gender: body.partner2Gender }),
      ...(body.proposerName && { proposerName: body.proposerName }),
      ...(body.proposalPartnerName && { proposalPartnerName: body.proposalPartnerName }),
      ...(body.valentineName && { valentineName: body.valentineName }),
      ...(body.dateNightName && { dateNightName: body.dateNightName }),
      ...(body.customCelebration && { customCelebration: body.customCelebration }),
    });

    // Send incomplete booking email
    const emailResult = await emailService.sendBookingIncomplete(body);

    if (dbResult.success && ('messageId' in emailResult)) {
      console.log('✅ Incomplete booking saved to database and email sent successfully');
      const { messageId } = emailResult as { messageId: string };
      return NextResponse.json({
        success: true,
        message: 'Incomplete booking saved and email sent successfully!',
        ...(messageId ? { messageId } : {}),
        bookingId: dbResult.booking?.id
      }, { status: 200 });
    } else {
      console.log('❌ Failed to save incomplete booking or send email:', {
        emailSuccess: emailResult.success,
        dbSuccess: dbResult.success,
        emailError: emailResult.error,
        dbError: dbResult.error
      });
      return NextResponse.json(
        { 
          success: false, 
          error: emailResult.error || dbResult.error || 'Failed to save incomplete booking or send email'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send incomplete booking email' 
      },
      { status: 500 }
    );
  }
}

