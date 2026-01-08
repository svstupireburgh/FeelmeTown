// Invoice Generator for FeelME Town
// Generates HTML invoice matching the provided design for PDF generation

interface InvoiceData {
  id: string;
  name: string;
  email: string;
  phone: string;
  theaterName: string;
  date: string;
  time: string;
  occasion: string;
  numberOfPeople: number;
  totalAmount: number;
  slotBookingFee?: number;
  venuePaymentMethod?: string;
  pricingData?: {
    theaterBasePrice?: number;
    extraGuestFee?: number;
    slotBookingFee?: number;
  };
  extraGuestsCount?: number;
  extraGuestCharges?: number;
  advancePayment?: number;
  venuePayment?: number;
}

const escapeHtml = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// Helper function to render occasion details from dynamic fields
const renderOccasionDetails = (bookingData: any, occasionMeta?: { fieldLabels?: Record<string, string> }) => {
  try {
    if (!bookingData) return '';

    const normalizeText = (input: unknown) =>
      String(input ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

    const fallbackLabelFromKey = (key: string) =>
      String(key || '')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .replace(/Name$/, ' Name')
        .replace(/Id$/, ' ID')
        .trim();

    const detailEntries: { label: string; value: string }[] = [];

    const labelKeys = Object.keys(bookingData).filter((key) => key.endsWith('_label'));
    if (labelKeys.length > 0) {
      for (const labelKey of labelKeys) {
        const baseKey = labelKey.replace(/_label$/, '');
        const rawLabel = bookingData[labelKey];
        const rawValue = bookingData[baseKey] ?? bookingData[`${baseKey}_value`];

        if (rawLabel === null || rawLabel === undefined) continue;
        if (rawValue === null || rawValue === undefined) continue;
        if (typeof rawValue === 'object' && !Array.isArray(rawValue)) continue;

        const expectedLabel = (occasionMeta?.fieldLabels?.[baseKey] || fallbackLabelFromKey(baseKey)).trim();

        const labelCandidate = String(rawLabel).trim();
        const valueCandidate = Array.isArray(rawValue) ? rawValue.join(', ') : String(rawValue).trim();

        // Some legacy bookings have label/value swapped. If the value matches the expected label,
        // treat the label field as the actual user-entered value.
        const normalizedExpected = normalizeText(expectedLabel);
        const normalizedLabelCandidate = normalizeText(labelCandidate);
        const normalizedValueCandidate = normalizeText(valueCandidate);

        const shouldSwap =
          Boolean(normalizedExpected) &&
          normalizedValueCandidate === normalizedExpected &&
          normalizedLabelCandidate !== normalizedExpected;

        const label = expectedLabel;
        const value = shouldSwap ? labelCandidate : valueCandidate;

        if (!label || !value) continue;

        // If the stored value is literally the label, skip (avoids rendering labels as values)
        if (normalizeText(value) === normalizeText(label)) continue;

        detailEntries.push({ label, value });
      }
    }

    if (detailEntries.length === 0 && bookingData.occasionData) {
      const occasionData = bookingData.occasionData || {};
      for (const key of Object.keys(occasionData)) {
        const rawValue = occasionData[key];
        if (rawValue === null || rawValue === undefined) continue;
        if (typeof rawValue === 'object' && !Array.isArray(rawValue)) continue;

        const value = Array.isArray(rawValue) ? rawValue.join(', ') : String(rawValue).trim();
        if (!value) continue;

        const labelFromMeta = occasionMeta?.fieldLabels?.[key];
        const label = (labelFromMeta || fallbackLabelFromKey(key)).trim();

        if (!label) continue;

        // If value equals label (legacy bad data), skip
        if (normalizeText(value) === normalizeText(label)) continue;
        detailEntries.push({ label, value });
      }
    }

    if (detailEntries.length === 0) {
      return '';
    }

    const itemsHtml = detailEntries
      .map(({ value }) => {
        const safeValue = escapeHtml(value);
        return `<span class="occasion-tag"><span class="occasion-tag-value">${safeValue}</span></span>`;
      })
      .join('');

    return `<div class="occasion-tags">${itemsHtml}</div>`;
  } catch (e) {
    return '';
  }
};

export const generateInvoiceHtml = (bookingData: InvoiceData): string => {
  const bd: any = bookingData as any;
  const people = Number(bd.numberOfPeople || 2);
  const pricing = (bd.pricingData || {}) as any;
  const theaterName = String(bd.theaterName || '');

  const resolveOccasionName = (): string => {
    const raw = typeof bd.occasion === 'string' ? bd.occasion.trim() : '';
    if (!raw) return '';
    const normalized = raw.toLowerCase();
    if (['no occasion', 'none', 'n/a', 'not applicable', 'not specified'].includes(normalized)) {
      return '';
    }
    return raw;
  };

  const occasionName = resolveOccasionName();
  bd.occasion = occasionName;

  const parseAmount = (input: unknown): number => {
    if (typeof input === 'number') {
      return Number.isFinite(input) ? input : 0;
    }
    if (typeof input === 'string') {
      const cleaned = input.replace(/[^0-9.-]/g, '');
      if (!cleaned) return 0;
      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const resolveDecorationAmount = (): { configured: number; applied: number } => {
    const candidates = [
      bd.decorationFee,
      bd.appliedDecorationFee,
      bd.decorationAppliedFee,
      bd.decorationFees,
      pricing?.decorationFee,
      pricing?.decorationFees,
      pricing?.appliedDecorationFee,
      pricing?.decorationAppliedFee,
    ];

    let configured = 0;
    for (const candidate of candidates) {
      const value = parseAmount(candidate);
      if (value > 0) {
        configured = value;
        break;
      }
    }

    const appliedCandidates = [
      bd.appliedDecorationFee,
      bd.decorationAppliedFee,
      pricing?.appliedDecorationFee,
      pricing?.decorationAppliedFee,
      configured,
    ];

    let applied = 0;
    for (const candidate of appliedCandidates) {
      const value = parseAmount(candidate);
      if (value > 0) {
        applied = value;
        break;
      }
    }

    return {
      configured,
      applied,
    };
  };

  const decorationAmounts = resolveDecorationAmount();

  const occasionMeta = bd._occasionMeta || bd.occasionMeta;
  const occasionDetailsHtml = renderOccasionDetails(bd, occasionMeta);

  const theaterBasePrice = Number(pricing.theaterBasePrice ?? 0);
  const extraGuestFee = Number(pricing.extraGuestFee ?? 400);
  const extraGuestsCount = Number(bd.extraGuestsCount ?? Math.max(0, people - 2));
  const extraGuestCharges = Number(bd.extraGuestCharges ?? (extraGuestsCount * extraGuestFee));

  const discountAmount = parseAmount(bd.discountAmount ?? bd.couponDiscount ?? 0);
  const specialDiscountAmount = parseAmount(
    bd.specialDiscount ??
      pricing?.specialDiscount ??
      bd.adminDiscount ??
      pricing?.adminDiscount ??
      0,
  );
  const genericDiscountAmount = parseAmount(
    bd.Discount ??
      pricing?.discount ??
      0,
  );
  const penaltyChargesAmount = parseAmount(
    bd.penaltyCharges ??
      bd.penaltyCharge ??
      pricing?.penaltyCharges ??
      pricing?.penaltyCharge ??
      0,
  );
  const penaltyReasonText = (() => {
    const candidates: unknown[] = [
      (bd as any)?.penaltyReason,
      (bd as any)?.penaltyReasonText,
      (pricing as any)?.penaltyReason,
      (pricing as any)?.penaltyReasonText,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        if (trimmed) return trimmed;
      }
    }
    return '';
  })();
  const penaltyReasonSuffix = penaltyReasonText ? ` (${escapeHtml(penaltyReasonText)})` : '';
  const providedSubtotal = parseAmount(bd.totalAmountBeforeDiscount ?? 0);
  const providedTotal = parseAmount(
    bd.totalAmountAfterDiscount ??
      bd.totalAmount ??
      bd.amount ??
      0,
  );
  const totalAmountAfterDiscount =
    providedTotal > 0
      ? providedTotal
      : Math.max(
          theaterBasePrice + extraGuestCharges + penaltyChargesAmount -
            (specialDiscountAmount + genericDiscountAmount + discountAmount),
          0,
        );
  const totalAmountBeforeAdjustments =
    providedSubtotal > 0
      ? providedSubtotal
      : totalAmountAfterDiscount +
          specialDiscountAmount +
          genericDiscountAmount +
          discountAmount;

  const slotBookingFeeConfiguredRaw = Number(bd.slotBookingFee ?? pricing.slotBookingFee ?? bd.advancePayment ?? 0);
  const advancePaymentRaw = Number(bd.advancePayment ?? 0);
  const slotBookingAmount = slotBookingFeeConfiguredRaw > 0
    ? slotBookingFeeConfiguredRaw
    : advancePaymentRaw;
  const invoiceTotal = slotBookingAmount > 0 ? slotBookingAmount : totalAmountAfterDiscount;
  const venuePayment = Number(
    bd.venuePayment ??
    (bd.totalAmountAfterDiscount !== undefined
      ? Math.max(Number(bd.totalAmountAfterDiscount) - invoiceTotal, 0)
      : Math.max(totalAmountAfterDiscount - invoiceTotal, 0))
  );
  const remainingPayableAmount = Math.max(totalAmountAfterDiscount - slotBookingAmount, 0);
  const normalizedPaymentStatus = String(bd.paymentStatus || bd.payment_status || '').toLowerCase();
  const shouldShowPayableMethod = normalizedPaymentStatus === 'paid';

  const slotPaymentMethodRaw = String(
    bd.advancePaymentMethod ||
      bd.paymentMode ||
      bd.paymentMethod ||
      bd.advance_payment_method ||
      bd.payment_mode ||
      bd.payment_method ||
      '',
  ).toLowerCase();
  const normalizedSlotPaymentMethod = slotPaymentMethodRaw === 'online_payment' ? 'online' : slotPaymentMethodRaw;
  const slotPaymentMethodLabel = normalizedSlotPaymentMethod === 'cash'
    ? 'Cash'
    : normalizedSlotPaymentMethod === 'upi'
      ? 'UPI'
      : normalizedSlotPaymentMethod === 'online'
        ? 'Online'
        : '';
  const slotMethodBelowHtml = slotPaymentMethodLabel
    ? `<div style="font-size: 12px; font-weight: 800; margin-top: 6px; opacity: 0.95;">${escapeHtml(slotPaymentMethodLabel)}</div>`
    : '';

  const venuePaymentMethodRaw = shouldShowPayableMethod
    ? String(bd.venuePaymentMethod || bd.finalPaymentMethod || '').toLowerCase()
    : '';
  const venuePaymentMethodLabel = venuePaymentMethodRaw === 'cash'
    ? 'Cash'
    : venuePaymentMethodRaw === 'upi'
      ? 'UPI'
      : venuePaymentMethodRaw === 'online'
        ? 'Online'
        : '';
  const venuePaymentRowLabel = 'Payable Amount';
  const payableMethodBelowHtml = venuePaymentMethodLabel
    ? `<div style="font-size: 12px; font-weight: 800; margin-top: 6px; opacity: 0.95;">${escapeHtml(venuePaymentMethodLabel)}</div>`
    : '';

  const appliedCouponCode = bd.appliedCouponCode || bd.discountSummary?.code || '';
  const couponDiscountType = bd.couponDiscountType || bd.discountSummary?.type || '';
  const couponDiscountValue = bd.couponDiscountValue ?? bd.discountSummary?.value ?? null;
  const couponDescriptionParts: string[] = [];
  if (appliedCouponCode) couponDescriptionParts.push(appliedCouponCode);
  if (couponDiscountType === 'percentage' && typeof couponDiscountValue === 'number') {
    couponDescriptionParts.push(`${couponDiscountValue}%`);
  } else if (couponDiscountType && typeof couponDiscountValue === 'number') {
    couponDescriptionParts.push(`₹${couponDiscountValue}`);
  }

  // Format numbers with Indian number format
  const fmt = (n: number) => new Intl.NumberFormat('en-IN').format(Math.round(Number(n || 0)));

  // Show only Booking ID and Customer Name (no extra 'Invoice' prefix) in Invoice No.
  const bookingIdForDisplay = String(bd.id || 'FMT-2025-89');
  const customerNameForDisplay = String(bd.name || '').trim();
  const invoiceNo = customerNameForDisplay
    ? `${bookingIdForDisplay} - ${customerNameForDisplay}`
    : bookingIdForDisplay;
  const invoiceDate = String(bd.date || new Date().toLocaleDateString('en-GB'));

  return `
    <!DOCTYPE html>
<html>

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice - FeelME Town</title>
  <style>
    @font-face {
      font-family: 'Paralucent-DemiBold';
      src: url('https://ik.imagekit.io/cybershoora/fonts/Paralucent-DemiBold.ttf?updatedAt=1758320830457') format('truetype');
    }

    @font-face {
      font-family: 'Paralucent-Medium';
      src: url('https://ik.imagekit.io/cybershoora/fonts/Paralucent-Medium.ttf?updatedAt=1758320830457') format('truetype');
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Paralucent-Medium', Arial, sans-serif;
       backgroundImage: 'url(/bg7.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
        overflowY: 'auto',
        overflowX: 'hidden'
      padding: 20px;
      min-height: 100vh;
    }

    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: linear-gradient(135deg, #F5ECCF 0%, #F9F2D9 100%);
      
      overflow: visible;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      height: auto;
      min-height: auto;
    }

   

    /* Top Header - Black */
    .invoice-header {
      background: #0f0f0f;
      color: #fff;
      padding: 1rem 2rem 5rem 2rem;
      height: 16rem;
      display: flex;
      border-radius:  0  0 2rem 2rem;
      align-items: center;
      justify-content: space-between;
    }

    .invoice-title {
      font-size: 48px;
      font-weight: 800;
      font-family: 'Paralucent-DemiBold', sans-serif;
      color: #fff;
    }

    .company-badge {
      border: 2px solid #E8DDB6;
      color: #E8DDB6;
      padding: 12px 20px;
      border-radius: 999px;
      font-weight: 600;
      font-family: 'Paralucent-Medium', sans-serif;
      font-size: 16px;
    }

    .invoice-subtitle {
      color: #E8DDB6;
      font-size: 14px;
      margin-top: 8px;
      opacity: 0.9;
    }

    /* Bill To Section - Orange */
    .bill-to-section {
      background: #F07E4B;
      color: #fff;
      padding: 24px 28px;
      margin: -5rem 2rem 0 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 0.6rem 2rem 2rem 2rem;
    }

    .bill-to-left h2 {
      font-size: 28px;
      font-weight: 800;
      margin: 6px 0 12px;
      font-family: 'Paralucent-DemiBold', sans-serif;
    }

    .bill-to-left .contact-row {
      display: flex;
      gap: 12px;
      align-items: center;
      color: #ffe;
      font-size: 15px;
      margin: 6px 0;
    }

    .bill-to-left .label {
      opacity: 0.95;
      font-size: 13px;
      font-family: 'Paralucent-Medium', sans-serif;
    }

    .amount-chip {
      background: #F2B365;
      color: #0b0b0b;
      padding: 8px 18px;
      border-radius: 999px;
      font-weight: 800;
      font-family: 'Paralucent-DemiBold', sans-serif;
      font-size: 16px;
    }

    .bill-to-right {
      text-align: right;
      font-family: 'Paralucent-Medium', sans-serif;
    }

    .bill-to-right .label {
      color: #fff;
      opacity: 0.9;
      font-size: 14px;
      margin-bottom: 4px;
    }

    .bill-to-right .value {
      color: #fff;
      font-weight: 700;
      font-size: 15px;
      margin-bottom: 12px;
    }

     .occasion-section {
      background: #F07E4B;
      color: #fff;
      padding: 20px 28px;
      margin: 1rem 2rem 1rem 2rem;
      border-radius:  2rem 0.6rem 2rem  2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: 'Paralucent-Medium', sans-serif;
    }

    .occasion-section .label {
      opacity: 0.95;
      font-size: 13px;
      margin-bottom: 6px;
    }

    .occasion-section .value {
      font-size: 16px;
      font-weight: 700;
      font-family: 'Paralucent-DemiBold', sans-serif;
    }

    .occasion-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }

    .occasion-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.92);
      color: #F07E4B;
      font-size: 12px;
      line-height: 1;
      border: 1px solid rgba(255, 255, 255, 0.18);
      max-width: 100%;
    }

    .occasion-tag-label {
      opacity: 0.92;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .occasion-tag-sep {
      opacity: 0.8;
    }

    .occasion-tag-value {
      font-weight: 800;
      font-family: 'Paralucent-DemiBold', sans-serif;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 220px;
    }

    .occasion-details-card {
      background: #F07E4B;
      color: #fff;
      margin: 0 2rem 1.5rem 2rem;
      padding: 24px 28px;
      border-radius: 0.6rem 2rem 2rem 2rem;
      font-family: 'Paralucent-Medium', sans-serif;
    }

    .occasion-details-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .occasion-details-title {
      font-size: 20px;
      font-weight: 800;
      font-family: 'Paralucent-DemiBold', sans-serif;
    }

    .occasion-details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px 24px;
    }

    .occasion-detail {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .occasion-detail-label {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      opacity: 0.85;
    }

    .occasion-detail-value {
      font-size: 16px;
      font-weight: 700;
      font-family: 'Paralucent-DemiBold', sans-serif;
    }

    /* Table Section */
    .table-section {
      margin: 0 2rem 2rem 2rem;
    }

    .invoice-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0 16px;
      table-layout: fixed;
    }

    .table-header {
      background: #101010;
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      font-family: 'Paralucent-DemiBold', sans-serif;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    
    /* Ensure table header doesn't repeat on new pages */
    .invoice-table {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    /* Keep table rows together when possible */
    .table-row {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    
    /* Additional PDF page break control */
    .table-section {
      break-inside: auto;
      page-break-inside: auto;
    }
    
    /* Prevent orphaned table headers */
    .table-header + .table-row {
      break-before: avoid;
      page-break-before: avoid;
    }

    .table-header th {
      padding: 16px 18px;
      text-align: left;
    }

    .table-header th:first-child {
      border-radius: 12px 0 0 12px;
    }

    .table-header th:last-child {
      border-radius: 0 12px 12px 0;
    }

    .table-row {
      background: transparent;
    }

    .table-row:nth-child(odd) {
      background: #EFE8C9;
    }

    .table-row td {
      padding: 16px 18px;
      font-size: 15px;
      color: #1a1a1a;
      font-weight: 500;
    }

    .table-row td:first-child {
      border-radius: 12px 0 0 12px;
      font-weight: 600;
    }

    .table-row td:last-child {
      border-radius: 0 12px 12px 0;
      font-weight: 700;
    }

    /* Footer Section */
    .invoice-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px 28px;
    }

    .decorative-stars {
      font-size: 3rem;
      color: #0f0f0f;
      margin-left: 1rem;
    }

    .decorative-stars img {
      width: 2rem;
      height: 2rem;
      object-fit: contain;
    }

    .payable-amount {
      background-color: #F07E4B;
      padding: 16px 24px;
      border-radius: 24px;
      font-weight: 700;
      font-family: 'Paralucent-DemiBold', sans-serif;
      font-size: 18px;
      color: #ffffff;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      letter-spacing: 0.5px;
    }

    /* Bottom Section */
    .bottom-section {
      display: flex;
      gap: 20px;
      padding: 0 20px 28px;
    }

    .terms-box {
      background: #F07E4B;
      border-radius: 2rem 0.5rem 2rem 2rem;
      padding: 24px;
      flex: 1;
      color: #fff;
    }

    .terms-title {
      font-size: 18px;
      font-weight: 700;
      font-family: 'Paralucent-DemiBold', sans-serif;
      margin-bottom: 16px;
    }

    .terms-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .terms-point {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .terms-dot {
      width: 8px;
      height: 8px;
      background: #fff;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .contact-box {
      background: #F2B365;
      border-radius: 0.5rem 2rem  2rem 2rem;
      padding: 24px;
      flex: 1;
      color: #0b0b0b;
      text-align: center;
    }

    .contact-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .contact-subtitle {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .contact-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 14px;
    }

    .brand-section {
      background: #E8DDB6;
      border-radius: 20px;
      padding: 24px;
      flex: 1;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .brand-logo {
      width: 60px;
      height: 60px;
      background: #0f0f0f;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
      font-size: 24px;
      color: #E8DDB6;
    }

    .brand-name {
      font-size: 20px;
      font-weight: 800;
      font-family: 'Paralucent-DemiBold', sans-serif;
      color: #0f0f0f;
      margin-bottom: 4px;
    }

    .brand-tagline {
      font-size: 12px;
      color: #666;
      font-weight: 500;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }

      .invoice-container {
        box-shadow: none;
      }
    }
  </style>
</head>

<body>

  <div class="invoice-container">
    <!-- Header Section -->
    <div class="top">
      <div class="invoice-header">
        <div>
          <div class="invoice-title">Invoice</div>
          <div class="invoice-subtitle">This invoice is issued for services provided by<br>FeelMe Town Private Theater
          </div>
        </div>
        <div class="company-badge">
          FeelMe town 🌐
        </div>
      </div>

     
    </div>
     <!-- Bill To Section -->
      <div class="bill-to-section">
        <div class="bill-to-left">
          <div class="label">Invoice to</div>
          <h2>${bookingData.name}</h2>
          <div class="contact-row">
            <span>📞</span>
            <span>${bookingData.phone || 'N/A'}</span>
          </div>
          <div class="contact-row">
            <span>✉️</span>
            <span>${bookingData.email || 'feelmetowm@gmail.com'}</span>
          </div>
        </div>
        <div class="bill-to-right">
          <div class="label">Invoice No.</div>
          <div class="value">${invoiceNo}</div>
          <div class="label">Date</div>
          <div class="value">${invoiceDate}</div>
          <div style="margin-top: 16px;">
            <span class="amount-chip">Slot Booking Fee ₹${fmt(slotBookingAmount)}${slotPaymentMethodLabel ? ` (${escapeHtml(slotPaymentMethodLabel)})` : ''}</span>
          </div>
        </div>
      </div>

   <!-- Occasion & Date Section -->
      <div class="occasion-section">
        <div class="bill-to-left">
          <div class="label">Occasion</div>
          <div class="value">${occasionName || ''}</div>
          ${occasionDetailsHtml}
        </div>
        <div class="bill-to-right">
          <div class="label">Date & Time</div>
          <div class="value">${bookingData.date || 'TBD'}, ${bookingData.time || ''}</div>
        </div>
      </div>


    <!-- Table Section -->
    <div class="table-section">
      <table class="invoice-table">
        <tbody>
          <tr class="table-header">
            <th>Item Description</th>
            <th>Base Price</th>
            <th>Quantity</th>
            <th>Price</th>
          </tr>
          <tr class="table-row">
            <td>${bookingData.theaterName || 'Theater'}</td>
            <td>${fmt(theaterBasePrice)}</td>
            <td>1</td>
            <td>${fmt(theaterBasePrice)}</td>
          </tr>
          
          ${extraGuestsCount > 0 ? `
          <tr class="table-row">
            <td>Extra Guests (${extraGuestsCount} guests)</td>
            <td>${fmt(extraGuestFee)}</td>
            <td>${extraGuestsCount}</td>
            <td>${fmt(extraGuestCharges)}</td>
          </tr>
          ` : ''}
          
          ${(() => {
      let itemsHtml = '';

      // Generic renderer: any selected service arrays saved on booking
      const entries = Object.entries(bd) as Array<[string, any]>;
      for (const [key, value] of entries) {
        if (!key || typeof key !== 'string') continue;
        if (!key.startsWith('selected')) continue;
        if (key === 'selectedMovies') continue; // movies are free/visual, skip pricing
        const items = Array.isArray(value) ? value : [];
        if (items.length === 0) continue;

        // Derive a user-friendly label from the key, e.g., "selectedDecorItems" → "Decor"
        const label = (() => {
          const raw = key.replace(/^selected/i, '');
          const cleaned = raw.replace(/Items?$/i, '').replace(/_/g, ' ').trim();
          if (!cleaned) return 'Item';
          // Capitalize first letter
          return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        })();

        itemsHtml += items.map((item: any) => {
          const name = item?.name || item?.title || 'Item';
          const price = Number(item?.price || 0);
          const qty = Number(item?.quantity || 1);
          const total = price * qty;
          return `
                <tr class="table-row">
                  <td>${label} - ${name}</td>
                  <td>${fmt(price)}</td>
                  <td>${fmt(qty)}</td>
                  <td>${fmt(total)}</td>
                </tr>
              `;
        }).join('');
      }

      return itemsHtml;
    })()}

          ${(() => {
      const applied = decorationAmounts.applied;
      if (applied > 0) {
        return `
          <tr class="table-row">
            <td>Decoration Applied Fee</td>
            <td>${fmt(applied)}</td>
            <td>1</td>
            <td>${fmt(applied)}</td>
          </tr>`;
      }
      return '';
    })()}
          
          ${penaltyChargesAmount > 0 ? `
          <tr class="table-row" style="background: #FEE2E2; color: #B91C1C;">
            <td><strong>Penalty Charges${penaltyReasonSuffix}</strong></td>
            <td>-</td>
            <td>-</td>
            <td><strong>₹${fmt(penaltyChargesAmount)}</strong></td>
          </tr>` : ''}

          <tr class="table-row" style="background: #F2B365; font-weight: bold; color: #0f0f0f;">
            <td><strong>Total Amount</strong></td>
            <td>-</td>
            <td>-</td>
            <td><strong>${fmt(totalAmountBeforeAdjustments)}</strong></td>
          </tr>

          ${specialDiscountAmount > 0 ? `
          <tr class="table-row" style="background: #FDEEE3; color: #B45309;">
            <td><strong>Special Discount</strong></td>
            <td>-</td>
            <td>-</td>
            <td><strong>-${fmt(specialDiscountAmount)}</strong></td>
          </tr>` : ''}

          ${genericDiscountAmount > 0 ? `
          <tr class="table-row" style="background: #FFF7ED; color: #B45309;">
            <td><strong>Discount</strong></td>
            <td>-</td>
            <td>-</td>
            <td><strong>-${fmt(genericDiscountAmount)}</strong></td>
          </tr>` : ''}

          ${discountAmount > 0 ? `
          <tr class="table-row" style="background: #FEF3C7; color: #92400E;">
            <td><strong>Coupon Discount${couponDescriptionParts.length ? ` (${couponDescriptionParts.join(' · ')})` : ''}</strong></td>
            <td>-</td>
            <td>-</td>
            <td><strong>-${fmt(discountAmount)}</strong></td>
          </tr>` : ''}

          ${(totalAmountBeforeAdjustments !== totalAmountAfterDiscount) ? `
          <tr class="table-row" style="background: #E5F7ED; font-weight: bold; color: #047857;">
            <td><strong>Total After Discount</strong></td>
            <td>-</td>
            <td>-</td>
            <td><strong>${fmt(totalAmountAfterDiscount)}</strong></td>
          </tr>` : ''}

          ${slotBookingAmount > 0 ? `
          <tr class="table-row">
            <td>Slot Booking Fee</td>
           
            <td>${fmt(slotBookingAmount)}</td>
            <td>-</td>
            <td><div>${fmt(slotBookingAmount)}</div>${slotMethodBelowHtml}</td>
          </tr>
          ` : ''}
          
          ${(venuePayment > 0 || venuePaymentMethodLabel || remainingPayableAmount > 0) ? `
          <tr class="table-row" style="background: #F2B365; font-weight: 700; color: #0f0f0f;">
            <td>${venuePaymentRowLabel}</td>
            <td>-</td>
            <td>-</td>
            <td style="background: #FDE68A; font-weight: 800; color: #7C2D12;"><div>${fmt(venuePayment > 0 ? venuePayment : remainingPayableAmount)}</div>${payableMethodBelowHtml}</td>
          </tr>
          ` : ''}

          
        </tbody>
      </table>
    </div>

    <!-- Footer Section -->
    <div class="invoice-footer">
      <div class="decorative-stars"></div>
      <div class="decorative-stars">✱ ✱ ✱</div>
      <div class="payable-amount">Thank you for visiting! See you again soon.</div>
    </div>

    <!-- Bottom Section -->
    <div class="bottom-section">
      <div class="terms-box">
        <div class="terms-title">Terms & Condition</div>
        <div class="terms-content">
          <div class="terms-point">
            <div class="terms-dot"></div>
            <span>Payment due within 24 hours</span>
          </div>
          <div class="terms-point">
            <div class="terms-dot"></div>
            <span>Cancellation policy applies</span>
          </div>
        </div>
      </div>

      <div class="contact-box">
        <div class="contact-title">Find us for</div>
        <div class="contact-subtitle">More Information</div>
        <div class="contact-info">
          <div>📞 +91 8006756453</div>
          <div>💬 +91 8006756453</div>
          <div>✉️ feelmetowm@gmail.com</div>
        </div>
      </div>

      <div class="brand-section">
        <div class="brand-logo">🎭</div>
        <div class="brand-name">FeelME Town</div>
        <div class="brand-tagline">Your Private theater</div>
      </div>
    </div>
  </div>
</body>

</html>
  `;
};

// Export default for easy import
export default { generateInvoiceHtml };
