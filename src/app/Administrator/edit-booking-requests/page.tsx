'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface EditRequest {
  _id?: string;
  bookingId?: string;
  name?: string;
  email?: string;
  phone?: string;
  date?: string;
  time?: string;
  status?: string;
  requestedAt?: string | Date;
  source?: string;
  [key: string]: any;
}

export default function EditBookingRequestsPage() {
  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch edit requests (reusable for polling)
  const fetchRequests = async (silent = false) => {
    try {
      if (!silent) setLoading(true); else setRefreshing(true);
      const res = await fetch('/api/edit-booking-request');
      const data = await res.json();
      if (data.success && Array.isArray(data.requests)) {
        setRequests(data.requests);
      } else {
        setRequests([]);
      }
    } catch (e) {
      setRequests([]);
    } finally {
      if (!silent) setLoading(false); else setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchRequests();
  }, []);

  // Live refresh every 2 seconds (content only)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRequests(true);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Fetch bookings to resolve phone recorded at booking time
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await fetch('/api/admin/bookings');
        const data = await res.json();
        const list = Array.isArray(data.bookings) ? data.bookings : [];
        setBookings(list);
      } catch (e) {
        setBookings([]);
      }
    };
    fetchBookings();
    const interval = setInterval(() => { fetchBookings(); }, 2000);
    return () => clearInterval(interval);
  }, []);

  const resolveMobile = (req: EditRequest): string => {
    const direct = (req.phone || (req as any).mobile || (req as any).whatsappNumber || (req as any).contactNumber || (req as any).customerPhone) as string | undefined;
    if (direct && String(direct).trim().length > 0) return String(direct);
    if (req.bookingId && bookings && bookings.length > 0) {
      const match = bookings.find((b: any) => String(b.bookingId) === String(req.bookingId));
      if (match && match.phone) return String(match.phone);
    }
    return '-';
  };

  const openEditInBookings = (req: EditRequest) => {
    // Prefer bookingId if present, fallback to name/email to search
    if (req.bookingId) {
      sessionStorage.setItem('openEditBookingId', String(req.bookingId));
    } else if (req._id) {
      sessionStorage.setItem('openEditBookingMongoId', String(req._id));
    } else if (req.email || req.name) {
      // Store hint for search
      sessionStorage.setItem('openEditBookingSearchHint', String(req.email || req.name));
    }
    router.push('/Administrator/bookings');
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Edit Booking Requests</h1>
        {refreshing && <span className="live-indicator">Live updating…</span>}
      </div>

      <div className="content">
        {loading ? (
          <div className="placeholder"><p>Loading edit requests...</p></div>
        ) : requests.length === 0 ? (
          <div className="placeholder"><p>No edit requests found.</p></div>
        ) : (
          <table className="requests-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Booking ID</th>
                <th>Customer</th>
                <th>Contact</th>
                <th>Date/Time</th>
                <th>Status</th>
                <th>Requested At</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={String(req._id || req.bookingId || Math.random())}>
                  <td>{String(req._id || '-')}</td>
                  <td>{req.bookingId || '-'}</td>
                  <td>{req.name || req.customerName || (req as any).bookingName || '-'}</td>
                  <td>
                    {resolveMobile(req)}
                  </td>
                  <td>
                    <div>{req.date || '-'}</div>
                    <div>{req.time || '-'}</div>
                  </td>
                  <td>
                    <span className={`status-pill ${String(req.status || 'pending').toLowerCase()}`}>
                      {String(req.status || 'pending')}
                    </span>
                  </td>
                  <td>{req.requestedAt ? new Date(req.requestedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-'}</td>
                  <td>
                    <button className="action-btn" onClick={() => openEditInBookings(req)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style jsx>{`
        .admin-page {
          padding: 2rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          background: #f5f7fb;
          color: #111;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        .live-indicator {
          font-size: 0.85rem;
          color: #166534;
          background: #ecfdf5;
          border: 1px solid #86efac;
          padding: 0.2rem 0.5rem;
          border-radius: 8px;
        }
        .page-header h1 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.75rem;
          color: #111;
        }
        .content {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1rem;
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
        }
        .placeholder {
          padding: 1rem;
          border: 1px dashed #d1d5db;
          border-radius: 10px;
          color: #444;
          background: #fff;
        }
        .requests-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        .requests-table th {
          background: #f9fafb;
          color: #111;
          font-weight: 600;
        }
        .requests-table th, .requests-table td {
          border-bottom: 1px solid #e5e7eb;
          padding: 0.75rem;
          text-align: left;
          font-size: 0.92rem;
          color: #111;
        }
        .requests-table tr:hover {
          background: #f5f7fb;
        }
        .status-pill {
          display: inline-block;
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #111;
          background: #e5e7eb;
          border: 1px solid #d1d5db;
        }
        .status-pill.pending { background: #fff7ed; border-color: #fdba74; color: #9a3412; }
        .status-pill.approved { background: #ecfdf5; border-color: #86efac; color: #166534; }
        .status-pill.rejected { background: #fef2f2; border-color: #fca5a5; color: #7f1d1d; }
        .action-btn {
          padding: 0.45rem 0.9rem;
          background: var(--accent-color);
          color: #fff;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .action-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(0,0,0,0.08); }
      `}</style>
    </div>
  );
}