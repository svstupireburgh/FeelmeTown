'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface FoodItem {
  id?: string;
  name: string;
  price: number;
  quantity: number;
  // true when this item comes from a decoration service
  isDecoration?: boolean;
  categoryName?: string;
  pricingMode?: 'single' | 'half-full' | 'three-size';
  halfPrice?: number;
  fullPrice?: number;
  smallPrice?: number;
  mediumPrice?: number;
  largePrice?: number;
  variantLabel?: string;
  vegType?: 'veg' | 'non-veg';
}

interface BookingSummary {
  id: string;
  ticketNumber: string;
  email?: string;
  name?: string;
  theaterName?: string;
  date?: string;
  time?: string;
  occasion?: string;
  numberOfPeople?: number;
  totalAmount?: number;
  advancePayment?: number;
  venuePayment?: number;
  paymentStatus?: string;
  status?: string;
}

const MENU_ITEMS: FoodItem[] = [
  {
    id: 'classic-popcorn',
    name: 'Classic Popcorn Bucket',
    price: 220,
    quantity: 1,
    vegType: 'veg',
  },
  {
    id: 'cheese-nachos',
    name: 'Cheesy Nachos',
    price: 260,
    quantity: 1,
    vegType: 'veg',
  },
  {
    id: 'veg-burger',
    name: 'Signature Veg Burger',
    price: 280,
    quantity: 1,
    vegType: 'veg',
  },
  {
    id: 'paneer-roll',
    name: 'Paneer Roll',
    price: 240,
    quantity: 1,
    vegType: 'veg',
  },
  {
    id: 'cold-coffee',
    name: 'Cold Coffee',
    price: 180,
    quantity: 1,
    vegType: 'veg',
  },
  {
    id: 'soft-drink',
    name: 'Soft Drink (500ml)',
    price: 160,
    quantity: 1,
    vegType: 'veg',
  },
];

const resolveVegType = (value: any): 'veg' | 'non-veg' => (value === 'non-veg' ? 'non-veg' : 'veg');

const VegBadge = ({ vegType = 'veg', compact = false }: { vegType?: 'veg' | 'non-veg'; compact?: boolean }) => {
  const type = resolveVegType(vegType);
  const textColor = type === 'veg' ? '#22c55e' : '#f87171';
  const indicatorColor = type === 'veg' ? '#16a34a' : '#dc2626';
  const ringColor = type === 'veg' ? 'rgba(34,197,94,0.35)' : 'rgba(248,113,113,0.35)';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? 4 : 6,
        fontSize: compact ? 10 : 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: compact ? '0.12em' : '0.18em',
        color: textColor,
      }}
    >
      <span
        style={{
          width: compact ? 8 : 10,
          height: compact ? 8 : 10,
          borderRadius: '50%',
          background: indicatorColor,
          boxShadow: `0 0 0 2px ${ringColor}`,
          flexShrink: 0,
        }}
      />
      {!compact && (type === 'veg' ? 'Veg' : 'Non Veg')}
    </span>
  );
};

const parseBookingDate = (dateStr?: string | null): Date | null => {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  return null;
};

interface TimeRangeParts {
  start: {
    hour: number;
    minute: number;
    period: 'AM' | 'PM';
  };
  end: {
    hour: number;
    minute: number;
    period: 'AM' | 'PM';
  };
}

const parseTimeRange = (timeRange?: string | null): TimeRangeParts | null => {
  if (!timeRange || typeof timeRange !== 'string') return null;
  const match = timeRange.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;

  return {
    start: {
      hour: parseInt(match[1], 10),
      minute: parseInt(match[2], 10),
      period: match[3].toUpperCase() as 'AM' | 'PM',
    },
    end: {
      hour: parseInt(match[4], 10),
      minute: parseInt(match[5], 10),
      period: match[6].toUpperCase() as 'AM' | 'PM',
    },
  };
};

const convertTo24Hour = (hour: number, period: 'AM' | 'PM') => {
  let value = hour % 12;
  if (period === 'PM') {
    value += 12;
  }
  return value;
};

const withTime = (date: Date, hour: number, minute: number) => {
  const next = new Date(date);
  next.setHours(hour, minute, 0, 0);
  return next;
};

interface BookingWindow {
  start: Date;
  end: Date;
}

const getBookingWindow = (dateStr?: string, timeRange?: string): BookingWindow | null => {
  const date = parseBookingDate(dateStr);
  const range = parseTimeRange(timeRange);
  if (!date || !range) return null;

  const startHour = convertTo24Hour(range.start.hour, range.start.period);
  const endHour = convertTo24Hour(range.end.hour, range.end.period);
  const startDateTime = withTime(date, startHour, range.start.minute);
  const endDateTime = withTime(date, endHour, range.end.minute);

  if (endDateTime <= startDateTime) {
    endDateTime.setDate(endDateTime.getDate() + 1);
  }

  return { start: startDateTime, end: endDateTime };
};

type OrderingWindowStatus =
  | {
      allowed: true;
      window: BookingWindow | null;
      accessOpensAt?: Date;
    }
  | {
      allowed: false;
      reason: 'tooEarly';
      accessOpensAt: Date;
      window: BookingWindow;
    }
  | {
      allowed: false;
      reason: 'tooLate';
      window: BookingWindow;
    };

const getOrderingWindowStatus = (dateStr?: string, timeRange?: string): OrderingWindowStatus => {
  const window = getBookingWindow(dateStr, timeRange);
  if (!window) {
    return { allowed: true, window: null };
  }

  const now = new Date();
  const accessOpensAt = new Date(window.start.getTime() - 15 * 60 * 1000);

  if (now < accessOpensAt) {
    return {
      allowed: false,
      reason: 'tooEarly',
      accessOpensAt,
      window,
    };
  }

  if (now > window.end) {
    return {
      allowed: false,
      reason: 'tooLate',
      window,
    };
  }

  return {
    allowed: true,
    window,
    accessOpensAt,
  };
};

const formatTimeForDisplay = (date: Date) =>
  date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

export default function OrderFoodPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: 240 }} />}>
      <OrderFoodPageInner />
    </Suspense>
  );
}

