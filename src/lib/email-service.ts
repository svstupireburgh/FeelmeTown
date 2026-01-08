// Email Service for FeelME Town
// Professional email templates like Netflix

import nodemailer from 'nodemailer';
import database from '@/lib/db-connect';
import getSiteUrl from '@/lib/site-url';
const CURRENT_YEAR = new Date().getFullYear();
// Helper: Render Occasion Details from dynamic fields present in bookingData
const renderOccasionDetails = (bookingData: Record<string, any>) => {
  try {
    if (!bookingData) return '';
    const keys = Object.keys(bookingData);
    const labelKeys = keys.filter(k => k.endsWith('_label'));
    if (labelKeys.length === 0) return '';

    const itemsHtml = labelKeys
      .map(labelKey => {
        const baseKey = labelKey.replace(/_label$/, '');
        const label = bookingData[labelKey];
        const value = bookingData[baseKey] ?? bookingData[`${baseKey}_value`] ?? '';
        const safeLabel = String(label || '').trim();
        const safeValue = String(value || '').trim();
        if (!safeLabel || !safeValue) return '';
        return `
          <div class="detail-item">
            <div class="detail-label">${safeLabel}</div>
            <div class="detail-value">${safeValue}</div>
          </div>
        `;
      })
      .filter(Boolean)
      .join('');

    if (!itemsHtml) return '';

    return `
      <div class="booking-card">
        <div class="booking-header">
          <div class="booking-icon">🎪</div>
          <div class="booking-title">Occasion Details</div>
        </div>
        <div class="detail-grid">
          ${itemsHtml}
        </div>
      </div>
    `;
  } catch (e) {
    return '';
  }
};

const buildOrderCancelledEmail = (bookingData: BookingData, options: { trackUrl: string }) => {
  const reason = (bookingData as any).cancelReason ? escapeHtml((bookingData as any).cancelReason) : '';
  const notes = (bookingData as any).cancelNotes ? escapeHtml((bookingData as any).cancelNotes) : '';
  const hasNotes = Boolean(notes.trim());

  const reasonBlock = reason
    ? `
      <div style="margin-top:18px; padding:16px; border-radius:16px; background:#111827; border:1px solid rgba(248, 113, 113, 0.45); color:#fee2e2; font-size:14px; line-height:1.6;">
        <div style="font-weight:800; letter-spacing:0.08em; font-size:12px; text-transform:uppercase; color:#fecaca; margin-bottom:8px;">Cancellation reason</div>
        <div style="white-space:pre-wrap;">${reason}</div>
        ${hasNotes ? `<div style=\"margin-top:10px; color:#fca5a5; white-space:pre-wrap;\"><strong>Note:</strong> ${notes}</div>` : ''}
      </div>
    `
    : '';

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        body { background:#0b0b0b; color:#fff; font-family: 'Inter', Arial, sans-serif; margin:0; padding:0; }
        .wrapper { max-width:640px; margin:0 auto; padding:32px 20px; }
        .card { background:#111; border-radius:20px; padding:28px; border:1px solid #1f1f1f; box-shadow:0 20px 50px rgba(0,0,0,0.4); }
        .title { font-size:24px; font-weight:700; margin-bottom:8px; color:#ffffff; }
        .badge { display:inline-block; margin-bottom:14px; padding:6px 14px; border-radius:999px; font-size:12px; letter-spacing:0.1em; background:#f87171; color:#0b0b0b; font-weight:700; }
        .sub { color:#bbb; font-size:14px; line-height:1.7; }
        .ticket { margin:22px 0; padding:18px; border-radius:18px; background:linear-gradient(135deg,#e50914,#b20710); text-align:center; font-size:20px; letter-spacing:0.32em; font-weight:800; }
        .cta { display:inline-block; margin-top:22px; padding:14px 28px; border-radius:999px; background:#f2b365; color:#000; text-decoration:none; font-weight:700; }
        .footer { text-align:center; margin-top:26px; color:#888; font-size:12px; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="card">
          <div class="badge">ORDER CANCELLED</div>
          <div class="title">Your order is Cancelled ❌</div>
          <div class="sub">Your food order for your FeelME Town experience has been cancelled. If you need help, please reach out to our team.</div>
          ${reasonBlock}
          ${bookingData.ticketNumber ? `<div class="ticket">${String(bookingData.ticketNumber).toUpperCase()}</div>` : ''}
          <a class="cta" href="${options.trackUrl}" target="_blank" rel="noreferrer">View order status</a>
        </div>
        <div class="footer">FeelME Town · Private Theatre & Cafe · We’re here if you need anything.</div>
      </div>
    </body>
  </html>
`;
};

const buildOrderItemCancelledEmail = (bookingData: BookingData, options: { trackUrl: string }) => {
  const reason = (bookingData as any).cancelReason ? escapeHtml((bookingData as any).cancelReason) : '';
  const notes = (bookingData as any).cancelNotes ? escapeHtml((bookingData as any).cancelNotes) : '';
  const hasNotes = Boolean(notes.trim());
  const rawItems = (bookingData as any).cancelledItemNames;
  const items = Array.isArray(rawItems)
    ? rawItems.map((x: any) => escapeHtml(x)).filter((x: string) => x.trim())
    : (bookingData as any).cancelledItemName
      ? [escapeHtml((bookingData as any).cancelledItemName)]
      : [];

  const itemsBlock = items.length
    ? `
      <div style="margin-top:18px; padding:16px; border-radius:16px; background:#0f172a; border:1px solid rgba(248, 181, 0, 0.35); color:#e5e7eb; font-size:14px; line-height:1.6;">
        <div style="font-weight:800; letter-spacing:0.08em; font-size:12px; text-transform:uppercase; color:#fef3c7; margin-bottom:8px;">Cancelled item</div>
        <div style="white-space:pre-wrap; font-weight:700; color:#ffffff;">${items.join(', ')}</div>
      </div>
    `
    : '';

  const reasonBlock = reason
    ? `
      <div style="margin-top:18px; padding:16px; border-radius:16px; background:#111827; border:1px solid rgba(248, 113, 113, 0.35); color:#fee2e2; font-size:14px; line-height:1.6;">
        <div style="font-weight:800; letter-spacing:0.08em; font-size:12px; text-transform:uppercase; color:#fecaca; margin-bottom:8px;">Reason</div>
        <div style="white-space:pre-wrap;">${reason}</div>
        ${hasNotes ? `<div style=\"margin-top:10px; color:#fca5a5; white-space:pre-wrap;\"><strong>Note:</strong> ${notes}</div>` : ''}
      </div>
    `
    : '';

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        body { background:#0b0b0b; color:#fff; font-family: 'Inter', Arial, sans-serif; margin:0; padding:0; }
        .wrapper { max-width:640px; margin:0 auto; padding:32px 20px; }
        .card { background:#111; border-radius:20px; padding:28px; border:1px solid #1f1f1f; box-shadow:0 20px 50px rgba(0,0,0,0.4); }
        .title { font-size:24px; font-weight:700; margin-bottom:8px; color:#ffffff; }
        .badge { display:inline-block; margin-bottom:14px; padding:6px 14px; border-radius:999px; font-size:12px; letter-spacing:0.1em; background:#fbbf24; color:#0b0b0b; font-weight:800; }
        .sub { color:#bbb; font-size:14px; line-height:1.7; }
        .ticket { margin:22px 0; padding:18px; border-radius:18px; background:linear-gradient(135deg,#e50914,#b20710); text-align:center; font-size:20px; letter-spacing:0.32em; font-weight:800; }
        .cta { display:inline-block; margin-top:22px; padding:14px 28px; border-radius:999px; background:#f2b365; color:#000; text-decoration:none; font-weight:700; }
        .footer { text-align:center; margin-top:26px; color:#888; font-size:12px; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="card">
          <div class="badge">ITEM CANCELLED</div>
          <div class="title">An item was cancelled from your order</div>
          <div class="sub">One item from your food order has been cancelled. Your remaining order (if any) will continue as usual.</div>
          ${itemsBlock}
          ${reasonBlock}
          ${bookingData.ticketNumber ? `<div class="ticket">${String(bookingData.ticketNumber).toUpperCase()}</div>` : ''}
          <a class="cta" href="${options.trackUrl}" target="_blank" rel="noreferrer">View order status</a>
        </div>
        <div class="footer">FeelME Town · Private Theatre & Cafe · We’re here if you need anything.</div>
      </div>
    </body>
  </html>
`;
};

