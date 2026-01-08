import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';
import emailService from '@/lib/email-service';
import { ExportsStorage } from '@/lib/exports-storage'; // Dummy - no longer used

// Helper function to get occasion specific fields with exact database field names
async function getOccasionFields(occasionName: string, body: any) {
  try {
    console.log('=== getOccasionFields DEBUG ===');
    console.log('Occasion name:', occasionName);
    
    // Fetch occasions from database to get required fields and labels
    const occasions = await database.getAllOccasions();
    console.log('All occasions from DB:', occasions.map(o => ({ name: o.name, requiredFields: o.requiredFields })));
    
    const occasion = occasions.find(occ => occ.name === occasionName);
    console.log('Found occasion:', occasion);
    
    if (!occasion) {
      console.log('Occasion not found in database');
      return {};
    }
    
    
    
    
    
    // Map required fields to body data using exact database field names
    const occasionFields: Record<string, string> = {};

    const assignField = (fieldName: string, rawValue: unknown) => {
      if (rawValue === undefined || rawValue === null) {
        return;
      }
      const trimmed = rawValue.toString().trim();
      if (!trimmed) {
        return;
      }
      occasionFields[fieldName] = trimmed;
    };

    
    // Check if occasionData exists (new dynamic format) - PRIORITY 1
    if (body.occasionData && typeof body.occasionData === 'object') {
      console.log('Processing occasionData:', body.occasionData);
      
      // Map each required field from occasion database to the corresponding value from occasionData
      if (occasion?.requiredFields && occasion.requiredFields.length > 0) {
        console.log('Required fields:', occasion.requiredFields);
        occasion.requiredFields.forEach((dbFieldName: string) => {
          const fieldValue = body.occasionData[dbFieldName];
          console.log(`Checking field ${dbFieldName}:`, fieldValue);
          assignField(dbFieldName, fieldValue);
        });
      }
      
      // Include ANY keys present in occasionData as a resilience fallback,
      // even if occasion.requiredFields is empty or misconfigured
      Object.keys(body.occasionData).forEach(frontendKey => {
        const rawValue = body.occasionData[frontendKey];
        if (rawValue !== undefined && rawValue !== null && rawValue.toString().trim() !== '') {
          if (!occasionFields[frontendKey]) {
            assignField(frontendKey, rawValue);
          }
        }
      });
      
      // If we found data in occasionData, return it directly (don't check legacy fields)
      if (Object.keys(occasionFields).length > 0) {
        console.log('Returning occasion fields from occasionData:', occasionFields);
        return occasionFields;
      }
    }
    
    // Also check for individual fields (legacy support)
    if (occasion?.requiredFields && occasion.requiredFields.length > 0) {
      console.log('Checking legacy fields...');
      occasion.requiredFields.forEach((fieldName: string) => {
        if (body[fieldName]) {
          assignField(fieldName, body[fieldName]);
          console.log(`Added legacy field ${fieldName} with value:`, body[fieldName]);
        }
      });
    }

    console.log('Final occasion fields to return:', occasionFields);
    return occasionFields;
  } catch (error) {
    
    return {};
  }
}