function OrderFoodPageInner() {
  const accentColor = '#E50914';
  const accentHover = '#FF2E3C';
  const goldColor = '#F2B365';
  const borderColor = 'rgba(255,255,255,0.15)';
  const mutedText = 'rgba(255,255,255,0.7)';
  const glassBg = 'rgba(8, 8, 8, 0.9)';

  const searchParams = useSearchParams();
  const [ticketNumber, setTicketNumber] = useState('FMT');
  const [ticketModalOpen, setTicketModalOpen] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [booking, setBooking] = useState<BookingSummary | null>(null);
  const [items, setItems] = useState<FoodItem[]>([]);
  const [serviceDrafts, setServiceDrafts] = useState<Record<string, FoodItem[]>>({});
  const [orderedByService, setOrderedByService] = useState<Record<string, FoodItem[]>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [services, setServices] = useState<any[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedServiceName, setSelectedServiceName] = useState<string>('');
  const [menuItems, setMenuItems] = useState<any[]>(MENU_ITEMS);
  // whether currently selected service is decoration (includeInDecoration: true)
  const [currentServiceIsDecoration, setCurrentServiceIsDecoration] = useState(false);
  // pricing data (we only need decorationFees here)
  const [pricingData, setPricingData] = useState<{ decorationFees: number }>({ decorationFees: 0 });
  const [orderConfirmOpen, setOrderConfirmOpen] = useState(false);
  const [decorationInfoOpen, setDecorationInfoOpen] = useState(false);
  const [decorationServiceName, setDecorationServiceName] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [variantMenuItem, setVariantMenuItem] = useState<any | null>(null);
  const [variantQty, setVariantQty] = useState<number>(1);
  const [variantSelectedKey, setVariantSelectedKey] = useState<string | null>(null);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [autoFetchTriggered, setAutoFetchTriggered] = useState(false);
  const [notifyingCustomer, setNotifyingCustomer] = useState(false);

  const normalizeDynamicFoodItems = (dynamicItems: Record<string, any> | undefined | null) => {
    if (!dynamicItems || typeof dynamicItems !== 'object') return {} as Record<string, FoodItem[]>;
    return Object.entries(dynamicItems).reduce((acc, [key, value]) => {
      acc[key] = Array.isArray(value)
        ? (value as any[]).map((item) => ({
            ...item,
            vegType: resolveVegType((item as any)?.vegType),
          }))
        : [];
      return acc;
    }, {} as Record<string, FoodItem[]>);
  };

  const normalizedBookingStatus = (booking?.status || '').toLowerCase();
  const orderIsDelivered = normalizedBookingStatus === 'ready' || normalizedBookingStatus === 'readying';
  const orderStatusLabel =
    orderIsDelivered
      ? 'Delivered'
      : normalizedBookingStatus === 'received'
      ? 'Order Received'
      : normalizedBookingStatus || 'Pending';

  const normalizedTicketInput = ticketNumber.trim().toUpperCase();
  const bookingMatchesInput =
    normalizedTicketInput.length > 0 && booking?.ticketNumber?.toUpperCase() === normalizedTicketInput;

  const resetMessages = () => {
    setError('');
    setInfo('');
  };

  useEffect(() => {
    if (autoFetchTriggered) return;
    const ticketFromQuery = searchParams?.get('ticket');
    if (ticketFromQuery) {
      setAutoFetchTriggered(true);
      setTicketModalOpen(false);
      setTicketNumber(String(ticketFromQuery).toUpperCase());
      fetchBookingByTicket(ticketFromQuery);
    }
  }, [searchParams, autoFetchTriggered]);

  const removeOrderedItem = async (idToRemove?: string) => {
    if (!booking) {
      setError('No booking loaded. Enter ticket number first.');
      return;
    }
    if (orderIsDelivered) {
      setInfo('');
      setError('This order has already been delivered. Please contact the FeelME Town team to make changes.');
      return;
    }
    if (!idToRemove) return;

    try {
      resetMessages();
      setSaving(true);
      const serviceName = 'Food';
      const res = await fetch('/api/order-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketNumber: booking.ticketNumber,
          items: [],
          removeItemIds: [idToRemove],
          markPaid: false,
          serviceName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to remove item');
      }

      const b = data.booking as any;
      setBooking((prev) =>
        prev
          ? {
              ...prev,
              totalAmount: b.totalAmount,
              advancePayment: b.advancePayment ?? prev.advancePayment,
              venuePayment: b.venuePayment,
              paymentStatus: b.paymentStatus,
              status: b.status || prev.status,
            }
          : prev,
      );
      if (data.booking?.dynamicServiceItems && typeof data.booking.dynamicServiceItems === 'object') {
        const normalizedDynamicItems = normalizeDynamicFoodItems(data.booking.dynamicServiceItems);
        setOrderedByService(normalizedDynamicItems);
        const latestSelectedFood = (normalizedDynamicItems?.selectedFood || []) as FoodItem[];
        setOrderPlaced(latestSelectedFood.length > 0);
      } else {
        setOrderedByService({});
        setOrderPlaced(false);
      }
      setInfo('Item removed from order.');
    } catch (e: any) {
      setError(e?.message || 'Failed to remove item');
    } finally {
      setSaving(false);
    }
  };

  const getCurrentServiceFieldKey = (): string | null => {
    // Food-only page: always store under selectedFood
    return 'selectedFood';
  };

  const fetchBookingByTicket = async (overrideTicket?: string) => {
    resetMessages();
    const raw = overrideTicket ?? ticketNumber;
    const trimmed = String(raw ?? '').trim().toUpperCase();
    if (!trimmed) {
      setError('Please enter your ticket number.');
      return;
    }

    try {
      setLoading(true);
      // Always store ticketNumber as a clean uppercase string for the input
      setTicketNumber(trimmed);
      const res = await fetch(`/api/order-items?ticketNumber=${encodeURIComponent(trimmed)}`);
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (!res.ok || !data?.success) {
        const msg =
          typeof data?.error === 'string'
            ? data.error
            : res.status === 404
            ? 'Booking not found for this ticket number'
            : 'Failed to find booking for this ticket number';
        throw new Error(msg);
      }

      const b = data.booking as any;
      const windowStatus = getOrderingWindowStatus(b.date, b.time);
      if (!windowStatus.allowed) {
        const tooEarly = windowStatus.reason === 'tooEarly';
        const message = tooEarly
          ? `Sorry! Food ordering opens 15 minutes before your slot at ${formatTimeForDisplay(windowStatus.accessOpensAt)}.`
          : `Sorry! This booking's ordering window closed at ${formatTimeForDisplay(windowStatus.window.end)}.`;
        setError(message);
        setInfo('');
        setBooking(null);
        setItems([]);
        setServiceDrafts({});
        setOrderedByService({});
        setOrderPlaced(false);
        setTicketModalOpen(true);
        setLoading(false);
        return;
      }

      setBooking({
        id: b.id,
        ticketNumber: b.ticketNumber,
        email: b.email,
        name: b.name,
        theaterName: b.theaterName,
        date: b.date,
        time: b.time,
        occasion: b.occasion,
        numberOfPeople: b.numberOfPeople,
        totalAmount: b.totalAmount,
        advancePayment: b.advancePayment,
        venuePayment: b.venuePayment,
        paymentStatus: b.paymentStatus,
        status: b.status,
      });
      setServiceDrafts({});
      setItems([]);
      const normalizedDynamicItems = normalizeDynamicFoodItems(b.dynamicServiceItems);
      setOrderedByService(normalizedDynamicItems);
      // If booking already has food orders, show them first and hide menu until user chooses Add More Items
      const hasFoodOrders = Array.isArray(normalizedDynamicItems?.selectedFood) &&
        (normalizedDynamicItems.selectedFood || []).length > 0;
      setOrderPlaced(hasFoodOrders);
      setTicketModalOpen(false);
      setInfo('Booking loaded. You can now add food items for this ticket.');
      const newOrdered = normalizedDynamicItems.selectedFood || [];
      if (newOrdered.length) {
        setOrderPlaced(true);
      }
    } catch (e: any) {
      const msg =
        typeof e?.message === 'string'
          ? e.message
          : typeof e === 'string'
          ? e
          : typeof e?.error === 'string'
          ? e.error
          : 'Failed to find booking for this ticket number';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    resetMessages();
    const name = newItemName.trim();
    const price = Number(newItemPrice);
    const qty = Number(newItemQty || '1');

    if (!name) {
      setError('Please enter item name.');
      return;
    }
    if (!(price >= 0)) {
      setError('Please enter a valid price.');
      return;
    }
    if (!(qty > 0)) {
      setError('Quantity should be at least 1.');
      return;
    }

    const id = `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    setItems((prev) => [...prev, { id, name, price, quantity: qty, vegType: 'veg' }]);
    setNewItemName('');
    setNewItemPrice('');
    setNewItemQty('1');
  };

  const handleRemoveItem = (id?: string) => {
    resetMessages();
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const foodTotal = items.reduce((sum, i) => sum + (Number(i.price || 0) * Number(i.quantity || 0)), 0);

  const handleUpdateQuantity = (id: string | undefined, delta: number) => {
    if (!id || !delta) return;
    resetMessages();
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const current = Number(item.quantity || 0) || 0;
        const next = Math.max(current + delta, 1);
        return { ...item, quantity: next };
      }),
    );
  };

  const decorationInfoModal = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 45,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 16px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 24,
          padding: 24,
          background:
            'linear-gradient(135deg, rgba(15,15,15,0.98), rgba(35,35,35,0.96))',
          border: '1px solid rgba(255,255,255,0.16)',
          boxShadow: '0 22px 55px rgba(0,0,0,0.85)',
          color: '#fff',
        }}
      >
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Decoration Service Selected</h3>
        <p style={{ marginTop: 10, fontSize: 14, color: mutedText }}>
          {decorationServiceName
            ? `You are viewing items from the "${decorationServiceName}" decoration service. Any items you add from here will be treated as decoration charges and added to the customer's booking total at the venue.`
            : 'You are viewing decoration items. Any items you add from here will be treated as decoration charges and added to the customer\'s booking total at the venue.'}
        </p>
        <p style={{ marginTop: 6, fontSize: 13, color: mutedText }}>
          Please confirm decoration with the guest before adding these items.
        </p>
        {pricingData.decorationFees > 0 && (
          <p style={{ marginTop: 4, fontSize: 13, color: '#e5e7eb' }}>
            Decoration fee (from pricing):
            <span style={{ marginLeft: 6, fontWeight: 600 }}>
              ₹{pricingData.decorationFees.toLocaleString('en-IN')}
            </span>
          </p>
        )}
        <p style={{ marginTop: 4, fontSize: 13, color: '#e5e7eb' }}>
          Current decoration charges from selected items:
          <span style={{ marginLeft: 6, fontWeight: 600 }}>
            ₹
            {items
              .filter((i) => i.isDecoration)
              .reduce(
                (sum, i) =>
                  sum + Number(i.price || 0) * Number(i.quantity || 0),
                0,
              )
              .toLocaleString('en-IN')}
          </span>
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
          <button
            type="button"
            onClick={() => setDecorationInfoOpen(false)}
            style={{
              padding: '9px 20px',
              borderRadius: 999,
              border: `1px solid ${borderColor}`,
              background: 'rgba(0,0,0,0.7)',
              color: '#e5e7eb',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );

  const orderConfirmModal = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 16px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 24,
          padding: 24,
          background:
            'linear-gradient(135deg, rgba(15,15,15,0.98), rgba(35,35,35,0.96))',
          border: '1px solid rgba(255,255,255,0.16)',
          boxShadow: '0 22px 55px rgba(0,0,0,0.85)',
          color: '#fff',
        }}
      >
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Confirm Food Order</h3>
        <p style={{ marginTop: 10, fontSize: 14, color: mutedText }}>
          Are you sure you want to place this food order for this booking? Our team will start preparing it
          immediately.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
          <button
            type="button"
            onClick={() => setOrderConfirmOpen(false)}
            style={{
              padding: '9px 18px',
              borderRadius: 999,
              border: `1px solid ${borderColor}`,
              background: 'transparent',
              color: '#e5e7eb',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              if (saving) return;
              await saveItems(false);
              setOrderConfirmOpen(false);
            }}
            style={{
              padding: '9px 20px',
              borderRadius: 999,
              border: 'none',
              background: 'rgba(251, 5, 5, 1)',
              color: '#fff',
              cursor: saving ? 'default' : 'pointer',
              fontSize: 13,
              fontWeight: 600,
              opacity: saving ? 0.7 : 1,
              boxShadow: '0 16px 35px rgba(220,38,38,0.7)',
            }}
          >
            {saving ? 'Placing…' : 'Yes, Order Food'}
          </button>
        </div>
      </div>
    </div>
  );

  const handleSelectService = (serviceId: string) => {
    if (!serviceId || !services.length) return;

    const svc = services.find((s: any) => {
      const svcId = s.id ?? s._id;
      return svcId && String(svcId) === String(serviceId);
    });
    if (!svc) return;

    const normalizedId = String(serviceId);
    let nextItems: FoodItem[] = [];
    setServiceDrafts((prevDrafts) => {
      const updatedDrafts = { ...prevDrafts };
      if (selectedServiceId) {
        updatedDrafts[selectedServiceId] = [...items];
      }
      if (updatedDrafts[normalizedId]) {
        nextItems = [...updatedDrafts[normalizedId]];
      } else {
        nextItems = [];
      }
      return updatedDrafts;
    });

    // Force Food-only: no decoration flow in this page
    setCurrentServiceIsDecoration(false);
    setDecorationServiceName(null);

    const rawItems = Array.isArray((svc as any).items) ? (svc as any).items : [];
    const normalized = rawItems.map((item: any, index: number) => ({
      id: item.id || item.itemId || `food-${index}`,
      name: item.name || item.title || 'Food Item',
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 1) || 1,
      imageUrl: item.imageUrl || item.image || item.photoUrl || null,
      categoryName: item.categoryName,
      pricingMode: item.pricingMode,
      halfPrice: typeof item.halfPrice === 'number' ? item.halfPrice : undefined,
      fullPrice: typeof item.fullPrice === 'number' ? item.fullPrice : undefined,
      smallPrice: typeof item.smallPrice === 'number' ? item.smallPrice : undefined,
      mediumPrice: typeof item.mediumPrice === 'number' ? item.mediumPrice : undefined,
      largePrice: typeof item.largePrice === 'number' ? item.largePrice : undefined,
      isDecoration: false,
      vegType: resolveVegType(item.vegType),
    }));

    setSelectedServiceId(normalizedId);
    // Lock the UI to Food service name for storage key
    setSelectedServiceName('Food');
    setItems(nextItems.map((item) => ({ ...item, vegType: resolveVegType(item.vegType) })));
    setMenuItems(normalized.length ? normalized : MENU_ITEMS);
  };

  const getSelectedServiceDetails = () => {
    if (!Array.isArray(services) || services.length === 0) return null;
    if (selectedServiceId) {
      const match = services.find((svc: any) => {
        const svcId = svc.id ?? svc._id;
        return svcId && String(svcId) === String(selectedServiceId);
      });
      if (match) return match;
    }
    return services[0] ?? null;
  };

  const handleAddMenuItem = (item: FoodItem, qty: number) => {
    resetMessages();
    const quantity = Number(qty || 1);
    if (!(quantity > 0)) return;

    setItems((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) {
        return prev.map((p) =>
          p.id === item.id
            ? {
                ...p,
                quantity: Number(p.quantity || 0) + quantity,
                // keep decoration flag if it was already set or current service is decoration
                isDecoration: p.isDecoration || currentServiceIsDecoration,
                vegType: resolveVegType(p.vegType),
              }
            : p,
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity,
          isDecoration: item.isDecoration ?? currentServiceIsDecoration,
          vegType: resolveVegType(item.vegType),
        },
      ];
    });
  };

  const saveItems = async (markPaid: boolean) => {
    if (!booking) {
      setError('No booking loaded. Enter ticket number first.');
      return;
    }

    if (!items.length) {
      setError('No items added for this service yet.');
      return;
    }

    try {
      resetMessages();
      setSaving(true);
      const serviceName = 'Food';
      if (!serviceName) {
        setSaving(false);
        setError('Please select a service before placing an order.');
        return;
      }
      const res = await fetch('/api/order-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketNumber: booking.ticketNumber,
          items,
          markPaid,
          serviceName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save food items');
      }

      const b = data.booking as any;
      setBooking((prev) =>
        prev
          ? {
              ...prev,
              totalAmount: b.totalAmount,
              advancePayment: b.advancePayment ?? prev.advancePayment,
              venuePayment: b.venuePayment,
              paymentStatus: b.paymentStatus,
              status: b.status || prev.status,
            }
          : prev,
      );
      setItems([]);
      if (data.booking?.dynamicServiceItems && typeof data.booking.dynamicServiceItems === 'object') {
        setOrderedByService(normalizeDynamicFoodItems(data.booking.dynamicServiceItems));
      } else {
        setOrderedByService({});
      }
      if (selectedServiceId) {
        setServiceDrafts((prev) => {
          const updated = { ...prev };
          delete updated[selectedServiceId];
          return updated;
        });
      }
      setOrderPlaced(true);
      setInfo(
        'Your food order is now under process. You will receive your food in approximately 15–20 minutes. Please sit back, relax and enjoy your private theater experience.',
      );
    } catch (e: any) {
      setError(e?.message || 'Failed to save food items');
    } finally {
      setSaving(false);
    }
  };

  const cancelOrder = async () => {
    if (!booking) {
      setError('No booking loaded. Enter ticket number first.');
      return;
    }

    try {
      resetMessages();
      setSaving(true);
      const serviceName = 'Food';
      if (!serviceName) {
        setSaving(false);
        setError('Please select a service before cancelling items.');
        return;
      }
      const res = await fetch('/api/order-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketNumber: booking.ticketNumber,
          items: [], // Clear all items
          markPaid: false,
          serviceName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel order');
      }

      const b = data.booking as any;
      setBooking((prev) =>
        prev
          ? {
              ...prev,
              totalAmount: b.totalAmount,
              advancePayment: b.advancePayment ?? prev.advancePayment,
              venuePayment: b.venuePayment,
              paymentStatus: b.paymentStatus,
              status: b.status || prev.status,
            }
          : prev,
      );
      setItems([]);
      if (data.booking?.dynamicServiceItems && typeof data.booking.dynamicServiceItems === 'object') {
        setOrderedByService(normalizeDynamicFoodItems(data.booking.dynamicServiceItems));
      } else {
        setOrderedByService({});
      }
      if (selectedServiceId) {
        setServiceDrafts((prev) => {
          const updated = { ...prev };
          delete updated[selectedServiceId];
          return updated;
        });
      }
      setOrderPlaced(false);
      setInfo('Order cancelled successfully.');
    } catch (e: any) {
      setError(e?.message || 'Failed to cancel order');
    } finally {
      setSaving(false);
    }
  };

  // Load decoration pricing from /api/pricing (same source as BookingPopup)
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const res = await fetch('/api/pricing', { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success && data.pricing) {
          const dec = Number(data.pricing.decorationFees ?? 0);
          setPricingData({ decorationFees: isNaN(dec) ? 0 : dec });
        }
      } catch {
        // ignore pricing errors; fallback is 0
      }
    };

    fetchPricing();
  }, []);

  // Load dynamic food menu items from services collection
  useEffect(() => {
    const loadMenu = async () => {
      try {
        const res = await fetch('/api/admin/services');
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success || !Array.isArray(data.services)) {
          setMenuItems(MENU_ITEMS);
          return;
        }

        const fetchedServices = data.services as any[];
        setServices(fetchedServices);

        const foodService =
          fetchedServices.find((s) => s.name?.toLowerCase?.().includes('food')) ||
          fetchedServices.find((s) => s.name?.toLowerCase?.().includes('snack')) ||
          fetchedServices[0];

        const rawItems = Array.isArray(foodService?.items) ? foodService.items : [];

        const normalized = rawItems.map((item: any, index: number) => ({
          id: item.id || item.itemId || `food-${index}`,
          name: item.name || item.title || 'Food Item',
          price: Number(item.price || 0),
          quantity: Number(item.quantity || 1) || 1,
          imageUrl: item.imageUrl || item.image || item.photoUrl || null,
          categoryName: item.categoryName,
          pricingMode: item.pricingMode,
          halfPrice: typeof item.halfPrice === 'number' ? item.halfPrice : undefined,
          fullPrice: typeof item.fullPrice === 'number' ? item.fullPrice : undefined,
          smallPrice: typeof item.smallPrice === 'number' ? item.smallPrice : undefined,
          mediumPrice: typeof item.mediumPrice === 'number' ? item.mediumPrice : undefined,
          largePrice: typeof item.largePrice === 'number' ? item.largePrice : undefined,
          vegType: resolveVegType(item.vegType),
        }));
        const defaultServiceId = foodService?.id ?? foodService?._id ?? null;
        const defaultServiceKey = defaultServiceId ? String(defaultServiceId) : null;
        if (defaultServiceKey && !selectedServiceId) {
          setSelectedServiceId(defaultServiceKey);
          setSelectedServiceName(foodService?.name || foodService?.title || '');
          setItems(
            serviceDrafts[defaultServiceKey]
              ? serviceDrafts[defaultServiceKey].map((item) => ({
                  ...item,
                  vegType: resolveVegType(item.vegType),
                }))
              : []
          );
        }
        setMenuItems(normalized.length ? normalized : MENU_ITEMS);
      } catch (e) {
        setMenuItems(MENU_ITEMS);
      }
    };

    loadMenu();
  }, [selectedServiceId, serviceDrafts]);

  useEffect(() => {
    setIsMounted(true);

    const handleResize = () => {
      if (typeof window !== 'undefined') {
        setIsSmallScreen(window.innerWidth < 768);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      setIsMounted(false);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (ticketModalOpen) {
      document.body.classList.add('ticket-modal-open');
    } else {
      document.body.classList.remove('ticket-modal-open');
    }

    return () => {
      document.body.classList.remove('ticket-modal-open');
    };
  }, [ticketModalOpen]);

  // Group menu items by category for display (category-wise sections)
  const categorizedMenuGroups = (() => {
    if (!Array.isArray(menuItems) || menuItems.length === 0) {
      return [] as { categoryKey: string; categoryLabel: string; items: any[] }[];
    }

    const groupsMap = new Map<string, { label: string; items: any[] }>();

    (menuItems as any[]).forEach((item) => {
      const raw = (item as any).categoryName as string | undefined;
      const trimmed = raw?.trim();
      const hasCategory = !!trimmed;
      const key = hasCategory ? trimmed! : '__uncategorized__';
      const label = hasCategory ? trimmed! : 'Other Items';

      if (!groupsMap.has(key)) {
        groupsMap.set(key, { label, items: [] });
      }
      groupsMap.get(key)!.items.push(item);
    });

    return Array.from(groupsMap.entries()).map(([categoryKey, value]) => ({
      categoryKey,
      categoryLabel: value.label,
      items: value.items,
    }));
  })();

  const availableCategoryFilters = (() => {
    const keys = categorizedMenuGroups.map((g) => g.categoryKey);
    return Array.from(new Set(keys));
  })();

  const getVariantOptions = (item: any): { key: string; label: string; price: number }[] => {
    const options: { key: string; label: string; price: number }[] = [];

    if (item.pricingMode === 'half-full') {
      if (typeof item.halfPrice === 'number' && item.halfPrice > 0) {
        options.push({ key: 'half', label: `Half ₹${item.halfPrice}`, price: item.halfPrice });
      }
      if (typeof item.fullPrice === 'number' && item.fullPrice > 0) {
        options.push({ key: 'full', label: `Full ₹${item.fullPrice}`, price: item.fullPrice });
      }
    } else if (item.pricingMode === 'three-size') {
      if (typeof item.smallPrice === 'number' && item.smallPrice > 0) {
        options.push({ key: 'small', label: `Small ₹${item.smallPrice}`, price: item.smallPrice });
      }
      if (typeof item.mediumPrice === 'number' && item.mediumPrice > 0) {
        options.push({ key: 'medium', label: `Medium ₹${item.mediumPrice}`, price: item.mediumPrice });
      }
      if (typeof item.largePrice === 'number' && item.largePrice > 0) {
        options.push({ key: 'large', label: `Full ₹${item.largePrice}`, price: item.largePrice });
      }
    } else if (typeof item.price === 'number' && item.price > 0) {
      options.push({ key: 'single', label: `Price ₹${item.price}`, price: item.price });
    }

    return options;
  };

  const openVariantModal = (item: any, qty: number) => {
    const options = getVariantOptions(item);
    if (!options.length) {
      // Fallback: no variants, just add directly
      handleAddMenuItem(item, qty || 1);
      return;
    }
    setVariantMenuItem(item);
    setVariantQty(qty && qty > 0 ? qty : 1);
    setVariantSelectedKey(options[0].key);
    setVariantModalOpen(true);
  };

  const addSelectedVariantToCart = () => {
    if (!variantMenuItem || !variantSelectedKey) return;

    const options = getVariantOptions(variantMenuItem);
    const chosen = options.find((opt) => opt.key === variantSelectedKey);
    if (!chosen) return;

    const base: FoodItem = {
      id: `${variantMenuItem.id}-${chosen.key}`,
      name:
        chosen.key === 'half'
          ? `${variantMenuItem.name} (Half)`
          : chosen.key === 'full'
          ? `${variantMenuItem.name} (Full)`
          : chosen.key === 'small'
          ? `${variantMenuItem.name} (Small)`
          : chosen.key === 'medium'
          ? `${variantMenuItem.name} (Medium)`
          : chosen.key === 'large'
          ? `${variantMenuItem.name} (Full)`
          : variantMenuItem.name,
      price: chosen.price,
      quantity: variantQty,
      isDecoration: currentServiceIsDecoration,
      categoryName: variantMenuItem.categoryName,
      pricingMode: variantMenuItem.pricingMode,
      halfPrice: variantMenuItem.halfPrice,
      fullPrice: variantMenuItem.fullPrice,
      smallPrice: variantMenuItem.smallPrice,
      mediumPrice: variantMenuItem.mediumPrice,
      largePrice: variantMenuItem.largePrice,
      variantLabel: chosen.key,
    };

    setItems((prev) => {
      const existing = prev.find((p) => p.id === base.id);
      if (existing) {
        return prev.map((p) =>
          p.id === base.id
            ? { ...p, quantity: Number(p.quantity || 0) + variantQty }
            : p,
        );
      }
      return [...prev, { ...base, vegType: resolveVegType(base.vegType) }];
    });

    setVariantModalOpen(false);
    setVariantMenuItem(null);
    setVariantSelectedKey(null);
    setVariantQty(1);
  };

  const handleOpenTicketModal = () => {
    resetMessages();
    setTicketModalOpen(true);
  };

  const ticketModal = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 16px',
        backgroundColor: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          borderRadius: 32,
          padding: 28,
          background:
            'linear-gradient(145deg, rgba(8,8,8,0.98), rgba(20,20,20,0.96))',
          border: '1px solid rgba(255,255,255,0.18)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.85)',
          color: '#fff',
        }}
      >
        <button
          onClick={() => setTicketModalOpen(false)}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 14,
            right: 18,
            border: 'none',
            background: 'transparent',
            color: 'rgba(209,213,219,1)',
            fontSize: 22,
            lineHeight: 1,
            cursor: 'pointer',
          }}
        >
          ×
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8, marginBottom: 18 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 14px',
              borderRadius: 999,
              border: '1px solid rgba(239,68,68,0.6)',
              background: 'rgba(239,68,68,0.1)',
              fontSize: 10,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: '#fee2e2',
            }}
          >
            <span aria-hidden="true">🎟️</span> Ticket Access
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 600, margin: 0 }}>Enter Your Ticket Number</h2>
          <p style={{ fontSize: 12, color: '#d1d5db', lineHeight: 1.6, maxWidth: 360, margin: 0 }}>
            Verify the guest ticket to unlock their food ordering form.
          </p>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 10,
              width: '100%',
              borderRadius: 14,
              border: '1px solid rgba(248,113,113,0.7)',
              background: 'rgba(248,113,113,0.15)',
              padding: '8px 12px',
              fontSize: 13,
              textAlign: 'left',
              color: '#fee2e2',
            }}
          >
            {error}
          </div>
        )}
        {info && (
          <div
            style={{
              marginBottom: 10,
              width: '100%',
              borderRadius: 14,
              border: '1px solid rgba(251,191,36,0.7)',
              background: 'rgba(251,191,36,0.14)',
              padding: '8px 12px',
              fontSize: 13,
              textAlign: 'left',
              color: '#facc15',
            }}
          >
            {info}
          </div>
        )}

        <label
          style={{
            display: 'block',
            textAlign: 'left',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            color: '#9ca3af',
            marginBottom: 6,
          }}
        >
          Ticket Number
        </label>
        <input
          type="text"
          value={typeof ticketNumber === 'string' ? ticketNumber : String(ticketNumber ?? '').toUpperCase()}
          onChange={(e) => setTicketNumber(e.target.value.toUpperCase())}
          placeholder="FMT0007"
          style={{
            width: '100%',
            borderRadius: 18,
            border: '1px solid rgba(255,255,255,0.22)',
            background: 'rgba(0,0,0,0.6)',
            padding: '11px 16px',
            fontSize: 14,
            letterSpacing: '0.3em',
            textAlign: 'center',
            color: '#fff',
          }}
        />

        <button
          type="button"
          disabled={loading}
          onClick={() => fetchBookingByTicket()}
          style={{
            marginTop: 16,
            width: '100%',
            padding: '11px 0',
            borderRadius: 18,
            border: 'none',
            background:
              'linear-gradient(90deg, rgba(220,38,38,1), rgba(239,68,68,1), rgba(249,115,22,1))',
            color: '#fff',
            fontWeight: 600,
            fontSize: 13,
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.6 : 1,
            boxShadow: '0 18px 40px rgba(220,38,38,0.6)',
          }}
        >
          {loading ? 'Checking…' : 'Check Ticket'}
        </button>

        {bookingMatchesInput && (
          <div
            style={{
              marginTop: 14,
              width: '100%',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.06)',
              padding: '10px 14px',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.3em',
                color: '#9ca3af',
                marginBottom: 4,
              }}
            >
              Customer Name
            </div>
            <div style={{ fontSize: 17, fontWeight: 600 }}>{booking?.name || 'Guest'}</div>
            <p style={{ marginTop: 4, fontSize: 12, color: '#d1d5db' }}>
              Ticket verified. Continue to add their order.
            </p>
          </div>
        )}

        <button
          type="button"
          disabled={!bookingMatchesInput}
          onClick={() => bookingMatchesInput && setTicketModalOpen(false)}
          style={{
            marginTop: 14,
            width: '100%',
            padding: '11px 0',
            borderRadius: 18,
            border: '1px solid rgba(255,255,255,0.25)',
            background: 'rgba(255,255,255,0.08)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 13,
            cursor: bookingMatchesInput ? 'pointer' : 'not-allowed',
            opacity: bookingMatchesInput ? 1 : 0.4,
          }}
        >
          Continue to Food Menu
        </button>
      </div>
    </div>
  );

  // Derived: previously ordered items for the currently selected service
  const currentServiceFieldKey = getCurrentServiceFieldKey();
  const orderedList = currentServiceFieldKey ? orderedByService[currentServiceFieldKey] || [] : [];
  const orderedTotal = orderedList.reduce(
    (sum, i) => sum + Number(i.price || 0) * Number(i.quantity || 0),
    0,
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        zIndex: 1,
        padding: isSmallScreen ? '32px 8px' : '60px 24px',
        backgroundImage: 'url(/bg7.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        color: '#fff',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '960px',
          background: glassBg,
          borderRadius: '32px',
          padding: isSmallScreen ? '24px 12px' : '48px',
          border: `1px solid ${borderColor}`,
          boxShadow: '0 25px 60px rgba(0,0,0,0.65)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '999px',
            border: `1px solid ${borderColor}`,
            background: 'rgba(255,255,255,0.04)',
            fontSize: '12px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: mutedText,
            marginBottom: '14px',
          }}>
            Order Station
          </div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 700, margin: 0 }}>Order Foods for Your Show</h1>
          <p style={{ color: mutedText, fontSize: '0.95rem', marginTop: '8px' }}>
            Enter your ticket number (shared on your confirmation email) or ask our staff, then add items for this booking.
          </p>
        </div>

        {error && (
          <div style={{
            marginBottom: '20px',
            padding: '12px 18px',
            borderRadius: '18px',
            border: '1px solid rgba(239,68,68,0.6)',
            background: 'rgba(239,68,68,0.12)',
            color: '#ffbdbd',
            fontSize: '0.9rem',
          }}>
            {error}
          </div>
        )}
        {info && (
          <div style={{
            marginBottom: '20px',
            padding: '12px 18px',
            borderRadius: '18px',
            border: '1px solid rgba(242,179,101,0.45)',
            background: 'rgba(242,179,101,0.12)',
            color: goldColor,
            fontSize: '0.9rem',
          }}>
            {info}
          </div>
        )}

        {!booking && (
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <p style={{ color: mutedText, marginBottom: '14px' }}>Please enter your ticket number to start.</p>
            <button
              style={{
                padding: '12px 28px',
                borderRadius: '999px',
                border: 'none',
                background: accentColor,
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 15px 35px rgba(229,9,20,0.35)',
              }}
              onClick={handleOpenTicketModal}
            >
              Enter Ticket Number
            </button>
          </div>
        )}

        {booking && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: isSmallScreen ? '18px' : '26px', marginTop: '18px' }}>
            <div style={{
              borderRadius: '28px',
              border: `1px solid ${borderColor}`,
              background: 'rgba(255,255,255,0.03)',
              padding: isSmallScreen ? '18px' : '28px',
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '16px', marginBottom: '18px' }}>
                <div>
                  <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: mutedText }}>Ticket Number</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '0.18em' }}>{booking.ticketNumber}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: mutedText }}>Booking ID</div>
                  <div style={{ fontFamily: 'monospace', padding: '6px 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', display: 'inline-block' }}>{booking.ticketNumber}</div>
                </div>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '16px',
                color: '#fff',
                fontSize: '0.9rem',
              }}>
                <div>
                  <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: mutedText }}>Name</div>
                  <div style={{ fontWeight: 600 }}>{booking.name || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: mutedText }}>Total Amount</div>
                  <div style={{ fontWeight: 600 }}>₹{Math.round(booking.totalAmount ?? 0)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: mutedText }}>Advance Paid</div>
                  <div style={{ fontWeight: 600 }}>₹{Math.round(booking.advancePayment ?? 0)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: mutedText }}>At Venue Payment</div>
                  <div style={{ fontWeight: 600 }}>₹{Math.round(booking.venuePayment ?? 0)} <span style={{ fontSize: '0.8rem', color: mutedText }}>(to be paid at venue)</span></div>
                </div>
              </div>
            </div>

            <div style={{
              borderRadius: '28px',
              border: `1px solid ${borderColor}`,
              background: 'rgba(255,255,255,0.03)',
              padding: '28px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Food Items</h2>
                <div style={{ color: mutedText, fontSize: '0.95rem' }}>
                  Food Total: <span style={{ color: goldColor, fontWeight: 700 }}>₹{Math.round(orderedTotal)}</span>
                </div>
              </div>

              {false && services.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                  {services.map((svc: any) => {
                    const id = svc.id || svc._id;
                    if (!id) return null;
                    const isActive = selectedServiceId === id;
                    return (
                      <button
                        key={String(id)}
                        type="button"
                        onClick={() => handleSelectService(String(id))}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 999,
                          border: `1px solid ${isActive ? accentColor : borderColor}`,
                          background: isActive ? 'rgba(229,9,20,0.85)' : 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        {svc.name || 'Service'}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Category filter for food items */}
              {!orderPlaced && categorizedMenuGroups.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginBottom: isSmallScreen ? 8 : 12,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter('ALL')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 999,
                      border:
                        selectedCategoryFilter === 'ALL'
                          ? `1px solid ${accentColor}`
                          : `1px solid ${borderColor}`,
                      background:
                        selectedCategoryFilter === 'ALL'
                          ? 'rgba(229,9,20,0.9)'
                          : 'rgba(0,0,0,0.6)',
                      color: '#fff',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    All
                  </button>

                  {availableCategoryFilters.map((key) => {
                    const group = categorizedMenuGroups.find((g) => g.categoryKey === key);
                    if (!group) return null;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedCategoryFilter(key)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 999,
                          border:
                            selectedCategoryFilter === key
                              ? `1px solid ${accentColor}`
                              : `1px solid ${borderColor}`,
                          background:
                            selectedCategoryFilter === key
                              ? 'rgba(229,9,20,0.9)'
                              : 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        {group.categoryLabel}
                      </button>
                    );
                  })}
                </div>
              )}

              {!orderPlaced && categorizedMenuGroups.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginBottom: isSmallScreen ? 10 : 16,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setOrderPlaced(true);
                      setCartModalOpen(false);
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 999,
                      border: `1px solid ${borderColor}`,
                      background: 'rgba(0,0,0,0.6)',
                      color: '#fca5a5',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel Add Items
                  </button>
                </div>
              )}

              {!orderPlaced && categorizedMenuGroups
                .filter((group) =>
                  selectedCategoryFilter === 'ALL'
                    ? true
                    : group.categoryKey === selectedCategoryFilter,
                )
                .map((group) => (
                <div key={group.categoryKey} style={{ marginBottom: isSmallScreen ? 16 : 22 }}>
                  {group.categoryKey !== '__uncategorized__' && (
                    <div
                      style={{
                        marginBottom: 8,
                        fontSize: 12,
                        textTransform: 'uppercase',
                        letterSpacing: '0.14em',
                        color: mutedText,
                        fontWeight: 'bold',
                      }}
                    >
                      {group.categoryLabel}
                    </div>
                  )}
                  {group.categoryKey === '__uncategorized__' && (
                    <div
                      style={{
                        marginBottom: 10,
                        fontSize: 13,
                        textTransform: 'uppercase',
                        letterSpacing: '0.14em',
                        color: mutedText,
                        fontWeight: 'bold',
                      }}
                    >
                      {group.categoryLabel}
                    </div>
                  )}

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isSmallScreen
                        ? 'repeat(2, minmax(0, 1fr))'
                        : 'repeat(3, minmax(0, 1fr))',
                      gap: isSmallScreen ? 10 : 16,
                    }}
                  >
                    {group.items.map((menuItem: any) => (
                      <div
                        key={menuItem.id}
                        style={{
                          borderRadius: 14,
                          border: `1px solid ${borderColor}`,
                          background: 'rgba(0,0,0,0.6)',
                          padding: isSmallScreen ? 8 : 10,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                        }}
                      >
                        <div
                          style={{
                            height: isSmallScreen ? 100 : 110,
                            borderRadius: 12,
                            backgroundImage: `url(${(menuItem as any).imageUrl || '/food-placeholder.jpg'})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            marginBottom: 4,
                          }}
                        />
                        <div
                          style={{
                            fontSize: isSmallScreen ? 11 : 14,
                            fontWeight: 600,
                            lineHeight: isSmallScreen ? 1.2 : 1.4,
                            wordBreak: 'break-word',
                          }}
                        >
                          {menuItem.name}
                        </div>
                        <div style={{ marginTop: 2 }}>
                          <VegBadge vegType={menuItem.vegType} compact={isSmallScreen} />
                        </div>
                        {!menuItem.isDecoration && (
                          <div style={{ marginTop: 2, fontSize: 11, color: mutedText }}>
                            {menuItem.pricingMode === 'half-full' ? (
                              <span>(Starting at Rs {menuItem.halfPrice || 0})</span>
                            ) : menuItem.pricingMode === 'three-size' ? (
                              <span>(Starting at Rs {menuItem.smallPrice || 0})</span>
                            ) : (
                              <span>(Single price )</span>
                            )}
                          </div>
                        )}
                        <div style={{ marginTop: 2 }}>
                          {menuItem.pricingMode === 'half-full' ? (
                            <span style={{ color: goldColor, fontSize: 12, fontWeight: 700 }}>
                              H & F
                            </span>
                          ) : menuItem.pricingMode === 'three-size' ? (
                            <span style={{ color: goldColor, fontSize: 12, fontWeight: 700 }}>
                              S, M & L
                            </span>
                          ) : (
                            <span style={{ color: goldColor, fontSize: 12, fontWeight: 700 }}>
                            ₹{menuItem.price}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', marginTop: 4 }}>
                          <button
                            type="button"
                            style={{
                              flex: 1,
                              borderRadius: 999,
                              border: 'none',
                              background:
                                'linear-gradient(90deg, rgba(220,38,38,1), rgba(239,68,68,1))',
                              color: '#fff',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                              padding: '4px 8px',
                            }}
                            onClick={() => {
                              const qty = 1;
                              if (menuItem.pricingMode === 'half-full' || menuItem.pricingMode === 'three-size') {
                                openVariantModal(menuItem, qty);
                              } else {
                                handleAddMenuItem(menuItem, qty);
                              }
                            }}
                          >
                            {(() => {
                              if (menuItem.pricingMode === 'half-full' || menuItem.pricingMode === 'three-size') {
                                // Find all variants of this item in cart
                                const itemVariants = items.filter(item => 
                                  item.id && item.id.startsWith(menuItem.id + '-')
                                );
                                const totalQuantity = itemVariants.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
                                
                                if (totalQuantity > 0) {
                                  // Get the variant labels to show
                                  const variantLabels = itemVariants.map(item => {
                                    if (item.variantLabel === 'half') return 'Half';
                                    if (item.variantLabel === 'full') return 'Full';
                                    if (item.variantLabel === 'small') return 'Small';
                                    if (item.variantLabel === 'medium') return 'Medium';
                                    if (item.variantLabel === 'large') return 'Large';
                                    return '';
                                  }).filter(label => label);
                                  
                                  const uniqueVariants = [...new Set(variantLabels)];
                                  const variantText = uniqueVariants.join(', ');
                                  
                                  return `Choose Size (${totalQuantity} ${variantText})`;
                                }
                                return 'Choose Size';
                              } else {
                                // Single price items
                                const existingItem = items.find(item => item.id === menuItem.id);
                                const quantity = existingItem ? Number(existingItem.quantity || 0) : 0;
                                return quantity > 0 ? `Add to Cart (${quantity})` : 'Add to Cart';
                              }
                            })()}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {categorizedMenuGroups.length === 0 ? (
                <div
                  style={{
                    border: '1px dashed rgba(255,255,255,0.25)',
                    borderRadius: '20px',
                    padding: '24px',
                    textAlign: 'center',
                    color: mutedText,
                  }}
                >
                  <div style={{ marginBottom: '16px' }}>
                    No food items added yet. Configure menu items to get started.
                  </div>
                  <button
                    type="button"
                    style={{
                      padding: '10px 20px',
                      borderRadius: '999px',
                      border: 'none',
                      background: accentColor,
                      color: '#fff',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                    onClick={() => {
                      // This would open a menu configuration modal or navigate to admin
                      // For now, we'll just show a message
                      alert('Menu configuration feature coming soon!');
                    }}
                  >
                    Add Menu Item
                  </button>
                </div>
              ) : (
                (orderPlaced && orderedList.length > 0) ? (
                  <div
                    style={{
                      borderRadius: '28px',
                      border: `1px solid ${borderColor}`,
                      background: 'rgba(255,255,255,0.03)',
                      padding: '28px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Your Ordered Items</h2>
                        {booking && (
                          <span
                            style={{
                              padding: '4px 12px',
                              borderRadius: '999px',
                              fontSize: 12,
                              fontWeight: 600,
                              background: orderIsDelivered ? 'rgba(34,197,94,0.15)' : 'rgba(248,181,0,0.15)',
                              color: orderIsDelivered ? '#4ade80' : '#fbbf24',
                              border: `1px solid ${orderIsDelivered ? 'rgba(34,197,94,0.35)' : 'rgba(248,181,0,0.45)'}`,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}
                          >
                            {orderStatusLabel}
                          </span>
                        )}
                      </div>
                      <div style={{ color: mutedText, fontSize: '0.95rem' }}>
                        Service Total: <span style={{ color: goldColor, fontWeight: 700 }}>₹{Math.round(orderedTotal)}</span>
                      </div>
                    </div>

                    {orderIsDelivered && (
                      <div
                        style={{
                          marginBottom: 16,
                          padding: '14px 16px',
                          borderRadius: 18,
                          background: 'rgba(34,197,94,0.08)',
                          border: '1px solid rgba(34,197,94,0.25)',
                          color: '#bbf7d0',
                          fontSize: 13,
                        }}
                      >
                        This order has been marked as delivered. Removing items is disabled until staff add new items again.
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {orderedList.map((item, idx) => (
                        <div
                          key={`${item.id || 'item'}-${idx}`}
                          style={{
                            borderRadius: 16,
                            border: `1px solid ${borderColor}`,
                            background: 'rgba(0,0,0,0.6)',
                            padding: 16,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontSize: isSmallScreen ? 13 : 16,
                                fontWeight: 600,
                                lineHeight: isSmallScreen ? 1.3 : 1.4,
                                wordBreak: 'break-word',
                              }}
                            >
                              {item.name}
                            </div>
                            <div style={{ marginTop: 4 }}>
                              <VegBadge vegType={item.vegType} compact={isSmallScreen} />
                            </div>
                            {item.isDecoration && (
                              <div style={{ fontSize: 12, color: goldColor, marginTop: 2 }}>Decoration Item</div>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 14, color: mutedText }}>Quantity</div>
                              <div style={{ fontSize: 18, fontWeight: 700, color: goldColor }}>
                                {Number(item.quantity || 0)}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 14, color: mutedText }}>Total</div>
                              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                                ₹{Number(item.price || 0) * Number(item.quantity || 0)}
                              </div>
                            </div>
                            {orderIsDelivered ? (
                              <span
                                style={{
                                  padding: isSmallScreen ? '6px 10px' : '10px 18px',
                                  borderRadius: 999,
                                  border: '1px solid rgba(34,197,94,0.35)',
                                  background: 'rgba(34,197,94,0.12)',
                                  color: '#4ade80',
                                  fontWeight: 600,
                                  fontSize: 12,
                                  minWidth: isSmallScreen ? 36 : 80,
                                  textAlign: 'center',
                                }}
                              >
                                Delivered
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => removeOrderedItem(item.id)}
                                style={{
                                  padding: isSmallScreen ? '6px 10px' : '8px 12px',
                                  borderRadius: isSmallScreen ? 999 : 12,
                                  border: `1px solid ${borderColor}`,
                                  background: 'transparent',
                                  color: '#ff9b9b',
                                  fontWeight: 600,
                                  cursor: saving ? 'not-allowed' : 'pointer',
                                  fontSize: 12,
                                  minWidth: isSmallScreen ? 36 : 80,
                                }}
                              >
                                {saving ? '…' : isSmallScreen ? '×' : 'Remove'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                      <button
                        type="button"
                        disabled={saving || orderIsDelivered}
                        onClick={cancelOrder}
                        style={{
                          flex: 1,
                          padding: '12px',
                          borderRadius: '24px',
                          border: `1px solid ${orderIsDelivered ? 'rgba(34,197,94,0.35)' : borderColor}`,
                          background: orderIsDelivered ? 'rgba(34,197,94,0.08)' : 'transparent',
                          color: orderIsDelivered ? '#4ade80' : '#ff9b9b',
                          fontWeight: 600,
                          cursor: saving || orderIsDelivered ? 'not-allowed' : 'pointer',
                          fontSize: 14,
                          opacity: saving || orderIsDelivered ? 0.6 : 1,
                        }}
                      >
                        {orderIsDelivered ? 'Delivered' : saving ? 'Cancelling…' : 'Cancel All Order'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOrderPlaced(false);
                          setInfo('');
                          setCartModalOpen(false);
                        }}
                        style={{
                          flex: 1,
                          padding: '12px',
                          borderRadius: '24px',
                          border: 'none',
                          background: accentColor,
                          color: '#fff',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontSize: 14,
                        }}
                      >
                        Add More Items
                      </button>
                    </div>
                  </div>
                ) : (
                  items.length > 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                      <button
                        type="button"
                        onClick={() => setCartModalOpen(true)}
                        style={{
                          position: 'relative',
                          padding: '12px 24px',
                          borderRadius: '999px',
                          border: 'none',
                          background: accentColor,
                          color: '#fff',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontSize: '14px',
                          boxShadow: '0 15px 35px rgba(229,9,20,0.35)',
                        }}
                      >
                        See Cart
                        <span
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: goldColor,
                            color: '#000',
                            fontSize: '12px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid #fff',
                          }}
                        >
                          {items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)}
                        </span>
                      </button>
                    </div>
                  ) : null
                )
              )}

              {/* Items + Invoice totals just above Order button */}
              <div
                style={{
                  marginTop: '20px',
                  marginBottom: '8px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'rgba(15,15,15,0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e5e7eb',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  fontSize: '0.9rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Foods Total</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>
                    ₹
                    {(
                      orderedTotal +
                      items.reduce(
                        (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
                        0,
                      )
                    ).toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Decoration Fee from pricing (only when any decoration item is present) */}
                {items.some((i) => i.isDecoration) && pricingData.decorationFees > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Decoration Fee</span>
                    <span style={{ color: '#fecaca', fontWeight: 600 }}>
                      ₹{pricingData.decorationFees.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Invoice Total with Foods</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>
                    ₹
                    {(
                      Math.round(booking?.totalAmount ?? 0) +
                      items.reduce(
                        (sum, item) =>
                          sum + Number(item.price || 0) * Number(item.quantity || 0),
                        0,
                      ) +
                      (items.some((i) => i.isDecoration) ? pricingData.decorationFees : 0)
                    ).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', color: mutedText, fontSize: '0.9rem', marginTop: '16px' }}>
                <div>
                  <strong style={{ color: '#fff' }}>Current Invoice Total:</strong> ₹{Math.round(booking.totalAmount ?? 0)}
                </div>
                <div>
                  <strong style={{ color: '#fff' }}>To be Paid at Venue:</strong> ₹{Math.round(booking.venuePayment ?? 0)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ticket Number Modal */}
      {ticketModalOpen && ticketModal}
      {decorationInfoOpen && decorationInfoModal}
      {orderConfirmOpen && orderConfirmModal}
      {variantModalOpen && variantMenuItem && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 55,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 16px',
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 420,
              borderRadius: 24,
              padding: 24,
              background:
                'linear-gradient(135deg, rgba(15,15,15,0.98), rgba(35,35,35,0.96))',
              border: '1px solid rgba(255,255,255,0.16)',
              boxShadow: '0 22px 55px rgba(0,0,0,0.85)',
              color: '#fff',
            }}
          >
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Choose Size</h3>
            <p style={{ marginTop: 8, fontSize: 14, color: mutedText }}>
              {variantMenuItem.name}
            </p>

            <div style={{ marginTop: 12 }}>
              {getVariantOptions(variantMenuItem).map((opt) => (
                <label
                  key={opt.key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderRadius: 10,
                    background:
                      variantSelectedKey === opt.key
                        ? 'rgba(248,250,252,0.12)'
                        : 'rgba(15,23,42,0.6)',
                    border:
                      variantSelectedKey === opt.key
                        ? '1px solid rgba(248,250,252,0.7)'
                        : '1px solid rgba(148,163,184,0.4)',
                    marginBottom: 6,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="radio"
                      name="variant-size"
                      checked={variantSelectedKey === opt.key}
                      onChange={() => setVariantSelectedKey(opt.key)}
                    />
                    <span style={{ fontSize: 14 }}>{opt.label}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>₹{opt.price}</span>
                </label>
              ))}
            </div>

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: mutedText }}>Quantity</span>
              <input
                type="number"
                min={1}
                value={variantQty}
                onChange={(e) => {
                  const v = Number(e.target.value || '1');
                  setVariantQty(v > 0 ? v : 1);
                }}
                style={{
                  width: 70,
                  borderRadius: 999,
                  border: `1px solid ${borderColor}`,
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  padding: '6px 10px',
                  fontSize: 13,
                  textAlign: 'center',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button
                type="button"
                onClick={() => {
                  setVariantModalOpen(false);
                  setVariantMenuItem(null);
                  setVariantSelectedKey(null);
                  setVariantQty(1);
                }}
                style={{
                  padding: '9px 18px',
                  borderRadius: 999,
                  border: `1px solid ${borderColor}`,
                  background: 'transparent',
                  color: '#e5e7eb',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addSelectedVariantToCart}
                disabled={!variantSelectedKey}
                style={{
                  padding: '9px 20px',
                  borderRadius: 999,
                  border: 'none',
                  background: 'rgba(251, 5, 5, 1)',
                  color: '#fff',
                  cursor: variantSelectedKey ? 'pointer' : 'not-allowed',
                  fontSize: 13,
                  fontWeight: 600,
                  opacity: variantSelectedKey ? 1 : 0.6,
                  boxShadow: '0 16px 35px rgba(220,38,38,0.7)',
                }}
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
      {cartModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 16px',
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 500,
              maxHeight: '80vh',
              borderRadius: 24,
              padding: 24,
              background:
                'linear-gradient(135deg, rgba(15,15,15,0.98), rgba(35,35,35,0.96))',
              border: '1px solid rgba(255,255,255,0.16)',
              boxShadow: '0 22px 55px rgba(0,0,0,0.85)',
              color: '#fff',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Your Cart</h3>
              <button
                type="button"
                onClick={() => setCartModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#e5e7eb',
                  fontSize: 24,
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: mutedText }}>
                Your cart is empty
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      borderRadius: 16,
                      border: `1px solid ${borderColor}`,
                      background: 'rgba(0,0,0,0.6)',
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>{item.name}</div>
                        <div style={{ marginTop: 4 }}>
                          <VegBadge vegType={item.vegType} compact />
                        </div>
                        {item.isDecoration && (
                          <div style={{ fontSize: 12, color: goldColor, marginTop: 2 }}>Decoration Item</div>
                        )}
                      </div>
                      <button
                        type="button"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ff9b9b',
                          fontSize: 12,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 14, color: goldColor, fontWeight: 600 }}>
                        ₹{Number(item.price || 0)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          type="button"
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '999px',
                            border: `1px solid ${borderColor}`,
                            background: 'rgba(0,0,0,0.6)',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: 16,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onClick={() => handleUpdateQuantity(item.id, -1)}
                        >
                          −
                        </button>
                        <span style={{ minWidth: 30, textAlign: 'center', fontSize: 14, fontWeight: 600 }}>
                          {Number(item.quantity || 0)}
                        </span>
                        <button
                          type="button"
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '999px',
                            border: `1px solid ${borderColor}`,
                            background: accentColor,
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: 16,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onClick={() => handleUpdateQuantity(item.id, 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        Total: ₹{Number(item.price || 0) * Number(item.quantity || 0)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {items.length > 0 && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${borderColor}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>Cart Total</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: goldColor }}>
                    ₹{items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0)}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    if (saving) return;
                    await saveItems(false);
                    setCartModalOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 999,
                    border: 'none',
                    background: saving ? 'rgba(251, 5, 5, 0.6)' : 'rgba(251, 5, 5, 1)',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving ? 'Placing Order…' : 'Place Order'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
