'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Shield } from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [alertOrder, setAlertOrder] = useState<AlertOrderRecord | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  
  // Login form states
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const orderFingerprintRef = useRef<Record<string, string>>({});
  const orderSnapshotRef = useRef<Record<string, string>>({});
  const dismissedFingerprintsRef = useRef<Record<string, { fp: string; ts: number }>>({});
  const hasAlertBaselineRef = useRef(false);
  const activeAlertKeyRef = useRef('');
  const activeAlertFingerprintRef = useRef('');
  const audioCtxRef = useRef<AudioContext | null>(null);

  const DISMISSED_STORAGE_KEY = 'admin:order-alert-dismissed-fingerprints';
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
      console.warn('⚠️ Failed to load dismissed order alerts from storage', error);
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
      console.warn('⚠️ Failed to poll orders for alert overlay', err);
    }
  }, [alertOpen, alertOrder, triggerAlertFeedback]);

  useEffect(() => {
    // Immediate authentication check - no loading state
    const adminToken = localStorage.getItem('adminToken');
    const loginTime = localStorage.getItem('adminLoginTime');

    const checkSession = async () => {
      if (adminToken === 'authenticated' && loginTime) {
        try {
          // Fetch settings to get configurable session lifetime (days)
          const res = await fetch('/api/admin/settings');
          const data = await res.json();
          const sessionTimeoutDays = Number(data?.settings?.sessionTimeout) || 30; // default 30 days
          const sessionDuration = sessionTimeoutDays * 24 * 60 * 60 * 1000;

          const currentTime = Date.now();
          if (currentTime - parseInt(loginTime) < sessionDuration) {
            setIsAuthenticated(true);
          } else {
            // Session expired, clear storage
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminLoginTime');
            localStorage.removeItem('adminUser');
            setIsAuthenticated(false);
          }
        } catch (e) {
          // Fallback to 30 days if settings fetch fails
          const currentTime = Date.now();
          const sessionDuration = 30 * 24 * 60 * 60 * 1000;
          if (currentTime - parseInt(loginTime) < sessionDuration) {
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminLoginTime');
            localStorage.removeItem('adminUser');
            setIsAuthenticated(false);
          }
        }
      } else {
        setIsAuthenticated(false);
      }
    };

    checkSession();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchOrdersForAlert();
    const interval = setInterval(() => {
      fetchOrdersForAlert();
    }, 2000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchOrdersForAlert]);

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
            console.warn('⚠️ Failed to persist dismissed order alerts', error);
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
    router.push('/Administrator/orders');
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
    router.push('/Administrator/orders');
  }, [alertOrder, dismissAlert, router, handleGoToOrders]);

  const describeAlert = useCallback((order: AlertOrderRecord) => {
    const theater = order.theaterName || 'this theater';
    const customer = order.customerName || 'the customer';
    const staffSuffix = order.performedBy ? ` by ${order.performedBy}` : '';
    const itemNames = (order.items || [])
      .map((item) => item?.name)
      .filter((name): name is string => Boolean(name));
    const itemList = itemNames.length ? itemNames.join(', ') : 'items';
    const action = (order.actionType || '').toLowerCase();

    if (action === 'remove') {
      const reason = order.removalReason || `Removed items: ${itemList}`;
      return `${customer} removed items for ${theater}${staffSuffix}. ${reason}`.trim();
    }

    if (action === 'clear') {
      return `${customer} cancelled all items for ${theater}${staffSuffix}.`;
    }

    if (action === 'update') {
      return `${customer} updated ${itemList} for ${theater}${staffSuffix}.`;
    }

    return `${customer} added new items for ${theater}${staffSuffix}. Let the kitchen know and prep quickly!`;
  }, []);

  const resolveAlertTitle = useCallback((order?: AlertOrderRecord | null) => {
    if (!order) return 'New order';
    const action = (order.actionType || '').toLowerCase();
    if (action === 'remove') return 'Items removed';
    if (action === 'clear') return 'Order cancelled';
    if (action === 'update') return 'Order updated';
    return 'New order';
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Call API to verify admin password from database
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();
      

      if (data.success) {
        
        // Store admin session
        localStorage.setItem('adminToken', 'authenticated');
        localStorage.setItem('adminLoginTime', Date.now().toString());
        localStorage.setItem('adminUser', JSON.stringify(data.admin));
        
        // Set authenticated state directly instead of redirect
        setIsAuthenticated(true);
        return;
      } else {
        setError(data.message || 'Invalid admin password. Please try again.');
        setPassword('');
        setIsLoading(false);
      }
    } catch (error) {
      
      setError('Connection error. Please try again.');
      setPassword('');
      setIsLoading(false);
    }
  };


  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="admin-login">
        <div className="animated-bg">
          <div className="grid-container">
            <div className="grid-overlay"></div>
            <div className="colored-grid-line horizontal-line-1"></div>
            <div className="colored-grid-line horizontal-line-2"></div>
            <div className="colored-grid-line horizontal-line-4"></div>
            <div className="colored-grid-line vertical-line-1"></div>
            <div className="colored-grid-line vertical-line-2"></div>
            <div className="colored-grid-line vertical-line-4"></div>
            <div className="colored-grid-line vertical-line-5"></div>
          </div>
        </div>
        
        <div className="login-container">
          <div className="login-header">
            <div className="logo-section">
              <Shield size={48} className="shield-icon" />
              <h1>FeelMe Town</h1>
              <p>Admin Access</p>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="password">Admin Password</label>
              <div className="password-input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
                  className="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="toggle-password"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !password}
              className="login-button"
            >
              {isLoading ? (
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  <span>Loading...</span>
                </div>
              ) : (
                'Access Admin Panel'
              )}
            </button>

            <div className="additional-buttons">
              <button type="button" className="secondary-button">
                Login with Face
              </button>
              <button type="button" className="secondary-button">
                Forgot Password
              </button>
            </div>
          </form>

          <div className="login-footer">
            <p>Authorized personnel only</p>
          </div>
        </div>
      </div>
    );
  }

  // Show admin panel if authenticated
  return (
    <div className="admin-layout">
      <AdminSidebar isOpen={sidebarOpen} />
      <div className={`admin-main ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <AdminHeader onToggleSidebar={toggleSidebar} />
        <main className="admin-content">
          {children}
        </main>
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
                  <span className="removed-items-list">
                    {removedNames.join(', ')}
                  </span>
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
                  <span className="added-items-list">
                    {addedNames.join(', ')}
                  </span>
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
                    const displayItems =
                      variant === 'added' && addedItems.length ? addedItems : alertOrder.items || [];
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
                      <td colSpan={3} className="empty-state">No items added.</td>
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
        .order-alert-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.75);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 32px 24px 48px;
          z-index: 9999;
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

