import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

interface ServiceItem {
  id?: string;
  name: string;
  price: number;
  quantity: number;
  serviceName?: string;
  isDecoration?: boolean;
  categoryName?: string;
  pricingMode?: string;
  variantLabel?: string;
  halfPrice?: number;
  fullPrice?: number;
  smallPrice?: number;
  mediumPrice?: number;
  largePrice?: number;
  vegType?: 'veg' | 'non-veg';
}

const normalizeItems = (items: any[], overrides: Partial<ServiceItem> = {}): ServiceItem[] => {
  if (!Array.isArray(items)) return [];
  return items
    .map((raw, index) => {
      const name = (raw?.name || raw?.title || '').toString().trim();
      const price = Number(raw?.price ?? raw?.amount ?? 0);
      const quantity = Number(raw?.quantity ?? 1);
      if (!name || !(price >= 0) || !(quantity > 0)) return null;
      const id = (
        raw?.id ||
        raw?.itemId ||
        raw?.sku ||
        (name ? `${name.toLowerCase().replace(/\s+/g, '-')}-${index}` : `item-${index}`)
      ).toString();

      const normalized: ServiceItem = {
        id,
        name,
        price,
        quantity,
        serviceName: overrides.serviceName ?? (raw?.serviceName ? raw.serviceName.toString() : undefined),
        isDecoration:
          overrides.isDecoration !== undefined
            ? overrides.isDecoration
            : raw?.isDecoration
            ? true
            : undefined,
        categoryName: typeof raw?.categoryName === 'string' ? raw.categoryName : overrides.categoryName,
        pricingMode: typeof raw?.pricingMode === 'string' ? raw.pricingMode : overrides.pricingMode,
        variantLabel: typeof raw?.variantLabel === 'string' ? raw.variantLabel : overrides.variantLabel,
        halfPrice: raw?.halfPrice !== undefined ? Number(raw.halfPrice) : overrides.halfPrice,
        fullPrice: raw?.fullPrice !== undefined ? Number(raw.fullPrice) : overrides.fullPrice,
        smallPrice: raw?.smallPrice !== undefined ? Number(raw.smallPrice) : overrides.smallPrice,
        mediumPrice: raw?.mediumPrice !== undefined ? Number(raw.mediumPrice) : overrides.mediumPrice,
        largePrice: raw?.largePrice !== undefined ? Number(raw.largePrice) : overrides.largePrice,
        vegType: overrides.vegType ?? (raw?.vegType === 'non-veg' ? 'non-veg' : 'veg'),
      };

      return normalized;
    })
    .filter((x): x is ServiceItem => !!x);
};

const sumItems = (items: ServiceItem[]): number => {
  return items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 0)), 0);
};

const SERVICE_FIELD_MAP: Record<string, string> = {
  food: 'selectedFoodItems',
  foods: 'selectedFoodItems',
  snack: 'selectedFoodItems',
  snacks: 'selectedFoodItems',
  beverage: 'selectedFoodItems',
  beverages: 'selectedFoodItems',
  drink: 'selectedFoodItems',
  drinks: 'selectedFoodItems',
  decor: 'selectedDecorItems',
  decoration: 'selectedDecorItems',
  decorations: 'selectedDecorItems',
  addon: 'selectedExtraAddOns',
  'add-ons': 'selectedExtraAddOns',
  'add on': 'selectedExtraAddOns',
  add: 'selectedExtraAddOns',
  extra: 'selectedExtraAddOns',
  extras: 'selectedExtraAddOns',
  cake: 'selectedCakes',
  cakes: 'selectedCakes',
  movie: 'selectedMovies',
  movies: 'selectedMovies',
  photo: 'selectedPhotography',
  photos: 'selectedPhotography',
  photography: 'selectedPhotography',
};

const resolveServiceFields = (serviceName: string) => {
  const trimmed = serviceName.trim();
  const normalized = trimmed.toLowerCase();

  let canonicalField: string | null = null;
  if (SERVICE_FIELD_MAP[normalized]) {
    canonicalField = SERVICE_FIELD_MAP[normalized];
  } else {
    for (const [key, value] of Object.entries(SERVICE_FIELD_MAP)) {
      if (normalized.includes(key)) {
        canonicalField = value;
        break;
      }
    }
  }

  const sanitizedServiceName = trimmed.replace(/[^a-zA-Z0-9]+/g, '');
  const serviceField = sanitizedServiceName ? `selected${sanitizedServiceName}` : canonicalField ?? 'selectedFoodItems';
  const isDecorationCategory = canonicalField === 'selectedDecorItems';

  return {
    canonicalField,
    serviceField,
    isDecorationCategory,
  };
};

