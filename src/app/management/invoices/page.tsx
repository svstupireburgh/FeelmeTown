'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, Calendar } from 'lucide-react';

interface InvoiceCardItem {
  id: string;
  name?: string;
  date?: string;
  url?: string;
  filename?: string;
}

const extractNameFromUrl = (url?: string) => {
  if (!url) return '';
  try {
    const u = new URL(url);
    const last = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || '');
    const file = last.replace(/\.pdf$/i, '');
    const cleaned = file.replace(/^Invoice(-FMT-2025-1116)?-/i, '');
    const parts = cleaned.split('-').filter(Boolean);
    if (parts.length === 0) return '';
    let guess = parts.slice(1).join(' ');
    if (!guess) guess = parts[0];
    return guess.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
};

export default function ManagementInvoicesPage() {
  const [items, setItems] = useState<InvoiceCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const knownInvoiceUrlsRef = useState<Set<string>>(new Set())[0];

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
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    }
  };

  useEffect(() => {
    let mounted = true;

    const fetchInvoices = async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const res = await fetch('/api/admin/invoices/list', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch invoices');
        const data = await res.json();
        const invoices = (data?.invoices || []) as Array<{
          publicId: string;
          filename: string;
          secureUrl: string;
          createdAt?: string | null;
        }>;
        const mapped: InvoiceCardItem[] = invoices.map((inv) => ({
          id: inv.publicId?.split('/').pop() || inv.filename || inv.publicId,
          name: extractNameFromUrl(inv.secureUrl) || inv.filename,
          date: inv.createdAt || undefined,
          url: inv.secureUrl,
          filename: inv.filename
        }));

        if (!mounted) return;

        if (!hasInitialized) {
          setItems(mapped);
          knownInvoiceUrlsRef.clear();
          mapped.forEach((m) => {
            if (m.url) knownInvoiceUrlsRef.add(m.url);
          });
          setHasInitialized(true);
          return;
        }

        // Append only new ones to avoid flicker
        const newOnes: InvoiceCardItem[] = [];
        for (const m of mapped) {
          const key = m.url || '';
          if (key && !knownInvoiceUrlsRef.has(key)) {
            knownInvoiceUrlsRef.add(key);
            newOnes.push(m);
          }
        }
        if (newOnes.length > 0) {
          setItems((prev) => [...newOnes, ...prev]);
        }
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load invoices');
      } finally {
        if (mounted) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    // Initial fetch
    fetchInvoices();

    // Poll every 2 seconds
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      setIsRefreshing(true);
      fetchInvoices(true);
    }, 2000);

    const onFocus = () => {
      if (!mounted) return;
      setIsRefreshing(true);
      fetchInvoices(true);
    };

    const onVisibilityChange = () => {
      if (!mounted) return;
      if (document.visibilityState === 'visible') {
        setIsRefreshing(true);
        fetchInvoices(true);
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [hasInitialized, knownInvoiceUrlsRef]);

  const filtered = items.filter((b) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      (b.id && b.id.toLowerCase().includes(term)) ||
      (b.name && b.name.toLowerCase().includes(term)) ||
      (b.filename && b.filename.toLowerCase().includes(term));

    if (!selectedDate) return matchesSearch;
    if (!b.date) return false;

    try {
      const sel = new Date(selectedDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
      const bd = new Date(b.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
      return matchesSearch && sel === bd;
    } catch {
      return matchesSearch;
    }
  });

  // Reset displayed count when filters change
  useEffect(() => {
    setDisplayedCount(10);
  }, [searchTerm, selectedDate]);

  const displayedItems = filtered.slice(0, displayedCount);
  const hasMore = displayedCount < filtered.length;

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
            <p>Cloudinary PDF invoices for management.</p>
          </div>
        </div>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search by filename or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="date-selector-button" title="Select specific date to view invoices">
          <Calendar size={16} />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'transparent' }}
          />
        </div>
        <div className="results-info">
          Showing {displayedItems.length} of {filtered.length} invoices
          {hasMore && <span style={{ marginLeft: '0.5rem', color: '#10b981' }}>(Scroll for more)</span>}
        </div>
      </div>

      {loading && <div className="text-gray-300">Loading invoices...</div>}
      {error && !loading && <div className="text-red-400">{error}</div>}

      {!loading && !error && filtered.length > 0 && (
        <div className="invoice-cards-grid">
          {displayedItems.map((b) => (
            <div className="invoice-card" key={b.id}>
              <div className="invoice-preview">
                {b.url ? (
                  <iframe src={`${b.url}#view=FitH`} title={`Invoice ${b.id}`} loading="lazy" />
                ) : (
                  <div className="invoice-preview-placeholder">No PDF</div>
                )}
              </div>
              <div className="invoice-body">
                <div className="invoice-title" title={b.name}>{b.name || 'Invoice'}</div>
                <div className="invoice-meta">
                  <span className="invoice-id" title={b.id}>#{b.id}</span>
                  {b.date && <span className="invoice-date">{new Date(b.date).toLocaleDateString('en-IN')}</span>}
                </div>
                <div className="invoice-actions">
                  <button
                    className="action-btn view-btn"
                    title="Open invoice preview"
                    onClick={() => { setPreviewUrl(b.url || ''); setPreviewTitle(b.name || 'Invoice'); setModalOpen(true); }}
                  >View</button>
                  {b.url && (
                    <button
                      className="action-btn download-btn"
                      title="Download PDF"
                      onClick={() => handleDownloadPdf(b.url || '', `${b.filename || b.id || 'invoice'}.pdf`)}
                    >
                      Download
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
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

      {modalOpen && (
        <div className="invoice-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="invoice-modal" onClick={(e) => e.stopPropagation()}>
            <div className="invoice-modal-header">
              <div className="invoice-modal-title" title={previewTitle}>{previewTitle}</div>
              <button className="invoice-modal-close" onClick={() => setModalOpen(false)} aria-label="Close">×</button>
            </div>
            <div className="invoice-modal-body">
              <iframe src={previewUrl} title={previewTitle} />
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .bookings-page { padding: 2rem; max-width: 1400px; margin: 0 auto; }
        .page-header { margin-bottom: 2rem; }
        .header-content { display: flex; justify-content: space-between; align-items: flex-start; gap: 2rem; }
        .header-text h1 { font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif; font-size: 2rem; font-weight: 600; color: #333; margin: 0 0 0.5rem 0; }
        .header-text p { font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif; font-size: 0.85rem; color: #666; margin: 0; }
        .filters-section { display: flex; gap: 1rem; margin-bottom: 2rem; align-items: flex-end; flex-wrap: nowrap; }
        .search-box { position: relative; flex: 1; max-width: 400px; }
        .search-box input { width: 100%; padding: 0.6rem 0.8rem 0.6rem 2.5rem; border: 1px solid #ddd; border-radius: 8px; font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif; font-size: 0.8rem; background: white; color: #000000; }
        .search-box .search-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #666; }
        .date-selector-button { padding: 0.4rem 0.8rem; background: white; color: #333; border-radius: 12px; font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif; font-size: 0.8rem; font-weight: 500; display: inline-flex; align-items: center; gap: 0.5rem; border: 1px solid #ddd; white-space: nowrap; }
        .results-info { font-size: 0.9rem; color: #6B7280; padding: 0.5rem 1rem; background: #F9FAFB; border-radius: 0.5rem; border: 1px solid #E5E7EB; }
        .invoice-cards-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
        .invoice-card { display: flex; flex-direction: column; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); overflow: hidden; border: 1px solid #eef0f3; }
        .invoice-preview { position: relative; background: #f3f4f6; height: 220px; border-bottom: 1px solid #eef0f3; }
        .invoice-preview iframe { width: 100%; height: 100%; border: 0; background: #fff; }
        .invoice-preview-placeholder { height: 100%; display: flex; align-items: center; justify-content: center; color: #9CA3AF; font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif; font-size: 0.9rem; }
        .invoice-body { display: flex; flex-direction: column; gap: 0.5rem; padding: 0.9rem; }
        .invoice-title { font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif; font-size: 1rem; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .invoice-meta { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; color: #6B7280; font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif; font-size: 0.8rem; }
        .invoice-id { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; background: #F3F4F6; padding: 0.1rem 0.4rem; border-radius: 6px; }
        .invoice-date { margin-left: auto; }
        .invoice-actions { display: flex; gap: 0.5rem; margin-top: 0.25rem; }
        .action-btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.5rem 0.8rem; border-radius: 8px; font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif; font-size: 0.85rem; text-decoration: none; transition: all 0.2s ease; border: 1px solid #e5e7eb; color: #111827; background: #fff; }
        .action-btn:hover { background: #f9fafb; transform: translateY(-1px); }
        .view-btn { border-color: #c7d2fe; background: #eef2ff; color: #3730a3; }
        .view-btn:hover { background: #e0e7ff; }
        .download-btn { border-color: #fecaca; background: #fee2e2; color: #991b1b; }
        .download-btn:hover { background: #fecaca; }
        @media (max-width: 768px) { .invoice-cards-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 520px) { .invoice-cards-grid { grid-template-columns: 1fr; } }
        .invoice-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 1rem; z-index: 1000; }
        .invoice-modal { width: 100%; max-width: 1000px; height: 80vh; background: #ffffff; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); display: flex; flex-direction: column; overflow: hidden; }
        .invoice-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; border-bottom: 1px solid #eef0f3; background: #f9fafb; }
        .invoice-modal-title { font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif; font-size: 1rem; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-right: 0.5rem; }
        .invoice-modal-close { background: transparent; border: none; font-size: 1.5rem; line-height: 1; cursor: pointer; color: #6b7280; }
        .invoice-modal-close:hover { color: #111827; }
        .invoice-modal-body { flex: 1; background: #f3f4f6; }
        .invoice-modal-body iframe { width: 100%; height: 100%; border: 0; background: #ffffff; }
      `}</style>
    </div>
  );
}