const formatPrepReadyTime = (readyAt?: string) => {
  if (!readyAt) return '';
  try {
    return new Date(readyAt).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const describePrepEta = (bookingData: BookingData) => {
  if (!bookingData.orderPrepMinutes) return '';
  const estimatedReadyTime = formatPrepReadyTime(bookingData.orderPrepReadyAt);
  return ` It should be ready in approximately ${bookingData.orderPrepMinutes} minutes${
    estimatedReadyTime ? ` (around ${estimatedReadyTime})` : ''
  }.`;
};

function escapeHtml(value: unknown) {
  const str = String(value ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const buildOrderStatusEmail = (
  bookingData: BookingData,
  options: { title: string; message: string; ctaLabel: string; trackUrl: string; badge: string },
) => {
  const hasPrepEstimate = Boolean(bookingData.orderPrepMinutes);
  const estimatedReadyTime = formatPrepReadyTime(bookingData.orderPrepReadyAt);
  const prepCopy = hasPrepEstimate
    ? `Your food should be ready in approximately <strong>${bookingData.orderPrepMinutes} minutes</strong>${
        estimatedReadyTime ? ` (around ${estimatedReadyTime})` : ''
      }.`
    : '';

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        body { background:#0b0b0b; color:#fff; font-family: 'Inter', Arial, sans-serif; margin:0; padding:0; }
        .wrapper { max-width:640px; margin:0 auto; padding:32px 20px; }
        .card { background:#111; border-radius:20px; padding:28px; border:1px solid #1f1f1f; box-shadow:0 20px 50px rgba(0,0,0,0.4); }
        .title { font-size:24px; font-weight:700; margin-bottom:8px; color:#ffffff; }
        .badge { display:inline-block; margin-bottom:14px; padding:6px 14px; border-radius:999px; font-size:12px; letter-spacing:0.1em; background:#f87171; color:#0b0b0b; font-weight:700; }
        .sub { color:#bbb; font-size:14px; line-height:1.7; }
        .eta-card { margin-top:18px; padding:16px; border-radius:16px; background:#0f172a; border:1px solid rgba(248, 181, 0, 0.45); color:#fef3c7; font-size:14px; line-height:1.6; }
        .eta-card strong { color:#fde047; }
        .ticket { margin:22px 0; padding:18px; border-radius:18px; background:linear-gradient(135deg,#e50914,#b20710); text-align:center; font-size:20px; letter-spacing:0.32em; font-weight:800; }
        .cta { display:inline-block; margin-top:22px; padding:14px 28px; border-radius:999px; background:#f2b365; color:#000; text-decoration:none; font-weight:700; }
        .footer { text-align:center; margin-top:26px; color:#888; font-size:12px; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="card">
          <div class="badge">${options.badge}</div>
          <div class="title">${options.title}</div>
          <div class="sub">${options.message}</div>
          ${hasPrepEstimate ? `<div class="eta-card">⏱️ ${prepCopy} We’ll ping you again the moment it’s ready to serve.</div>` : ''}
          ${bookingData.ticketNumber ? `<div class="ticket">${bookingData.ticketNumber.toUpperCase()}</div>` : ''}
          <a class="cta" href="${options.trackUrl}" target="_blank" rel="noreferrer">${options.ctaLabel}</a>
        </div>
        <div class="footer">FeelME Town · Private Theatre & Cafe · We will keep you posted.</div>
      </div>
    </body>
  </html>
`;
};

interface BookingData {
  id: string;
  name: string;
  email: string;
  phone: string;
  theaterName: string;
  date: string;
  time: string;
  occasion: string;
  numberOfPeople: number;
  totalAmount?: number;
  ticketNumber?: string;
  orderPrepMinutes?: number;
  orderPrepReadyAt?: string;
  cancelReason?: string;
  cancelNotes?: string;
  cancelledItemName?: string;
  cancelledItemNames?: string[];
}

// Helper: Get settings for SMTP and notification gating
const getSettingsOrDefault = async () => {
  try {
    const settings = await database.getSettings();
    return settings || {};
  } catch (e) {
    return {} as any;
  }
};

const createTransporter = async () => {
  const settings = await getSettingsOrDefault();

  const user = (settings.emailUser || '').toString().trim();
  const pass = (settings.emailPass || '').toString().trim();

  if (!user || !pass) {
    throw new Error('Email credentials not configured in database');
  }

  const host = (settings.smtpHost || '').toString().trim();
  const portRaw = (settings.smtpPort || '').toString().trim();
  const port = portRaw ? parseInt(portRaw, 10) : undefined;

  if (host && port) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
};

// Email templates
const emailTemplates = {
  // Booking cancelled
  bookingCancelled: (bookingData: BookingData & { refundAmount: number; refundStatus: string; cancelledAt: Date }) => ({
    subject: 'Booking Cancelled - FeelME Town - Refund Information',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Cancelled - FeelME Town</title>
        <style>
          @font-face {
            font-family: 'Paralucent-DemiBold';
            src: url('https://ik.imagekit.io/cybershoora/fonts/Paralucent-DemiBold.ttf?updatedAt=1758320830457') format('truetype');
          }
          @font-face {
            font-family: 'Paralucent-Medium';
            src: url('https://ik.imagekit.io/cybershoora/fonts/Paralucent-Medium.ttf?updatedAt=1758320830502') format('truetype');
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            margin: 0; padding: 0; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
          }
          .email-wrapper { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            padding: 40px 20px; 
            min-height: 100vh;
          }
          .container { 
            max-width: 650px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header { 
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); 
            padding: 50px 30px; 
            text-align: center; 
            font-family: 'Paralucent-Medium', sans-serif;
            position: relative;
            overflow: hidden;
          }
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.3;
          }
          .logo { 
            color: white; 
            font-size: 36px; 
            font-weight: 800; 
            margin-bottom: 15px;
            text-shadow: 0 2px 10px rgba(0,0,0,0.3);
            position: relative;
            z-index: 1;
          }
          .tagline { 
            color: rgba(255,255,255,0.9); 
            font-size: 18px; 
            font-family: 'Paralucent-Medium', sans-serif;
            font-weight: 300;
            position: relative;
            z-index: 1;
          }
          .brand-logo {
            width: 120px;
            height: auto;
            display: block;
            margin: 0 auto 12px;
            position: relative;
            z-index: 1;
          }
          .cancelled-badge {
            background: linear-gradient(45deg, #dc3545, #c82333);
            color: white;
            font-family: 'Paralucent-Medium', sans-serif;
            padding: 8px 20px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 600;
            display: inline-block;
            margin: 20px auto;
            box-shadow: 0 4px 15px rgba(220,53,69,0.3);
          }
          .content { 
            padding: 50px 40px; 
            background: white;
          }
          .greeting {
            text-align: center;
            margin-bottom: 40px;
          }
          .greeting h1 {
            color: #dc3545;
            font-family: 'Paralucent-Medium', sans-serif;
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 15px;
          }
          .greeting p {
            color: #666;
            font-size: 18px;
            font-family: 'Paralucent-Medium', sans-serif;
            line-height: 1.6;
          }
          .booking-card { 
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 35px; 
            border-radius: 20px; 
            margin: 30px 0;
            border: 1px solid #e9ecef;
            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
          }
          .booking-header {
            display: flex;
            align-items: center;
            margin-bottom: 25px;
          }
          .booking-icon {
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #dc3545, #c82333);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
            font-size: 24px;
          }
          .booking-title {
            color: #1a1a2e;
            font-size: 24px;
            font-weight: 700;
            font-family: 'Paralucent-Medium', sans-serif;
          }
          .detail-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 25px;
          }
          .detail-item {
            background: white;
            padding: 24px;
            border-radius: 16px;
            border: 1px solid #e9ecef;
            box-shadow: 0 4px 16px rgba(0,0,0,0.06);
          }
          .detail-label {
            display: inline-block;
            font-weight: 700;
            color: #fff;
            font-family: 'Paralucent-Medium', sans-serif;
            font-size: 14px;
            text-transform: none;
            letter-spacing: 0.3px;
            margin-bottom: 10px;
            padding: 8px 18px;
            border-radius: 9999px;
            background: linear-gradient(135deg, #dc3545, #c82333);
            box-shadow: 0 6px 18px rgba(220,53,69,0.35);
          }
          .detail-value {
            font-size: 28px;
            font-weight: 800;
            font-family: 'Paralucent-Medium', sans-serif;
            line-height: 1.2;
            background: linear-gradient(135deg, #dc3545, #c82333);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }
          .refund-section {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 30px;
            border-radius: 20px;
            text-align: center;
            font-family: 'Paralucent-DemiBold', sans-serif;
            margin: 30px 0;
            box-shadow: 0 15px 40px rgba(40,167,69,0.3);
          }
          .refund-label {
            font-size: 16px;
            opacity: 0.9;
            margin-bottom: 10px;
          }
          .refund-amount {
            font-size: 36px;
            font-weight: 800;
            text-shadow: 0 2px 10px rgba(0,0,0,0.2);
          }
          .footer { 
            background: #1a1a2e; 
            color: white; 
            font-family: 'Paralucent-Medium', sans-serif;
            padding: 40px 30px; 
            text-align: center;
          }
          .footer-logo {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 15px;
          }
          .footer-tagline {
            color: rgba(255,255,255,0.8);
            margin-bottom: 30px;
          }
          .footer-bottom {
            border-top: 1px solid rgba(255,255,255,0.1);
            padding-top: 20px;
            margin-top: 20px;
          }
          .footer-bottom p {
            font-size: 12px; 
            color: rgba(255,255,255,0.6);
          }
          @media (max-width: 600px) {
            .container { border-radius: 14px; margin: 0 8px; }
            .header { padding: 28px 16px; }
            .logo { font-size: 26px; }
            .tagline { font-size: 14px; }
            .content { padding: 24px 16px; }
            .detail-grid { grid-template-columns: 1fr; gap: 14px; }
            .detail-item { padding: 16px; border-radius: 12px; }
            .detail-label { font-size: 12px; padding: 6px 12px; }
            .detail-value { font-size: 22px; line-height: 1.25; word-break: break-word; }
            .booking-card { padding: 20px; }
            .refund-section { padding: 20px; border-radius: 14px; margin: 20px 0; }
            .refund-amount { font-size: 28px; }
            .footer { padding: 24px 16px; }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
        <div class="container">
          <div class="header">
            <img
              class="brand-logo"
              src="https://res.cloudinary.com/dxeih5yjj/image/upload/v1761909846/logo_ucslk6.svg"
              alt="FeelME Town logo"
              loading="lazy"
              decoding="async"
            />
            <div class="logo">FeelME Town</div>
            <div class="tagline">Premium Entertainment Experience</div>
          </div>
          
          <div class="content">
              <div class="cancelled-badge">Booking Cancelled</div>
              
              <div class="greeting">
                <h1>Booking Cancelled, ${bookingData.name}</h1>
                <p>Your booking has been successfully cancelled. We're sorry to see you go, but we understand that plans can change.</p>
              </div>
              
              <div class="booking-card">
                <div class="booking-header">
                  <div class="booking-icon">❌</div>
                  <div class="booking-title">Cancelled Booking Details</div>
                </div>
                
                <div class="detail-grid">
                  <div class="detail-item">
                    <div class="detail-label">Customer Name</div>
                    <div class="detail-value">${bookingData.name}</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-label">Theater Venue</div>
                    <div class="detail-value">${bookingData.theaterName}</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-label">Booking Date</div>
                    <div class="detail-value">${bookingData.date}</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-label">Show Time</div>
                    <div class="detail-value">${bookingData.time}</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-label">Cancelled At</div>
                    <div class="detail-value">${bookingData.cancelledAt.toLocaleDateString()}</div>
                  </div>
                  ${(bookingData as any).ticketNumber ? `
                  <div class="detail-item">
                    <div class="detail-label">Ticket Number</div>
                    <div class="detail-value">${(bookingData as any).ticketNumber}</div>
                  </div>
                  ` : ''}
                  <div class="detail-item">
                    <div class="detail-label">Refund Status</div>
                    <div class="detail-value">${bookingData.refundStatus === 'refundable' ? 'Eligible for Refund' : 'Non-Refundable'}</div>
                  </div>
                </div>
              </div>
              
              ${bookingData.refundAmount > 0 ? `
              <div class="refund-section">
                <div class="refund-label">Refund Amount</div>
                <div class="refund-amount">₹${bookingData.refundAmount}</div>
                <p style="margin-top: 15px; font-size: 16px; opacity: 0.9;">
                  Refund will be processed within 5-7 business days to your original payment method.
                </p>
              </div>
              ` : `
              <div class="refund-section" style="background: linear-gradient(135deg, #6c757d 0%, #495057 100%);">
                <div class="refund-label">No Refund Applicable</div>
                <div class="refund-amount">₹0</div>
                <p style="margin-top: 15px; font-size: 16px; opacity: 0.9;">
                  As per our cancellation policy, no refund is applicable for cancellations made within 72 hours of the booking date.
                </p>
              </div>
              `}
              
              <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 15px;">
                <p style="color: #666; font-size: 16px; margin: 0; font-family: 'Paralucent-Medium', sans-serif;">
                  <strong>💡 We hope to see you again soon!</strong> 
                  Feel free to book with us anytime for your special occasions. We're always here to create unforgettable memories.
                </p>
              </div>
            </div>
            
            <div class="footer">
              <div class="footer-logo">FeelME Town</div>
              <div class="footer-tagline">Creating Unforgettable Memories</div>
              
              <div class="footer-bottom">
                <p>© ${CURRENT_YEAR} FeelME Town. All rights reserved.</p>
                <p>Premium Entertainment • Luxury Experience • Unforgettable Moments</p>
                <p>Designed and Developed by <a href="https://www.cybershoora.com/" target="_blank" rel="noopener noreferrer"><span style="font-weight: 600; color: #ffffff;">CYBERSHOORA</span></a></p>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  // Booking completed successfully
  bookingComplete: (bookingData: BookingData, siteUrl: string) => ({
    subject: 'Booking Confirmed - FeelME Town - Premium Entertainment',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmed - FeelME Town</title>
        <style>
          @font-face {
            font-family: 'Paralucent-DemiBold';
            src: url('https://ik.imagekit.io/cybershoora/fonts/Paralucent-DemiBold.ttf?updatedAt=1758320830457') format('truetype');
          }
          @font-face {
            font-family: 'Paralucent-Medium';
            src: url('https://ik.imagekit.io/cybershoora/fonts/Paralucent-Medium.ttf?updatedAt=1758320830502') format('truetype');
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            
            margin: 0; padding: 0; 
            background: #ffffff !important;
            min-height: 100vh;
          }
          .email-wrapper { 
            background: #ffffff !important; 
            padding: 40px 20px; 
            min-height: 100vh;
          }
          .container { 
            max-width: 650px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header { 
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); 
            padding: 50px 30px; 
            text-align: center; 
            font-family: 'Paralucent-DemiBold', sans-serif;
            position: relative;
            overflow: hidden;
          }
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.3;
          }
          .logo { 
            color: white; 
            font-size: 36px; 
            font-weight: 800; 
            margin-bottom: 15px;
            text-shadow: 0 2px 10px rgba(0,0,0,0.3);
            position: relative;
            z-index: 1;
          }
          .tagline { 
            color: rgba(255,255,255,0.9); 
            font-size: 18px; 
            font-family: 'Paralucent-DemiBold', sans-serif;
            font-weight: 300;
            position: relative;
            z-index: 1;
          }

          /* Brand logo above heading */
          .brand-logo {
            width: 120px;
            height: auto;
            display: block;
            margin: 0 auto 12px;
            position: relative; /* ensure it sits above overlay */
            z-index: 1;
          }

          @media (max-width: 600px) {
            .brand-logo { width: 7rem; }
          }
          .success-badge {
            background: linear-gradient(45deg, #00d4aa, #00b894);
            color: white;
            font-family: 'Paralucent-Medium', sans-serif;
            padding: 8px 20px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 600;
            display: inline-block;
            margin: 20px auto;
            box-shadow: 0 4px 15px rgba(0,212,170,0.3);
          }
          .content { 
            padding: 50px 40px; 
            background: white;
          }
          .greeting {
            text-align: center;
            margin-bottom: 40px;
          }
          .greeting h1 {
            color: #667eea;
            font-family: 'Paralucent-Medium', sans-serif;
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 15px;
          }
          .greeting p {
            color: #666;
            font-size: 18px;
            font-family: 'Paralucent-Medium', sans-serif;
            line-height: 1.6;
          }
          .booking-card { 
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 35px; 
            border-radius: 20px; 
            margin: 30px 0;
            border: 1px solid #e9ecef;
            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
          }
          .booking-header {
            display: flex;
            align-items: center;
            
            margin-bottom: 25px;
          }
          .booking-icon {
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
            font-size: 24px;
          }
          .booking-title {
            color: #1a1a2e;
            font-size: 24px;
            font-weight: 700;
            font-family: 'Paralucent-Medium', sans-serif;
          }
          .detail-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 25px;
          }
          .detail-item {
            background: white;
            padding: 24px;
            border-radius: 16px;
            border: 1px solid #e9ecef; /* subtle card border */
            box-shadow: 0 4px 16px rgba(0,0,0,0.06);
          }
          .detail-label {
            display: inline-block;
            font-weight: 700;
            color: #fff;
            font-family: 'Paralucent-DemiBold', sans-serif;
            font-size: 14px;
            text-transform: none; /* match Title Case from reference */
            letter-spacing: 0.3px;
            margin-bottom: 10px;
            padding: 8px 18px;
            border-radius: 9999px; /* full pill */
            background: linear-gradient(135deg, #4b00cc, #5b3df4);
            box-shadow: 0 6px 18px rgba(91,61,244,0.35);
          }
          .detail-value {
            font-size: 28px;
            font-weight: 800;
            line-height: 1.2;
            font-family: 'Paralucent-Medium', sans-serif;
            background: linear-gradient(135deg, #6a5ae0, #7a56ff);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent; /* gradient text */
          }
          .total-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 20px;
            text-align: center;
            font-family: 'Paralucent-DemiBold', sans-serif;
            margin: 30px 0;
            box-shadow: 0 15px 40px rgba(102,126,234,0.3);
          }
          .total-label {
            font-size: 16px;
            opacity: 0.9;
            margin-bottom: 10px;
          }
          .total-amount {
            font-size: 36px;
            font-weight: 800;
            text-shadow: 0 2px 10px rgba(0,0,0,0.2);
          }
          .cta-section {
            text-align: center;
            margin: 40px 0;
          }
          .cta-button { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; 
            padding: 18px 40px; 

            font-family: 'Paralucent-Medium', sans-serif;
            text-decoration: none; 
            border-radius: 50px; 
            display: inline-block; 
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 10px 30px rgba(102,126,234,0.3);
            transition: all 0.3s ease;
          }
          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 15px 40px rgba(102,126,234,0.4);
          }
          .cta-button.cancel-button {
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
            margin-left: 15px;
            box-shadow: 0 10px 30px rgba(220,53,69,0.3);
          }
          .cta-button.cancel-button:hover {
            box-shadow: 0 15px 40px rgba(220,53,69,0.4);
          }
          .footer { 
            background: #1a1a2e; 
            color: white; 
            font-family: 'Paralucent-Medium', sans-serif;
            padding: 40px 30px; 
            text-align: center;
          }
          .footer-logo {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 15px;
          }
          .footer-tagline {
            color: rgba(255,255,255,0.8);
            margin-bottom: 30px;
          }
          .social-links { 
            margin: 30px 0; 
          }
          .social-links a { 
            color: white; 
            font-family: 'Paralucent-Medium', sans-serif;
            text-decoration: none; 
            margin: 0 15px;
            padding: 10px;
            border-radius: 50%;
            background: rgba(255,255,255,0.1);
            display: inline-block;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            line-height: 20px;
            transition: all 0.3s ease;
          }
          .social-links a svg {
            width: 20px;
            height: 20px;
            fill: white;
          }
          .social-links a:hover {
            background: #667eea;
            transform: translateY(-2px);
          }
          .footer-bottom {
            border-top: 1px solid rgba(255,255,255,0.1);
            padding-top: 20px;
            margin-top: 20px;
          }
          .footer-bottom p {
            font-size: 12px; 
            
            color: rgba(255,255,255,0.6);
          }
          .booking-id {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            margin: 20px 0;
            border: 2px dashed #667eea;
          }
          .booking-id-label {
            font-size: 12px;
            color: #666;
            font-family: 'Paralucent-Medium', sans-serif;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 5px;
          }
          .booking-id-value {
            font-size: 18px;
            font-weight: 700;
            color: #667eea;
            font-family: 'Paralucent-Medium', sans-serif;
            font-family: 'Courier New', monospace;
          }
          
          .pricing-section {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 20px;
            padding: 30px;
            margin: 30px 0;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            border: 2px solid #dee2e6;
          }
          
          .pricing-header {
            display: flex;
            align-items: center;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e9ecef;
          }
          
          .pricing-icon {
            font-size: 32px;
            margin-right: 15px;
          }
          
          .pricing-title {
            font-size: 24px;
            font-weight: 800;
            color: #495057;
            font-family: 'Paralucent-Medium', sans-serif;
          }
          
          .pricing-grid {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          
          .pricing-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            border-left: 4px solid #667eea;
          }
          
          .pricing-item.discount {
            border-left-color: #ffc107;
            background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
            font-weight: 600;
          }
          
          .pricing-item.final {
            border-left-color: #dc3545;
            background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
            font-weight: 800;
            font-size: 18px;
          }
          
          .pricing-label {
            font-size: 16px;
            color: #495057;
            font-family: 'Paralucent-Medium', sans-serif;
            font-weight: 500;
          }
          
          .pricing-value {
            font-size: 16px;
            color: #495057;
            font-family: 'Paralucent-Medium', sans-serif;
            font-weight: 700;
          }
          
          .pricing-item.final .pricing-value {
            font-size: 20px;
            color: #dc3545;
          }

          /* Animated Images (Responsive) */
          .animated-images {
            text-align: center;
            margin-top: 30px;
            padding: 20px;
            border-radius: 20px;
          }
          .image-stage {
            position: relative;
            width: 100%;
            max-width: 960px; /* cap width for large screens */
            margin: 0 auto;
            aspect-ratio: 16 / 9; /* responsive height */
            overflow: hidden;
            border-radius: 15px;
            
          }
          .animated-image {
            position: absolute;
            inset: 0; /* top:0; right:0; bottom:0; left:0 */
            width: 100%;
            height: 100%;
            object-fit: contain; /* show entire image on all screens */
            transition: opacity 1.8s ease-in-out;
            border-radius: 15px;
            opacity: 0; /* hidden by default */
          }
          /* Show the first image initially so animation starts from state */
          #image1.animated-image { opacity: 1; }

          @media (max-width: 600px) {
            .container { border-radius: 14px; margin: 0 8px; }
            .header { padding: 28px 16px; }
            .logo { font-size: 26px; }
            .tagline { font-size: 14px; }
            .content { padding: 24px 16px; }

            .detail-grid { grid-template-columns: 1fr; gap: 14px; }
            .detail-item { padding: 16px; border-radius: 12px; }
            .detail-label { font-size: 12px; padding: 6px 12px; }
            .detail-value { font-size: 22px; line-height: 1.25; word-break: break-word; }

            .booking-card { padding: 20px; }

            .total-section { padding: 20px; border-radius: 14px; margin: 20px 0; }
            .total-amount { font-size: 28px; }
            .total-label { font-size: 14px; }

            .cta-button { padding: 14px 24px; font-size: 15px; }

            .booking-id { padding: 12px; }
            .booking-id-value { font-size: 16px; }
            
            .pricing-section { padding: 20px; }
            .pricing-header { flex-direction: column; text-align: center; gap: 10px; }
            .pricing-icon { margin-right: 0; margin-bottom: 10px; }
            .pricing-title { font-size: 20px; }
            .pricing-item { flex-direction: column; text-align: center; gap: 8px; }
            .pricing-label { font-size: 14px; }
            .pricing-value { font-size: 16px; }

            .footer { padding: 24px 16px; }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
        <div class="container">
          <div class="header">
            <img
              class="brand-logo"
              src="${process.env.NEXT_PUBLIC_EMAIL_LOGO_URL || 'https://via.placeholder.com/120x40?text=FeelME+Town'}"
              alt="FeelME Town logo"
              loading="lazy"
              decoding="async"
            />
            <div class="logo">FeelME Town</div>
            <div class="tagline">Premium Entertainment Experience</div>
          </div>
          
          <div class="content">
              <div class="success-badge">Booking Confirmed</div>
              
              <div class="greeting">
                <h1>Congratulations, ${bookingData.name}! </h1>
                <p>Your booking has been successfully confirmed. We're excited to make your special occasion absolutely memorable!</p>
              </div>
              
              ${bookingData.ticketNumber ? `
              <!-- Ticket Number Section -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 20px; text-align: center; margin: 30px 0; box-shadow: 0 15px 40px rgba(102,126,234,0.3);">
                <div style="color: rgba(255,255,255,0.9); font-size: 14px; font-family: 'Paralucent-Medium', sans-serif; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px;">🎟️ Your Ticket Number</div>
                <div style="background: white; padding: 20px; border-radius: 15px; margin: 15px 0; box-shadow: 0 8px 24px rgba(0,0,0,0.15);">
                  <div style="font-size: 48px; font-weight: 800; font-family: 'Paralucent-DemiBold', monospace; background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; background-clip: text; color: transparent; letter-spacing: 4px;">${bookingData.ticketNumber}</div>
                </div>
                <div style="color: white; font-size: 16px; font-family: 'Paralucent-Medium', sans-serif; line-height: 1.6; opacity: 0.95;">
                  <strong>📱 Use this ticket number to:</strong><br>
                  • Order food and beverages in the theater<br>
                  • Access premium services during your visit<br>
                  • Quick identification at the venue
                </div>
              </div>
              ` : ''}
              
              <div class="booking-card">
                <div class="booking-header">
                  <div class="booking-icon"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g fill="none"><path fill="#f9c23c" d="M27.81 9H22.7c-.25 0-.46.174-.53.42c-.19.665-.8 1.157-1.51 1.157s-1.32-.481-1.51-1.157a.56.56 0 0 0-.53-.42H4.19C2.98 9 2 10.003 2 11.242v10.516C2 22.997 2.98 24 4.19 24h14.43c.25 0 .46-.174.53-.42c.19-.665.8-1.157 1.51-1.157s1.32.481 1.51 1.157c.07.246.28.42.53.42h5.11c1.21 0 2.19-1.003 2.19-2.242V11.242C30 10.003 29.02 9 27.81 9m-7.15 11.642c-.87 0-1.66-.743-1.66-1.634s.79-1.602 1.66-1.602s1.596.711 1.596 1.602c0 .89-.726 1.634-1.596 1.634m0-5.038c-.87 0-1.648-.727-1.648-1.618c0-.89.778-1.617 1.648-1.617s1.621.727 1.621 1.617c0 .891-.751 1.618-1.621 1.618"/><path fill="#d3883e" d="M10.116 14H5.884C5.395 14 5 13.569 5 13.035s.395-.965.884-.965h4.232c.489 0 .884.431.884.965c0 .545-.395.965-.884.965m-4.532 5h9.842c.313 0 .584-.223.574-.5c0-.277-.26-.5-.584-.5H5.584c-.323 0-.584.223-.584.5s.26.5.584.5m0 2h9.842c.313 0 .584-.232.574-.5c0-.277-.26-.5-.584-.5H5.584c-.323 0-.584.223-.584.5s.26.5.584.5m19.155-4h2.522c.41 0 .739.33.739.739v2.522c0 .41-.33.739-.739.739H24.74a.737.737 0 0 1-.739-.739V17.74c0-.41.33-.739.739-.739"/></g></svg></div>
                  <div class="booking-title">Booking Details</div>
                </div>
                
                <div class="detail-grid">
                  <div class="detail-item">
                    <div class="detail-label">Customer Name</div>
                    <div class="detail-value">${bookingData.name}</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-label">Theater Venue</div>
                    <div class="detail-value">${bookingData.theaterName}</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-label">Number of People</div>
                    <div class="detail-value">${bookingData.numberOfPeople || 2} Guests</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-label">Booking Date</div>
                    <div class="detail-value">${bookingData.date}</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-label">Show Time</div>
                    <div class="detail-value">${bookingData.time}</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-label">Special Occasion</div>
                    <div class="detail-value">${bookingData.occasion}</div>
                  </div>
                  ${(bookingData as any).birthdayName ? `
                  <div class="detail-item">
                    <div class="detail-label">Birthday Person</div>
                    <div class="detail-value">${(bookingData as any).birthdayName}</div>
                  </div>
                  ` : ''}
                  ${(bookingData as any).partner1Name ? `
                  <div class="detail-item">
                    <div class="detail-label">Partner 1</div>
                    <div class="detail-value">${(bookingData as any).partner1Name}</div>
                  </div>
                  ` : ''}
                  ${(bookingData as any).partner2Name ? `
                  <div class="detail-item">
                    <div class="detail-label">Partner 2</div>
                    <div class="detail-value">${(bookingData as any).partner2Name}</div>
                  </div>
                  ` : ''}
                  ${(bookingData as any).proposerName ? `
                  <div class="detail-item">
                    <div class="detail-label">Proposer</div>
                    <div class="detail-value">${(bookingData as any).proposerName}</div>
                  </div>
                  ` : ''}
                  ${(bookingData as any).proposalPartnerName ? `
                  <div class="detail-item">
                    <div class="detail-label">Proposal Partner</div>
                    <div class="detail-value">${(bookingData as any).proposalPartnerName}</div>
                  </div>
                  ` : ''}
                  ${(bookingData as any).valentineName ? `
                  <div class="detail-item">
                    <div class="detail-label">Valentine</div>
                    <div class="detail-value">${(bookingData as any).valentineName}</div>
                  </div>
                  ` : ''}
                  ${(bookingData as any).dateNightName ? `
                  <div class="detail-item">
                    <div class="detail-label">Date Night Person</div>
                    <div class="detail-value">${(bookingData as any).dateNightName}</div>
                  </div>
                  ` : ''}
                </div>
              </div>
              ${renderOccasionDetails(bookingData)}
              
              <div class="cta-section">
                <div style="text-align: center; margin-bottom: 20px; padding: 15px; background: #e8f5e8; border-radius: 10px; border-left: 4px solid #28a745;">
                  <p style="color: #155724; font-size: 16px; margin: 0; font-family: 'Paralucent-Medium', sans-serif;">
                    <strong>📎 Invoice Attached!</strong><br>
                    Your booking invoice PDF is attached to this email. You can also view and download it using the button below.
                  </p>
                </div>
                
                <a href="${siteUrl}/theater?cancelBookingId=${bookingData.id}&email=${encodeURIComponent(bookingData.email)}" class="cta-button cancel-button">Cancel Booking</a>
              </div>
              
              <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 15px;">
                <p style="color: #666; font-size: 16px; margin: 0; font-family: 'Paralucent-Medium', sans-serif;">
                  <strong>🎯 Pro Tip:</strong> Arrive 15 minutes early for the best experience. 
                  Our team will ensure everything is perfectly set up for your special occasion!
                </p>
              </div>
              
              <!-- Animated Images Section -->
              <div class="animated-images">
                <div class="image-stage">
                  <img id="image1" class="animated-image" src="https://res.cloudinary.com/dr8razrcd/image/upload/v1758319404/Mackup1_svsg64.png"
                       alt="Premium Theater Experience" loading="lazy" decoding="async" />
                  <img id="image2" class="animated-image" src="https://res.cloudinary.com/dr8razrcd/image/upload/v1758319383/Mackup2_lheb7l.png"
                       alt="Luxury Cinema Amenities" loading="lazy" decoding="async" />
                </div>
              </div>
              
              <script>
                // Image fade animation
                let currentImage = 1;
                const image1 = document.getElementById('image1');
                const image2 = document.getElementById('image2');
                
                function fadeImages() {
                  if (currentImage === 1) {
                    image1.style.opacity = '0';
                    image2.style.opacity = '1';
                    currentImage = 2;
                  } else {
                    image1.style.opacity = '1';
                    image2.style.opacity = '0';
                    currentImage = 1;
                  }
                }
                
                // Start animation after page load
                setTimeout(() => {
                  setInterval(fadeImages, 5000); // Fade every 5 seconds
                }, 1000);
              </script>
            </div>
            
            <div class="footer">
              <div class="footer-logo">FeelME Town</div>
              <div class="footer-tagline">Creating Unforgettable Memories</div>
              
              <div class="social-links">

                <a href="#" title="Facebook"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95"/></svg></a>
                <a href="#" title="Instagram"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4zm9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8A1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5a5 5 0 0 1-5 5a5 5 0 0 1-5-5a5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3a3 3 0 0 0 3 3a3 3 0 0 0 3-3a3 3 0 0 0-3-3"/></svg></a>
                <a href="#" title="YouTube"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="m10 15l5.19-3L10 9zm11.56-7.83c.13.47.22 1.1.28 1.9c.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83c-.25.9-.83 1.48-1.73 1.73c-.47.13-1.33.22-2.65.28c-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44c-.9-.25-1.48-.83-1.73-1.73c-.13-.47-.22-1.1-.28-1.9c-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83c.25-.9.83-1.48 1.73-1.73c.47-.13 1.33-.22 2.65-.28c1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44c.9.25 1.48.83 1.73 1.73"/></svg></a>
                <a href="#" title="Twitter"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 512 512"><path fill="currentColor" d="M389.2 48h70.6L305.6 224.2L487 464H345L233.7 318.6L106.5 464H35.8l164.9-188.5L26.8 48h145.6l100.5 132.9zm-24.8 373.8h39.1L151.1 88h-42z"/></svg></a>
          </div>
          
              <div class="footer-bottom">
                <p>© ${CURRENT_YEAR} FeelME Town. All rights reserved.</p>
                <p>Premium Entertainment • Luxury Experience • Unforgettable Moments</p>
                <p>Designed and Developed by <a href="https://www.cybershoora.com/" target="_blank" rel="noopener noreferrer"><span style="font-weight: 600; color: #ffffff;">CYBERSHOORA</span></a></p>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  // Booking interrupted/incomplete
  // Email-safe version - Compatible with all email clients
  bookingIncomplete: (bookingData: Partial<BookingData> & {
    email?: string;
    bookingId?: string;
    selectedCakes?: Array<{ id: string; name: string; price: number; quantity: number }>;
    selectedDecorItems?: Array<{ id: string; name: string; price: number; quantity: number }>;
    selectedGifts?: Array<{ id: string; name: string; price: number; quantity: number }>
  }, siteUrl: string) => ({
    subject: 'Complete Your Booking - FeelME Town - Don\'t Miss Out!',
    html: `
     <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Complete Your Booking - FeelME Town</title>
      <!--[if mso]>
      <style type="text/css">
        body, table, td {font-family: Arial, sans-serif !important;}
      </style>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background-color: #667eea; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased;">
      
      <!-- Wrapper Table -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #667eea; padding: 40px 0;">
        <tr>
          <td align="center">
            
            <!-- Main Container -->
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 20px; overflow: hidden; max-width: 600px;">
              
              <!-- Header -->
              <tr>
                <td style="background-color: #1a1a2e; padding: 50px 30px; text-align: center;">
                  <img src="https://res.cloudinary.com/dxeih5yjj/image/upload/v1761909846/logo_ucslk6.svg" 
                       alt="FeelME Town" 
                       width="120" 
                       style="display: block; margin: 0 auto 20px; max-width: 120px; height: auto;">
                  <h1 style="color: #ffffff; font-size: 36px; font-weight: bold; margin: 0 0 15px 0; font-family: Arial, sans-serif;">FeelME Town</h1>
                  <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 0; font-family: Arial, sans-serif;">Premium Entertainment Experience</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  
                  <!-- Urgent Badge -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" style="padding-bottom: 30px;">
                        <table cellpadding="0" cellspacing="0" border="0" style="background-color: #ff4757; border-radius: 25px;">
                          <tr>
                            <td style="padding: 10px 25px;">
                              <p style="color: #ffffff; font-size: 14px; font-weight: bold; margin: 0; font-family: Arial, sans-serif;">⚠️ Booking Incomplete</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Greeting -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" style="padding-bottom: 30px;">
                        <h2 style="color: #1a1a2e; font-size: 28px; font-weight: bold; margin: 0 0 15px 0; font-family: Arial, sans-serif;">Don't Miss Out, ${bookingData.name || 'Valued Customer'}! 🎯</h2>
                        <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0; font-family: Arial, sans-serif;">We noticed you started booking your special occasion but didn't complete it. Let's finish what we started!</p>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Booking ID -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f9fa; border: 2px solid #dee2e6; border-radius: 15px; margin-bottom: 30px;">
                    <tr>
                      <td align="center" style="padding: 20px;">
                        <p style="color: #495057; font-size: 12px; font-weight: bold; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px; font-family: Arial, sans-serif;">Incomplete Booking Reference</p>
                        <p style="color: #1a1a2e; font-size: 24px; font-weight: bold; margin: 0; letter-spacing: 1px; font-family: Arial, sans-serif;">${bookingData.bookingId || 'INC-XXXX'}</p>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Limited Offer -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fff3cd; border: 2px solid #ffc107; border-radius: 20px; margin-bottom: 30px;">
                    <tr>
                      <td align="center" style="padding: 35px 25px;">
                        <p style="font-size: 48px; margin: 0 0 15px 0;">🎁</p>
                        <h3 style="color: #856404; font-size: 26px; font-weight: bold; margin: 0 0 10px 0; font-family: Arial, sans-serif;">Limited Time Exclusive Offer!</h3>
                        <p style="color: #856404; font-size: 16px; font-weight: 600; margin: 0 0 15px 0; font-family: Arial, sans-serif;">Complete your booking within 24 hours and get</p>
                        <table cellpadding="0" cellspacing="0" border="0" style="background-color: #ff4757; border-radius: 25px; margin: 0 auto 15px;">
                          <tr>
                            <td style="padding: 12px 30px;">
                              <p style="color: #ffffff; font-size: 28px; font-weight: bold; margin: 0; font-family: Arial, sans-serif;">20% OFF</p>
                            </td>
                          </tr>
                        </table>
                        <p style="color: #856404; font-size: 16px; font-weight: 600; margin: 0; font-family: Arial, sans-serif;">on your total bill + Free Popcorn & Drinks!</p>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Countdown -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ff4757; border-radius: 20px; margin-bottom: 30px;">
                    <tr>
                      <td align="center" style="padding: 25px;">
                        <p style="color: #ffffff; font-size: 16px; font-weight: 600; margin: 0 0 15px 0; font-family: Arial, sans-serif;">⏰ This exclusive offer expires in:</p>
                        <p style="color: #ffffff; font-size: 32px; font-weight: bold; margin: 0; font-family: 'Courier New', monospace;">23:59:59</p>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Booking Details -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px;">
                    <tr>
                      <td>
                        <h3 style="color: #1a1a2e; font-size: 22px; font-weight: bold; margin: 0 0 20px 0; font-family: Arial, sans-serif;">🎟️ Booking Details</h3>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Details Grid -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px;">
                    <tr>
                      <td width="50%" style="padding: 0 5px 10px 0;" valign="top">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 12px;">
                          <tr>
                            <td style="padding: 20px;">
                              <table cellpadding="0" cellspacing="0" border="0" style="background-color: #ff4757; border-radius: 25px; margin-bottom: 10px;">
                                <tr>
                                  <td style="padding: 6px 16px;">
                                    <p style="color: #ffffff; font-size: 12px; font-weight: bold; margin: 0; font-family: Arial, sans-serif;">Customer Name</p>
                                  </td>
                                </tr>
                              </table>
                              <p style="color: #ff4757; font-size: 20px; font-weight: bold; margin: 0; font-family: Arial, sans-serif;">${bookingData.name || 'Not provided'}</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td width="50%" style="padding: 0 0 10px 5px;" valign="top">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 12px;">
                          <tr>
                            <td style="padding: 20px;">
                              <table cellpadding="0" cellspacing="0" border="0" style="background-color: #ff4757; border-radius: 25px; margin-bottom: 10px;">
                                <tr>
                                  <td style="padding: 6px 16px;">
                                    <p style="color: #ffffff; font-size: 12px; font-weight: bold; margin: 0; font-family: Arial, sans-serif;">Number of People</p>
                                  </td>
                                </tr>
                              </table>
                              <p style="color: #ff4757; font-size: 20px; font-weight: bold; margin: 0; font-family: Arial, sans-serif;">${bookingData.numberOfPeople || 2} Guests</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td width="50%" style="padding: 0 5px 10px 0;" valign="top">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 12px;">
                          <tr>
                            <td style="padding: 20px;">
                              <table cellpadding="0" cellspacing="0" border="0" style="background-color: #ff4757; border-radius: 25px; margin-bottom: 10px;">
                                <tr>
                                  <td style="padding: 6px 16px;">
                                    <p style="color: #ffffff; font-size: 12px; font-weight: bold; margin: 0; font-family: Arial, sans-serif;">Theater Venue</p>
                                  </td>
                                </tr>
                              </table>
                              <p style="color: #ff4757; font-size: 20px; font-weight: bold; margin: 0; font-family: Arial, sans-serif;">${bookingData.theaterName || 'Premium Theater'}</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td width="50%" style="padding: 0 0 10px 5px;" valign="top">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 12px;">
                          <tr>
                            <td style="padding: 20px;">
                              <table cellpadding="0" cellspacing="0" border="0" style="background-color: #ff4757; border-radius: 25px; margin-bottom: 10px;">
                                <tr>
                                  <td style="padding: 6px 16px;">
                                    <p style="color: #ffffff; font-size: 12px; font-weight: bold; margin: 0; font-family: Arial, sans-serif;">Booking Date</p>
                                  </td>
                                </tr>
                              </table>
                              <p style="color: #ff4757; font-size: 20px; font-weight: bold; margin: 0; font-family: Arial, sans-serif;">${bookingData.date || 'Select Date'}</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td width="50%" style="padding: 0 5px 10px 0;" valign="top">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 12px;">
                          <tr>
                            <td style="padding: 20px;">
                              <table cellpadding="0" cellspacing="0" border="0" style="background-color: #ff4757; border-radius: 25px; margin-bottom: 10px;">
                                <tr>
                                  <td style="padding: 6px 16px;">
                                    <p style="color: #ffffff; font-size: 12px; font-weight: bold; margin: 0; font-family: Arial, sans-serif;">Show Time</p>
                                  </td>
                                </tr>
                              </table>
                              <p style="color: #ff4757; font-size: 20px; font-weight: bold; margin: 0; font-family: Arial, sans-serif;">${bookingData.time || 'Select Time'}</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td width="50%" style="padding: 0 0 10px 5px;" valign="top">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 12px;">
                          <tr>
                            <td style="padding: 20px;">
                              <table cellpadding="0" cellspacing="0" border="0" style="background-color: #ff4757; border-radius: 25px; margin-bottom: 10px;">
                                <tr>
                                  <td style="padding: 6px 16px;">
                                    <p style="color: #ffffff; font-size: 12px; font-weight: bold; margin: 0; font-family: Arial, sans-serif;">Special Occasion</p>
                                  </td>
                                </tr>
                              </table>
                              <p style="color: #ff4757; font-size: 20px; font-weight: bold; margin: 0; font-family: Arial, sans-serif;">${bookingData.occasion || 'Not specified'}</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Pricing Section -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f9fa; border: 2px solid #dee2e6; border-radius: 20px; margin-bottom: 30px;">
                    <tr>
                      <td style="padding: 30px;">
                        <h3 style="color: #495057; font-size: 22px; font-weight: bold; margin: 0 0 20px 0; font-family: Arial, sans-serif;">💰 Pricing Breakdown</h3>
                        
                        <!-- Base Price -->
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-left: 4px solid #667eea; border-radius: 12px; margin-bottom: 12px;">
                          <tr>
                            <td style="padding: 15px 20px;">
                              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                  <td style="color: #495057; font-size: 15px; font-weight: 600; font-family: Arial, sans-serif;">Theater Base Price</td>
                                  <td align="right" style="color: #495057; font-size: 15px; font-weight: bold; font-family: Arial, sans-serif;">₹1,399</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                        
                  ${(bookingData.numberOfPeople || 2) > 2 ? `
                        <!-- Extra Guests -->
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-left: 4px solid #667eea; border-radius: 12px; margin-bottom: 12px;">
                          <tr>
                            <td style="padding: 15px 20px;">
                              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                  <td style="color: #495057; font-size: 15px; font-weight: 600; font-family: Arial, sans-serif;">Extra Guests (${(bookingData.numberOfPeople || 2) - 2} × ₹400)</td>
                                  <td align="right" style="color: #495057; font-size: 15px; font-weight: bold; font-family: Arial, sans-serif;">₹${((bookingData.numberOfPeople || 2) - 2) * 400}</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                  ` : ''}
                        
                  ${bookingData.selectedCakes && bookingData.selectedCakes.length > 0 ? `
                        <!-- Cakes -->
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-left: 4px solid #667eea; border-radius: 12px; margin-bottom: 12px;">
                          <tr>
                            <td style="padding: 15px 20px;">
                              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                  <td style="color: #495057; font-size: 15px; font-weight: 600; font-family: Arial, sans-serif;">Cakes (${bookingData.selectedCakes.length})</td>
                                  <td align="right" style="color: #495057; font-size: 15px; font-weight: bold; font-family: Arial, sans-serif;">₹${bookingData.selectedCakes.reduce((sum, cake) => sum + (cake.price * cake.quantity), 0)}</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                  ` : ''}
                        
                        <!-- Total -->
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #d4edda; border-left: 4px solid #28a745; border-radius: 12px; margin-bottom: 12px;">
                          <tr>
                            <td style="padding: 15px 20px;">
                              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                  <td style="color: #495057; font-size: 15px; font-weight: bold; font-family: Arial, sans-serif;">Total Amount</td>
                                  <td align="right" style="color: #495057; font-size: 15px; font-weight: bold; font-family: Arial, sans-serif;">₹${bookingData.totalAmount || (1399 + ((bookingData.numberOfPeople || 2) > 2 ? ((bookingData.numberOfPeople || 2) - 2) * 400 : 0))}</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Discount -->
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 12px; margin-bottom: 12px;">
                          <tr>
                            <td style="padding: 15px 20px;">
                              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                  <td style="color: #495057; font-size: 15px; font-weight: bold; font-family: Arial, sans-serif;">20% Discount (Limited Time)</td>
                                  <td align="right" style="color: #495057; font-size: 15px; font-weight: bold; font-family: Arial, sans-serif;">-₹${Math.round(((bookingData.totalAmount || (1399 + ((bookingData.numberOfPeople || 2) > 2 ? ((bookingData.numberOfPeople || 2) - 2) * 400 : 0))) * 0.2))}</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Final Amount -->
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8d7da; border-left: 4px solid #dc3545; border-radius: 12px;">
                          <tr>
                            <td style="padding: 15px 20px;">
                              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                  <td style="color: #dc3545; font-size: 17px; font-weight: bold; font-family: Arial, sans-serif;">Final Amount (After Discount)</td>
                                  <td align="right" style="color: #dc3545; font-size: 20px; font-weight: bold; font-family: Arial, sans-serif;">₹${Math.round(((bookingData.totalAmount || (1399 + ((bookingData.numberOfPeople || 2) > 2 ? ((bookingData.numberOfPeople || 2) - 2) * 400 : 0))) * 0.8))}</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Total Amount -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #28a745; border-radius: 20px; margin-bottom: 30px;">
                    <tr>
                      <td align="center" style="padding: 30px;">
                        <p style="color: #ffffff; font-size: 16px; font-weight: bold; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px; font-family: Arial, sans-serif;">Total Amount (After 20% Discount)</p>
                        <p style="color: #ffffff; font-size: 36px; font-weight: bold; margin: 0; letter-spacing: 2px; font-family: Arial, sans-serif;">₹${Math.round(((bookingData.totalAmount || (1399 + ((bookingData.numberOfPeople || 2) > 2 ? ((bookingData.numberOfPeople || 2) - 2) * 400 : 0))) * 0.8))}</p>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" style="padding: 20px 0 30px;">
                        <table cellpadding="0" cellspacing="0" border="0" style="background-color: #667eea; border-radius: 50px;">
                          <tr>
                            <td style="padding: 18px 45px;">
                              <a href="${siteUrl}/theater?bookingId=${bookingData.bookingId || 'incomplete'}&email=${encodeURIComponent(bookingData.email || '')}" 
                                 style="color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; font-family: Arial, sans-serif;">Complete Booking Now & Save 20%</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Pro Tip -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f9fa; border-radius: 15px;">
                    <tr>
                      <td style="padding: 20px;">
                        <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0; text-align: center; font-family: Arial, sans-serif;">
                          <strong>🎯 Pro Tip:</strong> This exclusive 20% discount is only available for the next 24 hours! Don't miss out on premium entertainment at an unbeatable price.
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #1a1a2e; padding: 40px 30px; text-align: center;">
                  <h3 style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 0 0 15px 0; font-family: Arial, sans-serif;">FeelME Town</h3>
                  <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 30px 0; font-family: Arial, sans-serif;">Creating Unforgettable Memories</p>
                  
                   <div class="social-links">

                <a href="#" title="Facebook"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95"/></svg></a>
                <a href="#" title="Instagram"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4zm9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8A1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5a5 5 0 0 1-5 5a5 5 0 0 1-5-5a5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3a3 3 0 0 0 3 3a3 3 0 0 0 3-3a3 3 0 0 0-3-3"/></svg></a>
                <a href="#" title="YouTube"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="m10 15l5.19-3L10 9zm11.56-7.83c.13.47.22 1.1.28 1.9c.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83c-.25.9-.83 1.48-1.73 1.73c-.47.13-1.33.22-2.65.28c-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44c-.9-.25-1.48-.83-1.73-1.73c-.13-.47-.22-1.1-.28-1.9c-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83c.25-.9.83-1.48 1.73-1.73c.47-.13 1.33-.22 2.65-.28c1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44c.9.25 1.48.83 1.73 1.73"/></svg></a>
                <a href="#" title="Twitter"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 512 512"><path fill="currentColor" d="M389.2 48h70.6L305.6 224.2L487 464H345L233.7 318.6L106.5 464H35.8l164.9-188.5L26.8 48h145.6l100.5 132.9zm-24.8 373.8h39.1L151.1 88h-42z"/></svg></a>
            </div>
            
                  <!-- Footer Bottom -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <tr>
                      <td align="center">
                        <p style="color: rgba(255,255,255,0.6); font-size: 12px; line-height: 1.6; margin: 0; font-family: Arial, sans-serif;">
                          © ${CURRENT_YEAR} FeelME Town. All rights reserved.<br>
                          Premium Entertainment • Luxury Experience • Unforgettable Moments<br>
                          Designed and Developed by <a href="https://www.cybershoora.com/" style="color: #ffffff; font-weight: bold; text-decoration: none;">CYBERSHOORA</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
            </table>
            
          </td>
        </tr>
      </table>
      
      </body>
      </html>
    `
  })
};

// Send email function
const sendEmail = async (to: string, subject: string, html: string, attachments?: any[]) => {
  try {
    const settings = await getSettingsOrDefault();

    if (!settings.enableEmailNotifications) {
      console.log('📧 Email notifications are disabled in settings');
      return { success: false, error: 'Email notifications disabled' };
    }

    const transporter = await createTransporter();

    const result = await transporter.sendMail({
      from: settings.emailUser || 'noreply@feelme-town.com',
      to,
      subject,
      html,
      attachments: attachments || []
    });

    console.log('✅ Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return { success: false, error: String(error) };
  }
};

// Email service functions
const emailService = {
  // Send support mail to Cybershoora
  sendSupportToCybershoora: async ({ subject, message, from }: { subject: string; message: string; from?: string }) => {
    const safeSubject = (subject || 'Support Mail from Administrator').toString().trim();
    const safeMessage = (message || '').toString().trim();

    if (!safeMessage) {
      return { success: false, error: 'Message is required' };
    }

    const customTemplate = {
      subject: safeSubject,
      html: `
        <div style="font-family: Arial, sans-serif; background:#0b0b0b; color:#fff; padding:20px;">
          <h2 style="margin-top:0;">Support Mail</h2>
          <p style="color:#bbb;">This message was sent from Administrator Support Mail page${from ? ` by <strong>${String(from).trim()}</strong>` : ''}.</p>
          <div style="background:#141414; padding:16px; border-radius:8px; border:1px solid #222;">
            <div style="margin-bottom:8px; color:#eee;"><strong>Subject:</strong> ${safeSubject}</div>
            <div style="white-space:pre-wrap; line-height:1.6; color:#ddd;">${safeMessage}</div>
          </div>
          <div style="margin-top:16px; font-size:12px; color:#888;">
            <a href="https://www.cybershoora.com/" target="_blank" rel="noopener noreferrer" style="color:#E50914; text-decoration:none;">Visit Cybershoora</a>
          </div>
        </div>
      `
    };

    // Use custom template to send to team Cybershoora
    return await sendEmail('teamcybershoora@gmail.com', customTemplate.subject, customTemplate.html);
  },
  sendOrderReceivedNotification: async (bookingData: BookingData & { trackUrl?: string }) => {
    if (!bookingData?.email) {
      return { success: false, error: 'No email provided' };
    }
    const siteUrl = await getSiteUrl();
    const trackUrl = bookingData.trackUrl || `${siteUrl}/order-items?ticket=${encodeURIComponent(bookingData.ticketNumber || '')}`;
    const etaSentence = describePrepEta(bookingData);
    const html = buildOrderStatusEmail(bookingData, {
      title: 'Your order is Received 🍿',
      message:
        `We just received your food order for your FeelME Town experience.${etaSentence} Sit back and relax — once the order is ready, our team will notify you. You can track the status anytime using the button below.`,
      ctaLabel: 'Track your order',
      trackUrl,
      badge: 'ORDER RECEIVED',
    });
    return sendEmail(bookingData.email, 'We have received your food order – FeelME Town', html);
  },
  sendOrderReadyNotification: async (bookingData: BookingData & { trackUrl?: string }) => {
    if (!bookingData?.email) {
      return { success: false, error: 'No email provided' };
    }
    const siteUrl = await getSiteUrl();
    const trackUrl = bookingData.trackUrl || `${siteUrl}/order-items?ticket=${encodeURIComponent(bookingData.ticketNumber || '')}`;
    const etaSentence = describePrepEta(bookingData);
    const html = buildOrderStatusEmail(bookingData, {
      title: 'Your order is Ready 🍽️',
      message:
        `Your food order is now ready to be served.${etaSentence} Our team will bring it to you shortly. If you need anything else, feel free to reach out. Enjoy your private theatre experience!`,
      ctaLabel: 'Track order status',
      trackUrl,
      badge: 'ORDER READY',
    });
    return sendEmail(bookingData.email, 'Your order is ready – FeelME Town', html);
  },

  sendOrderCancelledNotification: async (
    bookingData: BookingData & { trackUrl?: string; cancelReason?: string; cancelNotes?: string },
  ) => {
    if (!bookingData?.email) {
      return { success: false, error: 'No email provided' };
    }
    const siteUrl = await getSiteUrl();
    const trackUrl =
      bookingData.trackUrl || `${siteUrl}/order-items?ticket=${encodeURIComponent(bookingData.ticketNumber || '')}`;
    const html = buildOrderCancelledEmail(bookingData, { trackUrl });
    return sendEmail(bookingData.email, 'Your order is cancelled – FeelME Town', html);
  },

  sendOrderItemCancelledNotification: async (
    bookingData: BookingData & { trackUrl?: string; cancelReason?: string; cancelNotes?: string; cancelledItemName?: string; cancelledItemNames?: string[] },
  ) => {
    if (!bookingData?.email) {
      return { success: false, error: 'No email provided' };
    }
    const siteUrl = await getSiteUrl();
    const trackUrl =
      bookingData.trackUrl || `${siteUrl}/order-items?ticket=${encodeURIComponent(bookingData.ticketNumber || '')}`;
    const html = buildOrderItemCancelledEmail(bookingData, { trackUrl });
    return sendEmail(bookingData.email, 'Item cancelled from your order – FeelME Town', html);
  },
  // Send invoice ready email
  sendBookingInvoiceReady: async (
    bookingData: BookingData & { invoiceDriveUrl?: string },
    options: { attachment?: { filename: string; content: Buffer } } = {},
  ) => {
    if (!bookingData.email) {
      return { success: false, error: 'No email provided' };
    }
    const bookingId = bookingData.id || (bookingData as any).bookingId || '';
    const hasCloudInvoice = Boolean(bookingData.invoiceDriveUrl);

    let invoicePageUrl: string | null = null;
    let invoiceDownloadUrl: string | null = null;
    if (hasCloudInvoice && bookingId) {
      try {
        const siteUrl = await getSiteUrl();
        invoicePageUrl = `${siteUrl}/invoice/${encodeURIComponent(bookingId)}`;
        invoiceDownloadUrl = `${invoicePageUrl}?download=1`;
      } catch (error) {
        console.warn('⚠️ [email] Failed to resolve site URL for invoice page link:', error);
      }
    }

    const subject = 'Your Invoice Is Ready - FeelME Town 🧾';

    const template = {
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice Ready - FeelME Town</title>
          <style>
            body { margin:0; padding:0; background:#0b0b0b; color:#fff; font-family: Arial, sans-serif; }
            .container { max-width:650px; margin:0 auto; background:#141414; border-radius:20px; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,0.35); }
            .header { background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%); padding:40px 24px; text-align:center; }
            .title { font-size:28px; font-weight:800; color:#ffffff; }
            .content { padding:28px; }
            .cta { display:inline-block; margin-top:16px; background:#E50914; color:#fff !important; padding:12px 18px; border-radius:10px; text-decoration:none; font-weight:700; }
            .card { background:#0f0f0f; border:1px solid #1f1f1f; border-radius:16px; padding:20px; margin:12px 0; }
            .label { color:#bbb; font-size:12px; text-transform:uppercase; }
            .value { color:#fff; font-size:16px; font-weight:600; margin-top:6px; }
            .footer { text-align:center; color:#aaa; font-size:12px; padding:20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="title">Your invoice is ready</div>
              <div style="color:#bbb; margin-top:6px;">Hi ${bookingData.name || 'Customer'}, your invoice is ready. You can view it online and download it anytime.</div>
            </div>
            <div class="content">
              <div class="card">
                <div class="label">Booking Reference</div>
                <div class="value">${bookingData.id}</div>
              </div>
              <div style="margin-top:16px; font-size:13px; color:#d1d5db; line-height:1.6;">
                Your invoice is ready. You can view it online and download it anytime for your records.
              </div>
              ${invoicePageUrl ? `
                <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:18px;">
                  <a class="cta" href="${invoicePageUrl}" target="_blank" rel="noopener noreferrer">View invoice</a>
                  ${invoiceDownloadUrl ? `<a class="cta" href="${invoiceDownloadUrl}" target="_blank" rel="noopener noreferrer" style="background:#111827; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.2);">Download invoice</a>` : ''}
                </div>
              ` : ''}
            </div>
            <div class="footer">&copy; ${CURRENT_YEAR} FeelME Town • Delhi, India • feelmetown@gmail.com<br/>Thank you for visiting — see you again soon!</div>
          </div>
        </body>
      </html>
    `
    };

    // Disable PDF attachments for invoice delivery. We send View/Download links only.
    // (Keep signature compatible: callers may still pass options.attachment.)
    return sendEmail(bookingData.email, template.subject, template.html, undefined);
  },

  sendBookingInvoice: async (
    bookingData: BookingData & { invoiceDriveUrl?: string },
    options: { attachment?: { filename: string; content: Buffer } } = {},
  ) => {
    if (!bookingData.email) {
      return { success: false, error: 'No email provided' };
    }

    const bookingId = bookingData.id || (bookingData as any).bookingId || '';
    const hasCloudInvoice = Boolean(bookingData.invoiceDriveUrl);

    let invoicePageUrl: string | null = null;
    let invoiceDownloadUrl: string | null = null;
    if (bookingId) {
      try {
        const siteUrl = await getSiteUrl();
        invoicePageUrl = `${siteUrl}/invoice/${encodeURIComponent(bookingId)}`;
        if (hasCloudInvoice) {
          invoiceDownloadUrl = `${invoicePageUrl}?download=1`;
        }
      } catch (error) {
        console.warn('⚠️ [email] Failed to resolve site URL for invoice page link:', error);
      }
    }

    const template = {
      subject: 'This is your invoice - FeelME Town 🧾',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice - FeelME Town</title>
          <style>
            body { margin:0; padding:0; background:#0b0b0b; color:#fff; font-family: Arial, sans-serif; }
            .container { max-width:650px; margin:0 auto; background:#141414; border-radius:20px; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,0.35); }
            .header { background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%); padding:40px 24px; text-align:center; }
            .title { font-size:28px; font-weight:800; color:#ffffff; }
            .content { padding:28px; }
            .cta { display:inline-block; margin-top:16px; background:#E50914; color:#fff !important; padding:12px 18px; border-radius:10px; text-decoration:none; font-weight:700; }
            .card { background:#0f0f0f; border:1px solid #1f1f1f; border-radius:16px; padding:20px; margin:12px 0; }
            .label { color:#bbb; font-size:12px; text-transform:uppercase; }
            .value { color:#fff; font-size:16px; font-weight:600; margin-top:6px; }
            .footer { text-align:center; color:#aaa; font-size:12px; padding:20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="title">Here is your invoice</div>
              <div style="color:#bbb; margin-top:6px;">Hi ${bookingData.name || 'Customer'}, you can view your invoice online and download it anytime.</div>
            </div>
            <div class="content">
              <div class="card">
                <div class="label">Booking Reference</div>
                <div class="value">${bookingData.id}</div>
              </div>
              <div style="margin-top:16px; font-size:13px; color:#d1d5db; line-height:1.6;">
                Your invoice is available for your records.
              </div>
              ${invoicePageUrl ? `
                <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:18px;">
                  <a class="cta" href="${invoicePageUrl}" target="_blank" rel="noopener noreferrer">View invoice</a>
                  ${invoiceDownloadUrl ? `<a class="cta" href="${invoiceDownloadUrl}" target="_blank" rel="noopener noreferrer" style="background:#111827; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.2);">Download invoice</a>` : ''}
                </div>
              ` : ''}
            </div>
            <div class="footer">&copy; ${CURRENT_YEAR} FeelME Town • Delhi, India • feelmetown@gmail.com</div>
          </div>
        </body>
      </html>
    `
    };

    // Disable PDF attachments for invoice delivery. We send View/Download links only.
    // (Keep signature compatible: callers may still pass options.attachment.)
    return sendEmail(bookingData.email, template.subject, template.html, undefined);
  },

  sendBookingFinalInvoice: async (
    bookingData: BookingData & { invoiceDriveUrl?: string },
    options: { attachment?: { filename: string; content: Buffer } } = {},
  ) => {
    if (!bookingData.email) {
      return { success: false, error: 'No email provided' };
    }

    const bookingId = bookingData.id || (bookingData as any).bookingId || '';

    let invoicePageUrl: string | null = null;
    let invoiceDownloadUrl: string | null = null;
    if (bookingId) {
      try {
        const siteUrl = await getSiteUrl();
        invoicePageUrl = `${siteUrl}/invoice/${encodeURIComponent(bookingId)}`;
        invoiceDownloadUrl = `${invoicePageUrl}?download=1`;
      } catch (error) {
        console.warn('⚠️ [email] Failed to resolve site URL for invoice page link:', error);
      }
    }

    const template = {
      subject: 'Your Booking is Completed – Final Invoice 🧾',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Final Invoice - FeelME Town</title>
          <style>
            body { margin:0; padding:0; background:#0b0b0b; color:#fff; font-family: Arial, sans-serif; }
            .container { max-width:650px; margin:0 auto; background:#141414; border-radius:20px; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,0.35); }
            .header { background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%); padding:40px 24px; text-align:center; }
            .title { font-size:28px; font-weight:800; color:#ffffff; }
            .content { padding:28px; }
            .cta { display:inline-block; margin-top:16px; background:#E50914; color:#fff !important; padding:12px 18px; border-radius:10px; text-decoration:none; font-weight:700; }
            .card { background:#0f0f0f; border:1px solid #1f1f1f; border-radius:16px; padding:20px; margin:12px 0; }
            .label { color:#bbb; font-size:12px; text-transform:uppercase; }
            .value { color:#fff; font-size:16px; font-weight:600; margin-top:6px; }
            .footer { text-align:center; color:#aaa; font-size:12px; padding:20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="title">Your booking is completed!</div>
              <div style="color:#bbb; margin-top:6px;">Hi ${bookingData.name || 'Customer'}, this is your final invoice for your booking. Thank you for visiting FeelME Town — we hope to host you again soon.</div>
            </div>
            <div class="content">
              <div class="card">
                <div class="label">Booking Reference</div>
                <div class="value">${bookingData.id}</div>
              </div>
              <div style="margin-top:16px; font-size:13px; color:#d1d5db; line-height:1.6;">
                You can view it online and download it anytime for your records.
              </div>
              ${invoicePageUrl ? `
                <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:18px;">
                  <a class="cta" href="${invoicePageUrl}" target="_blank" rel="noopener noreferrer">View invoice</a>
                  ${invoiceDownloadUrl ? `<a class="cta" href="${invoiceDownloadUrl}" target="_blank" rel="noopener noreferrer" style="background:#111827; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.2);">Download invoice</a>` : ''}
                </div>
              ` : ''}
            </div>
            <div class="footer">&copy; ${CURRENT_YEAR} FeelME Town • Delhi, India • feelmetown@gmail.com</div>
          </div>
        </body>
      </html>
    `
    };

    // Disable PDF attachments for invoice delivery. We send View/Download links only.
    // (Keep signature compatible: callers may still pass options.attachment.)
    return sendEmail(bookingData.email, template.subject, template.html, undefined);
  },
  sendBookingConfirmed: async (bookingData: BookingData & { ticketNumber?: string }) => {
    if (!bookingData.email) {
      return { success: false, error: 'No email provided' };
    }
    const siteUrl = await getSiteUrl();
    const buildTemplate = (overrides?: {
      subject?: string;
      pageTitle?: string;
      badgeLabel?: string;
      introLine?: string;
      leadLine?: string;
      showActions?: boolean;
      orderCtaLabel?: string;
    }) => {
      const subject = overrides?.subject ?? 'Booking Confirmed - FeelME Town 🎉';
      const pageTitle = overrides?.pageTitle ?? 'Booking Confirmed - FeelME Town';
      const badgeLabel = overrides?.badgeLabel ?? 'Booking Confirmed';
      const introLine = overrides?.introLine ?? `Hi ${bookingData.name || 'Customer'},`;
      const leadLine = overrides?.leadLine ?? 'Your booking has been confirmed. We are excited to host you!';
      const showActions = overrides?.showActions ?? true;
      const orderCtaLabel = overrides?.orderCtaLabel ?? 'Order Food';

      const toNumber = (value: any) => {
        if (typeof value === 'number') {
          return Number.isFinite(value) ? value : 0;
        }
        if (typeof value === 'string') {
          const parsed = Number(value.replace(/[^0-9.]/g, ''));
          return Number.isFinite(parsed) ? parsed : 0;
        }
        return 0;
      };

      const formatMoney = (value: number) => {
        const v = Math.max(0, Number.isFinite(value) ? value : 0);
        return `₹${Math.round(v).toLocaleString('en-IN')}`;
      };

      const pricing: any = (bookingData as any).pricingData || {};
      const theaterPrice = toNumber(
        (bookingData as any).theaterPrice ??
          pricing.theaterBasePrice ??
          pricing.theaterPrice,
      );
      const decorationFee = toNumber(
        (bookingData as any).decorationAppliedFee ??
          (bookingData as any).decorationFee ??
          pricing.appliedDecorationFee ??
          pricing.decorationFee ??
          pricing.decorationFees,
      );

      const couponDiscount = toNumber(
        (bookingData as any).couponDiscount ??
          (bookingData as any).DiscountByCoupon ??
          (bookingData as any).discountByCoupon ??
          pricing.discountByCoupon,
      );
      const genericDiscount = toNumber(
        (bookingData as any).discount ??
          (bookingData as any).Discount,
      );
      const adminDiscount = toNumber(
        (bookingData as any).adminDiscount ??
          (bookingData as any).specialDiscount,
      );
      const totalDiscount = Math.max(0, couponDiscount + genericDiscount + adminDiscount);

      const totalBeforeDiscount = toNumber(
        (bookingData as any).totalAmountBeforeDiscount ??
          (bookingData as any).amountBeforeDiscount ??
          pricing.totalAmountBeforeDiscount ??
          pricing.amountBeforeDiscount,
      );
      const totalAfterDiscount = toNumber(
        (bookingData as any).totalAmountAfterDiscount ??
          (bookingData as any).totalAmount ??
          (bookingData as any).amount ??
          pricing.totalAmountAfterDiscount ??
          pricing.totalAmount,
      );

      const discountFromTotals =
        totalBeforeDiscount > 0 && totalAfterDiscount > 0
          ? Math.max(totalBeforeDiscount - totalAfterDiscount, 0)
          : 0;

      const effectiveDiscount = Math.max(totalDiscount, discountFromTotals, 0);
      const resolvedTotalBefore = totalBeforeDiscount > 0
        ? totalBeforeDiscount
        : totalAfterDiscount > 0
          ? totalAfterDiscount + effectiveDiscount
          : 0;
      const resolvedTotalAfter = totalAfterDiscount > 0
        ? totalAfterDiscount
        : resolvedTotalBefore > 0
          ? Math.max(resolvedTotalBefore - effectiveDiscount, 0)
          : 0;

      const slotBookingFee = toNumber(
        (bookingData as any).slotBookingFee ??
          pricing.slotBookingFee ??
          (bookingData as any).advancePayment,
      );
      const convenienceFee = toNumber(
        (bookingData as any).convenienceFee ??
          pricing.convenienceFee,
      );
      const extraGuestsCount = toNumber((bookingData as any).extraGuestsCount);
      const extraGuestCharges = toNumber(
        (bookingData as any).extraGuestCharges ??
          (extraGuestsCount > 0
            ? extraGuestsCount * toNumber(pricing.extraGuestFee)
            : 0),
      );

      const payableAmount = toNumber(
        (bookingData as any).advancePayment ??
          (bookingData as any).slotBookingFee ??
          pricing.slotBookingFee,
      );
      const venueAmountRaw = toNumber(
        (bookingData as any).venuePayment ??
          (bookingData as any).venueAmount ??
          (bookingData as any).balanceAmount,
      );
      const venueAmount = venueAmountRaw > 0
        ? venueAmountRaw
        : resolvedTotalAfter > 0
          ? Math.max(resolvedTotalAfter - payableAmount, 0)
          : 0;

      const serviceLabelFromKey = (key: string) => {
        if (key === 'selectedMovies') return 'Movies';
        const name = key.replace(/^selected/, '').replace(/([A-Z])/g, ' $1').trim();
        return name || 'Items';
      };

      const formatMaybeMoney = (value: number, hasValue: boolean) => {
        return hasValue ? formatMoney(value) : '—';
      };

      const itemRows: string[] = [];
      const selectedKeys = Object.keys(bookingData as any).filter((key) => {
        return key.startsWith('selected') && Array.isArray((bookingData as any)[key]);
      });
      selectedKeys.forEach((key) => {
        const arr = (bookingData as any)[key];
        const serviceLabel = serviceLabelFromKey(key);
        (arr as any[]).forEach((entry) => {
          if (!entry) return;

          if (typeof entry === 'string') {
            itemRows.push(`
              <div style="display:flex; justify-content:space-between; gap:10px; padding:8px 0; border-top:1px solid #1f1f1f;">
                <div style="color:#e5e7eb; font-weight:700;">${serviceLabel}: ${entry}</div>
                <div style="color:#ffffff; font-weight:800; white-space:nowrap;">—</div>
              </div>
            `);
            return;
          }

          const name =
            (entry as any).name ??
            (entry as any).title ??
            (entry as any).itemName ??
            (entry as any).serviceName ??
            'Item';
          const qty = toNumber((entry as any).quantity ?? (entry as any).qty ?? 1) || 1;
          const unitPrice = toNumber(
            (entry as any).price ??
              (entry as any).cost ??
              (entry as any).amount,
          );
          const totalPrice = toNumber(
            (entry as any).totalPrice ??
              (entry as any).total ??
              (unitPrice > 0 ? unitPrice * qty : 0),
          );
          const hasPrice = totalPrice > 0;

          itemRows.push(`
            <div style="display:flex; justify-content:space-between; gap:10px; padding:8px 0; border-top:1px solid #1f1f1f;">
              <div style="color:#e5e7eb; font-weight:700;">${serviceLabel}: ${name}${qty > 1 ? ` × ${qty}` : ''}</div>
              <div style="color:#ffffff; font-weight:800; white-space:nowrap;">${formatMaybeMoney(totalPrice, hasPrice)}</div>
            </div>
          `);
        });
      });

      const priceBreakdownRows: string[] = [];
      if (theaterPrice > 0) {
        priceBreakdownRows.push(`
          <div style="display:flex; justify-content:space-between; gap:10px; padding:8px 0;">
            <div style="color:#e5e7eb; font-weight:800;">Theater Base Price</div>
            <div style="color:#ffffff; font-weight:900; white-space:nowrap;">${formatMoney(theaterPrice)}</div>
          </div>
        `);
      }
      if (decorationFee > 0) {
        priceBreakdownRows.push(`
          <div style="display:flex; justify-content:space-between; gap:10px; padding:8px 0; border-top:1px solid #1f1f1f;">
            <div style="color:#e5e7eb; font-weight:800;">Decoration Fee</div>
            <div style="color:#ffffff; font-weight:900; white-space:nowrap;">${formatMoney(decorationFee)}</div>
          </div>
        `);
      }
      if (convenienceFee > 0) {
        priceBreakdownRows.push(`
          <div style="display:flex; justify-content:space-between; gap:10px; padding:8px 0; border-top:1px solid #1f1f1f;">
            <div style="color:#e5e7eb; font-weight:800;">Convenience Fee</div>
            <div style="color:#ffffff; font-weight:900; white-space:nowrap;">${formatMoney(convenienceFee)}</div>
          </div>
        `);
      }
      if (extraGuestsCount > 0 && extraGuestCharges > 0) {
        const extraGuestFee = extraGuestsCount > 0 ? Math.round(extraGuestCharges / extraGuestsCount) : 0;
        priceBreakdownRows.push(`
          <div style="display:flex; justify-content:space-between; gap:10px; padding:8px 0; border-top:1px solid #1f1f1f;">
            <div style="color:#e5e7eb; font-weight:800;">Extra Guests (${extraGuestsCount}${extraGuestFee > 0 ? ` × ${formatMoney(extraGuestFee)}` : ''})</div>
            <div style="color:#ffffff; font-weight:900; white-space:nowrap;">${formatMoney(extraGuestCharges)}</div>
          </div>
        `);
      }
      

      if (itemRows.length) {
        priceBreakdownRows.push(`
          <div style="padding-top:10px; margin-top:10px; border-top:1px solid #1f1f1f;">
            <div style="color:#bbb; font-size:12px; text-transform:uppercase; letter-spacing:.08em;">Selected Items</div>
            ${itemRows.join('')}
          </div>
        `);
      }

      const priceBreakdownHtml = priceBreakdownRows.length
        ? `
          <div class="card">
            <div class="label">Price Breakdown</div>
            <div style="margin-top:14px;">
              ${priceBreakdownRows.join('')}
            </div>
          </div>
        `
        : '';

      const totalSummaryHtml = `
        <div class="card">
          <div class="label">Total</div>
          <div style="margin-top:14px;">
            ${effectiveDiscount > 0 ? `
              <div style="display:flex; justify-content:space-between; gap:10px; padding:10px 0;">
                <div style="color:#e5e7eb; font-weight:800;">Total Amount (Before Discount)</div>
                <div style="color:#ffffff; font-weight:900; white-space:nowrap;">${formatMoney(resolvedTotalBefore || resolvedTotalAfter)}</div>
              </div>
              <div style="display:flex; justify-content:space-between; gap:10px; padding:10px 0; border-top:1px solid #1f1f1f;">
                <div style="color:#86efac; font-weight:900;">Discount</div>
                <div style="color:#86efac; font-weight:900; white-space:nowrap;">-${formatMoney(effectiveDiscount)}</div>
              </div>
              <div style="display:flex; justify-content:space-between; gap:10px; padding:10px 0; border-top:1px solid #1f1f1f;">
                <div style="color:#ffffff; font-weight:900;">Total Amount After Discount</div>
                <div style="color:#ffffff; font-weight:900; white-space:nowrap;">${formatMoney(resolvedTotalAfter || resolvedTotalBefore)}</div>
              </div>
            ` : `
              <div style="display:flex; justify-content:space-between; gap:10px; padding:10px 0;">
                <div style="color:#ffffff; font-weight:900;">Total Amount</div>
                <div style="color:#ffffff; font-weight:900; white-space:nowrap;">${formatMoney(resolvedTotalAfter || resolvedTotalBefore)}</div>
              </div>
              ${(slotBookingFee > 0) ? `
                <div style="display:flex; justify-content:space-between; gap:10px; padding:10px 0; border-top:1px solid #1f1f1f;">
                  <div style="color:#e5e7eb; font-weight:800;">Slot Booking Fee</div>
                  <div style="color:#ffffff; font-weight:900; white-space:nowrap;">${formatMoney(slotBookingFee)}</div>
                </div>
              ` : ''}
            `}

            ${( venueAmount > 0) ? `
              
              <div style="display:flex; justify-content:space-between; gap:10px; padding:10px 0; border-top:1px solid #1f1f1f;">
                <div style="color:#e5e7eb; font-weight:800;">Pay at Venue (Payable)</div>
                <div style="color:#111827; background:#FACC15; border-radius:999px; padding:6px 12px; font-weight:900; white-space:nowrap; display:inline-block;">${formatMoney(venueAmount)}</div>
              </div>
            ` : ''}
          </div>
        </div>
      `;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${pageTitle}</title>
          <style>
            @font-face { font-family: 'Paralucent-DemiBold'; src: url('https://ik.imagekit.io/cybershoora/fonts/Paralucent-DemiBold.ttf?updatedAt=1758320830457') format('truetype'); }
            @font-face { font-family: 'Paralucent-Medium'; src: url('https://ik.imagekit.io/cybershoora/fonts/Paralucent-Medium.ttf?updatedAt=1758320830502') format('truetype'); }
            body { margin:0; padding:0; background:#0b0b0b; color:#fff; font-family: 'Paralucent-Medium', Arial, sans-serif; }
            .container { max-width:650px; margin:0 auto; background:#141414; border-radius:20px; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,0.35); }
            .header { background: linear-gradient(135deg, #E50914 0%, #b20710 100%); padding:40px 24px; text-align:center; }
            .logo { font-size:32px; font-weight:800; color: white; }
            .tagline { color: rgba(255,255,255,0.85); margin-top:6px; }
            .badge { display:inline-block; margin-top:16px; background:#16a34a; color:#fff; padding:8px 14px; border-radius:999px; font-weight:700; font-size:14px; }
            .content { padding:28px; }
            .card { background:#0f0f0f; border:1px solid #1f1f1f; border-radius:16px; padding:20px; margin:12px 0; }
            .label { color:#bbb; font-size:12px; text-transform:uppercase; letter-spacing:.08em; }
            .value { color:#fff; font-size:16px; font-weight:600; margin-top:6px; }
            .note { margin-top:18px; background:#1a1a1a; border-left:4px solid #eab308; padding:14px; border-radius:10px; color:#fef08a; }
            .footer { text-align:center; color:#aaa; font-size:12px; padding:24px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">FeelME Town</div>
              <div class="tagline">Creating Unforgettable Memories</div>
              <div class="badge">${badgeLabel}</div>
            </div>
            <div class="content">
              <div style="margin-bottom:12px; font-size:18px; color: white;">${introLine}</div>
              <div style="color:#ddd; line-height:1.6;">${leadLine}</div>

              <div class="card">
                <div class="label">Booking Reference</div>
                <div class="value">${bookingData.id}</div>
              </div>
              ${(bookingData as any).ticketNumber ? `
              <div class="card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; text-align: center; padding: 30px;">
                <div style="color: rgba(255,255,255,0.9); font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px;">🎟️ YOUR TICKET NUMBER</div>
                <div style="background: white; padding: 20px; border-radius: 12px; margin: 15px 0;">
                  <div style="font-size: 36px; font-weight: 800; font-family: 'Paralucent-DemiBold', monospace; background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; background-clip: text; color: transparent; letter-spacing: 3px;">${(bookingData as any).ticketNumber}</div>
                </div>
                <div style="color: white; font-size: 14px; line-height: 1.6; opacity: 0.95;">
                  <strong>📱 Use this to order food & services in theater</strong>
                </div>
              </div>
              ` : ''}
              <div class="card" style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div>
                  <div class="label">Theater</div>
                  <div class="value">${bookingData.theaterName || ''}</div>
                </div>
                <div>
                  <div class="label">Guests</div>
                  <div class="value">${bookingData.numberOfPeople || 2}</div>
                </div>
                <div>
                  <div class="label">Date</div>
                  <div class="value">${bookingData.date || ''}</div>
                </div>
                <div>
                  <div class="label">Time</div>
                  <div class="value">${bookingData.time || ''}</div>
                </div>
                <div>
                  <div class="label">Occasion</div>
                  <div class="value">${bookingData.occasion || ''}</div>
                </div>
                ${(bookingData as any).birthdayName ? `
                <div>
                  <div class="label">Birthday Person</div>
                  <div class="value">${(bookingData as any).birthdayName}</div>
                </div>
                ` : ''}
                ${(bookingData as any).partner1Name ? `
                <div>
                  <div class="label">Partner 1</div>
                  <div class="value">${(bookingData as any).partner1Name}</div>
                </div>
                ` : ''}
                ${(bookingData as any).partner2Name ? `
                <div>
                  <div class="label">Partner 2</div>
                  <div class="value">${(bookingData as any).partner2Name}</div>
                </div>
                ` : ''}
                ${(bookingData as any).proposerName ? `
                <div>
                  <div class="label">Proposer</div>
                  <div class="value">${(bookingData as any).proposerName}</div>
                </div>
                ` : ''}
                ${(bookingData as any).proposalPartnerName ? `
                <div>
                  <div class="label">Proposal Partner</div>
                  <div class="value">${(bookingData as any).proposalPartnerName}</div>
                </div>
                ` : ''}
                ${(bookingData as any).valentineName ? `
                <div>
                  <div class="label">Valentine</div>
                  <div class="value">${(bookingData as any).valentineName}</div>
                </div>
                ` : ''}
                ${(bookingData as any).dateNightName ? `
                <div>
                  <div class="label">Date Night Person</div>
                  <div class="value">${(bookingData as any).dateNightName}</div>
                </div>
                ` : ''}
                ${(() => {
          // Handle dynamic occasion-specific fields
          const dynamicFields: string[] = [];
          Object.keys(bookingData).forEach(key => {
            if (key.endsWith('_label') && !key.includes('_value')) {
              const baseKey = key.replace('_label', '');
              const label = (bookingData as any)[key];
              const value = (bookingData as any)[baseKey] || (bookingData as any)[`${baseKey}_value`];
              if (value && value.trim()) {
                dynamicFields.push(`
                        <div>
                          <div class="label">${label}</div>
                          <div class="value">${value}</div>
                        </div>
                        `);
              }
            }
          });
          return dynamicFields.join('');
        })()}

              ${priceBreakdownHtml}

              ${totalSummaryHtml}

              <div class="note">
                <strong>🧾 Invoice Notice:</strong> Your invoice will be generated after your booking is <strong>completed</strong>. You'll receive an email to download it once the show ends.
              </div>
              ${showActions ? `
              <div style="margin-top:16px; text-align:center;">
                <a href="${siteUrl}/order-items" style="display:inline-block; background:#E50914; color:#fff; text-decoration:none; padding:12px 18px; border-radius:10px; font-weight:700; margin:5px;">${orderCtaLabel}</a>
                <a href="${siteUrl}/cancel-booking?bookingId=${encodeURIComponent(bookingData.id || (bookingData as any).bookingId || '')}" style="display:inline-block; background:#dc2626; color:#fff; text-decoration:none; padding:12px 18px; border-radius:10px; font-weight:700; margin:5px;">❌ Cancel Booking</a>
              </div>
              ` : ''}
            </div>
            <div class="footer"> 2024 FeelME Town • Delhi, Dwarka • feelmetown@gmail.com</div>
          </div>
        </body>
        </html>
      `;

      return { subject, html };
    };

    const customerTemplate = buildTemplate();
    const customerResult = await sendEmail(bookingData.email, customerTemplate.subject, customerTemplate.html);

    const settings = await getSettingsOrDefault();
    const potentialAdminEmails = [settings.emailUser, settings.emailFrom, settings.siteEmail]
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter((value) => value && value.includes('@'));
    const adminEmail = potentialAdminEmails.find((value) => value);

    if (adminEmail && adminEmail.toLowerCase() !== bookingData.email.toLowerCase()) {
      const adminTemplate = buildTemplate({
        subject: 'New Booking Confirmed - FeelME Town 🎉',
        pageTitle: 'New Booking Confirmed - FeelME Town',
        badgeLabel: 'New Booking Confirmed',
        introLine: `Hi ${settings.siteName?.trim() || 'FeelME Town Team'},`,
        leadLine: `${bookingData.name ? `${bookingData.name}` : 'A customer'} just confirmed a booking. Full details are below so the team can follow up immediately.`,
        showActions: false,
      });

      await sendEmail(adminEmail, adminTemplate.subject, adminTemplate.html);
    }

    return customerResult;
  },
  // Send booking completion email
  sendBookingComplete: async (bookingData: BookingData) => {
    if (!bookingData.email) {
      return { success: false, error: 'No email provided' };
    }

    try {
      const siteUrl = await getSiteUrl();
      // Generate email template
      const template = emailTemplates.bookingComplete(bookingData, siteUrl);

      // Do not send invoice PDFs as email attachments. Invoice is delivered via invoice page links.
      return await sendEmail(bookingData.email, template.subject, template.html);

    } catch (error) {
      // Fallback: send email without attachment
      const siteUrl = await getSiteUrl();
      const template = emailTemplates.bookingComplete(bookingData, siteUrl);
      return await sendEmail(bookingData.email, template.subject, template.html);
    }
  },

  // Send booking cancellation email
  sendBookingCancelled: async (bookingData: BookingData & { refundAmount: number; refundStatus: string; cancelledAt: Date }) => {
    if (!bookingData.email) {

      return { success: false, error: 'No email provided' };
    }

    const template = emailTemplates.bookingCancelled(bookingData);
    return await sendEmail(bookingData.email, template.subject, template.html);
  },

  // Send booking incomplete email
  sendBookingIncomplete: async (bookingData: Partial<BookingData> & { email?: string; bookingId?: string; selectedCakes?: Array<{ id: string; name: string; price: number; quantity: number }>; selectedDecorItems?: Array<{ id: string; name: string; price: number; quantity: number }>; selectedGifts?: Array<{ id: string; name: string; price: number; quantity: number }> }) => {
    if (!bookingData.email) {

      return { success: false, error: 'No email provided' };
    }

    // Save incomplete booking to MongoDB database directly
    try {
      // Import database directly to save incomplete booking
      const database = await import('@/lib/db-connect');

      const result = await database.default.saveIncompleteBooking({
        name: bookingData.name,
        email: bookingData.email,
        phone: bookingData.phone,
        theaterName: bookingData.theaterName,
        date: bookingData.date,
        time: bookingData.time,
        occasion: bookingData.occasion,
        numberOfPeople: bookingData.numberOfPeople || 2,
        selectedCakes: bookingData.selectedCakes,
        selectedDecorItems: bookingData.selectedDecorItems,
        selectedGifts: bookingData.selectedGifts,
        totalAmount: bookingData.totalAmount
      });

      if (result.success && result.booking) {


        // Update bookingData with the saved booking ID for email template
        bookingData.bookingId = result.booking.id;

        // Also trigger cleanup of expired bookings
        const cleanupResult = await database.default.deleteExpiredIncompleteBookings();
        if (cleanupResult.deletedCount && cleanupResult.deletedCount > 0) {

        }
      } else {

      }

    } catch (error) {

    }

    const siteUrl = await getSiteUrl();
    const template = emailTemplates.bookingIncomplete(bookingData, siteUrl);
    return await sendEmail(bookingData.email, template.subject, template.html);
  },

  // Send staff welcome email
  sendStaffWelcomeEmail: async (staffData: { name: string; email: string; profilePhoto: string }) => {
    if (!staffData.email) {
      return { success: false, error: 'No email provided' };
    }

    const emailTemplate = {
      subject: 'Welcome to FeelME Town Team! 🎉',
      html: `
       <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to FeelME Town</title>
          <style>
            @font-face {
              font-family: 'Paralucent-DemiBold';
              src: url('https://ik.imagekit.io/cybershoora/fonts/Paralucent-DemiBold.ttf?updatedAt=1758320830457') format('truetype');
            }
            @font-face {
              font-family: 'Paralucent-Medium';
              src: url('https://ik.imagekit.io/cybershoora/fonts/Paralucent-Medium.ttf?updatedAt=1758320830457') format('truetype');
            }
            body {
              margin: 0;
              padding: 0;
              font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
              background-color: #ededed;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 4rem;
              overflow: hidden;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #E50914 0%, #b20710 100%);
              padding: 40px 20px;
              text-align: center;
            }
            .brand-name {
              font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
              font-size: 32px;
              font-weight: 800;
              color: white;
              margin-bottom: 20px;
              text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
              letter-spacing: 1px;
            }
            .profile-photo {
              width: 120px;
              height: 120px;
              border-radius: 50%;
              border: 4px solid white;
              object-fit: cover;
              margin: 0 auto 20px;
              display: block;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }
            .header h1 {
              color: white;
              font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
              font-size: 28px;
              margin: 0;
            }
            .content {
              padding: 40px 30px;
            }
            .welcome-text {
              font-size: 18px;
              color: #333;
              line-height: 1.6;
              margin-bottom: 20px;
            }
            .info-box {
              background: #f8f9fa;
              border-left: 4px solid #E50914;
              padding: 20px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .info-box h3 {
              font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
              color: #E50914;
              margin: 0 0 10px 0;
              font-size: 18px;
            }
            .info-box p {
              margin: 8px 0;
              color: #555;
              font-size: 15px;
            }
            .footer {
              background-color: #1a1a1a;
              color: #999;
              text-align: center;
              padding: 30px 20px;
              font-size: 14px;
            }
            .footer-brand {
              font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
              font-size: 24px;
              font-weight: 700;
              color: white;
              margin-bottom: 15px;
              letter-spacing: 0.5px;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <!-- Header -->
            <div class="header">
              <div class="brand-name">FeelME Town</div>
              <img src="${staffData.profilePhoto}" alt="${staffData.name}" class="profile-photo">
              <h1>Welcome to the Team! 🎉</h1>
            </div>

            <!-- Content -->
            <div class="content">
              <p class="welcome-text">Dear <strong>${staffData.name}</strong>,</p>
              
              <p class="welcome-text">
                Congratulations! You have been added as a <strong>Staff Member</strong> at <strong>FeelME Town</strong> - 
                where unforgettable experiences come to life in our premium private theaters.
              </p>

              <div class="info-box">
                <h3>Your Role</h3>
                <p><strong>Position:</strong> Staff Member</p>
                <p><strong>Email:</strong> ${staffData.email}</p>
                <p><strong>Status:</strong> Active</p>
              </div>

              <p class="welcome-text">
                As part of our team, you'll be helping create magical moments for our guests. 
                We're excited to have you on board!
              </p>

              <p class="welcome-text">
                If you have any questions or need assistance, please don't hesitate to reach out to the management team.
              </p>

              <p class="welcome-text">
                Welcome aboard! 🎬🍿
              </p>
            </div>

            <!-- Footer -->
            <div class="footer">
              <div class="footer-content">
                <div class="footer-brand">FeelME Town</div>
                <p>Premium Private Theater Experience • Creating Unforgettable Moments Since 2021</p>
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                  <p style="font-size: 12px; color: #999; margin-bottom: 8px;">
                    Designed and Developed by <a href="https://www.cybershoora.com/" target="_blank" style="color: #E50914; text-decoration: none; font-weight: 600;">CYBERSHOORA</a>
                  </p>
                  <p style="font-size: 11px; color: #666;">This is an automated email. Please do not reply.</p>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    return await sendEmail(staffData.email, emailTemplate.subject, emailTemplate.html);
  },

  // Test email configuration
  testConnection: async () => {
    try {
      const transporter = await createTransporter();
      await transporter.verify();

      return { success: true, message: 'Email service ready' };
    } catch (error) {

      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
};

export default emailService;
