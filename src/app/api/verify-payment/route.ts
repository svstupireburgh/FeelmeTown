import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';
import crypto from 'crypto';

// Helper function to get occasion specific fields
async function getOccasionFields(occasionName: string, occasionData: any) {
  try {
    // Fetch occasions from database to get required fields
    const occasions = await database.getAllOccasions();
    const occasion = occasions.find(occ => occ.name === occasionName);
    
    if (!occasion || !occasion.requiredFields) {
      return {};
    }
    
    
    
    
    
    const dynamicOccasionFields: any = {};
    
    if (occasionData && occasion.requiredFields) {
      occasion.requiredFields.forEach((dbFieldName: string) => {
        // Try to find the field value in occasionData
        let fieldValue = null;
        
        // Method 1: Direct match
        if (occasionData[dbFieldName]) {
          fieldValue = occasionData[dbFieldName];
        }
        
        // Method 2: Case insensitive match
        if (!fieldValue) {
          const keys = Object.keys(occasionData);
          const matchingKey = keys.find(key => 
            key.toLowerCase().replace(/\s+/g, '') === dbFieldName.toLowerCase().replace(/\s+/g, '')
          );
          if (matchingKey) {
            fieldValue = occasionData[matchingKey];
          }
        }
        
        if (fieldValue && fieldValue.toString().trim()) {
          const trimmedValue = fieldValue.toString().trim();
          const fieldLabel = occasion.fieldLabels?.[dbFieldName] || dbFieldName;
          
          // Save with exact database field name
          dynamicOccasionFields[dbFieldName] = trimmedValue;
          dynamicOccasionFields[`${dbFieldName}_label`] = fieldLabel;
          dynamicOccasionFields[`${dbFieldName}_value`] = trimmedValue;
          
          
        }
      });
    }
    
    
    return dynamicOccasionFields;
  } catch (error) {
    
    return {};
  }
}

// POST /api/verify-payment - Verify Razorpay payment and save confirmed booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingData
    } = body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({
        success: false,
        error: 'Missing payment verification data'
      }, { status: 400 });
    }

    if (!bookingData) {
      return NextResponse.json({
        success: false,
        error: 'Missing booking data'
      }, { status: 400 });
    }

    // Step 1: Verify Razorpay signature
    
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!razorpaySecret) {
      
      return NextResponse.json({
        success: false,
        error: 'Payment verification configuration missing'
      }, { status: 500 });
    }

    const body_string = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', razorpaySecret)
      .update(body_string.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      
      return NextResponse.json({
        success: false,
        error: 'Payment verification failed'
      }, { status: 400 });
    }

    

    // Step 2: Generate booking ID
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 900000) + 100000;
    const bookingId = `FMT-${year}-${month}${day}-003-${randomNum}-${Math.floor(Math.random() * 90) + 10}`;

    

    // Step 3: Process occasion-specific fields
    
    const dynamicOccasionFields = await getOccasionFields(bookingData.occasion, bookingData.occasionData);

    // Step 4: Create complete booking data for confirmed booking
    
    
    const confirmedBookingData = {
      // Basic booking info
      bookingId: bookingId,
      name: bookingData.name.trim(),
      email: bookingData.email.trim().toLowerCase(),
      phone: bookingData.phone.trim(),
      theaterName: bookingData.theaterName.trim(),
      date: bookingData.date,
      time: bookingData.time,
      occasion: bookingData.occasion.trim(),
      
      // Pricing
      totalAmount: bookingData.totalAmount,
      advancePayment: bookingData.advancePayment,
      venuePayment: bookingData.venuePayment,
      appliedCouponCode: bookingData.appliedCouponCode,
      couponDiscount: bookingData.couponDiscount || 0,
      
      // Payment info
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      
      // Status and metadata
      status: 'confirmed', // This is the key fix!
      bookingType: 'online',
      paymentMode: 'razorpay',
      paymentStatus: 'paid',
      createdBy: 'Customer',
      createdAt: new Date(),
      
      // Selected items
      selectedMovies: bookingData.selectedMovies || [],
      selectedCakes: bookingData.selectedCakes || [],
      selectedDecorItems: bookingData.selectedDecorItems || [],
      selectedGifts: bookingData.selectedGifts || [],
      
      // Dynamic occasion fields (this ensures occasion-specific data is saved)
      ...dynamicOccasionFields
    };

    

    // Step 5: Save confirmed booking to main booking collection
    
    const result = await database.saveBooking(confirmedBookingData);

    if (result.success) {
      
      

      return NextResponse.json({
        success: true,
        message: 'Payment verified and booking confirmed successfully!',
        bookingId: bookingId,
        booking: confirmedBookingData,
        database: 'FeelME Town MongoDB',
        collection: 'booking'
      });
    } else {
      
      return NextResponse.json({
        success: false,
        error: 'Failed to save confirmed booking to database'
      }, { status: 500 });
    }

  } catch (error) {
    
    return NextResponse.json({
      success: false,
      error: 'Payment verification failed'
    }, { status: 500 });
  }
}

