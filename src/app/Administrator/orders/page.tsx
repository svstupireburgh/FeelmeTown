'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { RefreshCw, Search, Eye } from 'lucide-react';
import { consumeOrderAlertDetail, type OrderAlertDetailPayload } from '@/lib/order-alert';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';

interface OrderItem {
  id?: string;
  name?: string;
  price?: number;
  quantity?: number;
  serviceName?: string;
  isDecoration?: boolean;
}

interface OrderRecord {

  _id?: string;
  bookingId?: string;
  mongoBookingId?: string;
  ticketNumber?: string;
  customerName?: string;
  theaterName?: string;
  bookingDate?: string;
  bookingTime?: string;
  numberOfPeople?: number;
  serviceName?: string;
  serviceField?: string;
  canonicalField?: string;
  items?: OrderItem[];
  subtotal?: number;
  previousSubtotal?: number;
  actionType?: 'save' | 'clear' | 'append' | 'update' | 'remove' | 'cancelled';
  status?: string;
  markPaid?: boolean;
  totalAmountBefore?: number;
  totalAmountAfter?: number;
  venuePaymentBefore?: number;
  venuePaymentAfter?: number;
  performedBy?: string;
  recordedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  orderPrepMinutes?: number;
  orderPrepReadyAt?: string;
}

const limitOptions = [50, 100, 200, 300, 500];
const prepTimeOptions = [30, 40];

const currency = (value?: number) =>
  typeof value === 'number'
    ? `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`
    : '—';

const formatTimestamp = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatShortTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatDisplayDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  return value;
};

const formatTimeSlot = (value?: string) => {
  if (!value) return '—';

  if (/\d{1,2}:\d{2}\s*(AM|PM)\s*-\s*\d{1,2}:\d{2}\s*(AM|PM)/i.test(value)) {
    return value.toUpperCase();
  }
  const match = value.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!match) return value;
  const [, hours, minutes, period] = match;
  let hour = parseInt(hours, 10);
  const mins = minutes.padStart(2, '0');
  let resolvedPeriod = period?.toUpperCase();
  if (!resolvedPeriod) {
    resolvedPeriod = hour >= 12 ? 'PM' : 'AM';
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
  }
  return `${hour}:${mins} ${resolvedPeriod}`;
};

const buildItemsFingerprint = (items?: OrderItem[]) =>
  (items || [])
    .map((item) => `${item.id || item.name || 'item'}:${item.quantity ?? 0}:${item.price ?? 0}`)
    .join('|');

