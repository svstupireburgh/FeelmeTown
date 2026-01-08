'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import ManagementSidebar from '@/components/ManagementSidebar';
import ManagementHeader from '@/components/ManagementHeader';
import ToastManager from '@/components/ToastManager';
import { storeOrderAlertDetail } from '@/lib/order-alert';

interface AlertOrderItem {
  id?: string;
  name?: string;
  price?: number;
  quantity?: number;
}

interface AlertOrderRecord {
  _id?: string;
  bookingId?: string;
  mongoBookingId?: string;
  ticketNumber?: string;
  customerName?: string;
  theaterName?: string;
  numberOfPeople?: number;
  items?: AlertOrderItem[];
  subtotal?: number;
  totalAmountBefore?: number;
  totalAmountAfter?: number;
  status?: string;
  serviceName?: string;
  actionType?: string;
  removalReason?: string;
  performedBy?: string;
  changeSet?: {
    addedItems?: AlertOrderItem[];
    removedItems?: AlertOrderItem[];
    removedSubtotal?: number;
    addedSubtotal?: number;
  };
  removedItemNames?: string[];
}

const currency = (value?: number) =>
  typeof value === 'number'
    ? `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`
    : '—';

type AlertVariant = 'added' | 'cancelled' | 'removed';

const getAlertVariant = (order: AlertOrderRecord): AlertVariant => {
  const action = (order.actionType || '').toLowerCase();
  const eventType = ((order as any).eventType || '').toLowerCase();
  const addedItemsCount = order.changeSet?.addedItems?.length || 0;
  const removedItemsCount = order.changeSet?.removedItems?.length || 0;
  const hasAdded =
    action === 'append' ||
    action === 'update' ||
    addedItemsCount > 0 ||
    ((order.items || []).length > 0 && !removedItemsCount);

  if (action === 'cancelled' || eventType === 'cancellation') {
    return 'cancelled';
  }
  if (action === 'remove' || (removedItemsCount > 0 && !hasAdded)) {
    return 'removed';
  }
  return 'added';
};

