import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';
import { ExportsStorage } from '@/lib/exports-storage';
import emailService from '@/lib/email-service';

// Helper function to extract dynamic service items from request body
function getDynamicServiceItems(body: any): Record<string, any> {
  const dynamicServiceItems: Record<string, any> = {};

  // Look for all fields that start with "selected" and contain service items
  Object.keys(body).forEach(key => {
    if (key.startsWith('selected') && Array.isArray(body[key])) {
      // Store ALL dynamic service items (including movies, cakes, etc.)
      dynamicServiceItems[key] = body[key];
      console.log(`📦 Dynamic service items found: ${key}:`, body[key]);
    }
  });

  return dynamicServiceItems;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Step 1: Get occasion details from database (only if occasion is provided)
    console.log('OccasionData:', body.occasionData);
    console.log('Occasion from body:', body.occasion);

    let selectedOccasion = null;

    // Only validate occasion if it's provided and not empty (decoration = Yes case)
    if (body.occasion && typeof body.occasion === 'string' && body.occasion.trim() !== '') {
      const occasions = await database.getAllOccasions();
      console.log('All occasions from DB:', occasions.map(o => ({ name: o.name, requiredFields: o.requiredFields })));

      selectedOccasion = occasions.find(occ => occ.name === body.occasion);
      console.log('Found occasion:', selectedOccasion);

      if (!selectedOccasion) {
        console.log('Occasion not found in database');
        return NextResponse.json({
          success: false,
          error: 'Occasion not found in database'
        });
      }
    } else {
      console.log('No occasion provided (decoration = No), skipping occasion validation');
    }





    // Step 2: Process occasion-specific fields



    const dynamicOccasionFields: any = {};

    if (body.occasionData && selectedOccasion && selectedOccasion.requiredFields) {
      console.log('Processing occasionData:', body.occasionData);
      console.log('Required fields:', selectedOccasion.requiredFields);

      selectedOccasion.requiredFields.forEach((dbFieldName: string) => {


        // Try multiple ways to find the field in frontend data
        let fieldValue = null;
        let foundKey = null;

        // Method 1: Direct match
        if (body.occasionData[dbFieldName]) {
          fieldValue = body.occasionData[dbFieldName];
          foundKey = dbFieldName;

        }

        // Method 2: Check all keys in occasionData for partial matches
        if (!fieldValue) {
          const frontendKeys = Object.keys(body.occasionData);


          for (const frontendKey of frontendKeys) {
            // Method 2a: Exact match (case insensitive, space insensitive)
            if (frontendKey.toLowerCase().replace(/\s+/g, '') === dbFieldName.toLowerCase().replace(/\s+/g, '')) {
              fieldValue = body.occasionData[frontendKey];
              foundKey = frontendKey;

              break;
            }

            // Method 2b: Check if frontend key contains database field name words
            const dbWords = dbFieldName.toLowerCase().split(/\s+/);
            const frontendWords = frontendKey.toLowerCase().split(/\s+/);

            if (dbWords.every(word => frontendWords.some(fWord => fWord.includes(word) || word.includes(fWord)))) {
              fieldValue = body.occasionData[frontendKey];
              foundKey = frontendKey;

              break;
            }
          }
        }

        // Method 3: Use the frontend key as database field name if no match found
        if (!fieldValue && body.occasionData) {
          const frontendKeys = Object.keys(body.occasionData);
          if (frontendKeys.length > 0) {
            // Map frontend keys to database field names based on position
            const dbFieldIndex = selectedOccasion.requiredFields.indexOf(dbFieldName);
            if (dbFieldIndex >= 0 && dbFieldIndex < frontendKeys.length) {
              const frontendKey = frontendKeys[dbFieldIndex];
              fieldValue = body.occasionData[frontendKey];
              foundKey = frontendKey;

            }
          }
        }

        if (fieldValue && fieldValue.toString().trim()) {
          const trimmedValue = fieldValue.toString().trim();
          const fieldLabel = selectedOccasion.fieldLabels?.[dbFieldName] || dbFieldName;

          // Save with exact database field name
          dynamicOccasionFields[dbFieldName] = trimmedValue;
          dynamicOccasionFields[`${dbFieldName}_label`] = fieldLabel;
          dynamicOccasionFields[`${dbFieldName}_value`] = trimmedValue;

          console.log(`Added field ${dbFieldName} with value:`, trimmedValue);
        } else {
          console.log(`No value found for field ${dbFieldName}`);
        }
      });
    }



    // Step 3: Use pricing from frontend (includes all services and calculations)

    // Use the totalAmount calculated by frontend (includes theater + services + extra guests + discounts)
    const totalAmount = body.totalAmount || 0;

    // Use advance payment and venue payment from frontend if provided, otherwise calculate
    const advancePayment = body.advancePayment ?? Math.round(totalAmount * 0.30); // 30% advance



    // Step 4: Generate booking ID using database helper so it stays sequential (FMT-YYYY-COUNTER)
    const bookingId = await (database as any).generateBookingId?.();



    // Step 5: Get theater capacity from database
    let theaterCapacity = { min: 2, max: 10 }; // Default fallback

    try {
      // Fetch theater data to get actual capacity
      const theaterResult = await database.getAllTheaters();
      if (theaterResult.success && theaterResult.theaters) {
        const selectedTheater = theaterResult.theaters.find((theater: any) =>
          theater.name === body.theaterName ||
          theater.name.includes(body.theaterName.split(' ')[0]) // Match by first word
        );

        if (selectedTheater && selectedTheater.capacity && selectedTheater.capacity.min && selectedTheater.capacity.max) {
          theaterCapacity = {
            min: selectedTheater.capacity.min,
            max: selectedTheater.capacity.max
          };
          console.log('✅ [Booking API] Using theater capacity from database:', theaterCapacity, 'for theater:', body.theaterName);
        } else {
          console.log('⚠️ [Booking API] Theater capacity not found, using fallback for:', body.theaterName);
        }
      }
    } catch (error) {
      console.log('❌ [Booking API] Error fetching theater capacity:', error);
    }

    // Calculate extra guests based on actual theater capacity
    const actualExtraGuests = Math.max(0, (body.numberOfPeople || theaterCapacity.min) - theaterCapacity.min);

    // Build pricing snapshot: prefer frontend, else fetch from DB (Standard Pricing)
    let pricingSnapshot: any = body.pricingData || null;
    if (!pricingSnapshot) {
      try {
        const pricingResult = await (database as any).getAllPricing?.();
        if (pricingResult?.success && Array.isArray(pricingResult.pricing) && pricingResult.pricing.length > 0) {
          const first = pricingResult.pricing[0];
          pricingSnapshot = {
            id: first._id || first.id || undefined,
            name: first.name || 'Pricing',
            slotBookingFee: Number(first.slotBookingFee ?? 0),
            extraGuestFee: Number(first.extraGuestFee ?? 0),
            convenienceFee: Number(first.convenienceFee ?? 0),
            decorationFees: Number(first.decorationFees ?? 0)
          };
        }
      } catch { }
    }

    const normalizedPricingSnapshot: Record<string, unknown> = {
      ...(pricingSnapshot || {}),
      ...(body.pricingData || {}),
    };
    normalizedPricingSnapshot.slotBookingFee = Number(
      normalizedPricingSnapshot.slotBookingFee ?? body.slotBookingFee ?? pricingSnapshot?.slotBookingFee ?? 0,
    );
    normalizedPricingSnapshot.extraGuestFee = Number(
      normalizedPricingSnapshot.extraGuestFee ?? body.extraGuestFee ?? pricingSnapshot?.extraGuestFee ?? 0,
    );
    normalizedPricingSnapshot.convenienceFee = Number(
      normalizedPricingSnapshot.convenienceFee ?? pricingSnapshot?.convenienceFee ?? 0,
    );
    normalizedPricingSnapshot.decorationFees = Number(
      normalizedPricingSnapshot.decorationFees ?? pricingSnapshot?.decorationFees ?? 0,
    );
    normalizedPricingSnapshot.theaterBasePrice = Number(
      normalizedPricingSnapshot.theaterBasePrice ?? pricingSnapshot?.theaterBasePrice ?? 0,
    );
    normalizedPricingSnapshot.discountByCoupon = Number(
      body.DiscountByCoupon ??
        body.discountByCoupon ??
        body.couponDiscount ??
        normalizedPricingSnapshot.discountByCoupon ??
        pricingSnapshot?.discountByCoupon ??
        0,
    );

    const slotBookingFeeForMath = Number(
      body.slotBookingFee ??
        (body.pricingData && typeof body.pricingData === 'object' ? (body.pricingData as any).slotBookingFee : undefined) ??
        normalizedPricingSnapshot.slotBookingFee ??
        advancePayment ??
        0,
    );

    const venuePayment = body.venuePayment ?? (totalAmount - slotBookingFeeForMath);

    // Compute decoration fee explicitly like slotBookingFee (from snapshot)
    // Store decoration fee if decoration is enabled OR any related items are present
    const hasAnyDecoration =
      (String(body.wantDecorItems || '').toLowerCase() === 'yes') ||
      (Array.isArray(body.selectedDecorItems) && body.selectedDecorItems.length > 0) ||
      (Array.isArray((body as any).selectedExtraAddOns) && (body as any).selectedExtraAddOns.length > 0);

    const dropdownDecorationFee = Number(normalizedPricingSnapshot.decorationFees ?? 0);
    const decorationAppliedFee = hasAnyDecoration ? dropdownDecorationFee : 0;

    // Step 6: Create complete booking data
    const isManualBooking = Boolean(body.isManualBooking) || String(body.status || '').toLowerCase() === 'manual';
    const completeBookingData = {
      // Basic booking info
      bookingId: bookingId,
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone.trim(),
      theaterName: body.theaterName.trim(),
      date: body.date,
      time: body.time,
      occasion: body.occasion.trim(),

      // Guest information (dynamic based on theater capacity)
      numberOfPeople: body.numberOfPeople || theaterCapacity.min,
      extraGuestsCount: actualExtraGuests,
      extraGuestCharges: body.extraGuestCharges || 0,

      // Store theater capacity for reference
      theaterCapacity: theaterCapacity,
      baseCapacity: theaterCapacity.min,

      // Pricing
      totalAmount: totalAmount,
      totalAmountBeforeDiscount: body.totalAmountBeforeDiscount ?? body.amountBeforeDiscount ?? null,
      totalAmountAfterDiscount: body.totalAmountAfterDiscount ?? totalAmount,
      discountAmount: body.discountAmount ?? null,
      discountSummary: body.discountSummary ?? null,
      Discount: body.Discount ?? body.discount ?? null,
      discount: body.discount ?? null,
      specialDiscount: body.specialDiscount ?? body.adminDiscount ?? null,
      adminDiscount: body.adminDiscount ?? null,
      advancePayment: advancePayment,
      venuePayment: venuePayment,
      // Store slot booking fee explicitly (prefer snapshot, fallback to advancePayment)
      slotBookingFee: Number(normalizedPricingSnapshot.slotBookingFee ?? advancePayment),
      // Store the Decoration dropdown fee only when customer opted for/selected decor
      decorationFee: hasAnyDecoration ? dropdownDecorationFee : 0,
      appliedCouponCode: body.appliedCouponCode,
      couponDiscount: body.couponDiscount || 0,
      couponDiscountType: body.couponDiscountType ?? null,
      couponDiscountValue: body.couponDiscountValue ?? null,
      DiscountByCoupon: body.DiscountByCoupon ?? body.discountByCoupon ?? body.couponDiscount ?? 0,

      // Store pricing data used at time of booking (snapshot)
      pricingData: normalizedPricingSnapshot,
      // Keep helper for invoice math/compat
      decorationAppliedFee,

      // Status and metadata
      status: isManualBooking ? 'manual' : (body.status || 'confirmed'),
      bookingType: isManualBooking ? 'Manual' : (body.bookingType || 'online'),
      paymentMode: body.paymentMode || 'pay_at_venue',
      advancePaymentMethod: body.advancePaymentMethod || body.paymentMode || body.paymentMethod || 'pay_at_venue',
      venuePaymentMethod: body.venuePaymentMethod || body.paymentMode || body.paymentMethod || 'pay_at_venue',
      paymentMethod: body.paymentMethod || body.payment_mode || body.paymentMode || undefined,
      finalPaymentMethod: body.finalPaymentMethod || body.final_payment_method || undefined,
      paymentStatus: (() => {
        const normalized = String(body.paymentStatus || 'unpaid').toLowerCase();
        if (normalized === 'paid') return 'paid';
        if (normalized === 'partial') return 'partial';
        return 'unpaid';
      })(),
      createdBy: body.createdBy || 'Customer',
      isManualBooking,
      createdAt: new Date(),

      // Dynamic occasion fields (this is the key part!)
      ...dynamicOccasionFields,

      // Dynamic service items (completely dynamic - no hardcoded fields!)
      ...getDynamicServiceItems(body)
    };

    console.log('Final booking data to save:', JSON.stringify(completeBookingData, null, 2));
    console.log('Dynamic occasion fields:', dynamicOccasionFields);
    console.log('Dynamic service items:', getDynamicServiceItems(body));

    // Step 6: Save to database

    const saveFn = completeBookingData.isManualBooking
      ? (database as any).saveManualBooking
      : (database as any).saveBooking;

    const result = await saveFn(completeBookingData);

    if (result.success) {

      // Manual bookings are now only stored in database, not in JSON files
      if (completeBookingData.isManualBooking || completeBookingData.status === 'manual') {
        console.log('✅ Manual booking saved to database only (no JSON file):', completeBookingData.bookingId);
      }

      const persistedBooking = (result as any).booking || { ...completeBookingData, bookingId };
      const persistedBookingId = persistedBooking.bookingId || persistedBooking.id || bookingId;

      // Sync Excel records after new booking
      try {
        await fetch(`${request.nextUrl.origin}/api/admin/sync-excel-records`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: persistedBookingId,
            oldStatus: null,
            newStatus: persistedBooking.status || completeBookingData.status,
            action: 'create'
          })
        });
        console.log('✅ Excel records synced after new booking');
      } catch (syncError) {
        console.error('⚠️ Failed to sync Excel records:', syncError);
      }

      const bookingForEmail = persistedBooking;
      emailService.sendBookingConfirmed(bookingForEmail as any).catch(() => { });

      return NextResponse.json({
        success: true,
        message: 'Booking completed successfully with dynamic fields!',
        bookingId: persistedBookingId,
        booking: bookingForEmail,
        dynamicFields: dynamicOccasionFields,
        database: (result as any).database || 'FeelME Town',
        collection: (result as any).collection || 'booking'
      });
    } else {

      return NextResponse.json({
        success: false,
        error: 'Failed to save booking to database'
      });
    }

  } catch (error) {

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    });
  }
}

