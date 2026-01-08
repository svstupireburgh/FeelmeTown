"use client";

import React, { useEffect, useMemo, useState } from 'react';

interface BookingItem {
  _id?: string;
  bookingId?: string;
  name?: string;
  customerName?: string;
  email?: string;
  phone?: string;
  theaterName?: string;
  theater?: string;
  date?: string;
  time?: string;
  status?: string;
  totalAmount?: number;
  createdAt?: string | Date;
  __type?: 'completed' | 'cancelled' | 'manual';
}

const toIST = (d: any) => {
  try {
    const dt = new Date(d);
    return new Date(dt.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  } catch {
    return new Date();
  }
};

export default function BookingHistoryPage() {
  const [data, setData] = useState<{
    completed: BookingItem[];
    cancelled: BookingItem[];
    manual: BookingItem[];
  }>({ completed: [], cancelled: [], manual: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [start, setStart] = useState<string>(() => {
    const now = new Date();
    const s = new Date(now);
    s.setMonth(s.getMonth() - 3);
    s.setHours(0, 0, 0, 0);
    return s.toISOString().slice(0, 10);
  });
  const [end, setEnd] = useState<string>(() => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    return now.toISOString().slice(0, 10);
  });
  const [statusFilters, setStatusFilters] = useState<{
    completed: boolean;
    cancelled: boolean;
    manual: boolean;
  }>({ completed: true, cancelled: true, manual: true });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const selectedStatuses = Object.entries(statusFilters)
        .filter(([_, v]) => v)
        .map(([k]) => k)
        .join(',');
      const url = `/api/admin/booking-history?start=${start}&end=${end}&status=${selectedStatuses}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to fetch history');
      }
      const payload = json.data || {
        completed: [],
        cancelled: [],
        manual: []
      };
      setData(payload);
    } catch (err: any) {
      setError(err?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const combined = useMemo(() => {
    const items: BookingItem[] = [
      ...(data.completed || []).map(b => ({ ...b, __type: 'completed' as const })),
      ...(data.cancelled || []).map(b => ({ ...b, __type: 'cancelled' as const })),
      ...(data.manual || []).map(b => ({ ...b, __type: 'manual' as const }))
    ];
    return items.sort((a, b) => {
      const ad = new Date(a.createdAt || 0).getTime();
      const bd = new Date(b.createdAt || 0).getTime();
      return bd - ad;
    });
  }, [data]);

  const onFilter = () => {
    fetchData();
  };

  const toCSV = () => {
    const rows = [
      ['Type', 'Booking ID', 'Customer', 'Email', 'Phone', 'Theater', 'Date', 'Time', 'Status', 'Amount', 'CreatedAt (IST)']
    ];
    combined.forEach((b) => {
      rows.push([
        b.__type || '',
        (b.bookingId || (b._id ? String(b._id) : '')),
        b.name || b.customerName || '',
        b.email || '',
        b.phone || '',
        b.theaterName || b.theater || '',
        b.date || '',
        b.time || '',
        b.status || '',
        String(b.totalAmount ?? ''),
        toIST(b.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      ]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '"')}` ).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `booking-history-${start}-to-${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toPDF = async () => {
    const selectedStatuses = Object.entries(statusFilters)
      .filter(([_, v]) => v)
      .map(([k]) => k)
      .join(',');

    const url = `/api/admin/booking-history/pdf?start=${start}&end=${end}&status=${selectedStatuses}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || 'Failed to generate PDF');
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `booking-history-${start}-to-${end}.pdf`;
    a.click();
    URL.revokeObjectURL(objectUrl);
  };

  return (
    <div className="history-page">
      <div className="page-header">
        <h2>Booking History (Last 3 Months)</h2>
        <p className="subtitle">View, filter, and export bookings. Styled to match site.</p>
      </div>
      <div className="filters-bar">
        <div className="filter-group">
          <label className="filter-label">From</label>
          <input className="input" type="date" value={start} onChange={e => setStart(e.target.value)} />
        </div>
        <div className="filter-group">
          <label className="filter-label">To</label>
          <input className="input" type="date" value={end} onChange={e => setEnd(e.target.value)} />
        </div>
        <div className="filter-toggles">
          <label className="toggle"><input type="checkbox" checked={statusFilters.completed} onChange={e => setStatusFilters(s => ({ ...s, completed: e.target.checked }))} /> <span>Completed</span></label>
          <label className="toggle"><input type="checkbox" checked={statusFilters.cancelled} onChange={e => setStatusFilters(s => ({ ...s, cancelled: e.target.checked }))} /> <span>Cancelled</span></label>
          <label className="toggle"><input type="checkbox" checked={statusFilters.manual} onChange={e => setStatusFilters(s => ({ ...s, manual: e.target.checked }))} /> <span>Manual</span></label>
        </div>
        <div className="actions">
          <button className="btn btn-primary" onClick={onFilter}>Filter History</button>
          <button className="btn" onClick={toCSV}>Download Excel</button>
          <button className="btn" onClick={toPDF}>Download PDF</button>
        </div>
      </div>

      {loading && <div className="status status-loading">Loading...</div>}
      {error && <div className="status status-error">{error}</div>}

      <table className="history-table">
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
            <th>Amount</th>
            <th>CreatedAt (IST)</th>
          </tr>
        </thead>
        <tbody>
          {combined.map((b, idx) => (
            <tr key={`${b._id || b.bookingId || idx}`}>
              <td>{b.__type}</td>
              <td>{b.bookingId || (b._id ? String(b._id) : '')}</td>
              <td>{b.name || b.customerName}</td>
              <td>{b.email}</td>
              <td>{b.phone}</td>
              <td>{b.theaterName || b.theater}</td>
              <td>{b.date}</td>
              <td>{b.time}</td>
              <td>{b.status}</td>
              <td>{b.totalAmount ?? ''}</td>
              <td>{toIST(b.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
            </tr>
          ))}
          {combined.length === 0 && !loading && (
            <tr>
              <td colSpan={11} style={{ padding: '12px', textAlign: 'center' }}>No data found for selected range</td>
            </tr>
          )}
        </tbody>
      </table>
      <style jsx>{`
        .history-page { padding: 1.5rem 2rem; }
        .page-header h2 { font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif; font-size: 1.8rem; color: #ffffff; margin: 0 0 0.25rem 0; letter-spacing: 0.2px; }
        .subtitle { color: #b3b3b3; font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif; margin-bottom: 1rem; }
        .filters-bar { display: grid; grid-template-columns: repeat(12, 1fr); gap: 12px; align-items: end; background: #181818; border: 1px solid #2a2a2a; border-radius: 12px; padding: 12px; margin-bottom: 16px; }
        .filter-group { grid-column: span 3; display: flex; flex-direction: column; gap: 6px; }
        .filter-label { color: #e5e5e5; font-size: 0.9rem; }
        .input { background: #121212; border: 1px solid #2a2a2a; color: #e5e5e5; padding: 8px 10px; border-radius: 8px; outline: none; }
        .input:focus { border-color: #3a3a3a; }
        .filter-toggles { grid-column: span 4; display: flex; gap: 12px; align-items: center; }
        .toggle { display: inline-flex; gap: 8px; align-items: center; color: #e5e5e5; }
        .actions { grid-column: span 5; display: flex; gap: 10px; justify-content: flex-end; }
        .btn { background: #1f1f1f; border: 1px solid #2a2a2a; color: #e5e5e5; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif; transition: all 0.2s ease; }
        .btn:hover { background: #262626; border-color: #3a3a3a; }
        .btn-primary { background: #e50914; border-color: #e50914; color: #ffffff; }
        .btn-primary:hover { background: #f6121d; border-color: #f6121d; }
        .status { padding: 10px 12px; border-radius: 8px; margin-bottom: 12px; font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif; }
        .status-loading { background: #1f1f1f; border: 1px solid #2a2a2a; color: #e5e5e5; }
        .status-error { background: rgba(229,9,20,0.15); border: 1px solid rgba(229,9,20,0.35); color: #ffb3b3; }
        .history-table { width: 100%; border-collapse: collapse; }
        .history-table thead th { position: sticky; top: 0; background: #181818; color: #ffffff; padding: 10px; border-bottom: 1px solid #2a2a2a; text-align: left; font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif; }
        .history-table tbody td { padding: 10px; border-bottom: 1px solid #2a2a2a; color: #e5e5e5; font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif; }
        .history-table tbody tr { background: #1f1f1f; }
        .history-table tbody tr:hover { background: #262626; }
        @media (max-width: 900px) { .filters-bar { grid-template-columns: 1fr; } .filter-group, .filter-toggles, .actions { grid-column: span 1; } }
      `}</style>
    </div>
  );
}