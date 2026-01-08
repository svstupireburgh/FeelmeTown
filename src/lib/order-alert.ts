export const ORDER_ALERT_DETAIL_KEY = 'admin:order-alert-detail';
export const ORDER_ALERT_DETAIL_TTL = 30 * 1000; // 30 seconds

export interface OrderAlertDetailPayload {
  ticketNumber?: string;
  bookingId?: string;
  order?: Record<string, any>;
  storedAt: number;
}

export const storeOrderAlertDetail = (payload: Omit<OrderAlertDetailPayload, 'storedAt'>) => {
  if (typeof window === 'undefined') return;
  const entry: OrderAlertDetailPayload = {
    ...payload,
    storedAt: Date.now(),
  };
  try {
    window.localStorage.setItem(ORDER_ALERT_DETAIL_KEY, JSON.stringify(entry));
  } catch (error) {
    console.warn('Unable to store order alert detail payload', error);
  }
};

export const consumeOrderAlertDetail = (): OrderAlertDetailPayload | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ORDER_ALERT_DETAIL_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(ORDER_ALERT_DETAIL_KEY);
    const parsed: OrderAlertDetailPayload = JSON.parse(raw);
    if (!parsed || typeof parsed.storedAt !== 'number') {
      return null;
    }
    if (Date.now() - parsed.storedAt > ORDER_ALERT_DETAIL_TTL) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('Unable to read order alert detail payload', error);
    return null;
  }
};