export default function OrdersPage() {
  const { toasts, removeToast, showError, showSuccess, showWarning } = useToast();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [limit, setLimit] = useState(200);
  const [viewOrdersModalOpen, setViewOrdersModalOpen] = useState(false);
  const [buttonStates, setButtonStates] = useState<Record<string, 'initial' | 'received' | 'ready' | 'cancelled'>>({});
  const [buttonLoading, setButtonLoading] = useState<Record<string, boolean>>({});
  const [viewDetailOpen, setViewDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReasons, setCancelReasons] = useState<string[]>([]);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelNotes, setCancelNotes] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [itemCancelModalOpen, setItemCancelModalOpen] = useState(false);
  const [itemCancelTarget, setItemCancelTarget] = useState<OrderItem | null>(null);
  const [itemCancelReason, setItemCancelReason] = useState('');
  const [itemCancelNotes, setItemCancelNotes] = useState('');
  const [itemCancelLoading, setItemCancelLoading] = useState(false);
  const [modalActionLoading, setModalActionLoading] = useState(false);
  const [prepModalOrder, setPrepModalOrder] = useState<OrderRecord | null>(null);
  const [prepMinutesSelection, setPrepMinutesSelection] = useState<number>(30);
  const [prepCustomMinutes, setPrepCustomMinutes] = useState('');
  const [prepModalError, setPrepModalError] = useState('');
  const [prepModalLoading, setPrepModalLoading] = useState(false);
  const [prepModalAction, setPrepModalAction] = useState<'received' | 'ready'>('received');
  const changeSignatureRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const detail = consumeOrderAlertDetail();
    if (detail?.order) {
      setSelectedOrder(detail.order as OrderRecord);
      setViewDetailOpen(true);
    }
  }, []);

  useEffect(() => {
    setCancelReasons(['Customer requested', 'Item unavailable', 'Kitchen closed', 'Other']);
  }, []);

  const fetchOrders = async (opts: { silent?: boolean } = {}) => {
    const { silent = false } = opts;
    try {
      if (!silent) {
        setLoading(true);
      }
      setError('');
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (serviceFilter) params.set('serviceName', serviceFilter);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load orders');
      }

      const fetched = Array.isArray(data.orders) ? data.orders : [];
      const prevOrdersByTicket = new Map<
        string,
        {
          order: OrderRecord;
          itemsFingerprint: string;
        }
      >();
      orders.forEach((existing) => {
        if (!existing?.ticketNumber) return;
        prevOrdersByTicket.set(existing.ticketNumber, {
          order: existing,
          itemsFingerprint: buildItemsFingerprint(existing.items),
        });
      });

      setOrders(fetched);
      setButtonStates((prev) => {
        const next: Record<string, 'initial' | 'received' | 'ready' | 'cancelled'> = {};
        fetched.forEach((order: OrderRecord) => {
          const ticket = order.ticketNumber;
          if (!ticket) return;
          const status = (order.status || '').toLowerCase();
          const actionType = (order.actionType || '').toLowerCase();
          const isAppendLike = actionType === 'append' || actionType === 'save';
          const isUpdateLike = actionType === 'update';
          const isRemovalLike = actionType === 'remove' || actionType === 'clear' || actionType === 'cancelled';
          const itemsLength = Array.isArray(order.items) ? order.items.length : 0;
          const signatureBase = order.recordedAt || order.updatedAt || order.createdAt || '';
          const signature = [
            actionType || 'none',
            signatureBase,
            itemsLength,
            typeof order.subtotal === 'number' ? order.subtotal : 'no-subtotal',
          ].join('|');

          const prevSignature = changeSignatureRef.current[ticket];
          const hasPrevSignature = typeof prevSignature === 'string' && prevSignature.length > 0;
          const signatureChanged = Boolean(signature) && hasPrevSignature && signature !== prevSignature;
          const hasItems = itemsLength > 0;
          const prevEntry = prevOrdersByTicket.get(ticket);
          const prevOrder = prevEntry?.order;
          const prevItemsFingerprint = prevEntry?.itemsFingerprint || '';
          const currentItemsFingerprint = buildItemsFingerprint(order.items);

          const itemsChanged = Boolean(prevOrder) && prevItemsFingerprint !== currentItemsFingerprint;
          const subtotalChanged =
            Boolean(prevOrder) && typeof prevOrder?.subtotal === 'number' && prevOrder.subtotal !== order.subtotal;
          const actionChanged =
            Boolean(prevOrder) && (prevOrder?.actionType || '').toLowerCase() !== (order.actionType || '').toLowerCase();
          const statusChanged =
            Boolean(prevOrder) && (prevOrder?.status || '').toLowerCase() !== (order.status || '').toLowerCase();

          const changeDetected =
            signatureChanged || (prevOrder && (itemsChanged || subtotalChanged || actionChanged || statusChanged));

          if (signature && !hasPrevSignature) {
            changeSignatureRef.current[ticket] = signature;
          } else if (signatureChanged) {
            changeSignatureRef.current[ticket] = signature;
          }

          // If new items were appended/saved after a delivery, restart the cycle.
          if (status === 'ready' && changeDetected && hasItems && (isAppendLike || isUpdateLike)) {
            next[ticket] = 'initial';
            changeSignatureRef.current[ticket] = signature;
            return;
          }

          // Only reset to "Order Received" when a fresh change event is detected (not on initial load).
          if (changeDetected && (isAppendLike || isUpdateLike || isRemovalLike)) {
            next[ticket] = 'initial';
            return;
          }

          if (status === 'ready') {
            next[ticket] = 'ready';
          } else if (status === 'cancelled') {
            next[ticket] = 'cancelled';
          } else if (status === 'received' || status === 'placed') {
            next[ticket] = 'received';
          } else {
            next[ticket] = prev[ticket] ?? 'initial';
          }
        });
        return next;
      });

    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.warn('Orders fetch aborted (timeout)');
        return;
      }
      setError(err?.message || 'Unable to fetch orders');
    } finally {
      if (!opts.silent) {
        setLoading(false);
      }
    }
  };

  const adjustCustomMinutes = (delta: number) => {
    const currentValue = prepCustomMinutes.trim() ? Number(prepCustomMinutes) : prepMinutesSelection;
    const safeCurrent = Number.isFinite(currentValue) && currentValue > 0 ? currentValue : 30;
    const next = Math.max(1, Math.round(safeCurrent + delta));
    setPrepCustomMinutes(String(next));
    setPrepMinutesSelection(next);
  };

  const getSelectedPrepMinutes = () => {
    if (prepCustomMinutes.trim()) {
      const parsed = Number(prepCustomMinutes.trim());
      if (Number.isFinite(parsed) && parsed > 0) {
        return Math.round(parsed);
      }
      return null;
    }

    return prepMinutesSelection;
  };

  const openPrepModal = (order: OrderRecord, action: 'received' | 'ready' = 'received') => {
    setPrepModalOrder(order);
    setPrepModalAction(action);
    const initialMinutes = typeof order.orderPrepMinutes === 'number' ? order.orderPrepMinutes : 30;
    if (prepTimeOptions.includes(initialMinutes)) {
      setPrepMinutesSelection(initialMinutes);
      setPrepCustomMinutes('');
    } else if (initialMinutes > 0) {
      setPrepMinutesSelection(initialMinutes);
      setPrepCustomMinutes(String(initialMinutes));
    } else {
      setPrepMinutesSelection(30);
      setPrepCustomMinutes('');
    }
    setPrepModalError('');
    setPrepModalLoading(false);
  };

  const closePrepModal = () => {
    setPrepModalOrder(null);
    setPrepModalError('');
    setPrepCustomMinutes('');
    setPrepModalLoading(false);
  };

  const openCancelModal = (order: OrderRecord) => {
    setSelectedOrder(order);
    setCancelReason('');
    setCancelNotes('');
    setCancelModalOpen(true);
    setCancelLoading(false);
  };

  const closeCancelModal = () => {
    setCancelModalOpen(false);
    setCancelReason('');
    setCancelNotes('');
    setCancelLoading(false);
  };

  const openItemCancelModal = (target: OrderItem) => {
    setItemCancelTarget(target);
    setItemCancelReason('');
    setItemCancelNotes('');
    setItemCancelModalOpen(true);
    setItemCancelLoading(false);
  };

  const closeItemCancelModal = () => {
    setItemCancelModalOpen(false);
    setItemCancelTarget(null);
    setItemCancelReason('');
    setItemCancelNotes('');
    setItemCancelLoading(false);
  };

  const identifierForOrderItem = (item: OrderItem) => item.id || `${item.name}-${item.price}`;

  const performNotify = async (order: OrderRecord, nextAction: 'received' | 'ready' | 'cancelled', prepMinutes?: number) => {
    if (!order.ticketNumber) {
      alert('No ticket number associated with this order.');
      return;
    }

    const key = order.ticketNumber;
    try {
      setButtonLoading((prev) => ({ ...prev, [key]: true }));
      const payload: Record<string, any> = {
        ticketNumber: order.ticketNumber,
        status: nextAction,
      };
      if (typeof prepMinutes === 'number' && prepMinutes > 0) {
        payload.prepMinutes = prepMinutes;
      }
      const res = await fetch('/api/order-items/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to notify customer');
      }
      setButtonStates((prev) => ({ ...prev, [key]: nextAction }));
      setOrders((prev) =>
        prev.map((item) =>
          item.ticketNumber === order.ticketNumber
            ? {
                ...item,
                status: nextAction,
                orderPrepMinutes:
                  typeof prepMinutes === 'number'
                    ? prepMinutes
                    : data.prepMinutes ?? item.orderPrepMinutes,
                orderPrepReadyAt: data.prepReadyAt || item.orderPrepReadyAt,
              }
            : item,
        ),
      );
    } catch (err: any) {
      alert(err?.message || 'Failed to notify customer');
    } finally {
      setButtonLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleNotifyClick = (order: OrderRecord) => {
    if (!order.ticketNumber) {
      alert('No ticket number associated with this order.');
      return;
    }
    const key = order.ticketNumber;
    const stage = buttonStates[key] || 'initial';
    // Safety guard: once an order is marked ready (Delivered) or while a request is in flight,
    // do not allow any further clicks to trigger actions.
    if (buttonLoading[key] || stage === 'ready' || stage === 'cancelled') {
      return;
    }
    const nextAction = stage === 'received' ? 'ready' : 'received';

    if (nextAction === 'received') {
      openPrepModal(order, 'received');
      return;
    }

    performNotify(order, 'ready');
  };

  const handlePrepSubmit = async () => {
    if (!prepModalOrder) return;
    const minutes = getSelectedPrepMinutes();
    if (!minutes || minutes <= 0) {
      setPrepModalError('Please choose or enter a valid number of minutes.');
      return;
    }
    try {
      setPrepModalLoading(true);
      await performNotify(prepModalOrder, prepModalAction, minutes);
      closePrepModal();
    } finally {
      setPrepModalLoading(false);
    }
  };

  const handleCancelSubmit = async () => {
    if (!selectedOrder?.ticketNumber) return;
    if (!cancelReason.trim()) {
      alert('Please select a cancellation reason.');
      return;
    }

    const ticket = selectedOrder.ticketNumber;
    try {
      setCancelLoading(true);
      const res = await fetch('/api/order-items/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketNumber: ticket,
          status: 'cancelled',
          cancelReason: cancelReason.trim(),
          cancelNotes: cancelNotes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel order');
      }

      setButtonStates((prev) => ({ ...prev, [ticket]: 'cancelled' }));
      setOrders((prev) =>
        prev.map((item) =>
          item.ticketNumber === ticket
            ? {
                ...item,
                status: 'cancelled',
              }
            : item,
        ),
      );
      setSelectedOrder((prev) => (prev ? { ...prev, status: 'cancelled' } : prev));
      closeCancelModal();
    } catch (err: any) {
      alert(err?.message || 'Failed to cancel order');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleItemCancelSubmit = async () => {
    if (!selectedOrder?.ticketNumber || !itemCancelTarget) return;
    if (!itemCancelReason.trim()) {
      showWarning('Please select a cancellation reason.');
      return;
    }

    const ticketNumber = selectedOrder.ticketNumber;
    const serviceName = selectedOrder.serviceName || selectedOrder.theaterName;
    if (!serviceName) {
      showError('Service name not found for this order.');
      return;
    }

    const targetItem = itemCancelTarget;
    const removeKey = identifierForOrderItem(targetItem);
    const idToRemove = removeKey;
    if (!idToRemove) {
      showError('Unable to identify this item for cancellation.');
      return;
    }

    try {
      setItemCancelLoading(true);

      const removeRes = await fetch('/api/order-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketNumber,
          serviceName,
          items: [],
          removeItemIds: [idToRemove],
          markPaid: false,
        }),
      });
      const removeData = await removeRes.json();
      if (!removeRes.ok || !removeData.success) {
        throw new Error(removeData.error || 'Failed to cancel item');
      }

      setSelectedOrder((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: (prev.items || []).filter((it) => identifierForOrderItem(it) !== removeKey),
        };
      });

      setOrders((prev) =>
        prev.map((order) => {
          if (selectedOrder?._id && order._id !== selectedOrder._id) return order;
          if (!selectedOrder?._id && order.ticketNumber !== ticketNumber) return order;
          return {
            ...order,
            items: (order.items || []).filter((it) => identifierForOrderItem(it) !== removeKey),
          };
        }),
      );

      closeItemCancelModal();
      showSuccess('Item cancelled successfully.');

      try {
        const cancelledItemBaseName =
          targetItem.name ||
          (targetItem as any)?.itemName ||
          (targetItem as any)?.title ||
          (targetItem as any)?.serviceName ||
          'Item';
        const cancelledItemLabel = targetItem.quantity
          ? `${cancelledItemBaseName} (x${targetItem.quantity})`
          : cancelledItemBaseName;

        const notifyRes = await fetch('/api/order-items/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketNumber,
            status: 'item_cancelled',
            cancelReason: itemCancelReason.trim(),
            cancelNotes: itemCancelNotes.trim(),
            cancelledItemName: cancelledItemLabel,
          }),
        });
        const notifyData = await notifyRes.json();
        if (!notifyRes.ok || !notifyData.success) {
          throw new Error(notifyData.error || 'Failed to notify customer');
        }
      } catch (notifyErr: any) {
        showWarning(notifyErr?.message || 'Item cancelled but email could not be sent.');
      }
    } catch (err: any) {
      showError(err?.message || 'Failed to cancel item');
    } finally {
      setItemCancelLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders({ silent: true });
    const interval = setInterval(() => {
      fetchOrders({ silent: true });
    }, 2000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, serviceFilter, limit]);

  const serviceOptions = useMemo(() => {
    const values = new Set<string>();
    orders.forEach((order) => {
      if (order.serviceName) {
        values.add(order.serviceName);
      }
    });
    return Array.from(values).sort();
  }, [orders]);

  return (
    <>
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={removeToast} />
        ))}
      </div>
      <main className="orders-page">
        <div className="orders-shell">
          <header className="orders-header">
            <div>
              <p className="orders-kicker">Operations</p>
              <h1>Orders Board</h1>
              <p className="orders-subtitle">Every service-specific item the team adds lands here in real time.</p>
            </div>
            <div className="header-actions">
              <button type="button" className="view-orders-button" onClick={() => setViewOrdersModalOpen(true)}>
                View Orders
              </button>
              <button type="button" className="refresh-button" onClick={() => fetchOrders()}>
                <RefreshCw className={loading ? 'spin' : ''} />
                Refresh feed
              </button>
            </div>
          </header>

          <section className="filters">
            <div className="search-box">
              <Search className="icon" />
              <input
                type="text"
                placeholder="Search by booking, ticket, customer, service, staff"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-item">
              <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}>
                <option value="">All services</option>
                {serviceOptions.map((service) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-item">
              <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                {limitOptions.map((value) => (
                  <option key={value} value={value}>
                    Show {value}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="orders-table">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Theater</th>
                    <th>Time Slot</th>
                    <th>Items (Name · Qty · Price)</th>
                    <th>Subtotal</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5} className="empty-state">
                        No orders found for the selected filters.
                      </td>
                    </tr>
                  )}

                  {orders.map((order) => (
                    <tr key={order._id || `${order.bookingId}-${order.ticketNumber}-${order.recordedAt}`}>
                      <td>
                        <div className="table-title">{order.customerName || '—'}</div>
                        <div className="table-sub">Ticket: {order.ticketNumber || '—'}</div>
                      </td>
                      <td>
                        <div className="table-title">{order.theaterName || order.serviceName || '—'}</div>
                        {order.performedBy && <div className="table-sub">By: {order.performedBy}</div>}
                      </td>
                      <td>
                        <div className="table-title">{formatDisplayDate(order.bookingDate)}</div>
                        <div className="table-sub">{formatTimeSlot(order.bookingTime)}</div>
                      </td>
                      <td>
                        <div className="items-pill-grid">
                          {(order.items || []).map((item, index) => (
                            <div key={`${item.id || item.name}-${index}`} className="item-pill">
                              <span className="pill-name">{item.name || '—'}</span>
                              <span className="pill-qty"> × {item.quantity || 0}</span>
                              <span className="pill-price">{currency(item.price)}</span>
                            </div>
                          ))}
                          {(order.items || []).length === 0 && <div className="table-sub">No items.</div>}
                        </div>
                      </td>
                      <td>
                        <div className="table-title">{currency(order.subtotal)}</div>
                        <div className="table-sub">
                          Invoice: {currency(order.totalAmountBefore)} → {currency(order.totalAmountAfter)}
                        </div>
                      </td>
                      <td className="action-cell">
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="view-detail-button"
                            onClick={() => {
                              setSelectedOrder(order);
                              setViewDetailOpen(true);
                            }}
                          >
                            <Eye size={14} style={{ marginRight: '6px', opacity: 0.7 }} />
                            View Detail
                          </button>
                          <div className="action-stack">
                            <button
                              type="button"
                              className={`notify-button ${buttonStates[order.ticketNumber || ''] || 'initial'}`}
                              disabled={
                                buttonLoading[order.ticketNumber || ''] ||
                                buttonStates[order.ticketNumber || ''] === 'ready' ||
                                buttonStates[order.ticketNumber || ''] === 'cancelled'
                              }
                              onClick={() => handleNotifyClick(order)}
                            >
                              {buttonLoading[order.ticketNumber || '']
                                ? 'Sending…'
                                : buttonStates[order.ticketNumber || ''] === 'cancelled'
                                ? 'Cancelled'
                                : buttonStates[order.ticketNumber || ''] === 'received'
                                ? 'Order Placed'
                                : buttonStates[order.ticketNumber || ''] === 'ready'
                                ? 'Delivered'
                                : 'Order Received'}
                            </button>
                            {order.orderPrepMinutes && (
                              <div className="eta-pill">ETA: {order.orderPrepMinutes} min ({formatShortTime(order.orderPrepReadyAt) || 'soon'})</div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {loading && (
                    <tr>
                      <td colSpan={5} className="empty-state">
                        Loading orders…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {error && <div className="error-banner">{error}</div>}
          </section>
        </div>
    </main>

    {viewOrdersModalOpen && (
      <div className="modal-backdrop">
        <div className="modal-card">
          <div className="modal-header">
            <div>
              <p className="orders-kicker">All orders</p>
              <h2>Orders overview</h2>
              <p className="orders-subtitle">Snapshot of {orders.length} orders currently loaded.</p>
            </div>
            <button type="button" className="icon-button" onClick={() => setViewOrdersModalOpen(false)}>
              ×
            </button>
          </div>
          <div className="modal-body">
            <div className="modal-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Service</th>
                    <th>Time Slot</th>
                    <th>Items</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={`modal-${order._id || order.ticketNumber}`}>
                      <td>
                        <div className="table-title">{order.customerName || '—'}</div>
                        <div className="table-sub">Ticket: {order.ticketNumber || '—'}</div>
                      </td>
                      <td>{order.theaterName || order.serviceName || '—'}</td>
                      <td>
                        <div>{formatDisplayDate(order.bookingDate)}</div>
                        <div className="table-sub">{formatTimeSlot(order.bookingTime)}</div>
                      </td>
                      <td>
                        {(order.items || []).map((item, index) => (
                          <div key={`${order._id || order.ticketNumber}-${index}`} className="item-pill">
                            <span className="pill-name">{item.name || '—'}</span>
                            <span className="pill-qty"> × {item.quantity || 0}</span>
                            <span className="pill-price">{currency(item.price)}</span>
                          </div>
                        ))}
                        {(order.items || []).length === 0 && <div className="table-sub">No items.</div>}
                      </td>
                      <td>{currency(order.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )}

    {itemCancelModalOpen && selectedOrder && itemCancelTarget && (
      <div className="modal-backdrop modal-top">
        <div className="prep-modal-card">
          <div className="modal-header">
            <div>
              <p className="orders-kicker">Cancel item</p>
              <h2>
                {selectedOrder.customerName || 'Customer'} • {selectedOrder.ticketNumber}
              </h2>
              <p className="orders-subtitle">Item: {itemCancelTarget.name || 'Item'}</p>
            </div>
            <button type="button" className="icon-button" onClick={closeItemCancelModal}>
              ×
            </button>
          </div>

          <div className="modal-grid">
            <div className="modal-tile">
              <div className="tile-label">Reason</div>
              <select value={itemCancelReason} onChange={(e) => setItemCancelReason(e.target.value)}>
                <option value="">Select reason</option>
                {cancelReasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-tile">
              <div className="tile-label">Notes (optional)</div>
              <textarea
                value={itemCancelNotes}
                onChange={(e) => setItemCancelNotes(e.target.value)}
                placeholder="Any extra detail for the guest"
                rows={4}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary" onClick={closeItemCancelModal} disabled={itemCancelLoading}>
              Back
            </button>
            <button type="button" className="danger" onClick={handleItemCancelSubmit} disabled={itemCancelLoading}>
              {itemCancelLoading ? 'Cancelling…' : 'Cancel Item & Email Customer'}
            </button>
          </div>
        </div>
      </div>
    )}

    {viewDetailOpen && selectedOrder && (
      <div className="modal-backdrop">
        <div className="modal-card">
          <div className="modal-header">
            <div>
              <p className="orders-kicker">Order detail</p>
              <h2>{selectedOrder.customerName || 'Customer'}</h2>
              <div className="order-detail-tags">
                <span className="tag theater-tag">{selectedOrder.theaterName || selectedOrder.serviceName || 'Theater'}</span>
                {typeof selectedOrder.numberOfPeople === 'number' && selectedOrder.numberOfPeople > 0 && (
                  <span className="people-circle" title={`${selectedOrder.numberOfPeople} guests`}>
                    {selectedOrder.numberOfPeople}
                  </span>
                )}
                {(() => {
                  const status = (selectedOrder.status || '').toLowerCase();
                  const isDelivered = status === 'ready' || status === 'readying';
                  const isCancelled = status === 'cancelled';
                  const label = isDelivered
                    ? 'Delivered'
                    : isCancelled
                    ? 'Cancelled'
                    : status === 'received'
                    ? 'Order Received'
                    : status
                    ? status.replace(/^\w/, (c) => c.toUpperCase())
                    : 'Pending';
                  const badgeClass = isDelivered
                    ? 'detail-status delivered'
                    : isCancelled
                    ? 'detail-status cancelled'
                    : status === 'received'
                    ? 'detail-status received'
                    : 'detail-status pending';
                  return <span className={badgeClass}>{label}</span>;
                })()}
              </div>
              <p className="orders-subtitle">
                Ticket: {selectedOrder.ticketNumber || '—'} • {(selectedOrder.items || []).length} items
              </p>
            </div>
            <button type="button" className="icon-button" onClick={() => setViewDetailOpen(false)}>×</button>
          </div>
          <div className="modal-body">
            <div className="modal-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedOrder.items || []).map((it, idx) => (
                    <tr key={`${it?.id || it?.name || 'item'}-${idx}`}>
                      <td>{it?.name || '—'}</td>
                      <td>{it?.quantity || 0}</td>
                      <td>{currency(it?.price)}</td>
                      <td>
                        <button
                          type="button"
                          className="item-cancel-button"
                          onClick={() => openItemCancelModal(it)}
                          disabled={
                            (selectedOrder.status || '').toLowerCase() === 'ready' ||
                            (selectedOrder.status || '').toLowerCase() === 'cancelled'
                          }
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(selectedOrder.items || []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="empty-state">No items.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="danger"
              onClick={() => openCancelModal(selectedOrder)}
              disabled={(selectedOrder.status || '').toLowerCase() === 'ready' || (selectedOrder.status || '').toLowerCase() === 'cancelled'}
            >
              Cancel Order
            </button>
          </div>
        </div>
      </div>
    )}

    {cancelModalOpen && selectedOrder && (
      <div className="modal-backdrop">
        <div className="prep-modal-card">
          <div className="modal-header">
            <div>
              <p className="orders-kicker">Cancel order</p>
              <h2>
                {selectedOrder.customerName || 'Customer'} • {selectedOrder.ticketNumber}
              </h2>
              <p className="orders-subtitle">Select a reason and we’ll email the guest immediately.</p>
            </div>
            <button type="button" className="icon-button" onClick={closeCancelModal}>
              ×
            </button>
          </div>

          <div className="modal-grid">
            <div className="modal-tile">
              <div className="tile-label">Reason</div>
              <select value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}>
                <option value="">Select reason</option>
                {cancelReasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-tile">
              <div className="tile-label">Notes (optional)</div>
              <textarea
                value={cancelNotes}
                onChange={(e) => setCancelNotes(e.target.value)}
                placeholder="Any extra detail for the guest"
                rows={4}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary" onClick={closeCancelModal} disabled={cancelLoading}>
              Back
            </button>
            <button type="button" className="danger" onClick={handleCancelSubmit} disabled={cancelLoading}>
              {cancelLoading ? 'Cancelling…' : 'Cancel & Email Customer'}
            </button>
          </div>
        </div>
      </div>
    )}

    {prepModalOrder && (
      <div className="modal-backdrop">
        <div className="prep-modal-card">
          <div className="modal-header">
            <div>
              <p className="orders-kicker">Set prep time</p>
              <h2>
                {prepModalOrder.customerName || 'Customer'} • {prepModalOrder.ticketNumber}
              </h2>
              <p className="orders-subtitle">Tell the guest how long the kitchen needs before we email them.</p>
            </div>
            <button type="button" className="icon-button" onClick={closePrepModal}>
              ×
            </button>
          </div>

          <div className="prep-options">
            {prepTimeOptions.map((minutes) => {
              const selected = !prepCustomMinutes && prepMinutesSelection === minutes;
              return (
                <button
                  key={minutes}
                  type="button"
                  className={`prep-chip ${selected ? 'prep-chip-active' : ''}`}
                  onClick={() => {
                    setPrepMinutesSelection(minutes);
                    setPrepCustomMinutes('');
                    setPrepModalError('');
                  }}
                >
                  {minutes} min
                </button>
              );
            })}

            <div className="prep-custom-input">
              <label htmlFor="prep-custom">Custom minutes</label>
              <div className="custom-input-shell">
                <button
                  type="button"
                  className="stepper"
                  onClick={() => adjustCustomMinutes(-5)}
                  aria-label="Decrease prep minutes"
                >
                  −
                </button>
                <input
                  id="prep-custom"
                  type="number"
                  min={1}
                  placeholder="e.g. 25"
                  value={prepCustomMinutes}
                  onChange={(e) => {
                    const next = e.target.value;
                    setPrepCustomMinutes(next);
                    const parsed = Number(next);
                    if (Number.isFinite(parsed) && parsed > 0) {
                      setPrepMinutesSelection(Math.round(parsed));
                    }
                    setPrepModalError('');
                  }}
                />
                <button
                  type="button"
                  className="stepper"
                  onClick={() => adjustCustomMinutes(5)}
                  aria-label="Increase prep minutes"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {prepModalError && <p className="prep-error">{prepModalError}</p>}

          <div className="modal-actions">
            <button type="button" className="secondary" onClick={closePrepModal} disabled={prepModalLoading}>
              Cancel
            </button>
            <button type="button" className="primary" onClick={handlePrepSubmit} disabled={prepModalLoading}>
              {prepModalLoading ? 'Sending…' : 'Send order received email'}
            </button>
          </div>
        </div>
      </div>
    )}

    <style jsx>{`
      .orders-page {
        min-height: 100vh;
        width: 100%;
        padding: 48px 16px 64px;
        background: #f5f6fb;
        color: #111827;
        font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      .orders-shell {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 32px;
      }
      .orders-header {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 32px;
        padding: 32px;
        display: flex;
        justify-content: space-between;
        gap: 24px;
        box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
      }
      .header-actions {
        display: flex;
        gap: 12px;
      }
      .view-orders-button {
        border: 1px solid #e5e7eb;
        background: #fff7ed;
        color: #ff0000ff;
        font-weight: 600;
        padding: 12px 24px;
        border-radius: 999px;
        cursor: pointer;
      }
      .orders-header h1 {
        margin: 8px 0 4px;
        font-size: 32px;
        font-weight: 600;
      }
      .orders-kicker {
        text-transform: uppercase;
        letter-spacing: 0.4em;
        font-size: 11px;
        color: #9ca3af;
      }
      .orders-subtitle {
        color: #6b7280;
        font-size: 14px;
      }
      .refresh-button {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: none;
        border-radius: 999px;
        padding: 12px 28px;
        font-weight: 600;
        color: #ffffff;
        cursor: pointer;
        background: linear-gradient(90deg, #e50914, #ff6e40);
        box-shadow: 0 10px 20px rgba(244, 63, 94, 0.25);
        transition: filter 0.2s ease;
      }
      .refresh-button:hover {
        filter: brightness(1.08);
      }
      .refresh-button .spin {
        animation: spin 2s linear infinite;
      }
      .stat-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
      }
      .stat-card {
        border-radius: 24px;
        padding: 24px;
        background: #ffffff;
        border: 1px solid #f1f5f9;
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.07);
      }
      .stat-label {
        text-transform: uppercase;
        letter-spacing: 0.2em;
        font-size: 11px;
        color: #94a3b8;
      }
      .stat-value {
        margin-top: 12px;
        font-size: 30px;
        font-weight: 600;
      }
      .stat-accent {
        margin-top: 16px;
        height: 4px;
        border-radius: 999px;
      }
      .filters {
        padding: 20px;
        border-radius: 32px;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        align-items: center;
        box-shadow: 0 18px 35px rgba(15, 23, 42, 0.08);
      }
      .search-box {
        flex: 1;
        min-width: 220px;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        border-radius: 20px;
        border: 1px solid #e2e8f0;
        background: #f8fafc;
      }
      .search-box input {
        flex: 1;
        background: transparent;
        border: none;
        color: #111827;
        font-size: 14px;
        outline: none;
      }
      .icon {
        width: 16px;
        height: 16px;
        color: #9ca3af;
      }
      .filter-item {
        display: flex;
        align-items: center;
        gap: 8px;
        border-radius: 16px;
        border: 1px solid #e2e8f0;
        background: #f8fafc;
        padding: 8px 12px;
      }
      .filter-item select {
        background: transparent;
        border: none;
        color: #111827;
        font-size: 14px;
        outline: none;
      }
      .orders-table {
        border-radius: 32px;
        border: 1px solid #e5e7eb;
        background: #ffffff;
        box-shadow: 0 25px 60px rgba(15, 23, 42, 0.07);
      }
      .table-scroll {
        overflow-x: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
      }
      thead {
        background: #f9fafb;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 12px;
        color: #6b7280;
      }
      th,
      td {
        padding: 16px;
        border-bottom: 1px solid #f1f5f9;
        text-align: left;
      }
      tbody tr:hover {
        background: #f9fafb;
      }
      .table-title {
        font-weight: 600;
      }
      .table-sub {
        font-size: 12px;
        color: #6b7280;
      }
      .status-chip {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 6px 14px;
        font-size: 12px;
        font-weight: 600;
      }
      .status-paid {
        background: rgba(16, 185, 129, 0.15);
        color: #047857;
      }
      .status-pending {
        background: rgba(251, 191, 36, 0.2);
        color: #92400e;
      }
      .status-empty {
        background: rgba(148, 163, 184, 0.2);
        color: #475569;
      }
      .table-actions button {
        border: 1px solid transparent;
        background: #f8fafc;
        color: #111827;
        border-radius: 999px;
        padding: 6px 14px;
        font-size: 12px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
      }
      .empty-state {
        text-align: center;
        padding: 40px;
        font-size: 14px;
        color: #9ca3af;
      }
      .error-banner {
        border-top: 1px solid #fee2e2;
        background: #fef2f2;
        color: #b91c1c;
        padding: 12px 24px;
        font-size: 14px;
      }
      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        z-index: 50;
      }
      .modal-backdrop.modal-top {
        z-index: 70;
      }
      .modal-card {
        width: 100%;
        max-width: 720px;
        border-radius: 32px;
        border: 1px solid #e5e7eb;
        background: #ffffff;
        color: #111827;
        padding: 32px;
        box-shadow: 0 30px 70px rgba(15, 23, 42, 0.15);
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      .modal-header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
      }
      .modal-header h2 {
        margin: 8px 0 4px;
        font-size: 24px;
      }
      .icon-button {
        border: 1px solid #e5e7eb;
        background: #f9fafb;
        color: #6b7280;
        border-radius: 50%;
        padding: 8px;
        cursor: pointer;
      }
      .modal-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 20px;
      }
      .modal-tile {
        border-radius: 20px;
        border: 1px solid #e5e7eb;
        background: #f8fafc;
        padding: 16px;
      }
      .tile-label {
        text-transform: uppercase;
        letter-spacing: 0.25em;
        font-size: 10px;
        color: #94a3b8;
      }
      .tile-value {
        font-size: 20px;
        font-weight: 600;
        margin-top: 8px;
      }
      .tile-sub {
        font-size: 12px;
        color: #6b7280;
        margin-top: 6px;
      }
      .orders-subtitle {
        font-size: 0.875rem;
        color: #6b7280;
        margin: 4px 0 0;
      }
      .order-detail-tags {
        display: flex;
        gap: 8px;
        margin-top: 8px;
        flex-wrap: wrap;
      }
      .order-detail-tags .tag {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.35rem 0.85rem;
        border-radius: 999px;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .theater-tag {
        color: #fee2e2;
        background: #b91c1c;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.15);
      }
      .people-tag {
        color: #fff;
        background: linear-gradient(120deg, rgba(59, 130, 246, 0.9), rgba(236, 72, 153, 0.65));
        backdrop-filter: blur(6px);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      .people-circle {
        width: 32px;
        height: 32px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        color: #ffffff;
        background: radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.95), rgba(99, 102, 241, 0.85));
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
      }
      .items-table {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .items-title {
        font-weight: 600;
      }
      .items-scroll {
        max-height: 260px;
        overflow-y: auto;
        border: 1px solid #e5e7eb;
        border-radius: 20px;
      }
      .items-scroll table {
        width: 100%;
        font-size: 13px;
      }
      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }
      .modal-actions button {
        border: 1px solid #e5e7eb;
        color: #111827;
        background: #f9fafb;
        border-radius: 999px;
        padding: 10px 26px;
        cursor: pointer;
      }
      .modal-actions button:disabled {
        opacity: 0.75;
        cursor: not-allowed;
      }
      .modal-actions button.primary {
        background: #111827;
        border-color: #111827;
        color: #ffffff;
      }
      .modal-actions button.secondary {
        background: #f9fafb;
        border-color: #e5e7eb;
        color: #111827;
      }
      .modal-actions button.danger {
        background: #dc2626;
        border-color: #dc2626;
        color: #ffffff;
      }
      .modal-actions button.danger:hover {
        filter: brightness(1.05);
      }
      .detail-status {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 6px 14px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .detail-status.pending {
        background: rgba(251, 191, 36, 0.2);
        color: #92400e;
      }
      .detail-status.received {
        background: rgba(249, 115, 22, 0.18);
        color: #9a3412;
      }
      .detail-status.delivered {
        background: rgba(34, 197, 94, 0.18);
        color: #166534;
      }
      .detail-status.cancelled {
        background: rgba(220, 38, 38, 0.16);
        color: #991b1b;
      }
      .modal-tile select,
      .modal-tile textarea {
        width: 100%;
        margin-top: 10px;
        border-radius: 14px;
        border: 1px solid #e5e7eb;
        padding: 10px 12px;
        background: #ffffff;
        color: #111827;
        font-size: 14px;
        outline: none;
      }
      .prep-modal-card {
        width: 100%;
        max-width: 540px;
        border-radius: 32px;
        border: 1px solid #e5e7eb;
        background: #ffffff;
        color: #111827;
        padding: 32px;
        box-shadow: 0 30px 70px rgba(15, 23, 42, 0.2);
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      .prep-options {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }
      .prep-chip {
        border-radius: 999px;
        border: 1px solid #e2e8f0;
        padding: 10px 18px;
        background: #f1f5f9;
        font-weight: 700;
        color: #0f172a;
        cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease, border 0.15s ease;
      }
      .prep-chip-active {
        background: #111827;
        color: #ffffff;
        border-color: #111827;
      }
      .prep-custom-input {
        display: flex;
        flex-direction: column;
        gap: 6px;
        flex: 1;
        min-width: 140px;
      }
      .custom-input-shell {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #0f172a;
        border-radius: 16px;
        padding: 6px 10px;
        border: 1px solid #111827;
      }
      .prep-custom-input input {
        border-radius: 12px;
        border: none;
        padding: 10px 12px;
        font-size: 16px;
        font-weight: 600;
        color: #f8fafc;
        background: transparent;
        width: 100%;
      }
      .prep-custom-input input::placeholder {
        color: rgba(248, 250, 252, 0.6);
      }
      .stepper {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: none;
        background: #020617;
        color: #f8fafc;
        font-size: 20px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: inset 0 0 0 1px rgba(248, 250, 252, 0.08);
      }
      .stepper:hover {
        background: #111827;
      }
      .prep-error {
        color: #b91c1c;
        font-size: 13px;
      }
      .action-cell {
        text-align: right;
      }
      .action-buttons {
        display: flex;
        align-items: flex-start;
        justify-content: flex-end;
        gap: 12px;
      }
      .action-stack {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 6px;
        min-width: 160px;
      }
      .view-detail-button {
        display: flex;
        align-items: center;
        justify-content: center;
        border: 0.5px solid rgba(15, 23, 42, 0.3);
        background: transparent;
        color: rgba(15, 23, 42, 0.8);
        font-weight: 500;
        padding: 9px 18px 9px 14px;
        border-radius: 999px;
        box-shadow: none;
        cursor: pointer;
        white-space: nowrap;
        margin-top: 2px;
        transition: all 0.2s ease;
      }
      .view-detail-button:hover {
        background: rgba(15, 23, 42, 0.05);
      }
      .item-cancel-button {
        border: 1px solid rgba(220, 38, 38, 0.35);
        background: rgba(220, 38, 38, 0.06);
        color: #991b1b;
        font-weight: 700;
        border-radius: 999px;
        padding: 6px 12px;
        cursor: pointer;
        white-space: nowrap;
      }
      .item-cancel-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .notify-button {
        margin-top: 0;
        min-width: 160px;
        border-radius: 999px;
        padding: 10px 22px;
        font-weight: 600;
        font-size: 13px;
        color: #ffffff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        cursor: pointer;
        background: linear-gradient(90deg, #fe8c00, #f83600);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .notify-button.initial {
        background: linear-gradient(90deg, #f97316, #ea580c);
      }
      .notify-button.received {
        background: linear-gradient(90deg, #fb923c, #f97316);
        box-shadow: 0 18px 35px rgba(249, 115, 22, 0.35);
      }
      .notify-button.ready {
        background: linear-gradient(90deg, #22c55e, #16a34a);
        box-shadow: 0 18px 35px rgba(34, 197, 94, 0.35);
      }
      .notify-button:hover {
        transform: translateY(-1px);
      }
      .notify-button:disabled,
      .notify-button.ready:disabled {
        background: #9ca3af;
        box-shadow: none;
        cursor: not-allowed;
        transform: none;
        opacity: 0.8;
      }
      .eta-pill {
        margin-top: 8px;
        font-size: 11px;
        color: #92400e;
        background: rgba(254, 215, 170, 0.6);
        border-radius: 999px;
        padding: 4px 10px;
        display: inline-block;
      }
      @media (max-width: 768px) {
        .orders-header {
          flex-direction: column;
        }
        .filters {
          flex-direction: column;
        }
        .filter-item,
        .search-box {
          width: 100%;
        }
      }
      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
      .modal-body {
        margin-top: 16px;
      }
      .modal-table-scroll {
        max-height: 420px;
        overflow-y: auto;
        border: 1px solid #e5e7eb;
        border-radius: 16px;
      }
    `}</style>
  </>
  );
}