export default function ManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [staffUser, setStaffUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [alertOrder, setAlertOrder] = useState<AlertOrderRecord | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const orderFingerprintRef = useRef<Record<string, string>>({});
  const orderSnapshotRef = useRef<Record<string, string>>({});
  const dismissedFingerprintsRef = useRef<Record<string, { fp: string; ts: number }>>({});
  const hasAlertBaselineRef = useRef(false);
  const activeAlertKeyRef = useRef('');
  const activeAlertFingerprintRef = useRef('');
  const audioCtxRef = useRef<AudioContext | null>(null);

  const DISMISSED_STORAGE_KEY = 'management:order-alert-dismissed-fingerprints';
  const DISMISSED_TTL_MS = 24 * 60 * 60 * 1000;

  const getOrderKey = (order: AlertOrderRecord, fallbackIndex?: number) =>
    order._id || order.ticketNumber || order.bookingId || (fallbackIndex !== undefined ? `order-${fallbackIndex}` : '');

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => undefined);
        audioCtxRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(DISMISSED_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, { fp?: unknown; ts?: unknown }>;
      const now = Date.now();
      const next: Record<string, { fp: string; ts: number }> = {};
      Object.entries(parsed || {}).forEach(([key, value]) => {
        const fp = typeof value?.fp === 'string' ? value.fp : '';
        const ts = typeof value?.ts === 'number' ? value.ts : 0;
        if (!key || !fp || !ts) return;
        if (now - ts > DISMISSED_TTL_MS) return;
        next[key] = { fp, ts };
      });
      dismissedFingerprintsRef.current = next;
      window.localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.warn('⚠️ [management] Failed to load dismissed order alerts from storage', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playAlertTone = useCallback(() => {
    if (typeof window === 'undefined') return;
    const extendedWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
    const AudioContextClass = extendedWindow.AudioContext || extendedWindow.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContextClass();
    }
    const ctx = audioCtxRef.current;
    ctx.resume?.().catch(() => undefined);
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const now = ctx.currentTime;
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(880, now);
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.4, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.65);
  }, []);

  const triggerAlertFeedback = useCallback(() => {
    if (typeof window !== 'undefined' && 'vibrate' in window.navigator) {
      window.navigator.vibrate?.([180, 80, 180]);
    }
    playAlertTone();
  }, [playAlertTone]);

  const fetchOrdersForAlert = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/orders?limit=200&includeCompletedBookings=true', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (!data?.success || !Array.isArray(data.orders)) return;

      const fetched: AlertOrderRecord[] = data.orders;
      let detectedOrder: AlertOrderRecord | null = null;
      let detectedKey = '';
      let detectedFingerprint = '';
      const nextFingerprints: Record<string, string> = {};
      const nextSnapshots: Record<string, string> = {};

      fetched.forEach((order, index) => {
        const key = getOrderKey(order, index);
        if (!key) return;
        const itemsSnapshot = (order.items || [])
          .map((item) => ({
            id: item?.id || '',
            name: item?.name || '',
            qty: item?.quantity || 0,
            price: item?.price || 0,
          }))
          .sort((a, b) => {
            const aKey = `${a.name}-${a.id}-${a.price}`;
            const bKey = `${b.name}-${b.id}-${b.price}`;
            return aKey.localeCompare(bKey);
          });
        const action = order.actionType || '';
        const event = (order as any).eventType || '';
        const baseSnapshotPayload = {
          items: itemsSnapshot,
          action,
          event,
        };
        const fingerprint = JSON.stringify({
          ...baseSnapshotPayload,
          status: order.status || '',
        });
        const snapshot = JSON.stringify(baseSnapshotPayload);
        nextFingerprints[key] = fingerprint;
        nextSnapshots[key] = snapshot;
        const prevFingerprint = orderFingerprintRef.current[key];
        const prevSnapshot = orderSnapshotRef.current[key];
        const dismissedFingerprint = dismissedFingerprintsRef.current[key]?.fp;
        const status = (order.status || '').toLowerCase();
        const autoDismissedStatus = status === 'received' || status === 'ready' || status === 'cancelled';

        const snapshotChanged = !prevSnapshot || prevSnapshot !== snapshot;
        const fingerprintChanged = !prevFingerprint || prevFingerprint !== fingerprint;
        const statusOnlyChange =
          autoDismissedStatus && fingerprintChanged && !snapshotChanged;

        if (statusOnlyChange) {
          return;
        }
        if (autoDismissedStatus && (!prevFingerprint || prevFingerprint === fingerprint)) {
          return;
        }
        const isNewItems = snapshotChanged;
        const wasDismissedForSameState = dismissedFingerprint === fingerprint;
        if (!wasDismissedForSameState && isNewItems && !detectedOrder) {
          detectedOrder = order;
          detectedKey = key;
          detectedFingerprint = fingerprint;
        }
      });

      orderFingerprintRef.current = nextFingerprints;
      orderSnapshotRef.current = nextSnapshots;

      if (!hasAlertBaselineRef.current) {
        hasAlertBaselineRef.current = true;
        return;
      }

      if (detectedOrder) {
        const incomingKey = detectedKey || getOrderKey(detectedOrder);
        const activeKey = activeAlertKeyRef.current;
        const sameKey = incomingKey && activeKey && incomingKey === activeKey;
        setAlertOrder(detectedOrder);
        if (!alertOpen) {
          setAlertOpen(true);
        }
        if (!sameKey) {
          triggerAlertFeedback();
        }
        activeAlertKeyRef.current = incomingKey;
        activeAlertFingerprintRef.current = detectedFingerprint || nextFingerprints[incomingKey] || '';
      }
    } catch (err) {
      console.warn('⚠️ [management] Failed to poll orders for alert overlay', err);
    }
  }, [alertOpen, alertOrder, triggerAlertFeedback]);

  useEffect(() => {
    // Only check authentication for dashboard routes, not login page
    if (pathname !== '/management') {
      const staffToken = localStorage.getItem('staffToken');
      const loginTime = localStorage.getItem('staffLoginTime');
      const staffUserData = localStorage.getItem('staffUser');

      if (staffToken === 'authenticated' && loginTime && staffUserData) {
        // Check if session is valid using configurable lifetime (days)
        const checkSession = async () => {
          try {
            const res = await fetch('/api/admin/settings');
            const data = await res.json();
            const sessionTimeoutDays = Number(data?.settings?.sessionTimeout) || 1; // default 1 day
            const sessionDuration = sessionTimeoutDays * 24 * 60 * 60 * 1000;

            const currentTime = Date.now();
            if (currentTime - parseInt(loginTime) < sessionDuration) {
              const parsedUser = JSON.parse(staffUserData);
              try {
                const staffRes = await fetch('/api/admin/staff');
                const staffData = await staffRes.json();
                if (staffData.success && Array.isArray(staffData.staff)) {
                  const match = staffData.staff.find((member: any) => String(member.userId || member._id) === String(parsedUser.userId || parsedUser._id));
                  if (match) {
                    parsedUser.bookingAccess = match.bookingAccess === 'edit' ? 'edit' : 'view';
                    localStorage.setItem('staffUser', JSON.stringify(parsedUser));
                  }
                }
              } catch (error) {
                // Ignore refresh errors; fallback to stored data
              }
              setStaffUser(parsedUser);
              setIsLoading(false);
            } else {
              localStorage.removeItem('staffToken');
              localStorage.removeItem('staffLoginTime');
              localStorage.removeItem('staffUser');
              router.push('/management');
            }
          } catch (e) {
            // Fallback to 1 day if settings fetch fails
            const currentTime = Date.now();
            const sessionDuration = 1 * 24 * 60 * 60 * 1000;
            if (currentTime - parseInt(loginTime) < sessionDuration) {
              setStaffUser(JSON.parse(staffUserData));
              setIsLoading(false);
            } else {
              localStorage.removeItem('staffToken');
              localStorage.removeItem('staffLoginTime');
              localStorage.removeItem('staffUser');
              router.push('/management');
            }
          }
        };
        checkSession();
      } else {
        // Not authenticated, redirect to login
        router.push('/management');
      }
    } else {
      // For login page, just set loading to false
      setIsLoading(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    if (isLoading) return;
    if (!staffUser) return;
    if (pathname === '/management') return;

    fetchOrdersForAlert();
    const interval = setInterval(() => {
      fetchOrdersForAlert();
    }, 2000);
    return () => clearInterval(interval);
  }, [isLoading, staffUser, pathname, fetchOrdersForAlert]);

  const dismissAlert = useCallback(() => {
    if (alertOrder) {
      const key = activeAlertKeyRef.current || getOrderKey(alertOrder);
      if (key) {
        const fpToStore = activeAlertFingerprintRef.current || orderFingerprintRef.current[key] || '';
        const next = {
          ...dismissedFingerprintsRef.current,
          [key]: { fp: fpToStore, ts: Date.now() },
        };
        dismissedFingerprintsRef.current = next;
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(next));
          } catch (error) {
            console.warn('⚠️ [management] Failed to persist dismissed order alerts', error);
          }
        }
      }
    }
    setAlertOpen(false);
    setAlertOrder(null);
    activeAlertKeyRef.current = '';
    activeAlertFingerprintRef.current = '';
  }, [alertOrder]);

  const handleGoToOrders = useCallback(() => {
    dismissAlert();
    router.push('/management/orders');
  }, [dismissAlert, router]);

  const handleViewDetail = useCallback(() => {
    if (!alertOrder) {
      handleGoToOrders();
      return;
    }
    storeOrderAlertDetail({
      bookingId: alertOrder.bookingId,
      ticketNumber: alertOrder.ticketNumber,
      order: alertOrder,
    });
    dismissAlert();
    router.push('/management/orders');
  }, [alertOrder, dismissAlert, router, handleGoToOrders]);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontFamily: 'Paralucent-Medium, Arial, Helvetica, sans-serif',
          fontSize: '1.2rem',
          color: '#666',
        }}
      >
        Loading...
      </div>
    );
  }

  // For login page, don't show sidebar
  if (pathname === '/management') {
    return <>{children}</>;
  }

  // For all other management pages, show sidebar layout
  return (
    <div className="management-layout">
      <ManagementSidebar isOpen={sidebarOpen} />
      <div className={`management-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <ManagementHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} staffUser={staffUser} />
        <main className="main-content">{children}</main>
      </div>
      <ToastManager />

      {alertOpen && alertOrder && (
        <div className="order-alert-backdrop">
          <div className="order-alert-card">
            <div className="order-alert-header">
              <div>
                {(() => {
                  const variant = getAlertVariant(alertOrder);
                  let kicker = 'New order';
                  if (variant === 'cancelled') kicker = 'Order cancelled';
                  if (variant === 'removed') kicker = 'Items removed';
                  return <p className={`orders-kicker orders-kicker-${variant}`}>{kicker}</p>;
                })()}
                <h2>{alertOrder.customerName || 'Customer'}</h2>
                <div className="order-alert-tags">
                  <span className="tag theater-tag">{alertOrder.theaterName || 'Theater'}</span>
                  <span className="order-alert-chip">Booking: {alertOrder.bookingId || '—'}</span>
                  <span className="order-alert-chip">Ticket: {alertOrder.ticketNumber || '—'}</span>
                </div>
              </div>
              <button type="button" className="icon-button" onClick={dismissAlert}>
                ×
              </button>
            </div>
            <p className="order-alert-subtitle">
              {(() => {
                const variant = getAlertVariant(alertOrder);
                if (variant === 'cancelled') {
                  return 'Customer cancelled their items. Clear the station and update the team.';
                }
                if (variant === 'removed') {
                  return 'Customer removed some items. Confirm the kitchen has the latest list.';
                }
                return `A new order just landed for ${alertOrder.theaterName || 'this theater'}. Let the kitchen know and prep quickly!`;
              })()}
            </p>
            {(() => {
              const variant = getAlertVariant(alertOrder);
              const removedNames =
                alertOrder.removedItemNames?.length
                  ? alertOrder.removedItemNames
                  : alertOrder.changeSet?.removedItems
                      ?.map((item) => item?.name)
                      .filter((name): name is string => Boolean(name));
              if (variant !== 'removed' || !removedNames?.length) return null;
              return (
                <div className="order-alert-removed">
                  <span className="pill-pill">Removed</span>
                  <span className="removed-items-list">{removedNames.join(', ')}</span>
                </div>
              );
            })()}
            {(() => {
              const variant = getAlertVariant(alertOrder);
              const addedNames =
                alertOrder.changeSet?.addedItems
                  ?.map((item) => item?.name)
                  .filter((name): name is string => Boolean(name)) ||
                (alertOrder.items || [])
                  .map((item) => item?.name)
                  .filter((name): name is string => Boolean(name));
              if (variant !== 'added' || !addedNames?.length) return null;
              return (
                <div className="order-alert-added">
                  <span className="pill-pill">Added</span>
                  <span className="added-items-list">{addedNames.join(', ')}</span>
                </div>
              );
            })()}
            <div className="order-alert-table">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const variant = getAlertVariant(alertOrder);
                    const addedItems = alertOrder.changeSet?.addedItems || [];
                    const displayItems = variant === 'added' && addedItems.length ? addedItems : alertOrder.items || [];
                    return displayItems.map((item, idx) => {
                      const highlightRow = variant === 'added';
                      return (
                        <tr
                          key={`${item?.id || item?.name || 'item'}-${idx}`}
                          className={highlightRow ? 'order-row-added' : undefined}
                        >
                          <td>{item?.name || '—'}</td>
                          <td>{item?.quantity || 0}</td>
                          <td>{currency(item?.price)}</td>
                        </tr>
                      );
                    });
                  })()}
                  {(alertOrder.items || []).length === 0 && (
                    <tr>
                      <td colSpan={3} className="empty-state">
                        No items added.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="order-alert-actions">
              <button type="button" className="view-detail-button" onClick={handleViewDetail}>
                View detail
              </button>
              <button type="button" className="notify-button" onClick={handleGoToOrders}>
                Go to orders page
              </button>
              <button type="button" className="dismiss-button" onClick={dismissAlert}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .management-layout {
          display: flex;
          min-height: 100vh;
          background: #f8fafc;
        }

        .management-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          transition: margin-left 0.3s ease;
        }

        .management-content.sidebar-open {
          margin-left: 280px;
        }

        .management-content.sidebar-closed {
          margin-left: 80px;
        }

        .main-content {
          flex: 1;
          padding: 2rem;
        }

        @media (max-width: 768px) {
          .management-content {
            margin-left: 0 !important;
          }

          .management-content.sidebar-open,
          .management-content.sidebar-closed {
            margin-left: 0 !important;
          }

          .main-content {
            padding: 1rem;
          }
        }

        .order-alert-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.65);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 32px 24px 48px;
          z-index: 9999;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .order-alert-card {
          width: 100%;
          max-width: 760px;
          border-radius: 32px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: #ffffff;
          color: #111827;
          padding: 32px;
          box-shadow: 0 40px 90px rgba(15, 23, 42, 0.4);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .order-alert-header {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
        }
        .order-alert-tags {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 8px;
        }
        .order-alert-chip {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.35rem 0.85rem;
          border-radius: 999px;
          background: #f1f5f9;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .orders-kicker {
          font-size: 0.85rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 700;
          color: #0f172a;
          opacity: 0.65;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0.25rem 0.85rem;
          border-radius: 999px;
          background: #e2e8f0;
          border: 1px solid rgba(15, 23, 42, 0.08);
        }
        .orders-kicker-added {
          background: #ecfdf5;
          border-color: rgba(16, 185, 129, 0.35);
          color: #047857;
        }
        .orders-kicker-removed {
          background: #fff7ed;
          border-color: rgba(251, 146, 60, 0.35);
          color: #c2410c;
        }
        .orders-kicker-cancelled {
          background: #fef2f2;
          border-color: rgba(248, 113, 113, 0.35);
          color: #b91c1c;
        }
        .order-alert-subtitle {
          color: #475569;
          font-size: 0.95rem;
        }
        .order-alert-table {
          max-height: 260px;
          overflow: auto;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          padding: 12px;
          background: #f8fafc;
        }
        .order-alert-table table {
          width: 100%;
          border-collapse: collapse;
        }
        .order-alert-table th,
        .order-alert-table td {
          text-align: left;
          padding: 8px;
          font-size: 0.9rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .order-alert-table tbody tr:last-child td {
          border-bottom: none;
        }
        .order-alert-table tbody tr.order-row-added td {
          background: #fff7ed;
          color: #9a3412;
          font-weight: 600;
        }
        .order-alert-removed,
        .order-alert-added {
          display: inline-flex;
          gap: 8px;
          align-items: center;
          font-size: 0.9rem;
          border-radius: 16px;
          padding: 8px 12px;
        }
        .order-alert-removed {
          background: #fff1f2;
          color: #b91c1c;
          border: 1px solid #fecdd3;
        }
        .order-alert-added {
          background: #ecfdf5;
          color: #0f766e;
          border: 1px solid #a7f3d0;
        }
        .order-alert-removed .pill-pill {
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .order-alert-actions {
          display: flex;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 12px;
        }
        .view-detail-button,
        .notify-button,
        .dismiss-button {
          border-radius: 999px;
          padding: 12px 24px;
          font-weight: 600;
          border: none;
          cursor: pointer;
        }
        .view-detail-button {
          background: #0ea5e9;
          color: #ffffff;
        }
        .notify-button {
          background: #111827;
          color: #ffffff;
        }
        .dismiss-button {
          background: #f97316;
          color: #ffffff;
        }
        .tag.theater-tag {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.35rem 0.85rem;
          border-radius: 999px;
          font-weight: 700;
          text-transform: uppercase;
          background: #b91c1c;
          color: #fee2e2;
        }
      `}</style>
    </div>
  );
}
