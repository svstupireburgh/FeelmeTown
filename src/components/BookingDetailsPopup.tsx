'use client';

import React, { useState } from 'react';

interface Booking {
  id: number;
  customerName: string;
  email?: string;
  phone?: string;
  theater: string;
  theaterName?: string;
  date: string;
  time: string;
  status: string;
  amount: number;
  totalAmount?: number;
  advancePayment?: number;
  venuePayment?: number;
  adminDiscount?: number;
  specialDiscount?: number;
  Discount?: number;
  penaltyCharges?: number;
  penaltyCharge?: number;
  pricingData?: {
    slotBookingFee?: number;
    convenienceFee?: number;
    theaterBasePrice?: number;
    extraGuestFee?: number;
    decorationFees?: number;
    adminDiscount?: number;
    specialDiscount?: number;
    discount?: number;
    penaltyCharges?: number;
    penaltyCharge?: number;
  };
  extraGuestCharges?: number;
  extraGuestsCount?: number;
  numberOfPeople?: number;
  occasion?: string;
  occasionPersonName?: string;
  birthdayName?: string;
  birthdayGender?: string;
  partner1Name?: string;
  partner1Gender?: string;
  partner2Name?: string;
  partner2Gender?: string;
  dateNightName?: string;
  proposerName?: string;
  proposalPartnerName?: string;
  valentineName?: string;
  customCelebration?: string;
  selectedMovies?: string[];
  // Dynamic service items (can be any service name)
  [key: string]: any;
  occasionData?: { [key: string]: any };
  createdBy?: {
    type: 'admin' | 'staff' | 'customer';
    adminName?: string;
    staffName?: string;
    staffId?: string;
  };
  bookingDate?: string;
  createdAtIST?: string;
}

interface BookingDetailsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  occasions?: any[];
  onEdit?: (booking: Booking) => void;
  showEditButton?: boolean;
  hidePaymentSummary?: boolean;
}