const identifierForItem = (item: ServiceItem) => item.id || `${item.name}-${item.price}`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticketNumberRaw = searchParams.get('ticketNumber');
    const ticketNumber = ticketNumberRaw?.toString().trim();

    if (!ticketNumber) {
      return NextResponse.json({ success: false, error: 'Ticket number is required' }, { status: 400 });
    }

    const result = await (database as any).getBookingByTicketNumber?.(ticketNumber);

    if (!result || !result.success || !result.booking) {
      return NextResponse.json({ success: false, error: 'Booking not found for this ticket number' }, { status: 404 });
    }

    const booking: any = result.booking;

    const dynamicServiceItems: Record<string, ServiceItem[]> = {};
    Object.keys(booking).forEach((key) => {
      if (key.startsWith('selected') && Array.isArray(booking[key]) && key !== 'selectedMovies') {
        dynamicServiceItems[key] = normalizeItems(booking[key]);
      }
    });

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.bookingId || booking.id || booking._id?.toString?.() || '',
        mongoId: booking._id?.toString?.() || undefined,
        ticketNumber: booking.ticketNumber,
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        theaterName: booking.theaterName,
        date: booking.date,
        time: booking.time,
        occasion: booking.occasion,
        numberOfPeople: booking.numberOfPeople,
        totalAmount: Number(booking.totalAmount || 0),
        advancePayment: booking.advancePayment !== undefined ? Number(booking.advancePayment) : undefined,
        venuePayment: booking.venuePayment !== undefined ? Number(booking.venuePayment) : undefined,
        paymentStatus: booking.paymentStatus || booking.payment_status || 'unpaid',
        status: booking.status || 'completed',
        selectedFoodItems: Array.isArray(booking.selectedFoodItems)
          ? normalizeItems(booking.selectedFoodItems)
          : [],
        dynamicServiceItems,
      },
    });
  } catch (error) {
    console.error('❌ [order-items][GET] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch booking for this ticket number' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ticketNumberRaw = body.ticketNumber;
    const ticketNumber = ticketNumberRaw?.toString().trim();
    const serviceNameRaw = body.serviceName?.toString().trim();
    const markPaid = Boolean(body.markPaid);
    const performedByRaw = typeof body.performedBy === 'string' ? body.performedBy.trim() : undefined;
    const itemsInput = Array.isArray(body.items) ? body.items : [];
    const removeItemIdsInput: string[] = Array.isArray(body.removeItemIds)
      ? body.removeItemIds
          .map((x: any) => (typeof x === 'string' ? x.trim() : x?.toString?.()?.trim?.()))
          .filter((x: any): x is string => Boolean(x))
      : [];

    if (!ticketNumber) {
      return NextResponse.json({ success: false, error: 'Ticket number is required' }, { status: 400 });
    }

    if (!serviceNameRaw) {
      return NextResponse.json({ success: false, error: 'Service name is required for order items' }, { status: 400 });
    }

    const result = await (database as any).getBookingByTicketNumber?.(ticketNumber);

    if (!result || !result.success || !result.booking) {
      return NextResponse.json({ success: false, error: 'Booking not found for this ticket number' }, { status: 404 });
    }

    const booking: any = result.booking;

    const { canonicalField, serviceField, isDecorationCategory } = resolveServiceFields(serviceNameRaw);
    const overrides: Partial<ServiceItem> = {
      serviceName: serviceNameRaw,
      isDecoration: isDecorationCategory ? true : undefined,
      vegType: undefined,
    };
    const newServiceItems = normalizeItems(itemsInput, overrides);
    const newServiceTotal = sumItems(newServiceItems);

    const previousServiceItemsRaw = Array.isArray(booking[serviceField]) ? booking[serviceField] : [];
    const previousServiceItems = normalizeItems(previousServiceItemsRaw, { serviceName: serviceNameRaw });
    const previousServiceTotal = sumItems(previousServiceItems);

    const originalTotalAmount = Number(booking.totalAmount || 0);
    const originalVenuePayment = Number(booking.venuePayment || 0);
    const canonicalFieldName = canonicalField || serviceField;

    const removeIds = new Set(removeItemIdsInput);
    const removedItems = removeIds.size
      ? previousServiceItems.filter((it) => removeIds.has(identifierForItem(it)))
      : [];
    const removedSubtotal = sumItems(removedItems);

    const baseItems = removeIds.size
      ? previousServiceItems.filter((it) => !removeIds.has(identifierForItem(it)))
      : previousServiceItems;

    const isExplicitClearService = itemsInput.length === 0 && removeItemIdsInput.length === 0;
    const updatedServiceItems = isExplicitClearService ? [] : [...baseItems, ...newServiceItems];

    const updatedTotalAmount = isExplicitClearService
      ? Math.max(originalTotalAmount - previousServiceTotal, 0)
      : Math.max(originalTotalAmount + newServiceTotal - removedSubtotal, 0);
    const updatedVenuePayment = isExplicitClearService
      ? Math.max(originalVenuePayment - previousServiceTotal, 0)
      : Math.max(originalVenuePayment + newServiceTotal - removedSubtotal, 0);

    const updatePayload: Record<string, any> = {
      totalAmount: updatedTotalAmount,
      venuePayment: updatedVenuePayment,
      [serviceField]: updatedServiceItems,
    };

    if (markPaid) {
      updatePayload.paymentStatus = 'paid';
      if (!booking.status || booking.status === 'confirmed' || booking.status === 'manual') {
        updatePayload.status = 'completed';
      }
    }

    const bookingIdForUpdate = booking.bookingId || booking.id || booking._id?.toString?.();

    if (!bookingIdForUpdate) {
      return NextResponse.json({ success: false, error: 'Unable to determine booking ID for update' }, { status: 500 });
    }

    const updateResult = await (database as any).updateBooking(bookingIdForUpdate, updatePayload);

    if (!updateResult || !updateResult.success) {
      return NextResponse.json(
        { success: false, error: updateResult?.error || 'Failed to update booking with order items' },
        { status: 500 },
      );
    }

    const updatedBooking: any = updateResult.booking || {};
    const isClearingAfterUpdate = updatedServiceItems.length === 0;

    if (isClearingAfterUpdate) {
      try {
        await (database as any).deleteOrdersByBookingAndService?.({
          bookingId: booking.bookingId || bookingIdForUpdate,
          mongoBookingId: booking._id?.toString?.(),
          ticketNumber: booking.ticketNumber,
          serviceField,
          serviceName: serviceNameRaw,
        });
      } catch (cleanupError) {
        console.warn('⚠️ [order-items] Failed to remove cleared order records:', cleanupError);
      }

      const cancellationItems =
        removedItems.length > 0 ? removedItems : previousServiceItems;
      const cancellationSubtotal = sumItems(cancellationItems);

      try {
        const cancellationPayload = {
          bookingId: booking.bookingId || bookingIdForUpdate,
          mongoBookingId: booking._id?.toString?.(),
          ticketNumber: booking.ticketNumber,
          customerName: booking.name,
          theaterName: booking.theaterName,
          bookingStatus: 'cancelled',
          numberOfPeople: booking.numberOfPeople,
          serviceName: serviceNameRaw,
          serviceField,
          canonicalField: canonicalFieldName,
          items: cancellationItems,
          subtotal: cancellationSubtotal,
          previousSubtotal: previousServiceTotal,
          changeSet: {
            addedItems: [],
            removedItems: cancellationItems,
            removedSubtotal: previousServiceTotal,
            addedSubtotal: 0,
          },
          removedItemNames: cancellationItems
            .map((item) => item?.name)
            .filter((name): name is string => Boolean(name)),
          actionType: 'cancelled',
          removalReason: 'Customer cancelled their order',
          markPaid: false,
          status: 'cancelled',
          totalAmountBefore: originalTotalAmount,
          totalAmountAfter: updatedTotalAmount,
          venuePaymentBefore: originalVenuePayment,
          venuePaymentAfter: updatedVenuePayment,
          performedBy: performedByRaw,
          recordedAt: new Date(),
          bookingDate: booking.date,
          bookingTime: booking.time,
          eventOnly: true,
          eventType: 'cancellation',
          eventMessage: 'Customer cancelled their order',
        };

        await (database as any).saveOrderRecord?.(cancellationPayload);
      } catch (cancellationRecordError) {
        console.warn('⚠️ [order-items] Failed to record cancellation event:', cancellationRecordError);
      }
    }

    if (!isClearingAfterUpdate) {
      try {
        const actionType = isExplicitClearService
          ? 'clear'
          : removedItems.length && newServiceItems.length
          ? 'update'
          : removedItems.length
          ? 'remove'
          : 'append';
        const snapshotSubtotal = sumItems(updatedServiceItems);
        const eventType =
          actionType === 'remove'
            ? 'removal'
            : actionType === 'append' || actionType === 'update'
            ? 'addition'
            : undefined;
        const orderRecordPayload = {
          bookingId: booking.bookingId || bookingIdForUpdate,
          mongoBookingId: booking._id?.toString?.(),
          ticketNumber: booking.ticketNumber,
          customerName: booking.name,
          theaterName: booking.theaterName,
          bookingStatus: booking.status,
          numberOfPeople: booking.numberOfPeople,
          serviceName: serviceNameRaw,
          serviceField,
          canonicalField: canonicalFieldName,
          items: updatedServiceItems,
          subtotal: snapshotSubtotal,
          previousSubtotal: previousServiceTotal,
          changeSet: {
            addedItems: newServiceItems,
            removedItems,
            removedSubtotal,
            addedSubtotal: newServiceTotal,
          },
          removedItemNames: removedItems.map((item) => item?.name).filter((name): name is string => Boolean(name)),
          actionType,
          removalReason: removedItems.length
            ? `Removed items: ${removedItems.map((item) => item?.name || 'Item').join(', ')}`
            : undefined,
          markPaid,
          status: markPaid ? 'paid' : 'pending',
          totalAmountBefore: originalTotalAmount,
          totalAmountAfter: updatedTotalAmount,
          venuePaymentBefore: originalVenuePayment,
          venuePaymentAfter: updatedVenuePayment,
          performedBy: performedByRaw,
          recordedAt: new Date(),
          eventType,
        };

        await (database as any).saveOrderRecord?.(orderRecordPayload);
      } catch (orderRecordError) {
        console.warn('⚠️ [order-items] Failed to log order record:', orderRecordError);
      }
    }

    try {
      await (database as any).updateOrderStatusByTicket?.(ticketNumber, 'pending');
    } catch (statusError) {
      console.warn('⚠️ [order-items] Failed to reset order status:', statusError);
    }

    // Build dynamic service items map from the updated booking so UI can reflect per-service orders
    const dynamicServiceItems: Record<string, ServiceItem[]> = {};
    Object.keys(updatedBooking).forEach((key) => {
      if (key.startsWith('selected') && Array.isArray((updatedBooking as any)[key]) && key !== 'selectedMovies') {
        dynamicServiceItems[key] = normalizeItems((updatedBooking as any)[key]);
      }
    });

    return NextResponse.json({
      success: true,
      message: markPaid
        ? 'Items saved and booking marked as paid. Invoice will now include these items.'
        : 'Items saved successfully for this booking.',
      booking: {
        id: updatedBooking.bookingId || booking.bookingId || booking.id,
        ticketNumber: updatedBooking.ticketNumber || booking.ticketNumber,
        totalAmount: Number(updatedBooking.totalAmount ?? updatedTotalAmount),
        advancePayment:
          updatedBooking.advancePayment !== undefined
            ? Number(updatedBooking.advancePayment)
            : booking.advancePayment,
        venuePayment: Number(updatedBooking.venuePayment ?? updatedVenuePayment),
        paymentStatus: updatedBooking.paymentStatus || booking.paymentStatus,
        status: updatedBooking.status || booking.status,
        selectedFoodItems: Array.isArray(updatedBooking.selectedFoodItems)
          ? normalizeItems(updatedBooking.selectedFoodItems)
          : updatedServiceItems,
        dynamicServiceItems,
      },
    });
  } catch (error) {
    console.error('❌ [order-items][POST] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save order items for this ticket' }, { status: 500 });
  }
}
