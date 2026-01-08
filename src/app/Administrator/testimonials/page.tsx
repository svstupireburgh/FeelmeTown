  'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCcw, Search, Star, Pencil, Trash2, X, CheckCircle2 } from 'lucide-react';

type Testimonial = {
  id: string;
  dbId?: string;
  feedbackId?: string;
  name?: string;
  customerName?: string;
  message: string;
  text?: string;
  rating: number;
  avatar?: string | null;
  submittedAt?: string;
  date?: string;
  email?: string;
  socialHandle?: string;
  position?: string;
  socialPlatform?: string;
  avatarType?: string;
  image?: string;
};

const TestimonialsPage = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<{
    id: string;
    dbId?: string;
    name: string;
    message: string;
    rating: number;
    socialHandle?: string;
    socialPlatform?: string;
    email?: string;
  } | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Testimonial | null>(null);

  const getPrimaryId = (testimonial: Testimonial) => {
    const raw = testimonial.dbId ?? testimonial.id ?? testimonial.feedbackId;
    if (raw === undefined || raw === null) return '';
    if (typeof raw === 'string' || typeof raw === 'number') return String(raw);
    if (typeof raw === 'object' && typeof (raw as { toString?: unknown }).toString === 'function') {
      return (raw as { toString: () => string }).toString();
    }
    return '';
  };

  const getDbId = (testimonial: Testimonial) =>
    testimonial.dbId ? String(testimonial.dbId) : undefined;

  const openEditModal = (testimonial: Testimonial) => {
    setEditForm({
      id: getPrimaryId(testimonial),
      dbId: getDbId(testimonial),
      name: testimonial.name || testimonial.customerName || '',
      message: testimonial.message || testimonial.text || '',
      rating: testimonial.rating || 0,
      socialHandle: testimonial.socialHandle || '',
      socialPlatform: testimonial.socialPlatform || '',
      email: testimonial.email || ''
    });
    setShowEditModal(true);
  };

  const handleDelete = async (testimonial: Testimonial) => {
    const recordId = getPrimaryId(testimonial);
    if (!recordId) {
      setToast({ message: 'Unable to determine testimonial ID. Please refresh and try again.', type: 'error' });
      return;
    }

    try {
      setIsDeletingId(recordId);
      const response = await fetch('/api/testimonials', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recordId, dbId: getDbId(testimonial) })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete testimonial');
      }

      setTestimonials((prev) => prev.filter((item) => getPrimaryId(item) !== recordId));
      setToast({ message: 'Testimonial deleted successfully', type: 'success' });
    } catch (error) {
      console.error('Failed to delete testimonial:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Failed to delete testimonial',
        type: 'error'
      });
    } finally {
      setIsDeletingId(null);
    }
  };

  const openDeleteConfirmation = (testimonial: Testimonial) => {
    const recordId = getPrimaryId(testimonial);
    if (!recordId) {
      setToast({ message: 'Unable to determine testimonial ID. Please refresh and try again.', type: 'error' });
      return;
    }
    setPendingDelete(testimonial);
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    handleDelete(pendingDelete);
    setPendingDelete(null);
  };

  const handleCancelDelete = () => {
    setPendingDelete(null);
  };

  const handleEditSave = async () => {
    if (!editForm) return;
    const trimmedName = editForm.name.trim();
    const trimmedMessage = editForm.message.trim();
    const recordId = editForm.id;

    if (!recordId) {
      alert('Unable to determine testimonial id.');
      return;
    }

    if (!trimmedName || !trimmedMessage) {
      alert('Name and message are required.');
      return;
    }

    if (editForm.rating < 1 || editForm.rating > 5) {
      alert('Rating must be between 1 and 5.');
      return;
    }

    try {
      setIsSavingEdit(true);
      const payload = {
        id: recordId,
        dbId: editForm.dbId,
        name: trimmedName,
        message: trimmedMessage,
        rating: editForm.rating,
        email: editForm.email?.trim() || null,
        socialHandle: editForm.socialHandle?.trim() || null,
        socialPlatform: editForm.socialPlatform?.trim() || null
      };

      const response = await fetch('/api/testimonials', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update testimonial');
      }

      setTestimonials((prev) =>
        prev.map((item) =>
          getPrimaryId(item) === recordId
            ? {
                ...item,
                name: trimmedName,
                message: trimmedMessage,
                text: trimmedMessage,
                rating: editForm.rating,
                email: payload.email || item.email,
                socialHandle: payload.socialHandle || item.socialHandle,
                socialPlatform: payload.socialPlatform || item.socialPlatform
              }
            : item
        )
      );

      setShowEditModal(false);
      setEditForm(null);
    } catch (error) {
      console.error('Failed to update testimonial:', error);
      alert(error instanceof Error ? error.message : 'Failed to update testimonial');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const fetchTestimonials = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/feedback', { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load testimonials');
      }

      const raw = Array.isArray(data.feedback) ? data.feedback : [];
      const transformed = raw.map((feedback: any) => {
        const dbId = feedback._id || feedback.mongoId || feedback.mongo_id;
        return {
          id: String(feedback.feedbackId || feedback.feedback_id || dbId || ''),
          dbId: dbId ? String(dbId) : undefined,
          feedbackId: feedback.feedbackId || feedback.feedback_id,
          name: feedback.name,
          customerName: feedback.customerName,
          message: feedback.message || feedback.feedback || '',
          text: feedback.message || feedback.feedback || '',
          rating: typeof feedback.rating === 'number' ? feedback.rating : Number(feedback.rating || 0),
          avatar: feedback.avatar || null,
          image: feedback.avatar || null,
          submittedAt: feedback.submittedAt || feedback.submitted_at,
          date: (feedback.submittedAt || feedback.submitted_at)
            ? new Date(feedback.submittedAt || feedback.submitted_at).toISOString().split('T')[0]
            : undefined,
          email: feedback.email,
          socialHandle: feedback.socialHandle,
          socialPlatform: feedback.socialPlatform,
          position: feedback.socialPlatform ? `${feedback.socialPlatform} User` : 'Customer',
          avatarType: feedback.avatarType || feedback.avatar_type
        };
      });

      setTestimonials(transformed);
    } catch (err) {
      console.error('Failed to fetch testimonials:', err);
      setError(err instanceof Error ? err.message : 'Failed to load testimonials');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const filteredTestimonials = useMemo(() => {
    if (!searchTerm.trim()) return testimonials;
    const term = searchTerm.toLowerCase();
    return testimonials.filter((testimonial) => {
      return (
        testimonial.name?.toLowerCase().includes(term) ||
        testimonial.message?.toLowerCase().includes(term) ||
        testimonial.email?.toLowerCase().includes(term) ||
        testimonial.socialHandle?.toLowerCase().includes(term)
      );
    });
  }, [searchTerm, testimonials]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const renderRating = (value: number) => {
    const filled = Math.max(0, Math.min(5, Math.round(value)));
    return (
      <div className="rating-stars" aria-label={`Rated ${filled} out of 5`}>
        {Array.from({ length: 5 }).map((_, index) => (
          <Star key={index} size={16} className={index < filled ? 'filled' : 'empty'} />
        ))}
      </div>
    );
  };

  return (
    <div className="admin-testimonials">
      <div className="header">
        <div>
          <h1>Testimonials</h1>
          <p>Browse the feedback submitted by FeelME Town guests.</p>
        </div>
        <div className="header-actions">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search name, email, handle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="refresh-btn" onClick={fetchTestimonials} disabled={isLoading}>
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="status-card error">
          <p>{error}</p>
          <button onClick={fetchTestimonials}>Try again</button>
        </div>
      )}

      {!error && (
        <div className="status-card info">
          <span>Total testimonials:</span>
          <strong>{isLoading ? '-' : filteredTestimonials.length}</strong>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.type || 'info'}`}>
          <CheckCircle2 size={16} />
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="card-grid">
        {isLoading &&
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="testimonial-card skeleton">
              <div className="avatar shimmer" />
              <div className="lines">
                <div className="line shimmer" />
                <div className="line short shimmer" />
              </div>
            </div>
          ))}

        {!isLoading && !filteredTestimonials.length && !error && (
          <div className="empty-state">
            <p>No testimonials found.</p>
            <span>Once guests submit feedback, it will appear here.</span>
          </div>
        )}

        {!isLoading &&
          filteredTestimonials.map((testimonial, index) => {
            const cardKey = getPrimaryId(testimonial) || `testimonial-${index}`;
            const submittedDate =
              testimonial.submittedAt || testimonial.date
                ? new Date(testimonial.submittedAt ?? testimonial.date ?? '').toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'Unknown';

            return (
              <div key={cardKey} className="testimonial-card">
                <div className="card-header">
                  <img
                    src={testimonial.avatar || testimonial.image || '/images/Avatars/FMT.svg'}
                    alt={testimonial.name}
                    onError={(event) => {
                      (event.currentTarget as HTMLImageElement).src = '/images/Avatars/FMT.svg';
                    }}
                  />
                  <div>
                    <h3>{testimonial.name || testimonial.customerName || testimonial.email || 'Guest'}</h3>
                    <p>{testimonial.position || testimonial.socialHandle || testimonial.email || 'Customer'}</p>
                  </div>
                </div>

                <p className="message">“{testimonial.message || testimonial.text}”</p>

                <div className="card-footer">
                  {renderRating(testimonial.rating)}
                  <span>{submittedDate}</span>
                </div>
                <div className="card-actions">
                  <button
                    type="button"
                    className="action-btn edit"
                    onClick={() => openEditModal(testimonial)}
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="action-btn delete"
                    onClick={() => openDeleteConfirmation(testimonial)}
                    disabled={isDeletingId === getPrimaryId(testimonial)}
                  >
                    <Trash2 size={14} />
                    {isDeletingId === getPrimaryId(testimonial) ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {showEditModal && editForm && (
        <div className="edit-modal">
          <div className="modal-content">
            <button className="close-btn" onClick={() => setShowEditModal(false)}>
              <X size={16} />
            </button>
            <h2>Edit testimonial</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleEditSave();
              }}
            >
              <label>
                Name
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </label>
              <label>
                Email / Handle
                <input
                  type="text"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </label>
              <label>
                Message
                <textarea
                  value={editForm.message}
                  onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                  required
                />
              </label>
              <label>
                Rating
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={editForm.rating}
                  onChange={(e) => setEditForm({ ...editForm, rating: Number(e.target.value) })}
                  required
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="cancel" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="save" disabled={isSavingEdit}>
                  {isSavingEdit ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div className="confirm-modal">
          <div className="modal-content">
            <button className="close-btn" onClick={handleCancelDelete}>
              <X size={16} />
            </button>
            <h2>Delete testimonial?</h2>
            <p>
              This will permanently remove{' '}
              <strong>{pendingDelete.name || pendingDelete.customerName || 'this testimonial'}</strong>. You
              won't be able to undo this action.
            </p>
            <div className="modal-actions">
              <button type="button" className="cancel" onClick={handleCancelDelete}>
                Cancel
              </button>
              <button
                type="button"
                className="delete"
                onClick={handleConfirmDelete}
                disabled={isDeletingId === getPrimaryId(pendingDelete)}
              >
                {isDeletingId === getPrimaryId(pendingDelete) ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-testimonials {
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .header {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }

        .header h1 {
          color: #000000;
          font-size: 1.75rem;
          margin-bottom: 0.25rem;
        }

        .header p {
          color: #111827;
          font-size: 0.95rem;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 999px;
          padding: 0.4rem 0.9rem;
          min-width: 260px;
        }

        .search-box input {
          border: none;
          outline: none;
          width: 100%;
          font-size: 0.9rem;
        }

        .refresh-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          border: none;
          border-radius: 999px;
          padding: 0.45rem 0.9rem;
          background: #2563eb;
          color: white;
          font-weight: 500;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .refresh-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .refresh-btn:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 25px rgba(37, 99, 235, 0.25);
        }

        .status-card {
          background: white;
          border-radius: 16px;
          padding: 1rem 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid #e5e7eb;
        }

        .status-card.info span {
          color: #111827;
        }

        .status-card.info strong {
          font-size: 1.2rem;
          color: #2563eb;
        }

        .status-card.error {
          border-color: #fecaca;
          background: #fef2f2;
          color: #7f1d1d;
          gap: 1rem;
        }

        .status-card.error button {
          border: none;
          border-radius: 999px;
          padding: 0.35rem 0.85rem;
          background: #ef4444;
          color: #fff;
          cursor: pointer;
        }

        .toast {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: #ecfdf5;
          border: 1px solid #34d399;
          color: #065f46;
          padding: 0.5rem 0.75rem;
          border-radius: 999px;
          width: fit-content;
        }

        .toast button {
          border: none;
          background: transparent;
          color: inherit;
          cursor: pointer;
        }

        .toast.error {
          background: #fef2f2;
          border-color: #f87171;
          color: #7f1d1d;
        }

        .card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 1.25rem;
        }

        .testimonial-card {
          background: white;
          border-radius: 18px;
          padding: 1.25rem;
          border: 1px solid rgba(229, 231, 235, 0.8);
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
          box-shadow: 0 15px 35px rgba(15, 23, 42, 0.08);
        }

        .testimonial-card.skeleton {
          min-height: 170px;
          box-shadow: none;
        }

        .testimonial-card .avatar {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          background: #e5e7eb;
        }

        .testimonial-card .lines {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .testimonial-card .lines .line {
          height: 12px;
          border-radius: 999px;
          background: #e5e7eb;
        }

        .testimonial-card .lines .line.short {
          width: 60%;
        }

        .skeleton .shimmer {
          position: relative;
          overflow: hidden;
        }

        .skeleton .shimmer::after {
          content: '';
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
          animation: shimmer 1.6s infinite;
        }

        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }

        .card-header {
          display: flex;
          gap: 0.85rem;
          align-items: center;
        }

        .card-header img {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid rgba(37, 99, 235, 0.15);
        }

        .card-header h3 {
          margin: 0;
          font-size: 1rem;
          color: #0f172a;
        }

        .card-header p {
          margin: 0;
          color: #4b5563;
          font-size: 0.85rem;
        }

        .message {
          color: #0f172a;
          font-size: 0.95rem;
          line-height: 1.5;
          margin: 0;
        }

        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #111827;
          font-size: 0.85rem;
        }

        .card-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
          margin-top: 0.25rem;
        }

        .action-btn {
          border: none;
          border-radius: 999px;
          padding: 0.35rem 0.75rem;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.8rem;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.2s ease;
        }

        .action-btn svg {
          width: 14px;
          height: 14px;
        }

        .action-btn.edit {
          background: rgba(37, 99, 235, 0.1);
          color: #1d4ed8;
        }

        .action-btn.delete {
          background: rgba(239, 68, 68, 0.1);
          color: #b91c1c;
        }

        .action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .edit-modal {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 20;
          padding: 1rem;
        }

        .modal-content {
          background: #fff;
          border-radius: 18px;
          padding: 1.5rem;
          width: min(420px, 100%);
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .modal-content h2 {
          margin: 0;
        }

        .modal-content label {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          font-size: 0.85rem;
          color: #4b5563;
        }

        .modal-content input,
        .modal-content textarea {
          border: 1px solid #d1d5db;
          border-radius: 12px;
          padding: 0.5rem 0.75rem;
          font-size: 0.9rem;
        }

        .modal-content textarea {
          min-height: 90px;
          resize: vertical;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
        }

        .modal-actions button {
          border: none;
          border-radius: 999px;
          padding: 0.45rem 1rem;
          cursor: pointer;
        }

        .modal-actions .cancel {
          background: #e5e7eb;
          color: #374151;
        }

        .modal-actions .save {
          background: #2563eb;
          color: #fff;
        }

        .close-btn {
          position: absolute;
          right: 1rem;
          top: 1rem;
          border: none;
          background: transparent;
          cursor: pointer;
          color: #6b7280;
        }

        .rating-stars {
          display: inline-flex;
          gap: 0.2rem;
          color: #fbbf24;
        }

        .rating-stars .empty {
          color: #e5e7eb;
        }

        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 3rem 2rem;
          border-radius: 18px;
          border: 1px dashed #d1d5db;
          background: #f8fafc;
        }

        .empty-state p {
          margin-bottom: 0.5rem;
          font-weight: 600;
        }

        .empty-state span {
          color: #6b7280;
        }

        @media (max-width: 720px) {
          .admin-testimonials {
            padding: 1.25rem;
          }

          .header {
            flex-direction: column;
          }

          .header-actions {
            width: 100%;
          }

          .search-box {
            width: 100%;
          }

          .card-grid {
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          }
        }
      `}</style>
    </div>
  );
};

export default TestimonialsPage;
