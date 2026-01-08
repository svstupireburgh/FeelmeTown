import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';
import { ExportsStorage } from '@/lib/exports-storage';
import emailService from '@/lib/email-service';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📝 PUT /api/admin/update-booking - Received:', { bookingId: body.bookingId, body });
    
    const { 
      bookingId, 
      customerName, 
      email, 
      phone, 
      theater, 
      theaterName,
      date, 
      time, 
      status, 
      amount,
      totalAmount,
      advancePayment,
      venuePayment,
      numberOfPeople,
      paymentStatus,
      venuePaymentMethod,
      paidBy,
      staffName,
      userId,
      paidAt,
      sendInvoice = true,
      isManualBooking = false,
      resendConfirmationEmail = false,
      occasion,
      occasionData,
      decorationFee,
      appliedDecorationFee,
      dynamicOccasionKeys: dynamicOccasionKeysRaw,
      legacyOccasionKeys: legacyOccasionKeysRaw,
      legacyOccasionKeysToClear: legacyOccasionKeysToClearRaw
    } = body;

    // Guard: if a staff userId is provided, enforce bookingAccess permissions
    const actorStaffUserId = typeof body.userId === 'string' ? body.userId.trim() : body.userId;
    if (actorStaffUserId) {
      try {
        const staffMembers = await database.getAllStaff();
        const staffRecord = (staffMembers || []).find((m: any) =>
          String(m?.userId || m?._id || '').trim() === String(actorStaffUserId).trim()
        );

        if (staffRecord) {
          const access = staffRecord.bookingAccess === 'edit' ? 'edit' : 'view';
          if (access !== 'edit') {
            return NextResponse.json(
              { success: false, error: 'View-only staff cannot modify bookings.' },
              { status: 403 }
            );
          }
        }
      } catch {
        // If staff lookup fails, fall back to allowing the update (no auth context available)
      }
    }

    const dynamicOccasionKeys: string[] = Array.isArray(dynamicOccasionKeysRaw)
      ? Array.from(
          new Set(
            (dynamicOccasionKeysRaw as any[])
              .map((key) => (typeof key === 'string' ? key.trim() : ''))
              .filter((key) => Boolean(key)),
          ),
        )
      : [];

    const legacyOccasionKeys: string[] = Array.isArray(legacyOccasionKeysRaw)
      ? Array.from(
          new Set(
            (legacyOccasionKeysRaw as any[])
              .map((key) => (typeof key === 'string' ? key.trim() : ''))
              .filter((key) => Boolean(key)),
          ),
        )
      : [];

    const legacyOccasionKeysToClear: string[] = Array.isArray(legacyOccasionKeysToClearRaw)
      ? Array.from(
          new Set(
            (legacyOccasionKeysToClearRaw as any[])
              .map((key) => (typeof key === 'string' ? key.trim() : ''))
              .filter((key) => Boolean(key)),
          ),
        )
      : [];

    if (!bookingId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Booking ID is required'
        },
        { status: 400 }
      );
    }

    // Update booking data - only include fields that are provided
    const updateData: any = {};
    let pendingPricingData: Record<string, unknown> | null = null;
    
    if (customerName !== undefined) updateData.customerName = customerName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    const resolvedTheater = theater !== undefined ? theater : theaterName;
    if (resolvedTheater !== undefined) {
      updateData.theater = resolvedTheater;
      updateData.theaterName = resolvedTheater; // Also update theaterName for database compatibility
    }
    if (date !== undefined) updateData.date = date;
    if (time !== undefined) updateData.time = time;
    if (status !== undefined) updateData.status = status;
    const resolvedTotalAmount = totalAmount !== undefined ? totalAmount : amount;
    if (resolvedTotalAmount !== undefined) {
      updateData.amount = resolvedTotalAmount;
      updateData.totalAmount = resolvedTotalAmount;
    }
    if (advancePayment !== undefined) updateData.advancePayment = advancePayment;
    const resolvedSlotBookingFee = body.slotBookingFee !== undefined ? body.slotBookingFee : advancePayment;
    if (resolvedSlotBookingFee !== undefined) updateData.slotBookingFee = resolvedSlotBookingFee;
    if (venuePayment !== undefined) updateData.venuePayment = venuePayment;
    if (numberOfPeople !== undefined) updateData.numberOfPeople = numberOfPeople;
    if (body.extraGuestFee !== undefined) updateData.extraGuestFee = body.extraGuestFee;
    if (body.extraGuestCharges !== undefined) updateData.extraGuestCharges = body.extraGuestCharges;
    if (body.extraGuestsCount !== undefined) updateData.extraGuestsCount = body.extraGuestsCount;
    if (body.penaltyCharges !== undefined) {
      updateData.penaltyCharges = body.penaltyCharges;
      updateData.penaltyCharge = body.penaltyCharges;
    }
    if (body.penaltyReason !== undefined) {
      updateData.penaltyReason = typeof body.penaltyReason === 'string' ? body.penaltyReason.trim() : body.penaltyReason;
    }
    if ((body as any).Discount !== undefined || (body as any).discount !== undefined) {
      (updateData as any).Discount = (body as any).Discount ?? (body as any).discount;
    }
    if ((body as any).DiscountByCoupon !== undefined || (body as any).discountByCoupon !== undefined) {
      (updateData as any).DiscountByCoupon = (body as any).DiscountByCoupon ?? (body as any).discountByCoupon;
    }
    if (body.specialDiscount !== undefined) {
      updateData.specialDiscount = body.specialDiscount;
    } else if (body.adminDiscount !== undefined) {
      // Fallback to adminDiscount for compatibility
      updateData.specialDiscount = body.adminDiscount;
    }
    if (occasion !== undefined) updateData.occasion = occasion;
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    const normalizedVenuePaymentMethod = typeof venuePaymentMethod === 'string' ? venuePaymentMethod.toLowerCase() : undefined;
    if (normalizedVenuePaymentMethod) {
      updateData.venuePaymentMethod = normalizedVenuePaymentMethod;
      updateData.paymentMethod = normalizedVenuePaymentMethod;
    }
    
    // Add payment tracking fields
    console.log('🔍 [API] Payment tracking fields received:', { paidBy, staffName, userId, paidAt });
    
    if (paidBy !== undefined) {
      updateData.paidBy = paidBy;
      console.log('✅ [API] Added paidBy:', paidBy);
    }
    if (staffName !== undefined) {
      updateData.staffName = staffName;
      console.log('✅ [API] Added staffName:', staffName);
    }
    if (userId !== undefined) {
      updateData.userId = userId;
      console.log('✅ [API] Added userId:', userId);
    }
    if (paidAt !== undefined) {
      updateData.paidAt = paidAt;
      console.log('✅ [API] Added paidAt:', paidAt);
    }
    
    // Include dynamic service selections coming from Edit Booking (selected*) and pricingData
    try {
      Object.keys(body || {}).forEach((key) => {
        const value = (body as any)[key];
        if (key.startsWith('selected') && Array.isArray(value)) {
          updateData[key] = value;
        }
      });
      if (body.pricingData && typeof body.pricingData === 'object') {
        const incomingPricingData = { ...body.pricingData } as Record<string, unknown>;
        if ((body as any).DiscountByCoupon !== undefined || (body as any).discountByCoupon !== undefined) {
          incomingPricingData.discountByCoupon = (body as any).DiscountByCoupon ?? (body as any).discountByCoupon;
        }
        if (Object.keys(incomingPricingData).length > 0) {
          pendingPricingData = incomingPricingData;
        }
      }
    } catch {}

    const rawOccasionData =
      occasionData && typeof occasionData === 'object' ? { ...occasionData } : undefined;

    const normalizedOccasionData: Record<string, string> = {};

    if (rawOccasionData) {
      Object.entries(rawOccasionData).forEach(([fieldKey, fieldValue]) => {
        if (typeof fieldValue !== 'string') return;
        const trimmedValue = fieldValue.trim();
        if (!trimmedValue) return;
        normalizedOccasionData[fieldKey] = trimmedValue;
      });
    }

    dynamicOccasionKeys.forEach((fieldKey) => {
      const valueFromOccasionData =
        typeof rawOccasionData?.[fieldKey] === 'string'
          ? (rawOccasionData as Record<string, string>)[fieldKey].trim()
          : undefined;
      const valueFromBody =
        typeof body[fieldKey] === 'string' ? (body[fieldKey] as string).trim() : undefined;

      const resolvedValue = valueFromOccasionData || valueFromBody || '';

      if (resolvedValue) {
        normalizedOccasionData[fieldKey] = resolvedValue;
        updateData[fieldKey] = resolvedValue;
      } else {
        delete normalizedOccasionData[fieldKey];
        updateData[fieldKey] = '';
      }
    });

    Object.entries(normalizedOccasionData).forEach(([fieldKey, fieldValue]) => {
      if (updateData[fieldKey] === undefined) {
        updateData[fieldKey] = fieldValue;
      }
    });

    if (dynamicOccasionKeys.length > 0 || rawOccasionData) {
      updateData.occasionData = normalizedOccasionData;
    }

    const legacyKeysToPersistSet = new Set(legacyOccasionKeys);

    legacyOccasionKeys.forEach((legacyKey) => {
      const baseValueRaw = body[legacyKey];
      const baseValue = typeof baseValueRaw === 'string' ? baseValueRaw.trim() : baseValueRaw;

      if (typeof baseValue === 'string') {
        updateData[legacyKey] = baseValue;
      } else if (baseValue !== undefined) {
        updateData[legacyKey] = baseValue;
      }

      const labelKey = `${legacyKey}_label`;
      const valueKey = `${legacyKey}_value`;

      const rawLabel = body[labelKey];
      const rawValue = body[valueKey];

      if (typeof rawLabel === 'string' && rawLabel.trim()) {
        updateData[labelKey] = rawLabel.trim();
      } else if (typeof baseValue === 'string' && baseValue) {
        updateData[labelKey] = legacyKey;
      }

      if (typeof rawValue === 'string') {
        updateData[valueKey] = rawValue.trim();
      } else if (typeof baseValue === 'string') {
        updateData[valueKey] = baseValue;
      }
    });

    legacyOccasionKeysToClear.forEach((legacyKey) => {
      if (legacyKeysToPersistSet.has(legacyKey)) return;
      if (updateData[legacyKey] === undefined) {
        updateData[legacyKey] = '';
      } else if (typeof updateData[legacyKey] === 'string' && updateData[legacyKey]?.trim()) {
        return;
      } else {
        updateData[legacyKey] = '';
      }
    });

    const fallbackDynamicOccasionKeys = [
      'birthdayName',
      'birthdayGender',
      'partner1Name',
      'partner1Gender',
      'partner2Name',
      'partner2Gender',
      'dateNightName',
      'proposerName',
      'proposalPartnerName',
      'valentineName',
      'customCelebration',
      'occasionPersonName',
    ];
    fallbackDynamicOccasionKeys.forEach((key) => {
      if (body[key] === undefined) return;
      const value = body[key];
      if (typeof value === 'string') {
        updateData[key] = value.trim();
      } else {
        updateData[key] = value;
      }
    });

    if (decorationFee !== undefined) {
      updateData.decorationFee = decorationFee;
    }
    if (appliedDecorationFee !== undefined) {
      updateData.appliedDecorationFee = appliedDecorationFee;
    }
    if (body.penaltyCharges !== undefined) {
      updateData.penaltyCharges = body.penaltyCharges;
      updateData.penaltyCharge = body.penaltyCharges;
    }

    // Get current booking to check status change
    let currentBooking;
    let isManual = !!isManualBooking;
    if (isManual) {
      const manualBookings = await database.getAllManualBookings();
      currentBooking = manualBookings.manualBookings?.find((b: any) => (b.bookingId || b.id) === bookingId);
    } else {
      const bookingResult = await database.getBookingById(bookingId);
      currentBooking = bookingResult.booking;
      if (!currentBooking) {
        const manualBookings = await database.getAllManualBookings();
        const manual = manualBookings.manualBookings?.find((b: any) => (b.bookingId || b.id) === bookingId);
        if (manual) {
          currentBooking = manual;
          isManual = true;
        }
      } else if (currentBooking.isManualBooking || currentBooking.bookingType === 'Manual' || currentBooking.status === 'manual') {
        isManual = true;
      }
    }

    if (pendingPricingData) {
      updateData.pricingData = {
        ...((currentBooking as any)?.pricingData || {}),
        ...pendingPricingData,
      };
    }

    console.log('📦 [API] Final updateData for database:', updateData);

    const oldStatus = currentBooking?.status;
    const newStatus = status;
    const oldPaymentStatus = (currentBooking as any)?.paymentStatus || (currentBooking as any)?.payment_status;

    let result;
    
    // Special handling for cancellation - save to JSON file then delete
    if (newStatus === 'cancelled') {
      console.log(`🗑️ Admin cancelling booking ${bookingId} - saving to JSON then deleting`);
      
      // Get full booking data before deleting
      let bookingData: any = null;
      // Manual bookings now live in the main booking collection as well.
      // Always try main collection first so manual cancellations also have full bookingData for SQL sync.
      const bookingResult = await database.getBookingById(bookingId);
      bookingData = bookingResult.booking;

      if (!bookingData) {
        const manualBookings = await database.getAllManualBookings();
        bookingData =
          manualBookings.manualBookings?.find((b: any) => (b.bookingId || b.id) === bookingId) || null;
        if (bookingData) {
          isManual = true;
        }
      }
      // If not found in DB, try manual-bookings.json (JSON-only manual bookings)
      let jsonManualRecordFound = false;
      if (!bookingData) {
        try {
          const manual = await ExportsStorage.readManual('manual-bookings.json');
          const found = (manual.records || []).find((r: any) => (r.bookingId || r.id) === bookingId);
          if (found) {
            bookingData = found;
            isManual = true;
            jsonManualRecordFound = true;
          }
        } catch {}
      }
      
      // Save to cancelled JSON file before deleting
      if (bookingData) {
        // Determine who cancelled (admin or staff)
        const cancelledBy = body.cancelledBy || 'Administrator';
        const staffName = body.staffName || null;
        const staffId = body.staffId || body.userId || null; // Use staffId or userId from staff database

        const resolvedBookingDate =
          bookingData.date || bookingData.bookingDate || bookingData.booking_date;
        const resolvedTotalAmountRaw = bookingData.totalAmount || bookingData.total_amount;
        const resolvedTotalAmount = Number(resolvedTotalAmountRaw) || 0;
        
        // Calculate refund (same logic as customer cancellation)
        const bookingDate = resolvedBookingDate ? new Date(resolvedBookingDate) : new Date('');
        const now = new Date();
        const hoursUntilBooking = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        let refundAmount = 0;
        let refundStatus = 'non-refundable';
        if (Number.isFinite(hoursUntilBooking) && hoursUntilBooking > 72) {
          refundAmount = Math.round(resolvedTotalAmount * 0.25);
          refundStatus = 'refundable';
        }
        
        // Prepare cancelled booking record with ALL MongoDB fields
        const record = {
          // Basic booking info
          bookingId:
            bookingData.bookingId ||
            bookingData.id ||
            bookingData._id ||
            bookingData.bookingID ||
            bookingData.booking_id ||
            bookingId,
          name: bookingData.name,
          email: bookingData.email,
          phone: bookingData.phone,
          theaterName: bookingData.theaterName,
          date: resolvedBookingDate,
          time: bookingData.time || bookingData.bookingTime || bookingData.booking_time,
          occasion: bookingData.occasion,
          numberOfPeople: bookingData.numberOfPeople,
          
          // Payment info
          advancePayment:
            bookingData.advancePayment ??
            Math.round(((bookingData.totalAmount || bookingData.total_amount || 0) as number) * 0.25),
          venuePayment:
            bookingData.venuePayment ??
            Math.round(resolvedTotalAmount * 0.75),
          totalAmount: resolvedTotalAmount,
          
          // Cancellation info
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          cancelReason: (typeof body.cancelReason === 'string' && body.cancelReason.trim()) 
            ? body.cancelReason.trim() 
            : (cancelledBy === 'Staff' && staffName && staffId)
              ? `Cancelled by ${staffName} (${staffId})`
              : `Cancelled by ${cancelledBy}`,
          cancelledBy: cancelledBy, // 'Administrator' or 'Staff'
          staffName: staffName, // Staff name if cancelled by staff
          staffId: staffId, // Staff ID if cancelled by staff
          refundAmount: refundAmount,
          refundStatus: refundStatus,
          
          // Additional MongoDB fields - Pass everything to SQL
          occasionPersonName: bookingData.occasionPersonName,
          bookingType: bookingData.bookingType,
          createdBy: bookingData.createdBy,
          isManualBooking: bookingData.isManualBooking,
          notes: bookingData.notes,
          createdAt: bookingData.createdAt,
          
          // Custom fields (Your Nickname, Partner Name, etc.)
          ...(bookingData['Your Nickname'] && { 'Your Nickname': bookingData['Your Nickname'] }),
          ...(bookingData['Your Nickname_label'] && { 'Your Nickname_label': bookingData['Your Nickname_label'] }),
          ...(bookingData['Your Nickname_value'] && { 'Your Nickname_value': bookingData['Your Nickname_value'] }),
          ...(bookingData["Your Partner's Name"] && { "Your Partner's Name": bookingData["Your Partner's Name"] }),
          ...(bookingData["Your Partner's Name_label"] && { "Your Partner's Name_label": bookingData["Your Partner's Name_label"] }),
          ...(bookingData["Your Partner's Name_value"] && { "Your Partner's Name_value": bookingData["Your Partner's Name_value"] }),
          
          // Arrays (movies, cakes, decor, gifts)
          selectedMovies: bookingData.selectedMovies || [],
          selectedCakes: bookingData.selectedCakes || [],
          selectedDecorItems: bookingData.selectedDecorItems || [],
          selectedGifts: bookingData.selectedGifts || [],
          
          // Complete original booking data (everything from MongoDB)
          _originalBooking: bookingData
        };
        
        console.log(`📝 Cancelled booking record:`, JSON.stringify(record, null, 2));
        
        // Sync to GoDaddy SQL database (PRIORITY - Always run this first)
        try {
          console.log(`🔄 [GODADDY SQL] Syncing admin-cancelled booking to GoDaddy SQL...`);
          const { syncCancelledBookingToSQL } = await import('@/lib/godaddy-sql');
          const sqlResult = await syncCancelledBookingToSQL(record);
          if (sqlResult.success) {
            console.log(`✅ [GODADDY SQL] Successfully synced admin-cancelled booking to GoDaddy SQL: ${record.bookingId}`);
          } else {
            console.error(`❌ [GODADDY SQL] Sync failed:`, sqlResult.error);
          }
        } catch (sqlError) {
          console.error('❌ [GODADDY SQL] Exception during sync:', sqlError);
        }
        
        // Save to blob storage JSON (optional backup)
        try {
          await ExportsStorage.appendToArray('cancelled-bookings.json', record);
          console.log(`✅ Cancelled booking saved to JSON (Blob-backed)`);
        } catch (err) {
          console.error('❌ Failed to save to JSON (Blob-backed):', err);
        }

        // Manual bookings are now only in database, no JSON cleanup needed
        if (isManual) {
          console.log(`✅ Manual booking ${bookingId} cancelled (database only)`);
        }
      }
      
      // Delete booking from appropriate collection
      if (isManual) {
        result = await (database as any).deleteManualBooking?.(bookingId);
        if (!result || !result.success) {
          result = await database.deleteBooking(bookingId);
        }
      } else {
        result = await database.deleteBooking(bookingId);
      }
      // If this was a JSON-only manual booking (no DB row), treat as success
      if ((!result || !result.success) && isManual && jsonManualRecordFound) {
        result = { success: true } as any;
      }
      
      if (result.success) {
        console.log(`✅ Booking ${bookingId} deleted from database`);
        // Import the new counter system
        const { incrementCounter } = await import('@/lib/counter-system');
        await incrementCounter('cancelled');
      }
    } else if (newStatus === 'completed') {
      // Archive to completed JSON then delete from DB
      console.log(`✅ Completing booking ${bookingId} - archiving to JSON then deleting from DB`);

      // Get full booking data before deleting (similar to cancel branch)
      let bookingData: any = null;
      // Manual bookings now live in the main booking collection as well.
      // Always try main collection first so manual completion gets full bookingData for SQL sync.
      const bookingResult = await database.getBookingById(bookingId);
      bookingData = bookingResult.booking;

      if (bookingData) {
        if (
          bookingData.isManualBooking ||
          bookingData.bookingType === 'Manual' ||
          bookingData.status === 'manual'
        ) {
          isManual = true;
        }
      } else {
        const manualBookings = await database.getAllManualBookings();
        bookingData =
          manualBookings.manualBookings?.find((b: any) => (b.bookingId || b.id) === bookingId) || null;
        if (bookingData) {
          isManual = true;
        }
      }

      // If not found in DB, try manual-bookings.json (JSON-only manual bookings)
      let jsonManualRecordFound = false;
      if (!bookingData) {
        try {
          const manual = await ExportsStorage.readManual('manual-bookings.json');
          const found = (manual.records || []).find((r: any) => (r.bookingId || r.id) === bookingId);
          if (found) {
            bookingData = found;
            isManual = true;
            jsonManualRecordFound = true;
          }
        } catch {}
      }

      if (!bookingData) {
        return NextResponse.json(
          { success: false, error: 'Booking not found' },
          { status: 404 },
        );
      }

      // Save to completed JSON file before deleting
      if (bookingData) {
        const record = {
          // Basic booking info
          bookingId: bookingData.bookingId || bookingData.id,
          name: bookingData.name,
          email: bookingData.email,
          phone: bookingData.phone,
          theaterName: bookingData.theaterName,
          date: bookingData.date,
          time: bookingData.time,
          occasion: bookingData.occasion,
          numberOfPeople: bookingData.numberOfPeople,
          
          // Payment info
          advancePayment: bookingData.advancePayment,
          venuePayment: bookingData.venuePayment,
          totalAmount: bookingData.totalAmount,
          paymentStatus: bookingData.paymentStatus,
          venuePaymentMethod: bookingData.venuePaymentMethod || bookingData.paymentMethod,
          paidBy: bookingData.paidBy,
          paidAt: bookingData.paidAt,
          
          // Completion info
          status: isManual ? 'manual' : 'completed',
          completedAt: new Date().toISOString(),
          
          // Additional MongoDB fields - Pass everything to SQL
          occasionPersonName: bookingData.occasionPersonName,
          bookingType: bookingData.bookingType,
          createdBy: bookingData.createdBy,
          isManualBooking: bookingData.isManualBooking ?? isManual,
          staffId: bookingData.staffId,
          staffName: bookingData.staffName,
          notes: bookingData.notes,
          createdAt: bookingData.createdAt,
          
          // Custom fields (Your Nickname, Partner Name, etc.)
          ...(bookingData['Your Nickname'] && { 'Your Nickname': bookingData['Your Nickname'] }),
          ...(bookingData['Your Nickname_label'] && { 'Your Nickname_label': bookingData['Your Nickname_label'] }),
          ...(bookingData['Your Nickname_value'] && { 'Your Nickname_value': bookingData['Your Nickname_value'] }),
          ...(bookingData["Your Partner's Name"] && { "Your Partner's Name": bookingData["Your Partner's Name"] }),
          ...(bookingData["Your Partner's Name_label"] && { "Your Partner's Name_label": bookingData["Your Partner's Name_label"] }),
          ...(bookingData["Your Partner's Name_value"] && { "Your Partner's Name_value": bookingData["Your Partner's Name_value"] }),
          
          // Arrays (movies, cakes, decor, gifts)
          selectedMovies: bookingData.selectedMovies || [],
          selectedCakes: bookingData.selectedCakes || [],
          selectedDecorItems: bookingData.selectedDecorItems || [],
          selectedGifts: bookingData.selectedGifts || [],
          
          // Complete original booking data (everything from MongoDB)
          _originalBooking: bookingData
        };
        
        console.log(`📝 Completed booking record:`, JSON.stringify(record, null, 2));
        
        // Sync to GoDaddy SQL database (PRIORITY - Always run this first)
        try {
          console.log(`🔄 Syncing completed booking to GoDaddy SQL...`);
          const { syncCompletedBookingToSQL, syncManualBookingToSQL } = await import('@/lib/godaddy-sql');
          const sqlResult = isManual
            ? await syncManualBookingToSQL(record)
            : await syncCompletedBookingToSQL(record);
          if (sqlResult?.success) {
            console.log(`✅ Successfully synced completed booking to GoDaddy SQL`);
          } else {
            console.error(`❌ [GODADDY SQL] Sync failed:`, sqlResult?.error);
            return NextResponse.json(
              { success: false, error: 'Failed to sync completed booking to GoDaddy SQL' },
              { status: 502 },
            );
          }
        } catch (sqlError) {
          console.error('❌ Failed to sync completed booking to GoDaddy SQL:', sqlError);
          return NextResponse.json(
            { success: false, error: 'Failed to sync completed booking to GoDaddy SQL' },
            { status: 502 },
          );
        }
        
        // Save to blob storage JSON (optional backup)
        try {
          await ExportsStorage.appendToArray('completed-bookings.json', record);
          console.log(`✅ Completed booking archived to JSON (Blob-backed)`);
        } catch (err) {
          console.error('❌ Failed to archive completed booking to JSON (Blob-backed):', err);
        }

        // Manual bookings are now only in database, no JSON cleanup needed
        if (isManual) {
          console.log(`✅ Manual booking ${bookingId} completed (database only)`);
        }
      }

      // Delete from appropriate collection
      if (isManual) {
        result = await (database as any).deleteManualBooking?.(bookingId);
        if (!result || !result.success) {
          result = await database.deleteBooking(bookingId);
        }
      } else {
        result = await database.deleteBooking(bookingId);
      }
      // If this was a JSON-only manual booking (no DB row), treat as success
      if ((!result || !result.success) && isManual && jsonManualRecordFound) {
        result = { success: true } as any;
      }

      if (result.success) {
        console.log(`🗑️ Booking ${bookingId} deleted from database after archiving`);
        // Import the new counter system
        const { incrementCounter } = await import('@/lib/counter-system');
        await incrementCounter('completed');
        // Notify customer their invoice is ready
        // Invoice email is triggered explicitly when payment is marked as paid
      }
    } else {
      // Normal update for other status changes
      console.log('📝 About to update booking with data:', updateData);
      if (isManualBooking) {
        // Update manual booking
        console.log('📝 Updating manual booking...');
        result = await database.updateManualBooking(bookingId, updateData);
      } else {
        // Update regular booking
        console.log('📝 Updating regular booking...');
        result = await database.updateBooking(bookingId, updateData);
      }
      console.log('📝 Database update result:', result);

      // Handle counter updates for status changes
      if (result.success) {
        // Trigger slot refresh for theater page if time slot or date changed
        if (updateData.time || updateData.date || updateData.theaterName) {
          console.log('🔄 Time slot/date/theater changed, triggering slot refresh');
          // Note: This will be handled by the frontend after receiving the response
        }
        // If booking was pending due to edit request, confirm puts it back and clears flag
        if (newStatus === 'confirmed') {
          try {
            await database.updateBooking(bookingId, { isEditRequested: false });
          } catch (e) {
            
          }
        }
        if (oldStatus !== newStatus && newStatus) {
        
        
        // Decrement old status counter (if it was a counted status)
        if (oldStatus === 'confirmed') {
          // Note: We don't decrement counters as they represent cumulative counts
          
        }
        
        // Increment new status counter
        if (newStatus === 'completed') {
          // Import the new counter system
          const { incrementCounter } = await import('@/lib/counter-system');
          await incrementCounter('completed');
          
        }
        }

        if (paymentStatus !== undefined) {
          const normalizedPaymentStatus = String(paymentStatus).toLowerCase();
          const normalizedOldPaymentStatus = String(oldPaymentStatus || '').toLowerCase();
          const becamePaidNow = normalizedPaymentStatus === 'paid' && normalizedOldPaymentStatus !== 'paid';
          if (becamePaidNow) {
            // Invoice generation is intentionally NOT triggered here.
            // Only send the FINAL invoice email when payment is marked as paid.
            if (sendInvoice) {
              try {
                // Regenerate Cloudinary invoice so that updated payment method reflects in PDF/link
                let regeneratedInvoiceUrl: string | null = null;
                try {
                  const { POST: sendInvoiceHandler } = await import('@/app/api/admin/send-invoice/route');
                  const origin = (request as any)?.nextUrl?.origin ?? new URL(request.url).origin;
                  const invoiceRequest = new Request(`${origin}/api/admin/send-invoice`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      bookingId,
                      regenerateInvoice: false,
                      sendEmail: false,
                    }),
                  });
                  const invoiceResponse = await sendInvoiceHandler(invoiceRequest as any);
                  const invoiceResult = await invoiceResponse.json().catch(() => null as any);
                  if (invoiceResponse.ok) {
                    regeneratedInvoiceUrl = invoiceResult?.invoiceUrl || null;
                  }
                } catch (e) {
                  console.warn('⚠️ Failed to regenerate Cloudinary invoice:', e);
                }

                const bookingForEmail: any = isManual
                  ? (await database.getAllManualBookings()).manualBookings?.find((b: any) => (b.bookingId || b.id) === bookingId)
                  : (await database.getBookingById(bookingId)).booking;

                if (bookingForEmail?.email) {
                  const invoiceUrl = regeneratedInvoiceUrl || bookingForEmail?.invoiceDriveUrl || null;
                  const mailData: any = {
                    id: bookingForEmail.bookingId || bookingForEmail.id || bookingId,
                    name: bookingForEmail.name || bookingForEmail.customerName,
                    email: bookingForEmail.email,
                    phone: bookingForEmail.phone,
                    theaterName: bookingForEmail.theaterName || bookingForEmail.theater,
                    date: bookingForEmail.date,
                    time: bookingForEmail.time,
                    numberOfPeople: bookingForEmail.numberOfPeople,
                    totalAmount: bookingForEmail.totalAmount,
                    invoiceDriveUrl: invoiceUrl,
                  };

                  emailService.sendBookingFinalInvoice(mailData).catch((e: any) => {
                    console.warn('⚠️ Failed to send final invoice email:', e);
                  });
                }
              } catch (e) {
                console.warn('⚠️ Failed to prepare final invoice email:', e);
              }
            }
          }
        }
      }

      if (result.success && resendConfirmationEmail) {
        try {
          let updatedBookingData: any = null;
          if (isManual) {
            const manualBookings = await database.getAllManualBookings();
            updatedBookingData = manualBookings.manualBookings?.find((b: any) => (b.bookingId || b.id) === bookingId) || null;
          } else {
            const updatedBookingResult = await database.getBookingById(bookingId);
            updatedBookingData = updatedBookingResult.booking;
          }

          const bookingForEmail = updatedBookingData || currentBooking;
          if (bookingForEmail) {
            const mailData: any = {
              id: bookingForEmail.bookingId || bookingForEmail.id || bookingId,
              name: bookingForEmail.name || bookingForEmail.customerName,
              email: bookingForEmail.email,
              phone: bookingForEmail.phone,
              theaterName: bookingForEmail.theaterName || bookingForEmail.theater,
              date: bookingForEmail.date,
              time: bookingForEmail.time,
              occasion: bookingForEmail.occasion,
              numberOfPeople: bookingForEmail.numberOfPeople,
              selectedCakes: bookingForEmail.selectedCakes || [],
              selectedDecorItems: bookingForEmail.selectedDecorItems || [],
              selectedGifts: bookingForEmail.selectedGifts || [],
              selectedMovies: bookingForEmail.selectedMovies || [],
            };
            emailService.sendBookingConfirmed(mailData).catch(() => {});
          }
        } catch (resendError) {
          console.error('⚠️ Failed to resend confirmation email:', resendError);
        }
      }

    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: newStatus === 'cancelled' ? 'Booking cancelled successfully' : 'Booking updated successfully',
        booking: (result as any).booking || null
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to update booking'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update booking'
      },
      { status: 500 }
    );
  }
}

