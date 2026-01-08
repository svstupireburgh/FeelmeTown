import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';
import emailService from '@/lib/email-service';
import {
  uploadInvoiceToCloudinary,
  deleteInvoiceFromCloudinaryByUrl,
  extractCloudinaryPublicIdFromUrl,
} from '@/lib/cloudinary-invoices';

export const runtime = 'nodejs';
export const maxDuration = 120;

const INTERNAL_INVOICE_SECRET = process.env.INTERNAL_INVOICE_SECRET || 'feelmetown-internal-secret';

const normalizeBaseUrl = (raw: string | null | undefined): string => {
  const value = String(raw || '').trim();
  if (!value) return '';
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/, '');
};

interface LoadedBooking {
  booking: any | null;
  isManual: boolean;
}

const resolveBookingId = (value: unknown): string => {
  if (!value) return '';
  return String(value).trim();
};

const loadBooking = async (rawBookingId: string): Promise<LoadedBooking> => {
  let isManual = false;
  const resolvedId = resolveBookingId(rawBookingId);
  if (!resolvedId) {
    return { booking: null, isManual };
  }

  try {
    const bookingResult = await database.getBookingById(resolvedId);
    if (bookingResult?.booking) {
      const booking = bookingResult.booking;
      if (
        booking.isManualBooking ||
        (typeof booking.status === 'string' && booking.status.toLowerCase() === 'manual') ||
        (typeof booking.bookingType === 'string' && booking.bookingType.toLowerCase() === 'manual')
      ) {
        isManual = true;
      }
      return { booking, isManual };
    }
  } catch (error) {
    console.warn('⚠️ [send-invoice] Failed to load booking from primary collection:', error);
  }

  try {
    const manualBookings = await database.getAllManualBookings();
    const manualBooking = manualBookings?.manualBookings?.find(
      (entry: any) => resolveBookingId(entry?.bookingId || entry?.id) === resolvedId,
    );
    if (manualBooking) {
      isManual = true;
      return { booking: manualBooking, isManual };
    }
  } catch (error) {
    console.warn('⚠️ [send-invoice] Failed to load booking from manual collection:', error);
  }

  return { booking: null, isManual };
};

const buildMailPayload = (booking: any) => {
  const primaryId =
    booking.bookingId || booking.id || (booking._id ? String(booking._id) : undefined);

  if (!primaryId) {
    return null;
  }

  return {
    id: primaryId,
    name: booking.name || booking.customerName || 'Customer',
    email: booking.email,
    phone: booking.phone,
    theaterName: booking.theaterName || booking.theater,
    date: booking.date,
    time: booking.time,
    numberOfPeople: booking.numberOfPeople,
    totalAmount: booking.totalAmount,
    invoiceDriveUrl: booking.invoiceDriveUrl,
  } as any;
};

