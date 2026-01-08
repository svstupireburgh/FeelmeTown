import { NextRequest, NextResponse } from 'next/server';
import { generateInvoiceHtml } from '@/lib/invoice';
import { launchBrowser } from '@/lib/server-puppeteer';
import database from '@/lib/db-connect';
import { ExportsStorage } from '@/lib/exports-storage';


export const runtime = 'nodejs';
export const maxDuration = 120;
const INTERNAL_INVOICE_SECRET = process.env.INTERNAL_INVOICE_SECRET || 'feelmetown-internal-secret';

export async function POST(request: NextRequest) {
  try {
    const bookingData = await request.json();
    
    if (!bookingData || !bookingData.id) {
      return NextResponse.json(
        { success: false, error: 'Booking data is required' },
        { status: 400 }
      );
    }

    // Generate invoice HTML
    const invoicePayload: any = { ...bookingData };

    try {
      const occasions = await (database as any).getAllOccasions?.();
      if (Array.isArray(occasions)) {
        const matchedOccasion = occasions.find((occ: any) => occ?.name === invoicePayload.occasion);
        if (matchedOccasion) {
          invoicePayload._occasionMeta = {
            fieldLabels: matchedOccasion.fieldLabels || {},
            requiredFields: matchedOccasion.requiredFields || [],
          };
        }
      }
    } catch (error) {
      console.warn('âš ï¸ [invoice] Failed to load occasion metadata for POST request:', error);
    }

    const invoiceHtml = generateInvoiceHtml(invoicePayload);
    
    // Launch puppeteer to generate PDF
    const browser = await launchBrowser();
    
    const page = await browser.newPage();
    
    // Set content and wait for fonts to load
    await page.setContent(invoiceHtml, { 
      waitUntil: 'networkidle0' 
    });
    
    // Generate PDF with custom settings
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });
    
    await browser.close();
    
    // Create custom filename with customer name
    const cleanCustomerName = (bookingData.name || 'Customer').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-');
    const filename = `Invoice-FMT-${cleanCustomerName}.pdf`;
    
    // Return PDF as response
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
    
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

