import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';
import {
  getCancelledBookingHistoryFromSQL,
  getCompletedBookingHistoryFromSQL,
} from '@/lib/godaddy-sql';
import { launchBrowser } from '@/lib/server-puppeteer';

export const runtime = 'nodejs';
export const maxDuration = 60;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
  'Surrogate-Control': 'no-store',
};

const parseDateParam = (value: string | null, fallback: string) => {
  const v = String(value || '').trim();
  if (!v) return fallback;
  return v;
};

const escapeHtml = (value: any) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const toISTString = (raw: any) => {
  try {
    if (!raw) return '';
    return new Date(raw).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const inDateRange = (raw: any, start: string, end: string) => {
  try {
    const t = new Date(raw).getTime();
    if (!Number.isFinite(t)) return false;
    const startT = new Date(`${start}T00:00:00.000Z`).getTime();
    const endT = new Date(`${end}T23:59:59.999Z`).getTime();
    return t >= startT && t <= endT;
  } catch {
    return false;
  }
};

export async function GET(request: NextRequest) {
  let browser: any;
  try {
    const { searchParams } = new URL(request.url);
    const start = parseDateParam(
      searchParams.get('start'),
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    );
    const end = parseDateParam(searchParams.get('end'), new Date().toISOString().slice(0, 10));

    const statusParam = String(searchParams.get('status') || '').trim();
    const requested = new Set(
      statusParam
        ? statusParam
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
        : ['completed', 'cancelled', 'manual'],
    );

    const [completedRes, cancelledRes] = await Promise.all([
      requested.has('completed')
        ? getCompletedBookingHistoryFromSQL({ start, end })
        : Promise.resolve({ success: true, bookings: [] as any[] }),
      requested.has('cancelled')
        ? getCancelledBookingHistoryFromSQL({ start, end })
        : Promise.resolve({ success: true, bookings: [] as any[] }),
    ]);

    if (!completedRes.success || !cancelledRes.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch booking history from SQL' },
        { status: 500, headers: NO_CACHE_HEADERS },
      );
    }

    const completed = (completedRes.bookings || []).map((b: any) => ({ ...b, __type: 'completed' }));
    const cancelled = (cancelledRes.bookings || []).map((b: any) => ({ ...b, __type: 'cancelled' }));

    let manual: any[] = [];
    if (requested.has('manual')) {
      const manualRes = await database.getAllManualBookings();
      const allManual = manualRes?.success && Array.isArray(manualRes.manualBookings) ? manualRes.manualBookings : [];
      manual = allManual
        .filter((b: any) => inDateRange(b.createdAt || b.created_at, start, end))
        .map((b: any) => ({
          __type: 'manual',
          bookingId: b.bookingId || b.id || (b._id ? String(b._id) : undefined),
          name: b.name || b.customerName,
          customerName: b.customerName || b.name,
          email: b.email,
          phone: b.phone,
          theaterName: b.theaterName || b.theater,
          theater: b.theater,
          date: b.date,
          time: b.time,
          status: b.status || 'manual',
          totalAmount: b.totalAmount || b.amount,
          createdAt: b.createdAt || b.created_at,
        }));
    }

    const combined = [...completed, ...cancelled, ...manual].sort((a: any, b: any) => {
      const ad = new Date(a.createdAt || 0).getTime();
      const bd = new Date(b.createdAt || 0).getTime();
      return bd - ad;
    });

    const title = `Booking History (${start} to ${end})`;

    const rowsHtml = combined
      .map((b: any) => {
        const createdAtIst = toISTString(b.createdAt);
        const amount = b.totalAmount ?? '';
        const type = String(b.__type || b.status || '').toUpperCase();
        const status = String(b.status || '').toUpperCase();
        return `
          <tr>
            <td class="type">${escapeHtml(type)}</td>
            <td class="mono">${escapeHtml(b.bookingId || b._id || '')}</td>
            <td>${escapeHtml(b.name || b.customerName || '')}</td>
            <td>${escapeHtml(b.email || '')}</td>
            <td>${escapeHtml(b.phone || '')}</td>
            <td>${escapeHtml(b.theaterName || b.theater || '')}</td>
            <td>${escapeHtml(b.date || '')}</td>
            <td>${escapeHtml(b.time || '')}</td>
            <td>${escapeHtml(status)}</td>
            <td class="amount">${escapeHtml(amount)}</td>
            <td>${escapeHtml(createdAtIst)}</td>
          </tr>
        `;
      })
      .join('');

    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page { size: A4 landscape; margin: 14mm; }
      body { margin: 0; padding: 0; background: #0b0b0b; color: #e5e5e5; font-family: Arial, Helvetica, sans-serif; }
      .wrap { padding: 18px; }
      .header { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
      .brand { font-size: 18px; font-weight: 800; letter-spacing: 0.4px; color: #ffffff; }
      .accent { color: #e50914; }
      .meta { font-size: 11px; color: #b3b3b3; }
      .card { background: #141414; border: 1px solid #232323; border-radius: 14px; overflow: hidden; }
      .table-wrap { width: 100%; overflow: hidden; }
      table { width: 100%; border-collapse: collapse; }
      thead th { background: #181818; color: #ffffff; text-align: left; font-size: 11px; padding: 10px 10px; border-bottom: 1px solid #2a2a2a; }
      tbody td { font-size: 10.5px; padding: 9px 10px; border-bottom: 1px solid #222; vertical-align: top; }
      tbody tr:nth-child(even) td { background: #121212; }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
      .type { font-weight: 700; }
      .amount { text-align: right; font-variant-numeric: tabular-nums; }
      .footer { margin-top: 10px; font-size: 10px; color: #9ca3af; display: flex; justify-content: space-between; }
      .pill { display: inline-block; padding: 3px 8px; border-radius: 999px; border: 1px solid #2a2a2a; background: rgba(229,9,20,0.12); color: #ffb3b3; font-weight: 700; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="header">
        <div>
          <div class="brand">FeelME Town <span class="accent">History</span></div>
          <div class="meta">${escapeHtml(title)}</div>
        </div>
        <div class="meta">
          <span class="pill">Generated (IST): ${escapeHtml(toISTString(new Date()))}</span>
        </div>
      </div>

      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Booking ID</th>
                <th>Customer</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Theater</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th style="text-align:right">Amount</th>
                <th>Created At (IST)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="11">No data found for selected range</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <div class="footer">
        <div>Rows: ${combined.length}</div>
        <div>Source: GoDaddy SQL (completed/cancelled) + Mongo (manual)</div>
      </div>
    </div>
  </body>
</html>`;

    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      landscape: true,
      margin: {
        top: '14mm',
        right: '14mm',
        bottom: '14mm',
        left: '14mm',
      },
    });

    await browser.close();
    browser = null;

    const filename = `booking-history-${start}-to-${end}.pdf`;
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        ...NO_CACHE_HEADERS,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignore
      }
    }
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to generate history PDF' },
      { status: 500, headers: NO_CACHE_HEADERS },
    );
  }
}
