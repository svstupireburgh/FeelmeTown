import { NextRequest, NextResponse } from 'next/server';
import emailService from '@/lib/email-service';
import database from '@/lib/db-connect';
import getSiteUrl from '@/lib/site-url';

const parsePrepMinutes = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.max(1, Math.round(parsed));
};

const safeText = (value: unknown) => {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  return str;
};

const safeStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => safeText(x))
    .filter((x) => x.length > 0);
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ticketNumberRaw = body.ticketNumber;
    const statusRaw = body.status?.toString().trim().toLowerCase();
    const ticketNumber = ticketNumberRaw?.toString().trim();

    if (!ticketNumber) {
      return NextResponse.json({ success: false, error: 'Ticket number is required' }, { status: 400 });
    }

    const result = await (database as any).getBookingByTicketNumber?.(ticketNumber);

    if (!result || !result.success || !result.booking) {
      return NextResponse.json({ success: false, error: 'Booking not found for this ticket number' }, { status: 404 });
    }

    const booking: any = result.booking;

    if (!booking.email) {
      return NextResponse.json({ success: false, error: 'Booking does not have an email on file.' }, { status: 400 });
    }

    const siteUrl = await getSiteUrl();
    const trackUrl = `${siteUrl}/order-items?ticket=${encodeURIComponent(ticketNumber)}`;

    const cancelReason = safeText(body.cancelReason);
    const cancelNotes = safeText(body.cancelNotes);

    const cancelledItemName = safeText(body.cancelledItemName);
    const cancelledItemNames = safeStringArray(body.cancelledItemNames);

    const prepMinutes = statusRaw === 'cancelled' || statusRaw === 'item_cancelled' ? null : parsePrepMinutes(body.prepMinutes);
    const prepReadyAt = prepMinutes ? new Date(Date.now() + prepMinutes * 60 * 1000) : null;

    const payload = {
      ...booking,
      trackUrl,
      orderPrepMinutes: prepMinutes ?? booking.orderPrepMinutes,
      orderPrepReadyAt: prepReadyAt?.toISOString() ?? booking.orderPrepReadyAt,
      cancelReason,
      cancelNotes,
      cancelledItemName,
      cancelledItemNames,
    };

    const newStatus =
      statusRaw === 'ready'
        ? 'ready'
        : statusRaw === 'cancelled'
          ? 'cancelled'
          : statusRaw === 'item_cancelled'
            ? 'item_cancelled'
            : 'received';
    if (newStatus === 'ready') {
      await emailService.sendOrderReadyNotification(payload as any);
    } else if (newStatus === 'cancelled') {
      if (!cancelReason) {
        return NextResponse.json({ success: false, error: 'Cancellation reason is required' }, { status: 400 });
      }
      await emailService.sendOrderCancelledNotification(payload as any);
    } else if (newStatus === 'item_cancelled') {
      if (!cancelReason) {
        return NextResponse.json({ success: false, error: 'Cancellation reason is required' }, { status: 400 });
      }
      const hasItemName = Boolean(cancelledItemName) || cancelledItemNames.length > 0;
      if (!hasItemName) {
        return NextResponse.json({ success: false, error: 'Cancelled item name is required' }, { status: 400 });
      }
      const itemCancelledSender = (emailService as any).sendOrderItemCancelledNotification;
      if (typeof itemCancelledSender === 'function') {
        await itemCancelledSender(payload as any);
      } else {
        console.warn(
          '⚠️ [order-items][notify] sendOrderItemCancelledNotification is not available at runtime. Skipping email for item_cancelled.',
        );
      }
    } else {
      await emailService.sendOrderReceivedNotification(payload as any);
    }

    const metadata: Record<string, any> = {};
    if (prepMinutes) {
      metadata.orderPrepMinutes = prepMinutes;
    }
    if (prepReadyAt) {
      metadata.orderPrepReadyAt = prepReadyAt.toISOString();
    }

    if (newStatus === 'cancelled') {
      metadata.cancelReason = cancelReason;
      if (cancelNotes) {
        metadata.cancelNotes = cancelNotes;
      }
      metadata.cancelledAt = new Date().toISOString();
    }

    if (newStatus !== 'item_cancelled') {
      await (database as any).updateOrderStatusByTicket?.(
        ticketNumber,
        newStatus,
        Object.keys(metadata).length ? metadata : undefined,
      );
    }

    let autoDeleteResult: any = null;
    if (newStatus === 'ready') {
      try {
        autoDeleteResult = await (database as any).markOrderReadyForAutoDeletion?.(ticketNumber);
      } catch (autoDeleteError) {
        console.error('❌ Failed to schedule auto-delete for ready order:', autoDeleteError);
      }
    }

    return NextResponse.json({
      success: true,
      message:
        newStatus === 'ready'
          ? 'Customer notified that order is ready.'
          : newStatus === 'cancelled'
            ? 'Customer notified that order is cancelled.'
            : newStatus === 'item_cancelled'
              ? 'Customer notified that an order item is cancelled.'
            : 'Customer notified that order is received.',
      status: newStatus,
      prepMinutes: prepMinutes || null,
      prepReadyAt: prepReadyAt ? prepReadyAt.toISOString() : null,
      autoDeleteAt: autoDeleteResult?.autoDeleteAt || null,
    });
  } catch (error: any) {
    console.error('❌ [order-items][notify] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to notify customer' }, { status: 500 });
  }
}