// GET method to preview invoice HTML (for testing)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');
    const format = (searchParams.get('format') || 'html').toLowerCase();
    const forceInternal = searchParams.get('forceInternal') === 'true';
    const headerSecret = request.headers.get('x-internal-invoice-secret');
    const isInternalRequest = forceInternal || (!!headerSecret && headerSecret === INTERNAL_INVOICE_SECRET);

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Helper to enrich booking selections (services/items) with latest prices from DB
    const enrichWithServicePrices = (invoiceData: any, services: any[]) => {
      try {
        if (!Array.isArray(services) || services.length === 0) return invoiceData;
        const itemPriceByKey = new Map<string, number>();

        for (const svc of services) {
          const items = Array.isArray(svc.items) ? svc.items : [];
          for (const it of items) {
            const key1 = (it.id || it.itemId || '').toString().toLowerCase();
            const key2 = (it.name || it.title || '').toString().trim().toLowerCase();
            const price = Number(it.price || 0);
            if (key1) itemPriceByKey.set(`id:${key1}`, price);
            if (key2) itemPriceByKey.set(`name:${key2}`, price);
          }
        }

        const fixItems = (arr: any[]) =>
          (Array.isArray(arr) ? arr : []).map((x) => {
            const nx = { ...x };
            const idKey = (nx.id || nx.itemId || '').toString().toLowerCase();
            const nameKey = (nx.name || nx.title || '').toString().trim().toLowerCase();
            if (!(nx.price > 0)) {
              let p = 0;
              if (idKey && itemPriceByKey.has(`id:${idKey}`)) p = itemPriceByKey.get(`id:${idKey}`)!;
              else if (nameKey && itemPriceByKey.has(`name:${nameKey}`)) p = itemPriceByKey.get(`name:${nameKey}`)!;
              nx.price = p;
            }
            if (!(nx.quantity > 0)) nx.quantity = 1;
            return nx;
          });

        return {
          ...invoiceData,
          selectedDecorItems: fixItems(invoiceData.selectedDecorItems || invoiceData.decorationItems || []),
          selectedCakes: fixItems(invoiceData.selectedCakes || invoiceData.cakeItems || []),
          selectedGifts: fixItems(invoiceData.selectedGifts || invoiceData.giftItems || []),
          selectedExtraAddOns: fixItems(invoiceData.selectedExtraAddOns || []),
        };
      } catch {
        return invoiceData;
      }
    };

    // Helper to build invoice HTML from normalized data
    const buildHtml = async (invoiceData: any) => {
      try {
        const services = await (database as any).getAllServices?.();
        const enriched = enrichWithServicePrices(invoiceData, Array.isArray(services) ? services : []);
        const occasions = await (database as any).getAllOccasions?.();
        if (Array.isArray(occasions)) {
          const matchedOccasion = occasions.find((occ: any) => occ?.name === enriched.occasion);
          if (matchedOccasion) {
            enriched._occasionMeta = {
              fieldLabels: matchedOccasion.fieldLabels || {},
              requiredFields: matchedOccasion.requiredFields || [],
            };
          }
        }
        return generateInvoiceHtml(enriched);
      } catch {
        return generateInvoiceHtml(invoiceData);
      }
    };

    // Try to fetch booking from database first
    const result = await database.getBookingById(bookingId);
    if (result.success && result.booking) {
      const b: any = result.booking || {};
      const status = String(b.status || '').toLowerCase();
      const paymentStatus = String(b.paymentStatus || b.payment_status || '').toLowerCase();

      // Gate invoice until payment is marked as paid unless internal secret provided
      if (paymentStatus !== 'paid' && !isInternalRequest && false) {
        const customerName = b.name || 'Valued Customer';
        const gatingHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Invoice Pending</title><style>body{margin:0;padding:0;background:#0b0b0b;color:#fff;font-family:Arial,Helvetica,sans-serif}.wrap{max-width:720px;margin:6rem auto;background:#141414;border-radius:20px;border:1px solid #222;box-shadow:0 10px 30px rgba(0,0,0,.4);padding:32px;text-align:center}.title{font-size:28px;font-weight:800;margin-bottom:10px}.note{background:#1a1a1a;border-left:4px solid #eab308;color:#fef08a;padding:14px;border-radius:10px;margin-top:12px;display:inline-block}</style></head><body><div class="wrap"><div class="title">Invoice will be available after payment</div><div class="note">Once our team marks your booking as <b>Paid</b>, your invoice will unlock automatically and we&rsquo;ll email you the download link.</div></div><!-- INVOICE_PENDING --><script type="application/json" id="booking-data">{"name":"${customerName}","bookingId":"${bookingId}"}</script></body></html>`;

        // If PDF requested while pending, block
        if (format === 'pdf') {
          return NextResponse.json({ success: false, error: 'Invoice not available until payment is marked as paid' }, { status: 403 });
        }

        return new NextResponse(gatingHtml, { status: 200, headers: { 'Content-Type': 'text/html' } });
      }

      // Payment received â†’ build invoice regardless of completion status
      const invoiceData: any = {
        id: b.bookingId || b.id || (b._id ? String(b._id) : bookingId),
        name: b.name || b.customerName || '',
        email: b.email || '',
        phone: b.phone || '',
        theaterName: b.theaterName || b.theater || '',
        date: b.date || '',
        time: b.time || '',
        occasion: b.occasion || '',
        numberOfPeople: Number(b.numberOfPeople || 2),
        totalAmount: Number(b.totalAmount || 0),
        slotBookingFee: Number((b as any).slotBookingFee ?? b.pricingData?.slotBookingFee ?? b.advancePayment ?? 0),
        venuePaymentMethod: (b as any).venuePaymentMethod || (b as any).paymentMethod || (b as any).finalPaymentMethod || undefined,
        pricingData: b.pricingData || {},
        extraGuestsCount: Number(b.extraGuestsCount ?? Math.max(0, Number(b.numberOfPeople || 2) - 2)),
        extraGuestCharges: Number(b.extraGuestCharges || 0),
        advancePayment: b.advancePayment !== undefined ? Number(b.advancePayment) : undefined,
        venuePayment: b.venuePayment !== undefined ? Number(b.venuePayment) : undefined,
        ...b
      };

      const invoiceHtml = await buildHtml(invoiceData);

      if (format === 'pdf') {
        let browser;
        try {
          // Increase timeout to 2 minutes (120000ms)
          const timeout = 120000;
          
          // Launch browser with increased timeout
          browser = await launchBrowser();
          const page = await browser.newPage();
          
          // Set default navigation timeout
          page.setDefaultNavigationTimeout(timeout);
          page.setDefaultTimeout(timeout);
          
          // Set content with networkidle0 but with a timeout
          console.log('Setting invoice HTML content...');
          await page.setContent(invoiceHtml, { 
            waitUntil: 'networkidle0',
            timeout: timeout
          });
          
          console.log('Generating PDF buffer...');
          const pdfBuffer = await page.pdf({ 
            format: 'A4', 
            printBackground: true, 
            margin: { 
              top: '20px', 
              right: '20px', 
              bottom: '20px', 
              left: '20px' 
            },
            timeout: timeout
          });
          
          console.log('PDF generation successful');
          const cleanCustomerName = (invoiceData.name || 'Customer').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-');
          const filename = `Invoice-FMT-${cleanCustomerName}.pdf`;
          
          return new NextResponse(pdfBuffer as any, { 
            status: 200, 
            headers: { 
              'Content-Type': 'application/pdf', 
              'Content-Disposition': `attachment; filename="${filename}"`,
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
              'Surrogate-Control': 'no-store'
            } 
          });
        } catch (error: any) {
          console.error('❌ PDF generation failed:', error);
          throw new Error(`Failed to generate PDF: ${error?.message || 'Unknown error'}`);
        } finally {
          // Ensure browser is always closed
          if (browser) {
            await browser.close().catch(err => 
              console.error('Error closing browser:', err)
            );
          }
        }
      }

      return new NextResponse(invoiceHtml, { status: 200, headers: { 'Content-Type': 'text/html' } });
    }

    // Not found in DB â†’ try completed-bookings.json (archived after completion)
    try {
      let record: any = null;
      const arr = await ExportsStorage.readArray('completed-bookings.json');
      if (Array.isArray(arr)) {
        record = arr.find((r: any) => (r.bookingId || r.id) === bookingId) || null;
      }
      if (!record) {
        return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
      }

      const invoiceData: any = {
        id: record.bookingId || record.id || bookingId,
        name: record.name || '',
        email: record.email || '',
        phone: record.phone || '',
        theaterName: record.theaterName || '',
        date: record.date || '',
        time: record.time || '',
        occasion: record.occasion || '',
        numberOfPeople: Number(record.numberOfPeople || 2),
        totalAmount: Number(record.totalAmount || 0),
        slotBookingFee: Number((record as any).slotBookingFee ?? record.pricingData?.slotBookingFee ?? record.advancePayment ?? 0),
        venuePaymentMethod: (record as any).venuePaymentMethod || (record as any).paymentMethod || (record as any).finalPaymentMethod || undefined,
        advancePayment: record.advancePayment !== undefined ? Number(record.advancePayment) : undefined,
        venuePayment: record.venuePayment !== undefined ? Number(record.venuePayment) : undefined,
        ...record
      };

      const invoiceHtml = await buildHtml(invoiceData);

      if (format === 'pdf') {
        const browser = await launchBrowser();
        const page = await browser.newPage();
        await page.setContent(invoiceHtml, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' } });
        await browser.close();
        const cleanCustomerName = (invoiceData.name || 'Customer').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-');
        const filename = `Invoice-FMT-${cleanCustomerName}.pdf`;
        return new NextResponse(pdfBuffer as any, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"` } });
      }

      return new NextResponse(invoiceHtml, { status: 200, headers: { 'Content-Type': 'text/html' } });
    } catch (archiveError) {
      console.error('âŒ Failed to build invoice from archived bookings:', archiveError);
    }

    return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
  } catch (error) {
    console.error('âŒ Invoice preview error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate invoice preview' }, { status: 500 });
  }
}


