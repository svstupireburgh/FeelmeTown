'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, Calendar } from 'lucide-react';

interface BookingWithInvoice {
  bookingId: string;
  name?: string;
  date?: string;
  paymentStatus?: string;
  invoiceDriveUrl?: string;
  filename?: string;
}

// Helper to get current date in IST (DD/MM/YYYY)
const getCurrentDateIST = () => {
  const now = new Date();
  return now.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

// Extract probable customer name from Cloudinary/URL filename
const extractCustomerNameFromUrl = (url?: string) => {
  if (!url) return '';
  try {
    const u = new URL(url);
    const last = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || '');
    const file = last.replace(/\.pdf$/i, '');
    // Common patterns: Invoice-<id>-<Name>, Invoice-FMT-<Name>
    const cleaned = file.replace(/^Invoice(-FMT-2025-1116)?-/i, '');
    // If still has id-like segment, take last hyphen group as name
    const parts = cleaned.split('-').filter(Boolean);
    if (parts.length === 0) return '';
    // If more than one part, likely last parts form the name
    let guess = parts.slice(1).join(' ');
    if (!guess) guess = parts[0];
    // Beautify
    return guess.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
};

export default function AdminInvoicesPage() {
  const [bookings, setBookings] = useState<BookingWithInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const knownInvoiceUrlsRef = useState<Set<string>>(new Set())[0];

  const [searchTerm, setSearchTerm] = useState('');
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  const [showTomorrowOnly, setShowTomorrowOnly] = useState(false);
  const [selectedDate, setSelectedDate] = useState(''); // YYYY-MM-DD

  // Infinite scroll state (UI-only)
  const [displayedCount, setDisplayedCount] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  const handleDownloadPdf = async (pdfUrl: string, filename: string) => {
    try {
      const res = await fetch(pdfUrl, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Failed to download PDF');
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Fallback: open in new tab if browser blocks blob download
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    }
  };

  useEffect(() => {
    const fetchInvoices = async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        // Load directly from Cloudinary folder via admin API (no-store to bypass cache)
        const res = await fetch('/api/admin/invoices/list', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch Cloudinary invoices');
        const data = await res.json();
        const invoices = (data?.invoices || []) as Array<{
          publicId: string;
          filename: string;
          secureUrl: string;
          createdAt?: string | null;
        }>;
        const mapped: BookingWithInvoice[] = invoices.map((inv) => {
          const candidateId = inv.publicId?.split('/').pop() || inv.filename || inv.publicId;
          return {
            bookingId: candidateId,
            name: extractCustomerNameFromUrl(inv.secureUrl) || inv.filename,
            date: inv.createdAt || undefined,
            paymentStatus: undefined,
            invoiceDriveUrl: inv.secureUrl,
            filename: inv.filename,
          };
        });

        // First load: set all and seed known set
        if (!hasInitialized) {
          setBookings(mapped);
          knownInvoiceUrlsRef.clear();
          mapped.forEach((m) => {
            if (m.invoiceDriveUrl) knownInvoiceUrlsRef.add(m.invoiceDriveUrl);
          });
          setHasInitialized(true);
          return;
        }

        // Subsequent loads: only prepend new ones (no flicker)
        const newOnes: BookingWithInvoice[] = [];
        for (const m of mapped) {
          const key = m.invoiceDriveUrl || '';
          if (key && !knownInvoiceUrlsRef.has(key)) {
            knownInvoiceUrlsRef.add(key);
            newOnes.push(m);
          }
        }
        if (newOnes.length > 0) {
          setBookings((prev) => [...newOnes, ...prev]);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load invoices');
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    };

    // Initial fetch
    fetchInvoices();

    // Poll every 2 seconds for new invoices only
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      setIsRefreshing(true);
      fetchInvoices(true);
    }, 2000);

    const onFocus = () => {
      setIsRefreshing(true);
      fetchInvoices(true);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setIsRefreshing(true);
        fetchInvoices(true);
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [hasInitialized, knownInvoiceUrlsRef]);

  const isToday = (dateStr?: string) => {
    if (!dateStr) return false;
    const bookingDate = new Date(dateStr);
    const bookingDateIST = bookingDate.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return bookingDateIST === getCurrentDateIST();
  };

  const isTomorrow = (dateStr?: string) => {
    if (!dateStr) return false;
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIST = tomorrow.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const bookingDate = new Date(dateStr);
    const bookingDateIST = bookingDate.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return bookingDateIST === tomorrowIST;
  };

  const isSelectedDate = (dateStr?: string) => {
    if (!selectedDate) return true; // no filter
    if (!dateStr) return false;

    try {
      const selectedDateFormatted = new Date(selectedDate).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });

      const bookingDateParsed = new Date(dateStr);
      const bookingDateIST = bookingDateParsed.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });

      return bookingDateIST === selectedDateFormatted;
    } catch {
      return false;
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      (b.bookingId && b.bookingId.toLowerCase().includes(term)) ||
      (b.name && b.name.toLowerCase().includes(term)) ||
      (b.filename && b.filename.toLowerCase().includes(term));

    let matchesDate = true;
    if (showTodayOnly) {
      matchesDate = isToday(b.date);
    } else if (showTomorrowOnly) {
      matchesDate = isTomorrow(b.date);
    } else if (selectedDate) {
      matchesDate = isSelectedDate(b.date);
    }

    return matchesSearch && matchesDate;
  });

  // Reset displayed count when filters change
  useEffect(() => {
    setDisplayedCount(10);
  }, [searchTerm, showTodayOnly, showTomorrowOnly, selectedDate]);

  const displayedBookings = filteredBookings.slice(0, displayedCount);
  const hasMore = displayedCount < filteredBookings.length;

  // Infinite scroll handler (IntersectionObserver)
  useEffect(() => {
    const target = loadMoreSentinelRef.current;
    if (!target) return;
    if (!hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (!hasMore || isLoadingMore) return;

        setIsLoadingMore(true);
        setTimeout(() => {
          setDisplayedCount((prev) => prev + 10);
          setIsLoadingMore(false);
        }, 150);
      },
      {
        root: null,
        rootMargin: '250px',
        threshold: 0,
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, displayedCount]);

  return (
    <div className="bookings-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Invoices</h1>
            <p>PDF cards with customer name, plus quick View and Download actions.</p>
          </div>
        </div>
      </div>

      {/* Filters row: search + Today/Tomorrow/Select Date */}
      <div className="filters-section">
        <div className="search-box">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search by name or booking ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          className={`today-button ${showTodayOnly ? 'active' : ''}`}
          onClick={() => {
            setShowTodayOnly(!showTodayOnly);
            setShowTomorrowOnly(false);
            setSelectedDate('');
          }}
          title={showTodayOnly ? "Show all invoices" : "Show today's invoices only"}
        >
          Today
        </button>

        <button
          className={`today-button ${showTomorrowOnly ? 'active' : ''}`}
          onClick={() => {
            setShowTomorrowOnly(!showTomorrowOnly);
            setShowTodayOnly(false);
            setSelectedDate('');
          }}
          title={showTomorrowOnly ? "Show all invoices" : "Show tomorrow's invoices only"}
        >
          Tomorrow
        </button>

        <button
          className={`date-selector-button ${selectedDate ? 'active' : ''}`}
          // For now we rely on the native date input; button kept for visual consistency
          onClick={() => {}}
          title="Select specific date to view invoices"
        >
          <Calendar size={16} />
          {selectedDate ? new Date(selectedDate).toLocaleDateString('en-IN') : 'Select Date'}
        </button>

        <div className="results-info">
          Showing {displayedBookings.length} of {filteredBookings.length} invoices
          {hasMore && (
            <span style={{ marginLeft: '0.5rem', color: '#10b981' }}>(Scroll for more)</span>
          )}
        </div>
      </div>

      {loading && <div className="text-gray-300">Loading invoices...</div>}
      {error && !loading && <div className="text-red-400">{error}</div>}

      {!loading && !error && filteredBookings.length === 0 && (
        <div className="text-gray-300">No invoices found for the selected filters.</div>
      )}

      {!loading && !error && filteredBookings.length > 0 && (
        <div className="invoice-cards-grid">
          {displayedBookings.map((b) => {
            const extracted = extractCustomerNameFromUrl(b.invoiceDriveUrl);
            const customerDisplay = extracted || b.name || 'Customer';
            const pdfUrl = b.invoiceDriveUrl || '';
            return (
              <div className="invoice-card" key={b.bookingId}>
                <div className="invoice-preview">
                  {pdfUrl ? (
                    <iframe
                      src={`${pdfUrl}#view=FitH`}
                      title={`Invoice ${b.bookingId}`}
                      loading="lazy"
                    />
                  ) : (
                    <div className="invoice-preview-placeholder">No PDF</div>
                  )}
                </div>

                <div className="invoice-body">
                  <div className="invoice-title" title={customerDisplay}>{customerDisplay}</div>
                  <div className="invoice-meta">
                    <span className="invoice-id" title={b.bookingId}>#{b.bookingId}</span>
                    {b.date && <span className="invoice-date">{new Date(b.date).toLocaleDateString('en-IN')}</span>}
                    {b.paymentStatus && (
                      <span className={`invoice-status ${b.paymentStatus?.toLowerCase()}`}>
                        {b.paymentStatus}
                      </span>
                    )}
                  </div>
                  <div className="invoice-actions">
                    <button
                      className="action-btn view-btn"
                      title="Open invoice preview"
                      onClick={() => {
                        const fallbackUrl = `/invoice/${encodeURIComponent(b.bookingId)}`;
                        setPreviewUrl(pdfUrl || fallbackUrl);
                        setPreviewTitle(customerDisplay);
                        setIsModalOpen(true);
                      }}
                    >View</button>
                    {pdfUrl && (
                      <button
                        className="action-btn download-btn"
                        title="Download PDF"
                        onClick={() => handleDownloadPdf(pdfUrl, `${b.filename || b.bookingId || 'invoice'}.pdf`)}
                      >
                        Download
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Loading indicator for infinite scroll */}
      {isLoadingMore && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#10b981', fontSize: '0.9rem', fontWeight: 600 }}>
          Loading more invoices...
        </div>
      )}

      {/* Sentinel for IntersectionObserver */}
      {hasMore && (
        <div ref={loadMoreSentinelRef} style={{ height: '1px', width: '100%' }} />
      )}

      {isModalOpen && (
        <div className="invoice-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="invoice-modal" onClick={(e) => e.stopPropagation()}>
            <div className="invoice-modal-header">
              <div className="invoice-modal-title" title={previewTitle}>{previewTitle || 'Invoice'}</div>
              <button className="invoice-modal-close" onClick={() => setIsModalOpen(false)} aria-label="Close">×</button>
            </div>
            <div className="invoice-modal-body">
              <iframe src={previewUrl} title={previewTitle || 'Invoice'} />
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .bookings-page {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 2rem;
        }

        .header-text h1 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 2rem;
          font-weight: 600;
          color: #333;
          margin: 0 0 0.5rem 0;
        }

        .header-text p {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.85rem;
          color: #666;
          margin: 0;
        }

        .filters-section {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          align-items: flex-end;
          flex-wrap: nowrap;
        }

        .search-box {
          position: relative;
          flex: 1;
          max-width: 400px;
        }

        .search-box input {
          width: 100%;
          padding: 0.6rem 0.8rem 0.6rem 2.5rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.8rem;
          background: white;
          color: #000000;
        }

        .search-box input::placeholder {
          color: #666666;
        }

        .search-box .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #666;
        }

        .today-button {
          padding: 0.6rem 1.2rem;
          background: rgb(255, 66, 66);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .today-button:hover {
          background: rgb(255, 66, 66);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .today-button:active {
          transform: translateY(0);
        }

        .today-button.active {
          background: #28a745;
          box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
        }

        .today-button.active:hover {
          background: #218838;
        }

        .date-selector-button {
          padding: 0.6rem 1.2rem;
          background: white;
          color: #333;
          border-radius: 12px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          border: 1px solid #ddd;
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .date-selector-button svg {
          color: #ff4242;
        }

        .date-selector-button:hover {
          background: #f8f9fa;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .date-selector-button.active {
          border-color: #ff4242;
          box-shadow: 0 4px 12px rgba(255, 66, 66, 0.3);
        }

        .results-info {
          font-size: 0.9rem;
          color: #6B7280;
          padding: 0.5rem 1rem;
          background: #F9FAFB;
          border-radius: 0.5rem;
          border: 1px solid #E5E7EB;
        }

        .invoice-cards-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }

        .invoice-card {
          display: flex;
          flex-direction: column;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          border: 1px solid #eef0f3;
        }

        .invoice-preview {
          position: relative;
          background: #f3f4f6;
          height: 220px;
          border-bottom: 1px solid #eef0f3;
        }

        .invoice-preview iframe {
          width: 100%;
          height: 100%;
          border: 0;
          background: #fff;
        }

        .invoice-preview-placeholder {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9CA3AF;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
        }

        .invoice-body {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.9rem;
        }

        .invoice-title {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1rem;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .invoice-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
          color: #6B7280;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.8rem;
        }

        .invoice-id {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          background: #F3F4F6;
          padding: 0.1rem 0.4rem;
          border-radius: 6px;
        }

        .invoice-date {
          margin-left: auto;
        }

        .invoice-status {
          padding: 0.15rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          border: 1px solid #e5e7eb;
          background: #F9FAFB;
        }

        .invoice-status.paid {
          background: #ECFDF5;
          color: #065F46;
          border-color: #A7F3D0;
        }

        .invoice-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.25rem;
        }

        .action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem 0.8rem;
          border-radius: 8px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.85rem;
          text-decoration: none;
          transition: all 0.2s ease;
          border: 1px solid #e5e7eb;
          color: #111827;
          background: #fff;
        }

        .action-btn:hover {
          background: #f9fafb;
          transform: translateY(-1px);
        }

        .view-btn {
          border-color: #c7d2fe;
          background: #eef2ff;
          color: #3730a3;
        }

        .view-btn:hover {
          background: #e0e7ff;
        }

        .download-btn {
          border-color: #fecaca;
          background: #fee2e2;
          color: #991b1b;
        }

        .download-btn:hover {
          background: #fecaca;
        }

        @media (max-width: 768px) {
          .filters-section {
            flex-direction: column;
            align-items: stretch;
          }

          .results-info {
            align-self: flex-start;
          }

          .invoice-cards-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 520px) {
          .invoice-cards-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Modal */
        .invoice-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          z-index: 1000;
        }

        .invoice-modal {
          width: 100%;
          max-width: 1000px;
          height: 80vh;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .invoice-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #eef0f3;
          background: #f9fafb;
        }

        .invoice-modal-title {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1rem;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-right: 0.5rem;
        }

        .invoice-modal-close {
          background: transparent;
          border: none;
          font-size: 1.5rem;
          line-height: 1;
          cursor: pointer;
          color: #6b7280;
        }

        .invoice-modal-close:hover {
          color: #111827;
        }

        .invoice-modal-body {
          flex: 1;
          background: #f3f4f6;
        }

        .invoice-modal-body iframe {
          width: 100%;
          height: 100%;
          border: 0;
          background: #ffffff;
        }
      `}</style>
    </div>
  );
}