export default function BookingDetailsPopup({ 
  isOpen, 
  onClose, 
  booking, 
  occasions = [], 
  onEdit,
  showEditButton = true,
  hidePaymentSummary = false
}: BookingDetailsPopupProps) {
  if (!isOpen || !booking) return null;

  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppMode, setWhatsAppMode] = useState<'choose' | 'other'>('choose');
  const [otherWhatsAppNumberRaw, setOtherWhatsAppNumberRaw] = useState('');

  const whatsappNumber = (() => {
    const raw = String(booking.phone || '').trim();
    if (!raw) return '';
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';

    // If 10 digits, assume India country code.
    if (digits.length === 10) return `91${digits}`;

    // If already includes country code.
    return digits;
  })();

  const normalizeWhatsAppNumber = (raw: string) => {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return '';
    const digits = trimmed.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 10) return `91${digits}`;
    return digits;
  };

  const whatsappMessage = (() => {
    const ticketNumber = String((booking as any).ticketNumber || (booking as any).ticket_number || '').trim();
    const bookingId = String((booking as any).originalBookingId || booking.id || (booking as any).bookingId || '').trim();
    const theaterName = String(booking.theaterName || booking.theater || '').trim();

    const bookingOccasionLocal = occasions.find((occ) => occ?.name === booking.occasion);

    const legacyFallbackKeysLocal = [
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
      'babyShowerParentName',
      'babyGender',
      'farewellPersonName',
      'farewellReason',
      'congratulationsPersonName',
      'congratulationsReason',
      'occasionPersonName',
    ];

    const formatValueLocal = (value: unknown) => {
      if (value === null || value === undefined) {
        return '';
      }
      if (Array.isArray(value)) {
        return value.length > 0 ? value.join(', ') : '';
      }
      if (typeof value === 'object') {
        return '';
      }
      return String(value).trim();
    };

    const formatLabelLocal = (fieldKey: string) => {
      const labelFromOccasion = bookingOccasionLocal?.fieldLabels?.[fieldKey];
      if (labelFromOccasion) {
        return labelFromOccasion;
      }
      return fieldKey
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
    };

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

    const totalAmount = toNumber((booking.totalAmount ?? booking.amount) || 0);

    const theaterBasePrice = toNumber(
      (booking as any).theaterPrice ??
        (booking as any).theaterBasePrice ??
        booking.pricingData?.theaterBasePrice,
    );

    const decorationFee = toNumber(
      (booking as any).decorationAppliedFee ??
        (booking as any).decorationFee ??
        booking.pricingData?.decorationFees,
    );

    const slotBookingFee = toNumber(
      (booking as any).slotBookingFee ??
        booking.pricingData?.slotBookingFee,
    );

    const couponDiscount = toNumber(
      (booking as any).couponDiscount ??
        (booking as any).DiscountByCoupon ??
        (booking as any).discountByCoupon,
    );
    const specialDiscount = toNumber(
      booking.specialDiscount ?? booking.adminDiscount ?? booking.Discount,
    );
    const totalDiscount = Math.max(0, couponDiscount + specialDiscount);

    const payAtVenue = toNumber(
      booking.venuePayment ??
        (booking as any).venueAmount ??
        (totalAmount > 0 ? Math.max(totalAmount - slotBookingFee, 0) : 0),
    );

    const selectedItemLines: string[] = [];
    let selectedItemsTotal = 0;

    const serviceLabelFromKey = (key: string) => {
      if (key === 'selectedMovies') return 'Movies';
      const name = key.replace(/^selected/, '').replace(/([A-Z])/g, ' $1').trim();
      return name || 'Items';
    };

    Object.keys(booking).forEach((key) => {
      if (!key.startsWith('selected') || !Array.isArray((booking as any)[key])) return;
      const arr = (booking as any)[key] as any[];
      if (!arr.length) return;
      const serviceLabel = serviceLabelFromKey(key);

      arr.forEach((entry) => {
        if (!entry) return;
        if (typeof entry === 'string') {
          selectedItemLines.push(`- ${serviceLabel}: ${entry}`);
          return;
        }
        if (typeof entry === 'object') {
          const name = String(entry.name ?? entry.title ?? entry.id ?? 'Item').trim();
          const qty = Math.max(1, toNumber(entry.quantity ?? entry.qty ?? 1) || 1);
          const unitPrice = toNumber(entry.price ?? entry.cost ?? entry.amount);
          const rowTotal = toNumber(entry.totalPrice ?? entry.total ?? (unitPrice > 0 ? unitPrice * qty : 0));
          if (rowTotal > 0) {
            selectedItemsTotal += rowTotal;
            selectedItemLines.push(`- ${serviceLabel}: ${name}${qty > 1 ? ` × ${qty}` : ''} = ${formatMoney(rowTotal)}`);
          } else {
            selectedItemLines.push(`- ${serviceLabel}: ${name}${qty > 1 ? ` × ${qty}` : ''}`);
          }
        }
      });
    });

    const occasionLines: string[] = [];
    if (booking.occasion) {
      const addOccasionLine = (label: string, rawValue: unknown) => {
        const displayValue = formatValueLocal(rawValue);
        if (!displayValue) return;
        occasionLines.push(`- ${label}: ${displayValue}`);
      };

      Object.keys(booking).forEach((key) => {
        if (!key.endsWith('_label')) return;
        const label = (booking as any)[key];
        if (!label) return;
        const fieldKey = key.replace('_label', '');
        addOccasionLine(String(label).trim(), (booking as any)[fieldKey]);
      });

      if (booking.occasionData && typeof booking.occasionData === 'object') {
        Object.entries(booking.occasionData).forEach(([fieldKey, rawValue]) => {
          addOccasionLine(formatLabelLocal(fieldKey), rawValue);
        });
      }

      legacyFallbackKeysLocal.forEach((fieldKey) => {
        const rawValue = (booking as any)[fieldKey];
        addOccasionLine(formatLabelLocal(fieldKey), rawValue);
      });
    }

    const lines = [
      'Booking Details',
      '',
      'Customer Information',
      booking.customerName ? `- Name: ${booking.customerName}` : '',
      booking.email ? `- Email: ${booking.email}` : '',
      booking.phone ? `- Phone: ${String(booking.phone)}` : '',
      '',
      'Booking Information',
      bookingId ? `- Booking ID: ${bookingId}` : '',
      ticketNumber ? `- Ticket No: ${ticketNumber}` : '',
      theaterName ? `- Theater: ${theaterName}` : '',
      booking.date ? `- Date: ${booking.date}` : '',
      booking.time ? `- Time: ${booking.time}` : '',
      booking.occasion ? `- Occasion: ${booking.occasion}` : '',
      (booking.numberOfPeople ? `- Guests: ${booking.numberOfPeople}` : ''),
      '',
      ...(occasionLines.length ? ['Occasion Details', ...occasionLines, ''] : []),
      ...(selectedItemLines.length
        ? [
            'Selected Items',
            ...selectedItemLines,
            (selectedItemsTotal > 0 ? `Selected Items Cost: ${formatMoney(selectedItemsTotal)}` : ''),
            '',
          ]
        : []),
      'Payment Summary',
      (theaterBasePrice > 0 ? `- Theater Price: ${formatMoney(theaterBasePrice)}` : ''),
      (decorationFee > 0 ? `- Decoration Fee: ${formatMoney(decorationFee)}` : ''),
      (selectedItemsTotal > 0 ? `- Selected Items Cost: ${formatMoney(selectedItemsTotal)}` : ''),
      (slotBookingFee > 0 ? `- Slot Booking Fee: ${formatMoney(slotBookingFee)}` : ''),
      (totalDiscount > 0 ? `- Discount: -${formatMoney(totalDiscount)}` : ''),
      (payAtVenue > 0 ? `- Pay at Venue: ${formatMoney(payAtVenue)}` : ''),
      (totalAmount > 0 ? `- Total Amount: ${formatMoney(totalAmount)}` : ''),
    ].filter((line) => typeof line === 'string' && line.trim().length > 0);

    return lines.join('\n');
  })();

  const openWhatsAppToNumber = (targetNumber: string) => {
    const normalized = normalizeWhatsAppNumber(targetNumber);
    if (!normalized) return;
    const url = `https://wa.me/${encodeURIComponent(normalized)}?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOpenWhatsAppModal = () => {
    setWhatsAppMode('choose');
    setOtherWhatsAppNumberRaw('');
    setIsWhatsAppModalOpen(true);
  };

  const handleCloseWhatsAppModal = () => {
    setIsWhatsAppModalOpen(false);
    setWhatsAppMode('choose');
    setOtherWhatsAppNumberRaw('');
  };

  const handleSendToCustomerWhatsApp = () => {
    if (!whatsappNumber) return;
    openWhatsAppToNumber(whatsappNumber);
    handleCloseWhatsAppModal();
  };

  const handleSwitchToOtherWhatsApp = () => {
    setWhatsAppMode('other');
  };

  const handleSendToOtherWhatsApp = () => {
    const normalized = normalizeWhatsAppNumber(otherWhatsAppNumberRaw);
    if (!normalized) return;
    openWhatsAppToNumber(normalized);
    handleCloseWhatsAppModal();
  };

  const slotBookingFeePaymentMethod = (() => {
    const rawMethod =
      (booking as any).advancePaymentMethod ||
      (booking as any).paymentMode ||
      (booking as any).paymentMethod ||
      (booking as any).finalPaymentMethod ||
      (booking as any).venuePaymentMethod ||
      '';

    const normalized = String(rawMethod || '').trim().toLowerCase();
    if (normalized === 'online_payment') return 'online';
    if (normalized === 'online') return 'online';
    if (normalized === 'upi') return 'upi';
    if (normalized === 'cash') return 'cash';
    if ((booking as any).status === 'manual') return 'cash';
    return 'online';
  })();

  const shouldShowVenuePaymentMethod = (() => {
    const status = String((booking as any).paymentStatus || '').toLowerCase();
    return status === 'paid';
  })();

  const venuePaymentMethodBadge = (() => {
    const rawMethod =
      (booking as any).venuePaymentMethod ||
      (booking as any).finalPaymentMethod ||
      (booking as any).paymentMode ||
      (booking as any).paymentMethod ||
      (booking as any).advancePaymentMethod ||
      '';

    const normalized = String(rawMethod || '').trim().toLowerCase();
    if (normalized === 'online_payment') return 'online';
    if (normalized === 'online') return 'online';
    if (normalized === 'upi') return 'upi';
    if (normalized === 'cash') return 'cash';
    if ((booking as any).status === 'manual') return 'cash';
    return 'online';
  })();

  const paidMeta = (() => {
    const status = String((booking as any).paymentStatus || '').toLowerCase();
    if (status !== 'paid') return null;
    const paidByRaw = (booking as any).paidBy || (booking as any).paid_by || '';
    const staffNameRaw = (booking as any).staffName || (booking as any).staff_name || '';
    const actor = String(staffNameRaw || paidByRaw || '').trim();
    const paidAtRaw = (booking as any).paidAt || (booking as any).paid_at || '';
    let timeLabel = '';
    if (paidAtRaw) {
      try {
        timeLabel = new Date(paidAtRaw).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      } catch {
        timeLabel = String(paidAtRaw);
      }
    }
    if (!actor && !timeLabel) return null;
    return { actor, timeLabel };
  })();

  const createdByMeta = (() => {
    const raw = (booking as any).createdBy;
    if (!raw) return null;

    if (typeof raw === 'string') {
      const v = raw.trim();
      if (!v) return null;
      return { role: '', name: v, id: '' };
    }

    if (typeof raw === 'object') {
      const typeRaw = (raw as any).type ?? (raw as any).role ?? '';
      const type = String(typeRaw || '').trim().toLowerCase();

      if (type === 'staff') {
        const name =
          String((raw as any).staffName || (booking as any).staffName || 'Staff').trim();
        const id = String((raw as any).staffId || (booking as any).staffId || (booking as any).userId || '').trim();
        return { role: 'Staff', name, id };
      }

      if (type === 'admin' || type === 'administrator') {
        const name = String((raw as any).adminName || 'Administrator').trim();
        return { role: 'Admin', name, id: '' };
      }

      if (type === 'customer') {
        return { role: 'Customer', name: '', id: '' };
      }
    }

    return null;
  })();

  const shouldShowCreatedBy = (() => {
    const status = String((booking as any).status || '').toLowerCase();
    const bookingType = String((booking as any).bookingType || '').toLowerCase();
    return status === 'manual' || bookingType === 'manual' || Boolean((booking as any).isManualBooking);
  })();

  const createdAtDisplay = (() => {
    if (booking.createdAtIST) return booking.createdAtIST;
    const raw = (booking as any).createdAt || (booking as any).created_at;
    if (!raw) return '';
    try {
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
  })();

  const bookingOccasion = occasions.find(occ => occ.name === booking.occasion);
  const hasLegacyLabelEntries = Object.keys(booking).some((key) => key.endsWith('_label') && booking[key]);
  const hasOccasionData = !!(booking.occasionData && Object.keys(booking.occasionData).length > 0);

  const legacyFallbackKeys = [
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
    'babyShowerParentName',
    'babyGender',
    'farewellPersonName',
    'farewellReason',
    'congratulationsPersonName',
    'congratulationsReason',
    'occasionPersonName'
  ];

  const formatLabel = (fieldKey: string) => {
    const labelFromOccasion = bookingOccasion?.fieldLabels?.[fieldKey];
    if (labelFromOccasion) {
      return labelFromOccasion;
    }
    return fieldKey
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const formatValue = (value: unknown) => {
    if (value === null || value === undefined) {
      return '';
    }
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : '';
    }
    if (typeof value === 'object') {
      return '';
    }
    return String(value).trim();
  };

  const handleEditClick = () => {
    if (onEdit) {
      onEdit(booking);
    } else {
      // Default edit behavior - store in sessionStorage
      sessionStorage.setItem('editingBooking', JSON.stringify({
        bookingId: booking.id || booking.bookingId || booking._id,
        isEditing: true,
        isAdminEdit: true,
        ...booking
      }));
    }
    onClose();
  };

  return (
    <>
      <div className="booking-detail-popup">
        <div className="popup-overlay" onClick={onClose}></div>
        <div className="popup-content">
          <div className="popup-header">
            <h3>Booking Details</h3>
            <div className="header-actions">
              <button
                className="whatsapp-btn-header"
                onClick={handleOpenWhatsAppModal}
                type="button"
              >
                Send to WhatsApp
              </button>
              <button className="close-btn" onClick={onClose}>×</button>
            </div>
          </div>
          {isWhatsAppModalOpen && (
            <div className="whatsapp-modal-overlay" onClick={handleCloseWhatsAppModal}>
              <div className="whatsapp-modal" onClick={(e) => e.stopPropagation()}>
                <div className="whatsapp-modal-title">Send to WhatsApp</div>
                {whatsAppMode === 'choose' ? (
                  <div className="whatsapp-modal-actions">
                    <button
                      type="button"
                      className="whatsapp-option-btn"
                      onClick={handleSendToCustomerWhatsApp}
                      disabled={!whatsappNumber}
                    >
                      Customer No
                    </button>
                    <button
                      type="button"
                      className="whatsapp-option-btn whatsapp-option-btn-secondary"
                      onClick={handleSwitchToOtherWhatsApp}
                    >
                      Other No
                    </button>
                    <button
                      type="button"
                      className="whatsapp-cancel-btn"
                      onClick={handleCloseWhatsAppModal}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="whatsapp-modal-other">
                    <input
                      className="whatsapp-input"
                      value={otherWhatsAppNumberRaw}
                      onChange={(e) => setOtherWhatsAppNumberRaw(e.target.value)}
                      placeholder="Enter mobile number"
                      inputMode="tel"
                      autoFocus
                    />
                    <div className="whatsapp-modal-actions">
                      <button
                        type="button"
                        className="whatsapp-send-btn"
                        onClick={handleSendToOtherWhatsApp}
                        disabled={!normalizeWhatsAppNumber(otherWhatsAppNumberRaw)}
                      >
                        Send
                      </button>
                      <button
                        type="button"
                        className="whatsapp-cancel-btn"
                        onClick={handleCloseWhatsAppModal}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="popup-body">
            <div className="detail-section">
              <h4>Customer Information</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="label">Name:</span>
                  <span className="value">{booking.customerName}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Email:</span>
                  <span className="value">{booking.email || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Ticket No:</span>
                  <span className="value">{(booking as any).ticketNumber || (booking as any).ticket_number || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Phone:</span>
                  <span className="value">{booking.phone || 'N/A'}</span>
                </div>
              </div>
            </div>
            
            <div className="detail-section">
              <h4>Booking Information</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="label">Theater:</span>
                  <span className="value">{booking.theater}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Date:</span>
                  <span className="value">{booking.date}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Time:</span>
                  <span className="value">{booking.time}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Status:</span>
                  <span className={`status-badge ${booking.status.toLowerCase()}`}>
                    {booking.status}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="label">Amount:</span>
                  <span className="value">₹{(booking.amount || 0).toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Occasion:</span>
                  <span className="value">{booking.occasion || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Number of People:</span>
                  <span className="value">
                    {booking.numberOfPeople}
                    {(() => {
                      // Show theater base capacity if available
                      const baseCapacity = booking.baseCapacity || booking.theaterCapacity?.min;
                      if (baseCapacity) {
                        return ` (Base Capacity: ${baseCapacity})`;
                      }
                      return '';
                    })()}
                  </span>
                </div>

                <div className="detail-item">
                  <span className="label">Created At (IST):</span>
                  <span className="value">{createdAtDisplay || 'N/A'}</span>
                </div>
                {/* Show Created By information for manual bookings */}
                {shouldShowCreatedBy && createdByMeta && (
                  <div className="detail-item">
                    <span className="label">Created By:</span>
                    <span className="value payment-value-with-badge">
                      {createdByMeta.role ? (
                        <span className="payment-method-badge createdby-role">{createdByMeta.role}</span>
                      ) : null}
                      {createdByMeta.name ? (
                        <span className="payment-method-badge actor">{createdByMeta.name}</span>
                      ) : null}
                      {createdByMeta.id ? (
                        <span className="payment-method-badge time">{createdByMeta.id}</span>
                      ) : null}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Occasion-Specific Information */}
            {booking.occasion && (
              <div className="detail-section">
                <h4>Occasion Details</h4>
                <div className="detail-grid">
                  {/* Dynamic Occasion Fields - Show all fields with labels */}
                  {Object.keys(booking).map((key) => {
                    if (!key.endsWith('_label') || !booking[key]) {
                      return null;
                    }

                    const fieldKey = key.replace('_label', '');
                    const rawValue = booking[fieldKey];
                    if (!rawValue || typeof rawValue === 'object') {
                      return null;
                    }

                    const displayValue = formatValue(rawValue);
                    if (!displayValue) {
                      return null;
                    }

                    return (
                      <div key={key} className="detail-item">
                        <span className="label">{booking[key]}:</span>
                        <span className="value">{displayValue}</span>
                      </div>
                    );
                  })}

                  {!hasLegacyLabelEntries && hasOccasionData &&
                    Object.entries(booking.occasionData ?? {}).map(([fieldKey, rawValue]) => {
                      const displayValue = formatValue(rawValue);
                      if (!displayValue) {
                        return null;
                      }
                      return (
                        <div key={`occasionData_${fieldKey}`} className="detail-item">
                          <span className="label">{formatLabel(fieldKey)}:</span>
                          <span className="value">{displayValue}</span>
                        </div>
                      );
                    })
                  }

                  {!hasLegacyLabelEntries && !hasOccasionData && legacyFallbackKeys.map((fieldKey) => {
                    const value = (booking as any)[fieldKey];
                    const displayValue = formatValue(value);
                    if (!displayValue) {
                      return null;
                    }
                    return (
                      <div key={`legacy_${fieldKey}`} className="detail-item">
                        <span className="label">{formatLabel(fieldKey)}:</span>
                        <span className="value">{displayValue}</span>
                      </div>
                    );
                  })}

                  {/* Show a message if no occasion details found */}
                  {!hasLegacyLabelEntries && !hasOccasionData &&
                    !legacyFallbackKeys.some((fieldKey) => formatValue((booking as any)[fieldKey])) && (
                      <div className="detail-item">
                        <span className="label">Details:</span>
                        <span className="value">
                          No additional occasion details available 
                          <br />
                          <small style={{ color: '#666', fontSize: '0.85em' }}>
                            (booking created before dynamic fields were implemented)
                          </small>
                        </span>
                      </div>
                  )}
                </div>
              </div>
            )}

            {/* Selected Items (conditional) - Dynamic check for any service items */}
            {(() => {
              // Check for movies
              const hasMovies = Array.isArray(booking.selectedMovies) && booking.selectedMovies.length > 0;
              
              // Check for any dynamic service items (fields starting with "selected")
              const hasDynamicItems = Object.keys(booking).some(key => 
                key.startsWith('selected') && 
                key !== 'selectedMovies' && 
                Array.isArray(booking[key]) && 
                booking[key].length > 0
              );
              
              return hasMovies || hasDynamicItems;
            })() && (
              <div className="detail-section">
                <h4>Selected Items</h4>
                <div className="items-container">
                  {/* Movies Section */}
                  {Array.isArray(booking.selectedMovies) && booking.selectedMovies.length > 0 && (
                    <div className="items-category">
                      <h5 className="category-title">Movies</h5>
                      <div className="items-list">
                        {booking.selectedMovies.map((movie: any, index: number) => {
                          // Extract full movie name from different possible formats
                          let movieName = 'Unknown Movie';
                          if (typeof movie === 'string') {
                            movieName = movie;
                          } else if (typeof movie === 'object') {
                            // Try different name fields and clean up the name
                            movieName = movie?.name || movie?.title || movie?.movieName || movie?.id || 'Unknown Movie';
                            
                            // Clean up movie name if it contains ID prefixes
                            if (movieName && typeof movieName === 'string') {
                              // Remove common ID patterns like "questions_and..." -> "Questions And..."
                              if (movieName.includes('_')) {
                                movieName = movieName
                                  .split('_')
                                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                  .join(' ');
                              }
                              // Remove "..." at the end and replace with full name
                              if (movieName.endsWith('...')) {
                                movieName = movieName.replace('...', '');
                              }
                            }
                          }
                          
                          const moviePrice = typeof movie === 'object' ? movie?.price : 0;
                          const movieQuantity = typeof movie === 'object' ? movie?.quantity : 1;
                          
                          return (
                            <div key={index} className="item-card">
                              <div className="item-info">
                                <span className="item-name">{movieName}</span>
                                {typeof movie === 'object' && (
                                  <div className="item-details">
                                    <span className="item-quantity">Qty: {movieQuantity}</span>
                                    <span className="item-price">₹{moviePrice?.toLocaleString() || 0}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Dynamic Service Items Sections */}
                  {Object.keys(booking)
                    .filter(key => 
                      key.startsWith('selected') && 
                      key !== 'selectedMovies' && 
                      Array.isArray(booking[key]) && 
                      booking[key].length > 0
                    )
                    .map(serviceKey => {
                      const serviceName = serviceKey.replace('selected', '');
                      const serviceItems = booking[serviceKey];
                      
                      return (
                        <div key={serviceKey} className="items-category">
                          <h5 className="category-title">{serviceName}</h5>
                          <div className="items-list">
                            {serviceItems.map((item: any, index: number) => {
                              const itemName = typeof item === 'string' ? item : (item?.name ?? item?.title ?? item?.id ?? `Unknown ${serviceName}`);
                              const itemPrice = typeof item === 'object' ? item?.price : 0;
                              const itemQuantity = typeof item === 'object' ? item?.quantity : 1;
                              
                              return (
                                <div key={index} className="item-card">
                                  <div className="item-info">
                                    <span className="item-name">{itemName}</span>
                                    {typeof item === 'object' && (
                                      <div className="item-details">
                                        <span className="item-quantity">Qty: {itemQuantity}</span>
                                        <span className="item-price">₹{itemPrice?.toLocaleString() || 0}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  }

                  {/* Items Total */}
                  {(() => {
                    let totalItemsPrice = 0;
                    
                    // Calculate total from all items dynamically
                    Object.keys(booking).forEach(key => {
                      if (key.startsWith('selected') && Array.isArray(booking[key])) {
                        booking[key].forEach((item: any) => {
                          if (typeof item === 'object' && item?.price && item?.quantity) {
                            totalItemsPrice += item.price * item.quantity;
                          }
                        });
                      }
                    });
                    
                    if (totalItemsPrice > 0) {
                      return (
                        <div className="items-total">
                          <div className="total-line">
                            <span className="total-label">Total Items Cost:</span>
                            <span className="total-amount">₹{totalItemsPrice.toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    }
                    
                    return null;
                  })()}
                </div>
              </div>
            )}

            {!hidePaymentSummary && (
            <div className="detail-section">
              <h4>Payment Summary</h4>
              <div className="detail-grid">
                {/* 1. Booking ID */}
                <div className="detail-item">
                  <span className="label">Booking ID:</span>
                  <span className="value">{booking.originalBookingId || booking.id}</span>
                </div>
                
                {/* 2. Theater Base Price */}
                <div className="detail-item">
                  <span className="label">Theater Base Price:</span>
                  <span className="value">₹{(booking.pricingData?.theaterBasePrice || 1399).toLocaleString()}</span>
                </div>
                
                {/* 3. Extra Guest Fee (per guest rate) */}
                {booking.pricingData?.extraGuestFee && (
                  <div className="detail-item">
                    <span className="label">Extra Guest Fee:</span>
                    <span className="value">₹{booking.pricingData.extraGuestFee.toLocaleString()} per guest</span>
                  </div>
                )}
                
                {/* 4. Price of Guests (total extra guest charges) */}
                {(() => {
                  const numberOfPeople = booking.numberOfPeople || 2;
                  const extraGuestFee = booking.pricingData?.extraGuestFee || 299;
                  const storedExtraGuestCharges = booking.extraGuestCharges;
                  const storedExtraGuestsCount = booking.extraGuestsCount;
                  
                  const getTheaterCapacity = (theaterName: string) => {
                    if (theaterName?.includes('EROS') || theaterName?.includes('FMT-Hall-1')) return { min: 2, max: 4 };
                    if (theaterName?.includes('PHILIA') || theaterName?.includes('FMT-Hall-2')) return { min: 2, max: 6 };
                    if (theaterName?.includes('PRAGMA') || theaterName?.includes('FMT-Hall-3')) return { min: 2, max: 8 };
                    if (theaterName?.includes('STORGE') || theaterName?.includes('FMT-Hall-4')) return { min: 2, max: 10 };
                    return { min: 2, max: 10 };
                  };
                  
                  const capacity = getTheaterCapacity(booking.theater || booking.theaterName || '');
                  // Use stored baseCapacity if available, otherwise calculate
                  const baseCapacity = booking.baseCapacity || booking.theaterCapacity?.min || capacity.min;
                  const extraGuests = storedExtraGuestsCount !== undefined ? storedExtraGuestsCount : Math.max(0, numberOfPeople - baseCapacity);
                  const extraGuestCharges = storedExtraGuestCharges || (extraGuests * extraGuestFee);
                  
                  if (extraGuests > 0) {
                    return (
                      <div className="detail-item">
                        <span className="label">Price of Guests:</span>
                        <span className="value">
                          {extraGuests} guest{extraGuests > 1 ? 's' : ''} × ₹{extraGuestFee.toLocaleString()} = ₹{extraGuestCharges.toLocaleString()}
                        </span>
                      </div>
                    );
                  } else {
                    return (
                      <div className="detail-item">
                        <span className="label">Price of Guests:</span>
                        <span className="value">No extra guests (Base capacity: {booking.baseCapacity || booking.theaterCapacity?.min || capacity.min})</span>
                      </div>
                    );
                  }
                })()}
                
                {/* 5. Decoration Fees (if applicable) */}
                {(() => {
                  const decorationSelected =
                    booking.wantDecorItems === 'Yes' ||
                    booking.selectedServices?.['__decoration__'] === 'Yes' ||
                    booking.decorationFee ||
                    booking.decorationAppliedFee;
                  const decorationFee =
                    booking.decorationFee ??
                    booking.decorationAppliedFee ??
                    booking.pricingData?.decorationFees ??
                    0;
                  if (!decorationSelected || !decorationFee) return null;
                  return (
                    <div className="detail-item">
                      <span className="label">Decoration Fees:</span>
                      <span className="value">₹{Number(decorationFee).toLocaleString()}</span>
                    </div>
                  );
                })()}

                {/* 6. Slot Booking Fee */}
                <div className="detail-item">
                  <span className="label">Slot Booking Fee:</span>
                  <span className="value payment-value-with-badge">
                    ₹{(
                      Number(
                        (booking as any).slotBookingFee ??
                          booking.pricingData?.slotBookingFee ??
                          499,
                      )
                    ).toLocaleString()}
                    <span className={`payment-method-badge ${slotBookingFeePaymentMethod}`}>
                      {slotBookingFeePaymentMethod.toUpperCase()}
                    </span>
                  </span>
                </div>

                {(() => {
                  const items: Array<{ name: string; quantity: number; unitPrice: number; total: number }> = [];

                  Object.keys(booking).forEach((key) => {
                    if (!key.startsWith('selected') || !Array.isArray(booking[key])) return;
                    booking[key].forEach((raw: any) => {
                      if (!raw || typeof raw !== 'object') return;

                      const name = String(raw?.name ?? raw?.title ?? raw?.id ?? '').trim();
                      if (!name) return;

                      const unitPrice = Number(raw?.price ?? raw?.cost ?? 0);
                      const quantity = Number(raw?.quantity ?? 1);
                      const total = Math.max(unitPrice * (Number.isFinite(quantity) ? quantity : 1), 0);
                      if (!Number.isFinite(total) || total <= 0) return;

                      items.push({ name, quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1, unitPrice, total });
                    });
                  });

                  const itemsSubtotal = items.reduce((sum, item) => sum + item.total, 0);
                  if (!itemsSubtotal || items.length === 0) return null;

                  return (
                    <div className="detail-item payment-items-breakdown">
                      <span className="label">Items</span>
                      <span className="value">
                        <div className="payment-items-box">
                          <div className="payment-items-list">
                            {items.map((item, idx) => (
                              <div key={idx} className="payment-item-row">
                                <span className="payment-item-name">
                                  {item.quantity > 1 ? `${item.name} × ${item.quantity}` : item.name}
                                </span>
                                <span className="payment-item-price">₹{item.total.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                          <div className="payment-items-subtotal">
                            <span className="payment-items-subtotal-label">Subtotal</span>
                            <span className="payment-items-subtotal-value">₹{itemsSubtotal.toLocaleString()}</span>
                          </div>
                        </div>
                      </span>
                    </div>
                  );
                })()}
                
                {/* 7. Payable Amount */}
                <div className="detail-item">
                  <span className="label">Payable Amount:</span>
                  <span className="value payment-value-with-badge">
                    ₹{(booking.venuePayment || (((booking.totalAmount ?? booking.amount) as number || 0) - (booking.pricingData?.slotBookingFee || 499))).toLocaleString()}
                    {shouldShowVenuePaymentMethod && (
                      <span className={`payment-method-badge ${venuePaymentMethodBadge}`}>
                        {venuePaymentMethodBadge.toUpperCase()}
                      </span>
                    )}
                  </span>
                </div>

                {paidMeta && (
                  <div className="detail-item">
                    <span className="label">Marked Paid By:</span>
                    <span className="value payment-value-with-badge">
                      {paidMeta.actor ? (
                        <span className="payment-method-badge actor">
                          {paidMeta.actor}
                        </span>
                      ) : null}
                      {paidMeta.timeLabel ? (
                        <span className="payment-method-badge time">
                          {paidMeta.timeLabel}
                        </span>
                      ) : null}
                    </span>
                  </div>
                )}
                
                {/* 8. Coupon Discount (if applied) */}
                {(() => {
                  const specialDiscountAmount = Number(
                    booking.specialDiscount ??
                      booking.pricingData?.specialDiscount ??
                      booking.adminDiscount ??
                      booking.pricingData?.adminDiscount ??
                      0,
                  );
                  if (!specialDiscountAmount) return null;
                  return (
                    <div className="detail-item">
                      <span className="label">Special Discount:</span>
                      <span className="value" style={{ color: "#DC2626" }}>-₹{specialDiscountAmount.toLocaleString()}</span>
                    </div>
                  );
                })()}

                {(() => {
                  const discountAmount = Number(
                    booking.Discount ??
                      booking.pricingData?.discount ??
                      0,
                  );
                  if (!discountAmount) return null;
                  return (
                    <div className="detail-item">
                      <span className="label">Discount:</span>
                      <span className="value" style={{ color: "#DC2626" }}>-₹{discountAmount.toLocaleString()}</span>
                    </div>
                  );
                })()}

                {(() => {
                  const penaltyChargesAmount = Number(
                    booking.penaltyCharges ??
                      booking.penaltyCharge ??
                      booking.pricingData?.penaltyCharges ??
                      booking.pricingData?.penaltyCharge ??
                      0,
                  );
                  if (!penaltyChargesAmount) return null;
                  return (
                    <div className="detail-item">
                      <span className="label">Penalty Charges:</span>
                      <span className="value" style={{ color: "#1D4ED8" }}>₹{penaltyChargesAmount.toLocaleString()}</span>
                    </div>
                  );
                })()}

                {(() => {
                  const discountAmount = Number(
                    booking.discountAmount ??
                      booking.couponDiscount ??
                      0,
                  );
                  if (!discountAmount) return null;
                  const couponLabelParts: string[] = [];
                  const couponCode =
                    booking.appliedCouponCode ||
                    booking.discountSummary?.code;
                  const discountType =
                    booking.couponDiscountType ||
                    booking.discountSummary?.type;
                  const discountValue =
                    booking.couponDiscountValue ??
                    booking.discountSummary?.value ??
                    null;

                  if (couponCode) couponLabelParts.push(couponCode);
                  if (discountType === 'percentage' && typeof discountValue === 'number') {
                    couponLabelParts.push(`${discountValue}%`);
                  } else if (discountType && typeof discountValue === 'number') {
                    couponLabelParts.push(`₹${discountValue}`);
                  }

                  return (
                    <div className="detail-item">
                      <span className="label">
                        Coupon Discount
                        {couponLabelParts.length ? ` (${couponLabelParts.join(' · ')})` : ''}
                      </span>
                      <span className="value" style={{ color: '#DC2626' }}>-₹{Number(discountAmount).toLocaleString()}</span>
                    </div>
                  );
                })()}

                {/* 9. Totals */}
                {(() => {
                  const totalAfter = Number(
                    booking.totalAmountAfterDiscount ??
                      booking.totalAmount ??
                      booking.amount ??
                      0,
                  );

                  const couponDiscount = Number(
                    booking.discountAmount ??
                      booking.couponDiscount ??
                      0,
                  );

                  const specialDiscountAmount = Number(
                    booking.specialDiscount ??
                      booking.pricingData?.specialDiscount ??
                      booking.adminDiscount ??
                      booking.pricingData?.adminDiscount ??
                      0,
                  );

                  const genericDiscountAmount = Number(
                    booking.Discount ??
                      booking.pricingData?.discount ??
                      0,
                  );

                  const totalBefore = Number(
                    booking.totalAmountBeforeDiscount ??
                      (totalAfter + specialDiscountAmount + genericDiscountAmount + couponDiscount),
                  );

                  return (
                    <>
                      <div className="detail-item">
                        <span className="label">Subtotal (Before Discount):</span>
                        <span className="value">₹{Number(totalBefore).toLocaleString()}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Total After Discount:</span>
                        <span className="value" style={{ fontWeight: 'bold', color: '#28a745' }}>
                          ₹{Number(totalAfter).toLocaleString()}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Booking Detail Popup */
        .booking-detail-popup {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .popup-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          cursor: pointer;
        }

        .popup-content {
          position: relative;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #eee;
        }

        .popup-header h3 {
          margin: 0;
          color: #333;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .edit-btn-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .edit-btn-header:hover {
          background: #0056b3;
          transform: translateY(-1px);
        }

        .edit-btn-header span {
          font-size: 16px;
        }

        .whatsapp-btn-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #25d366;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .whatsapp-btn-header:hover {
          background: #128c7e;
          transform: translateY(-1px);
        }

        .whatsapp-btn-header:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .whatsapp-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .whatsapp-modal {
          width: 100%;
          max-width: 420px;
          background: #ffffff;
          border-radius: 12px;
          padding: 18px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
        }

        .whatsapp-modal-title {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 12px;
        }

        .whatsapp-modal-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .whatsapp-option-btn {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 12px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          font-weight: 700;
          font-size: 14px;
          background: #25d366;
          color: #ffffff;
          transition: all 0.2s ease;
        }

        .whatsapp-option-btn:hover {
          background: #128c7e;
        }

        .whatsapp-option-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .whatsapp-option-btn-secondary {
          background: #111827;
        }

        .whatsapp-option-btn-secondary:hover {
          background: #0b1220;
        }

        .whatsapp-modal-other {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .whatsapp-input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          font-size: 14px;
          outline: none;
        }

        .whatsapp-send-btn {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 12px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          font-weight: 800;
          font-size: 14px;
          background: #25d366;
          color: #ffffff;
          transition: all 0.2s ease;
        }

        .whatsapp-send-btn:hover {
          background: #128c7e;
        }

        .whatsapp-send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .whatsapp-cancel-btn {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          cursor: pointer;
          font-weight: 700;
          font-size: 14px;
          background: #ffffff;
          color: #111827;
          transition: all 0.2s ease;
        }

        .whatsapp-cancel-btn:hover {
          background: #f3f4f6;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #666;
          padding: 0.5rem;
          border-radius: 50%;
          transition: all 0.2s ease;
        }

        .close-btn:hover {
          background: #f5f5f5;
          color: #333;
        }

        .popup-body {
          padding: 1.5rem;
        }

        .detail-section {
          margin-bottom: 2rem;
        }

        .detail-section h4 {
          margin: 0 0 1rem 0;
          color: #333;
          font-size: 1.1rem;
          font-weight: 600;
          border-bottom: 2px solid #007bff;
          padding-bottom: 0.5rem;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .detail-item .label {
          font-weight: 600;
          color: #555;
          font-size: 0.9rem;
        }

        .detail-item .value {
          color: #333;
          font-size: 0.95rem;
        }

        .payment-value-with-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .payment-method-badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 10px;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          line-height: 1.3;
          text-transform: uppercase;
          border: 1px solid transparent;
          background: #f1f5f9;
          color: #0f172a;
        }

        .payment-method-badge.online {
          background: #e0f2fe;
          border-color: #7dd3fc;
          color: #075985;
        }

        .payment-method-badge.upi {
          background: #dcfce7;
          border-color: #86efac;
          color: #166534;
        }

        .payment-method-badge.cash {
          background: #fff7ed;
          border-color: #fdba74;
          color: #9a3412;
        }

        .payment-method-badge.actor {
          background: #ede9fe;
          border-color: #c4b5fd;
          color: #5b21b6;
          text-transform: none;
        }

        .payment-method-badge.time {
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #334155;
          text-transform: none;
          font-weight: 800;
        }

        .payment-method-badge.createdby-role {
          background: #f1f5f9;
          border-color: #cbd5e1;
          color: #0f172a;
        }

        .payment-items-breakdown {
          grid-column: 1 / -1;
        }

        .payment-items-box {
          margin-top: 0.5rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 0.75rem;
        }

        .payment-items-list {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .payment-item-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }

        .payment-item-name {
          color: #334155;
          font-size: 0.9rem;
          line-height: 1.35;
          flex: 1;
          word-break: break-word;
        }

        .payment-item-price {
          color: #0f172a;
          font-weight: 700;
          font-size: 0.9rem;
          white-space: nowrap;
        }

        .payment-items-subtotal {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.6rem;
          padding-top: 0.6rem;
          border-top: 1px dashed #cbd5e1;
        }

        .payment-items-subtotal-label {
          font-size: 0.85rem;
          color: #64748b;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .payment-items-subtotal-value {
          font-size: 0.95rem;
          color: #16a34a;
          font-weight: 800;
        }

        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
          text-transform: uppercase;
        }

        .status-badge.confirmed {
          background: #d4edda;
          color: #155724;
        }

        .status-badge.pending {
          background: #fff3cd;
          color: #856404;
        }

        .status-badge.cancelled {
          background: #f8d7da;
          color: #721c24;
        }

        .status-badge.completed {
          background: #d1ecf1;
          color: #0c5460;
        }

        .status-badge.manual {
          background: #f8d7da;
          color: #721c24;
        }

        .status-badge.incomplete {
          background: #e2e3e5;
          color: #383d41;
        }

        /* Items Container Styles */
        .items-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .items-category {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 1rem;
          border-left: 4px solid #007bff;
        }

        .category-title {
          margin: 0 0 1rem 0;
          color: #333;
          font-size: 1rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .items-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .item-card {
          background: white;
          border-radius: 6px;
          padding: 0.75rem;
          border: 1px solid #e9ecef;
          transition: all 0.2s ease;
        }

        .item-card:hover {
          box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
          border-color: #007bff;
        }

        .item-info {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }

        .item-name {
          font-weight: 500;
          color: #333;
          flex: 1;
          line-height: 1.4;
          word-wrap: break-word;
          overflow-wrap: break-word;
          hyphens: auto;
          max-width: 100%;
        }

        .item-details {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.25rem;
          min-width: fit-content;
        }

        .item-quantity {
          font-size: 0.85rem;
          color: #666;
          background: #e9ecef;
          padding: 0.2rem 0.5rem;
          border-radius: 12px;
        }

        .item-price {
          font-weight: 600;
          color: #28a745;
          font-size: 0.9rem;
        }

        .items-total {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 2px solid #007bff;
        }

        .total-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 1.1rem;
        }

        .total-label {
          font-weight: 600;
          color: #333;
        }

        .total-amount {
          font-weight: 700;
          color: #28a745;
          font-size: 1.2rem;
        }

        @media (max-width: 768px) {
          .popup-content {
            width: 95%;
            margin: 1rem;
          }

          .detail-grid {
            grid-template-columns: 1fr;
          }

          .popup-header {
            padding: 1rem;
          }

          .popup-body {
            padding: 1rem;
          }

          .item-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .item-details {
            align-items: flex-start;
            flex-direction: row;
            gap: 1rem;
          }
        }

        @media (max-width: 480px) {
          .popup-content {
            width: 100%;
            height: 100vh;
            border-radius: 0;
            max-height: none;
          }

          .popup-header h3 {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </>
  );
}