// POST /api/booking - Save booking data to database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    
    
    
    
    
    // Enhanced logging for occasion data debugging
    console.log('=== BOOKING API DEBUG ===');
    console.log('Occasion:', body.occasion);
    console.log('OccasionData:', body.occasionData);
    if (body.occasionData) {
      console.log('OccasionData keys:', Object.keys(body.occasionData));
      Object.keys(body.occasionData).forEach(key => {
        console.log(`  ${key}:`, body.occasionData[key]);
      });
    } else {
      console.log('No occasionData found in request body');
    }
    
    // Validate required fields
    const requiredFields = ['name', 'email', 'phone', 'theaterName', 'date', 'time', 'occasion'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Missing required fields: ${missingFields.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Use pricing from frontend (includes all services, discounts, and calculations)
    
    // Use the totalAmount calculated by frontend (includes theater + services + extra guests + discounts)
    const totalAmount = body.totalAmount || 0;
    
    // Use advance payment and venue payment from frontend if provided, otherwise calculate
    const advancePayment = body.advancePayment ?? 0; // Default advance payment
    const slotBookingFeeForMath = Number(
      body.slotBookingFee ??
        (body.pricingData && typeof body.pricingData === 'object' ? (body.pricingData as any).slotBookingFee : undefined) ??
        advancePayment ??
        0,
    );
    const venuePayment = body.venuePayment ?? (totalAmount - slotBookingFeeForMath);

    // Normalize pricing snapshot and decoration fees from payload
    const normalizedPricingData = (() => {
      if (body.pricingData && typeof body.pricingData === 'object') {
        return { ...body.pricingData };
      }
      return null;
    })();

    const hasAnyDecorationSelection =
      String(body.wantDecorItems || '').toLowerCase() === 'yes' ||
      (Array.isArray(body.selectedDecorItems) && body.selectedDecorItems.length > 0) ||
      (Array.isArray(body.selectedExtraAddOns) && body.selectedExtraAddOns.length > 0);

    const decorationFeeValue = Number(
      body.decorationFee ?? 
      body.decorationAppliedFee ?? 
      normalizedPricingData?.decorationFees ?? 
      0
    ) || 0;

    const decorationAppliedFee = hasAnyDecorationSelection ? decorationFeeValue : 0;

    if (normalizedPricingData) {
      normalizedPricingData.decorationFees = Number(
        normalizedPricingData.decorationFees ?? decorationAppliedFee ?? 0
      ) || 0;
    }

    // Helper function to calculate booking date and time
    const calculateBookingDateTime = (date: string, time: string) => {
      try {
        let bookingDate: Date;
        
        if (date.includes(',')) {
          // Format: "Thursday, October 2, 2025" - parse manually
          const dateParts = date.split(', ');
          if (dateParts.length >= 2) {
            const dateStr = dateParts[1]; // "October 2, 2025"
            
            // Manual parsing to avoid JavaScript date parsing issues
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                              'July', 'August', 'September', 'October', 'November', 'December'];
            
            const parts = dateStr.split(' '); // ["October", "2", "2025"]
            
            if (parts.length >= 2) {
              const monthName = parts[0]; // "October"
              const dayStr = parts[1].replace(',', ''); // "2"
              const yearStr = parts[2] || new Date().getFullYear(); // "2025" or current year
              
              const monthIndex = monthNames.indexOf(monthName);
              const day = parseInt(dayStr);
              const year = parseInt(String(yearStr));
              
              if (monthIndex !== -1 && !isNaN(day) && !isNaN(year)) {
                bookingDate = new Date(year, monthIndex, day);
              } else {
                throw new Error('Invalid date format');
              }
            } else {
              throw new Error('Invalid date format');
            }
          } else {
            bookingDate = new Date(date);
          }
        } else {
          // Format: "2025-09-27" or similar
          bookingDate = new Date(date);
        }
        
        if (isNaN(bookingDate.getTime())) {
          throw new Error('Invalid date format');
        }
        
        
        
        // Parse time to get hours and minutes
        let hour24 = 18; // Default to 6 PM
        let minutes = 0;
        
        if (time) {
          // Handle different time formats
          if (time.includes(' - ')) {
            // Format: "4:00 PM - 7:00 PM" - extract start time
            const startTime = time.split(' - ')[0].trim();
            const timeMatch = startTime.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
            if (timeMatch) {
              const [, hours, mins, period] = timeMatch;
              hour24 = parseInt(hours);
              minutes = parseInt(mins);
              
              if (period.toLowerCase() === 'pm' && hour24 !== 12) {
                hour24 += 12;
              } else if (period.toLowerCase() === 'am' && hour24 === 12) {
                hour24 = 0;
              }
            }
          } else {
            // Format: "6:00 PM" - direct time
            const timeMatch = time.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
            if (timeMatch) {
              const [, hours, mins, period] = timeMatch;
              hour24 = parseInt(hours);
              minutes = parseInt(mins);
              
              if (period.toLowerCase() === 'pm' && hour24 !== 12) {
                hour24 += 12;
              } else if (period.toLowerCase() === 'am' && hour24 === 12) {
                hour24 = 0;
              }
            }
          }
        }
        
        // Create booking date time in IST
        const bookingDateTime = new Date(bookingDate);
        bookingDateTime.setHours(hour24, minutes, 0, 0);
        
        // Convert to IST timezone for database storage
        const istDateTime = new Date(bookingDateTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        
        
        
        
        
        return istDateTime;
      } catch (error) {
        
        // Fallback: use current time
        return new Date();
      }
    };


    // Get occasion specific fields first
    console.log('Getting occasion fields...');
    const occasionFields = await getOccasionFields(body.occasion, body);
    console.log('Occasion fields received:', occasionFields);

    // Create booking data
    const bookingData = {
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone.trim(),
      theaterName: body.theaterName.trim(),
      date: body.date,
      time: body.time,
      occasion: body.occasion.trim(),
      // Preserve full dynamic occasion data for database layer resilience
      occasionData: body.occasionData || {},
      numberOfPeople: body.numberOfPeople || 2,
      // Calculate and store extra guests count for easy reference
      extraGuestsCount: (() => {
        const numberOfPeople = body.numberOfPeople || 2;
        // Get theater capacity to calculate extra guests
        const getTheaterCapacity = (theaterName: string) => {
          if (theaterName?.includes('EROS') || theaterName?.includes('FMT-Hall-1')) return { min: 2, max: 4 };
          if (theaterName?.includes('PHILIA') || theaterName?.includes('FMT-Hall-2')) return { min: 2, max: 6 };
          if (theaterName?.includes('PRAGMA') || theaterName?.includes('FMT-Hall-3')) return { min: 2, max: 8 };
          if (theaterName?.includes('STORGE') || theaterName?.includes('FMT-Hall-4')) return { min: 2, max: 10 };
          return { min: 2, max: 10 };
        };
        const capacity = getTheaterCapacity(body.theaterName || '');
        return Math.max(0, numberOfPeople - capacity.min);
      })(),
      selectedCakes: body.selectedCakes || [],
      selectedDecorItems: body.selectedDecorItems || [],
      selectedMovies: body.selectedMovies || [],
      totalAmount: totalAmount,
      totalAmountBeforeDiscount: body.totalAmountBeforeDiscount ?? body.amountBeforeDiscount ?? null,
      totalAmountAfterDiscount: body.totalAmountAfterDiscount ?? totalAmount,
      discountAmount: body.discountAmount ?? null,
      discountSummary: body.discountSummary ?? null,
      Discount: body.Discount ?? body.discount ?? null,
      discount: body.discount ?? null,
      specialDiscount: body.specialDiscount ?? body.adminDiscount ?? null,
      adminDiscount: body.adminDiscount ?? null,
      appliedCouponCode: body.appliedCouponCode ?? body.discountSummary?.code ?? undefined,
      couponDiscount: body.couponDiscount ?? body.DiscountByCoupon ?? body.discountByCoupon ?? 0,
      couponDiscountType: body.couponDiscountType ?? body.discountSummary?.type ?? null,
      couponDiscountValue: body.couponDiscountValue ?? body.discountSummary?.value ?? null,
      DiscountByCoupon: body.DiscountByCoupon ?? body.discountByCoupon ?? body.couponDiscount ?? 0,
      advancePayment: advancePayment, // Amount paid now (25%)
      venuePayment: venuePayment, // Amount to be paid at venue
      slotBookingFee: body.slotBookingFee ?? body.pricingData?.slotBookingFee ?? advancePayment,
      paymentMode: body.paymentMode || body.paymentMethod || 'pay_at_venue',
      advancePaymentMethod: body.advancePaymentMethod || body.paymentMode || body.paymentMethod || 'pay_at_venue',
      venuePaymentMethod: body.venuePaymentMethod || body.paymentMode || body.paymentMethod || 'pay_at_venue',
      paymentMethod: body.paymentMethod || undefined,
      finalPaymentMethod: body.finalPaymentMethod || body.final_payment_method || undefined,
      paymentStatus: (() => {
        const normalized = String(body.paymentStatus || 'unpaid').toLowerCase();
        if (normalized === 'paid') return 'paid';
        if (normalized === 'partial') return 'partial';
        return 'unpaid';
      })(),
      status: body.isManualBooking ? 'manual' : 'confirmed', // Booking status
      // Store pricing data used at time of booking
      pricingData: normalizedPricingData || {
        slotBookingFee: 1000,
        extraGuestFee: 400,
        convenienceFee: 50,
        decorationFees: decorationAppliedFee
      },
      // Store calculated extra guest charges
      extraGuestCharges: body.extraGuestCharges || 0,
      decorationFee: decorationAppliedFee,
      decorationAppliedFee,
      // Timestamps - Set createdAt based on booking time, not server time
      createdAt: calculateBookingDateTime(body.date, body.time), // When booking was created (based on booking time)
      // Manual booking specific fields
      isManualBooking: body.isManualBooking || false,
      bookingType: body.bookingType || 'Online',
      createdBy: body.createdBy || 'Customer',
      staffId: body.staffId || null, // Staff ID who created the booking
      staffName: body.staffName || null, // Staff name who created the booking
      notes: body.notes || '',
      // Spread occasion specific fields dynamically from database (no legacy occasionPersonName)
      ...occasionFields
    };
    
    console.log('Final booking data to save:', JSON.stringify(bookingData, null, 2));

    // Check if this is completing an incomplete booking
    const incompleteBookingId = body.incompleteBookingId;
    let deletedIncompleteBooking = null;

    // Save to database using db-connect (optimized for speed)
    let result;
    
    if (body.isManualBooking) {
      // Manual bookings go ONLY to manual_booking collection
      
      result = await database.saveManualBooking({
        ...bookingData,
        staffId: body.staffId,
        staffName: body.staffName,
        createdBy: body.createdBy || 'Admin'
      });
      
    } else {
      // Online bookings go to regular booking collection
      // Note: Counter increment is handled inside saveBooking function
      result = await database.saveBooking(bookingData);
      
    }

    if (result.success && result.booking) {
      const bookingType = body.isManualBooking ? 'Manual' : 'Online';
      const createdBy = body.createdBy || 'Customer';
      
      
      
      // Log occasion-specific fields that were saved
      
      const occasionFields = await getOccasionFields(body.occasion, body);
      Object.keys(occasionFields).forEach(key => {
        if (key.endsWith('_label')) {
          const baseKey = key.replace('_label', '');
          const label = occasionFields[key];
          const value = occasionFields[baseKey];
          
        } else if (!key.endsWith('_value') && !key.endsWith('_label')) {
          
        }
      });

      // If this was completing an incomplete booking, delete the incomplete one
      if (incompleteBookingId) {
        
        
        const deleteResult = await database.deleteIncompleteBooking(incompleteBookingId);
        if (deleteResult.success) {
          
          deletedIncompleteBooking = {
            id: incompleteBookingId,
            deleted: true
          };
        } else {
          
        }
      }

      // Update blob storage JSON files
      try {
        if (body.isManualBooking) {
          // Manual bookings are now only stored in database, not in JSON files
          console.log('✅ Manual booking saved to database only (no JSON file):', result.booking.bookingId);
        } else {
          // Update confirmed bookings JSON (if it exists)
          try {
            const confirmed = await ExportsStorage.readArray('confirmed-bookings.json');
            const confirmedBookingRecord = {
              id: result.booking.id,
              bookingId: result.booking.bookingId,
              name: result.booking.name,
              email: result.booking.email,
              phone: result.booking.phone,
              theaterName: result.booking.theaterName,
              date: result.booking.date,
              time: result.booking.time,
              occasion: result.booking.occasion,
              numberOfPeople: result.booking.numberOfPeople,
              totalAmount: result.booking.totalAmount,
              advancePayment: result.booking.advancePayment,
              venuePayment: result.booking.venuePayment,
              status: result.booking.status,
              createdAt: result.booking.createdAt,
              ...occasionFields
            };
            
            confirmed.push(confirmedBookingRecord);
            await ExportsStorage.writeArray('confirmed-bookings.json', confirmed);
            console.log('✅ Confirmed booking written to confirmed-bookings.json:', result.booking.bookingId);
          } catch (jsonError) {
            console.log('ℹ️ confirmed-bookings.json not found or error, skipping JSON update');
          }
        }
      } catch (jsonError) {
        console.error('❌ Failed to update JSON files in blob storage:', jsonError);
        // Don't fail the booking if JSON update fails
      }

      // Send confirmation email in background (no invoice attachment)
      // Include occasion-specific fields in the email data
      const emailData = {
        ...result.booking,
        // Include occasion-specific fields from the original booking data
        ...occasionFields
      };
      emailService.sendBookingConfirmed(emailData).catch(error => {
        
      });

      return NextResponse.json({
        success: true,
        message: 'Booking completed successfully!',
        bookingId: result.booking.id,
        booking: result.booking,
        database: 'FeelME Town',
        collection: body.isManualBooking ? 'manual_booking' : 'booking',
        bookingType: body.isManualBooking ? 'Manual' : 'Online',
        incompleteBookingDeleted: deletedIncompleteBooking
      }, { status: 201 });
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to save booking data. Please try again.' 
      },
      { status: 500 }
    );
  }
}
