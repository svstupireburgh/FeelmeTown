'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, UserCheck, UserX, X, Save, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TrustedCustomer {
  _id?: string;
  customerId?: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  notes?: string;
  tags?: string[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  billingPreference?: 'paid' | 'free';
}

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

const initialFormState = {
  name: '',
  company: '',
  email: '',
  phone: '',
  notes: '',
  tags: '',
  isActive: true,
  billingPreference: 'paid' as 'paid' | 'free'
};

const formatDate = (value?: string) => {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function TrustedCustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<TrustedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [editingCustomer, setEditingCustomer] = useState<TrustedCustomer | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/trusted-customers');
      const data = await response.json();

      if (data.success) {
        setCustomers(Array.isArray(data.customers) ? data.customers : []);
      } else {
        showToast(data.error || 'Failed to fetch trusted customers', 'error');
      }
    } catch (error) {
      showToast('Failed to fetch trusted customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    const interval = setInterval(fetchCustomers, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingCustomer(null);
  };

  const handleAddCustomer = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEditCustomer = (customer: TrustedCustomer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      company: customer.company || '',
      email: customer.email || '',
      phone: customer.phone || '',
      notes: customer.notes || '',
      tags: Array.isArray(customer.tags) ? customer.tags.join(', ') : '',
      isActive: customer.isActive !== undefined ? customer.isActive : true,
      billingPreference: customer.billingPreference === 'free' ? 'free' : 'paid'
    });
    setShowForm(true);
  };

  const handleDeleteCustomer = async (customer: TrustedCustomer) => {
    const customerName = customer.name || customer.customerId;
    const confirmDelete = window.confirm(`Delete trusted customer ${customerName}?`);
    if (!confirmDelete) return;

    try {
      const id = customer._id || customer.customerId;
      if (!id) {
        showToast('Missing customer identifier', 'error');
        return;
      }

      const response = await fetch(`/api/admin/trusted-customers?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        showToast('Trusted customer deleted successfully', 'success');
        fetchCustomers();
      } else {
        showToast(data.error || 'Failed to delete trusted customer', 'error');
      }
    } catch (error) {
      showToast('Failed to delete trusted customer', 'error');
    }
  };

  const handleToggleActive = async (customer: TrustedCustomer) => {
    const id = customer._id || customer.customerId;
    if (!id) {
      showToast('Missing customer identifier', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/admin/trusted-customers?id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !customer.isActive })
      });

      const data = await response.json();

      if (data.success) {
        showToast(`Customer marked as ${customer.isActive ? 'inactive' : 'active'}`, 'success');
        fetchCustomers();
      } else {
        showToast(data.error || 'Failed to update status', 'error');
      }
    } catch (error) {
      showToast('Failed to update status', 'error');
    }
  };

  const handleSaveCustomer = async () => {
    if (!formData.name.trim()) {
      showToast('Please enter a name', 'error');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...formData,
        tags: formData.tags,
        isActive: formData.isActive
      };

      const url = editingCustomer
        ? `/api/admin/trusted-customers?id=${encodeURIComponent(editingCustomer._id || editingCustomer.customerId || '')}`
        : '/api/admin/trusted-customers';

      const method = editingCustomer ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        showToast(editingCustomer ? 'Trusted customer updated' : 'Trusted customer added', 'success');
        setShowForm(false);
        resetForm();
        fetchCustomers();
      } else {
        showToast(data.error || 'Failed to save trusted customer', 'error');
      }
    } catch (error) {
      showToast('Failed to save trusted customer', 'error');
    } finally {
      setSaving(false);
    }
  };

  const activeCount = customers.filter(customer => customer.isActive !== false).length;
  const filteredCustomers = customers.filter((customer) => {
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && customer.isActive !== false) ||
      (statusFilter === 'inactive' && customer.isActive === false);

    if (!matchesStatus) return false;

    if (!searchTerm.trim()) return true;

    const term = searchTerm.trim().toLowerCase();
    return [
      customer.name,
      customer.company,
      customer.email,
      customer.phone,
      customer.customerId,
      Array.isArray(customer.tags) ? customer.tags.join(' ') : '',
      customer.billingPreference
    ]
      .filter(Boolean)
      .some((value) => value!.toString().toLowerCase().includes(term));
  });

  if (loading) {
    return (
      <div className="trusted-customers-page">
        <div className="loading">Loading trusted customers...</div>
      </div>
    );
  }

  return (
    <div className="trusted-customers-page">
      <div className="page-header">
        <div>
          <h1>Trusted Customers</h1>
          <p className="subtitle">Maintain your VIP and repeat customers list for quick reference.</p>
        </div>
        <div className="header-actions">
          <div className="total-count">
            <span className="count-number">{activeCount}</span>
            <span className="count-label">Active</span>
          </div>
          <button className="add-btn" onClick={handleAddCustomer}>
            <Plus size={20} />
            Add Customer
          </button>
        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}

      {showForm && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingCustomer ? 'Edit Trusted Customer' : 'Add Trusted Customer'}</h2>
              <button className="icon-button" onClick={() => { setShowForm(false); resetForm(); }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <label>
                  <span>Name *</span>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter customer name"
                  />
                </label>
                <label>
                  <span>Company</span>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Company or organisation"
                  />
                </label>
                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@example.com"
                  />
                </label>
                <label>
                  <span>Phone</span>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone number"
                  />
                </label>
                <label className="full-width">
                  <span>Tags</span>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="Comma separated values (e.g. VIP, Anniversary)"
                  />
                </label>
                <label className="full-width">
                  <span>Notes</span>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Special preferences, reminders or history"
                    rows={3}
                  />
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <div className="toggle-stack">
                <div className="status-toggle">
                  <span className="toggle-label">Status</span>
                  <button
                    className={`status-button ${formData.isActive ? 'active' : 'inactive'}`}
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  >
                    {formData.isActive ? <UserCheck size={18} /> : <UserX size={18} />}
                    {formData.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>
                <div className="billing-toggle">
                  <span className="toggle-label">Billing</span>
                  <div className="billing-options">
                    <button
                      type="button"
                      className={`billing-button ${formData.billingPreference === 'paid' ? 'selected' : ''}`}
                      onClick={() => setFormData({ ...formData, billingPreference: 'paid' })}
                    >
                      Paid
                    </button>
                    <button
                      type="button"
                      className={`billing-button ${formData.billingPreference === 'free' ? 'selected' : ''}`}
                      onClick={() => setFormData({ ...formData, billingPreference: 'free' })}
                    >
                      Free
                    </button>
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button className="secondary" type="button" onClick={() => { setShowForm(false); resetForm(); }}>
                  Cancel
                </button>
                <button className="primary" type="button" onClick={handleSaveCustomer} disabled={saving}>
                  <Save size={18} />
                  {saving ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Save Customer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="page-toolbar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by name, phone, email or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="status-filters">
          {[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' }
          ].map((option) => (
            <button
              key={option.value}
              className={`filter-pill ${statusFilter === option.value ? 'active' : ''}`}
              onClick={() => setStatusFilter(option.value as 'all' | 'active' | 'inactive')}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🤝</div>
          <h3>{customers.length === 0 ? 'No trusted customers yet' : 'No matching customers'}</h3>
          <p>{customers.length === 0 ? 'Start building your VIP list by adding a trusted customer.' : 'Try adjusting your filters or search query.'}</p>
          {customers.length === 0 && (
            <button className="add-btn" onClick={handleAddCustomer}>
              <Plus size={20} />
              Add Customer
            </button>
          )}
        </div>
      ) : (
        <div className="customer-grid">
          {filteredCustomers.map((customer) => {
            const isActive = customer.isActive !== false;
            const isFree = customer.billingPreference === 'free';
            const manualBookingHref = (() => {
              const params = new URLSearchParams();
              params.set('newBooking', 'true');
              if (customer.customerId) params.set('trustedCustomerId', String(customer.customerId));
              if (customer.name) params.set('trustedCustomerName', String(customer.name));
              if (customer.phone) params.set('trustedCustomerPhone', String(customer.phone));
              if (customer.email) params.set('trustedCustomerEmail', String(customer.email));
              if (customer.billingPreference) params.set('trustedBilling', customer.billingPreference);
              return `/ManualBooking?${params.toString()}`;
            })();
            return (
              <div
                key={customer._id || customer.customerId}
                className={`customer-card ${isActive ? 'card-active' : 'card-inactive'}`}
              >
                <div className="card-header">
                  <div className="card-title">
                    <h3>{customer.name || 'Unnamed Customer'}</h3>
                    <div className="card-meta">
                      {customer.customerId && <span className="badge id">#{customer.customerId}</span>}
                      {customer.company && <span className="badge company">{customer.company}</span>}
                      <span className={`badge billing ${isFree ? 'free' : 'paid'}`}>
                        {isFree ? 'Free Customer' : 'Paid Customer'}
                      </span>
                    </div>
                  </div>
                  <span className={`status-chip ${isActive ? 'active' : 'inactive'}`}>
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="card-body">
                  <div className="info-row">
                    <div className="info-block">
                      <span className="label">Contact</span>
                      <div className="contact-list">
                        {customer.phone ? (
                          <a href={`tel:${customer.phone}`}>{customer.phone}</a>
                        ) : (
                          <span className="placeholder">No phone</span>
                        )}
                        {customer.email && <a href={`mailto:${customer.email}`}>{customer.email}</a>}
                      </div>
                    </div>
                    <div className="info-block">
                      <span className="label">Billing Type</span>
                      <span className={`value-pill ${isFree ? 'pill-free' : 'pill-paid'}`}>
                        {isFree ? 'Complimentary / Free of Charge' : 'Standard Paid'}
                      </span>
                    </div>
                    <div className="info-block">
                      <span className="label">Added On</span>
                      <span className="value">{formatDate(customer.createdAt)}</span>
                    </div>
                    <div className="info-block">
                      <span className="label">Last Updated</span>
                      <span className="value">{formatDate(customer.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="info-row">
                    <div className="info-block full">
                      <span className="label">Tags</span>
                      <div className="tag-list">
                        {customer.tags && customer.tags.length > 0 ? (
                          customer.tags.map((tag) => (
                            <span key={tag} className="tag">{tag}</span>
                          ))
                        ) : (
                          <span className="placeholder">No tags applied</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="info-row">
                    <div className="info-block full">
                      <span className="label">Notes</span>
                      <p className="notes-text">{customer.notes || 'No notes saved yet.'}</p>
                    </div>
                  </div>
                </div>

                <div className="card-actions">
                  <button
                    className="action-button primary-action"
                    onClick={() => router.push(manualBookingHref)}
                    type="button"
                  >
                    <Plus size={16} />
                    New Booking
                  </button>
                  <button
                    className={`action-button status ${isActive ? 'status-active' : 'status-inactive'}`}
                    onClick={() => handleToggleActive(customer)}
                    type="button"
                  >
                    {isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                    {isActive ? 'Mark Inactive' : 'Mark Active'}
                  </button>
                  <button
                    className="action-button outline"
                    onClick={() => handleEditCustomer(customer)}
                    type="button"
                  >
                    <Edit size={16} />
                    Edit Details
                  </button>
                  <button
                    className="action-button danger"
                    onClick={() => handleDeleteCustomer(customer)}
                    type="button"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .trusted-customers-page {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          color:rgb(0, 0, 0);
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }

        .page-header h1 {
          margin: 0;
          color:rgb(0, 0, 0);
          font-size: 2rem;
          font-weight: 600;
        }

        .subtitle {
          margin-top: 0.25rem;
          color: #94a3b8;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .total-count {
          background: transparent;
          border: 1px solid rgba(255, 0, 0, 0.63);
          border-radius: 12px;
          padding: 0.75rem 1rem;
          text-align: center;
          color:rgb(255, 0, 0);
        }

        .count-number {
          font-size: 1.5rem;
          font-weight: 600;
          display: block;
        }

        .count-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgba(255, 0, 0, 0.7);
        }

        .add-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          border: none;
          color: #fff;
          padding: 0.75rem 1.25rem;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 12px 30px rgba(34, 197, 94, 0.25);
        }

        .add-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 36px rgba(34, 197, 94, 0.3);
        }

        .toast {
          padding: 0.85rem 1.2rem;
          border-radius: 10px;
          font-weight: 500;
          max-width: 420px;
          animation: fadeIn 0.2s ease;
        }

        .toast.success {
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.4);
          color: #bbf7d0;
        }

        .toast.error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #fecaca;
        }

        .page-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          align-items: center;
          justify-content: space-between;
          background: rgba(15, 23, 42, 0.55);
          border: 1px solid rgba(148, 163, 184, 0.12);
          padding: 0.9rem 1.1rem;
          border-radius: 14px;
          box-shadow: 0 24px 48px rgba(2, 6, 23, 0.35);
          backdrop-filter: blur(14px);
        }

        .search-box {
          flex: 1 1 260px;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(99, 102, 241, 0.18);
          border-radius: 999px;
          padding: 0.55rem 1rem;
          color: #cbd5f5;
        }

        .search-box input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: inherit;
          font-size: 0.95rem;
        }

        .search-box input::placeholder {
          color: rgba(203, 213, 225, 0.6);
        }

        .status-filters {
          display: inline-flex;
          gap: 0.5rem;
        }

        .filter-pill {
          border: 1px solid rgba(148, 163, 184, 0.25);
          background: rgba(15, 23, 42, 0.6);
          color: #cbd5f5;
          padding: 0.45rem 0.95rem;
          border-radius: 999px;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .filter-pill.active {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.85), rgba(14, 165, 233, 0.85));
          color: #f8fafc;
          border-color: transparent;
          box-shadow: 0 10px 22px rgba(59, 130, 246, 0.35);
        }

        .customer-grid {
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
        }

        .customer-card {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.82), rgba(2, 6, 23, 0.92));
          border: 1px solid rgba(30, 41, 59, 0.65);
          border-radius: 18px;
          padding: 1.25rem;
          position: relative;
          overflow: hidden;
          box-shadow: 0 30px 60px rgba(2, 6, 23, 0.45);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          width: 100%;
        }

        .customer-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(
            circle at top right,
            rgba(59, 130, 246, 0.25),
            transparent 55%
          );
          pointer-events: none;
        }

        .customer-card.card-active {
          border-color: rgba(34, 197, 94, 0.35);
        }

        .customer-card.card-inactive {
          border-color: rgba(239, 68, 68, 0.35);
        }

        .customer-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 36px 72px rgba(2, 6, 23, 0.55);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          position: relative;
          z-index: 1;
        }

        .card-title h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #f8fafc;
        }

        .card-meta {
          display: flex;
          gap: 0.4rem;
          margin-top: 0.4rem;
          flex-wrap: wrap;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.2rem 0.55rem;
          border-radius: 999px;
          font-size: 0.74rem;
          font-weight: 500;
          background: rgba(148, 163, 184, 0.18);
          color: #e2e8f0;
        }

        .badge.id {
          background: rgba(59, 130, 246, 0.25);
          color: #bfdbfe;
        }

        .badge.company {
          background: rgba(236, 72, 153, 0.25);
          color: #fbcfe8;
        }

        .badge.billing.paid {
          background: rgba(96, 165, 250, 0.28);
          color: #bfdbfe;
        }

        .badge.billing.free {
          background: rgba(34, 197, 94, 0.28);
          color: #bbf7d0;
        }

        .status-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 90px;
          padding: 0.4rem 0.9rem;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .status-chip.active {
          background: rgba(34, 197, 94, 0.2);
          color: #86efac;
        }

        .status-chip.inactive {
          background: rgba(239, 68, 68, 0.2);
          color: #fca5a5;
        }

        .card-body {
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
          position: relative;
          z-index: 1;
        }

        .info-row {
          display: grid;
          gap: 0.85rem;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        }

        .info-row .full {
          grid-column: 1 / -1;
        }

        .info-block {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          background: rgba(15, 23, 42, 0.55);
          border: 1px solid rgba(148, 163, 184, 0.14);
          border-radius: 12px;
          padding: 0.75rem;
          min-height: 88px;
        }

        .info-block.full {
          min-height: inherit;
        }

        .label {
          font-size: 0.75rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(148, 163, 184, 0.85);
        }

        .value {
          font-size: 0.95rem;
          color: #e2e8f0;
          font-weight: 500;
        }

        .value-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.4rem 0.8rem;
          border-radius: 999px;
          font-weight: 600;
          font-size: 0.82rem;
        }

        .value-pill.pill-paid {
          background: rgba(59, 130, 246, 0.18);
          color: #bfdbfe;
          border: 1px solid rgba(59, 130, 246, 0.35);
        }

        .value-pill.pill-free {
          background: rgba(34, 197, 94, 0.18);
          color: #bbf7d0;
          border: 1px solid rgba(34, 197, 94, 0.35);
        }

        .contact-list {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .contact-list a {
          color: #93c5fd;
          text-decoration: none;
          font-weight: 500;
        }

        .placeholder {
          color: rgba(148, 163, 184, 0.6);
          font-size: 0.85rem;
        }

        .tag-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
        }

        .tag {
          padding: 0.25rem 0.6rem;
          background: rgba(99, 102, 241, 0.16);
          color: #c7d2fe;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .notes-text {
          margin: 0;
          font-size: 0.92rem;
          line-height: 1.5;
          color: rgba(226, 232, 240, 0.92);
        }

        .card-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          position: relative;
          z-index: 1;
        }

        .action-button {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          border-radius: 12px;
          border: 1px solid transparent;
          padding: 0.6rem 0.95rem;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .action-button.primary-action {
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          color: #f8fafc;
          border-color: rgba(59, 130, 246, 0.45);
          box-shadow: 0 16px 32px rgba(79, 70, 229, 0.35);
        }

        .action-button.status {
          background: rgba(34, 197, 94, 0.18);
          color: #86efac;
          border-color: rgba(34, 197, 94, 0.35);
        }

        .action-button.status-inactive {
          background: rgba(239, 68, 68, 0.18);
          color: #fca5a5;
          border-color: rgba(239, 68, 68, 0.35);
        }

        .action-button.outline {
          background: transparent;
          border-color: rgba(148, 163, 184, 0.35);
          color: #e2e8f0;
        }

        .action-button.danger {
          background: rgba(239, 68, 68, 0.18);
          color: #fecaca;
          border-color: rgba(239, 68, 68, 0.35);
        }

        .action-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.45);
        }

        .action-button.primary-action:hover {
          transform: translateY(-2px);
        }

        .empty-state {
          border-radius: 18px;
          border: 1px dashed rgba(148, 163, 184, 0.35);
          padding: 3rem 2rem;
          text-align: center;
          background: rgba(15, 23, 42, 0.6);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.8rem;
          color: #94a3b8;
        }

        .empty-icon {
          font-size: 2.75rem;
        }

        .loading {
          padding: 3rem;
          text-align: center;
          color: #94a3b8;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(2, 6, 23, 0.78);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
          padding: 1.5rem;
        }

        .modal {
          background: rgba(15, 23, 42, 0.95);
          border-radius: 20px;
          border: 1px solid rgba(99, 102, 241, 0.18);
          min-width: min(720px, 100%);
          max-width: 820px;
          box-shadow: 0 40px 80px rgba(2, 6, 23, 0.55);
          display: flex;
          flex-direction: column;
          backdrop-filter: blur(18px);
        }

        .modal-header {
          padding: 1.5rem 1.6rem;
          border-bottom: 1px solid rgba(99, 102, 241, 0.15);
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #f8fafc;
        }

        .modal-body {
          padding: 1.4rem 1.6rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }

        label {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          font-size: 0.9rem;
          color: #cbd5f5;
        }

        input,
        textarea {
          background: rgba(15, 23, 42, 0.75);
          border: 1px solid rgba(148, 163, 184, 0.25);
          border-radius: 12px;
          padding: 0.75rem 0.85rem;
          color: #f8fafc;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        input:focus,
        textarea:focus {
          border-color: rgba(99, 102, 241, 0.6);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25);
        }

        textarea {
          resize: vertical;
        }

        .full-width {
          grid-column: span 2;
        }

        .modal-footer {
          padding: 1.3rem 1.6rem;
          border-top: 1px solid rgba(99, 102, 241, 0.15);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .toggle-stack {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .status-toggle {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.4rem;
        }

        .status-toggle .toggle-label {
          font-size: 0.85rem;
          color: rgba(148, 163, 184, 0.8);
          margin-right: 0.5rem;
        }

        .status-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          background: rgba(15, 23, 42, 0.75);
          padding: 0.45rem 0.95rem;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease;
          color: #cbd5f5;
        }

        .status-button.active {
          background: rgba(34, 197, 94, 0.2);
          border-color: rgba(34, 197, 94, 0.45);
          color: #bbf7d0;
        }

        .status-button.inactive {
          background: rgba(239, 68, 68, 0.18);
          border-color: rgba(239, 68, 68, 0.45);
          color: #fecaca;
        }

        .toggle-label {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(148, 163, 184, 0.75);
        }

        .billing-toggle {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .billing-options {
          display: inline-flex;
          gap: 0.45rem;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(99, 102, 241, 0.18);
          border-radius: 999px;
          padding: 0.3rem;
        }

        .billing-button {
          border: none;
          background: transparent;
          color: rgba(148, 163, 184, 0.85);
          font-size: 0.82rem;
          font-weight: 600;
          padding: 0.35rem 0.9rem;
          border-radius: 999px;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .billing-button.selected {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.85), rgba(14, 165, 233, 0.85));
          color: #f8fafc;
          box-shadow: 0 10px 22px rgba(59, 130, 246, 0.35);
        }

        .modal-actions {
          display: flex;
          gap: 0.75rem;
        }

        .primary,
        .secondary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          padding: 0.75rem 1.2rem;
          font-weight: 600;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .primary {
          background: linear-gradient(135deg, #6366f1, #ec4899);
          color: #fff;
          box-shadow: 0 16px 30px rgba(99, 102, 241, 0.35);
        }

        .primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }

        .secondary {
          background: rgba(148, 163, 184, 0.12);
          color: #e2e8f0;
        }

        .primary:hover:not(:disabled),
        .secondary:hover {
          transform: translateY(-2px);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 1024px) {
          .info-row {
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          }
        }

        @media (max-width: 900px) {
          .modal {
            min-width: 100%;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .full-width {
            grid-column: span 1;
          }
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .header-actions {
            width: 100%;
            justify-content: space-between;
          }

          .page-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .status-filters {
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}