const ensureInvoiceCloudinaryUrl = async (
  bookingId: string,
  mailData: any,
  baseUrl: string,
  isManual: boolean,
  options: { regenerate?: boolean; previousInvoiceUrl?: string } = {},
): Promise<any> => {
  const regenerate = options.regenerate ?? false;
  const previousInvoiceUrl = options.previousInvoiceUrl || null;

  if (!regenerate && mailData?.invoiceDriveUrl) {
    return mailData;
  }

  try {
    const { GET: generateInvoiceHandler } = await import('@/app/api/generate-invoice/route');

    const requestUrl = new URL(
      `${baseUrl}/api/generate-invoice?bookingId=${encodeURIComponent(mailData.id)}&format=pdf&forceInternal=true`,
    );

    const headers = new Headers();
    if (INTERNAL_INVOICE_SECRET) {
      headers.set('x-internal-invoice-secret', INTERNAL_INVOICE_SECRET);
    }

    const invoiceRequest = new Request(requestUrl.toString(), {
      method: 'GET',
      headers,
    });

    const pdfResponse = await generateInvoiceHandler(invoiceRequest as any);
    if (!pdfResponse.ok) {
      let details = '';
      try {
        details = await (pdfResponse as any).text?.();
      } catch {
        details = '';
      }
      console.warn(
        '⚠️ [send-invoice] Failed to generate invoice PDF for Cloudinary upload:',
        pdfResponse.status,
        details ? `\n${details}` : '',
      );
      return mailData;
    }

    const arrayBuffer = await pdfResponse.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    const cleanCustomerName = (mailData.name || 'Customer')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '-');

    // If we are regenerating and we already have an existing Cloudinary URL,
    // force a new public_id so the returned URL changes (and then delete the old asset).
    const filename = (regenerate && previousInvoiceUrl)
      ? `Invoice-${mailData.id}-${cleanCustomerName}-${Date.now()}.pdf`
      : `Invoice-${mailData.id}-${cleanCustomerName}.pdf`;

    const cloudinaryFile = await uploadInvoiceToCloudinary(filename, pdfBuffer);
    const invoiceUrl = cloudinaryFile?.inlineUrl || cloudinaryFile?.secureUrl || null;

    if (invoiceUrl) {
      mailData.invoiceDriveUrl = invoiceUrl;
      try {
        if (isManual) {
          await database.updateManualBooking?.(bookingId, { invoiceDriveUrl: invoiceUrl });
        }
        await database.updateBooking(bookingId, { invoiceDriveUrl: invoiceUrl });
      } catch (updateError) {
        console.warn('⚠️ [send-invoice] Failed to persist invoice URL on booking:', updateError);
      }

      if (previousInvoiceUrl) {
        const oldPublicId = extractCloudinaryPublicIdFromUrl(previousInvoiceUrl);
        const newPublicId = extractCloudinaryPublicIdFromUrl(invoiceUrl);
        if (oldPublicId && newPublicId && oldPublicId !== newPublicId) {
          await deleteInvoiceFromCloudinaryByUrl(previousInvoiceUrl);
        }
      }
    }

    return mailData;
  } catch (error) {
    console.error('❌ [send-invoice] Failed to generate/upload invoice PDF:', error);
    return mailData;
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawBookingId = resolveBookingId(body?.bookingId);
    const regenerateInvoiceRaw = body?.regenerateInvoice;
    const sendEmail = body?.sendEmail !== undefined ? Boolean(body.sendEmail) : true;

    if (!rawBookingId) {
      return NextResponse.json(
        { success: false, error: 'Booking ID is required' },
        { status: 400 },
      );
    }

    const { booking, isManual } = await loadBooking(rawBookingId);

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 },
      );
    }

    const previousInvoiceUrl = booking?.invoiceDriveUrl || null;

    // Default behavior:
    // - if caller explicitly sets regenerateInvoice -> respect it
    // - else generate/upload only when invoiceDriveUrl is missing
    const regenerateInvoice = regenerateInvoiceRaw !== undefined
      ? Boolean(regenerateInvoiceRaw)
      : !previousInvoiceUrl;

    const mailData = buildMailPayload(booking);
    if (!mailData?.email) {
      return NextResponse.json(
        { success: false, error: 'No email available for this booking' },
        { status: 400 },
      );
    }

    // Resolve base URL prioritizing database settings
    let resolvedBaseUrl: string;
    try {
      const settings = await database.getSettings();
      const websiteUrl = normalizeBaseUrl(settings?.websiteUrl || null);

      const requestOrigin = (request as any)?.nextUrl?.origin ?? new URL(request.url).origin;
      const headerHost = request.headers.get('host');
      const headerProto = request.headers.get('x-forwarded-proto') ?? (headerHost?.startsWith('localhost') ? 'http' : 'https');
      const headerOrigin = headerHost ? `${headerProto}://${headerHost}` : '';

      resolvedBaseUrl = websiteUrl ||
        process.env.NEXT_PUBLIC_BASE_URL ||
        process.env.BASE_URL ||
        requestOrigin ||
        headerOrigin ||
        'http://localhost:3000';
    } catch {
      resolvedBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';
    }

    resolvedBaseUrl = normalizeBaseUrl(resolvedBaseUrl) || 'http://localhost:3000';

    const enrichedMailData = await ensureInvoiceCloudinaryUrl(
      rawBookingId,
      mailData,
      resolvedBaseUrl,
      isManual,
      { regenerate: regenerateInvoice, previousInvoiceUrl },
    );

    // If the caller only wants a Cloudinary URL (no email), we must have the PDF URL.
    if (!sendEmail) {
      if (!enrichedMailData?.invoiceDriveUrl) {
        return NextResponse.json(
          { success: false, error: 'Failed to generate invoice PDF' },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Invoice generated successfully',
        invoiceUrl: enrichedMailData.invoiceDriveUrl || null,
      });
    }

    // For email delivery we can send a View link even if PDF generation failed.
    const emailResult = await emailService.sendBookingInvoice(enrichedMailData);

    if (!emailResult?.success) {
      return NextResponse.json(
        { success: false, error: emailResult?.error || 'Failed to send invoice email' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: enrichedMailData?.invoiceDriveUrl
        ? 'Invoice email sent successfully'
        : 'Invoice email sent successfully (invoice PDF link will appear once generated)',
      invoiceUrl: enrichedMailData?.invoiceDriveUrl || null,
    });
  } catch (error) {
    console.error('❌ [send-invoice] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send invoice email' },
      { status: 500 },
    );
  }
}
