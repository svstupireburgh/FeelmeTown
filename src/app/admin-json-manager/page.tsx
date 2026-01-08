'use client';

import { useState, useEffect } from 'react';

export default function AdminJsonManagerPage() {
  const [activeTab, setActiveTab] = useState('pricing');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Pricing State
  const [pricing, setPricing] = useState({
    slotBookingFee: 0,
    extraGuestFee: 0,
    convenienceFee: 0,
    decorationFees: 0
  });

  // Cancel Reasons State
  const [cancelReasons, setCancelReasons] = useState<any[]>([]);
  const [newReason, setNewReason] = useState({
    reason: '',
    category: 'General',
    isActive: true
  });

  // Load data on component mount
  useEffect(() => {
    if (activeTab === 'pricing') {
      loadPricing();
    } else if (activeTab === 'cancel-reasons') {
      loadCancelReasons();
    }
  }, [activeTab]);

  const loadPricing = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/pricing');
      const data = await response.json();
      if (data.success) {
        setPricing(data.pricing);
        setResult({ message: 'Pricing loaded successfully', data: data.pricing });
      }
    } catch (error) {
      setResult({ error: 'Failed to load pricing' });
    }
    setLoading(false);
  };

  const updatePricing = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pricing)
      });
      const data = await response.json();
      setResult(data);
      if (data.success) {
        alert('Pricing updated successfully in JSON file!');
      }
    } catch (error) {
      setResult({ error: 'Failed to update pricing' });
    }
    setLoading(false);
  };

  const loadCancelReasons = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/cancel-reasons');
      const data = await response.json();
      if (data.success) {
        setCancelReasons(data.cancelReasons);
        setResult({ message: 'Cancel reasons loaded successfully', count: data.count });
      }
    } catch (error) {
      setResult({ error: 'Failed to load cancel reasons' });
    }
    setLoading(false);
  };

  const addCancelReason = async () => {
    if (!newReason.reason.trim()) {
      alert('Please enter a cancel reason');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/cancel-reasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReason)
      });
      const data = await response.json();
      setResult(data);
      if (data.success) {
        setNewReason({ reason: '', category: 'General', isActive: true });
        loadCancelReasons(); // Reload the list
        alert('Cancel reason added successfully to JSON file!');
      }
    } catch (error) {
      setResult({ error: 'Failed to add cancel reason' });
    }
    setLoading(false);
  };

  const deleteCancelReason = async (id: string) => {
    if (!confirm('Are you sure you want to delete this cancel reason?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/cancel-reasons?id=${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      setResult(data);
      if (data.success) {
        loadCancelReasons(); // Reload the list
        alert('Cancel reason deleted successfully from JSON file!');
      }
    } catch (error) {
      setResult({ error: 'Failed to delete cancel reason' });
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: '#333', marginBottom: '2rem' }}>🔧 Admin JSON Manager</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Manage pricing and cancel reasons that get saved to JSON files in Vercel Blob storage
      </p>

      {/* Tabs */}
      <div style={{ marginBottom: '2rem', borderBottom: '2px solid #eee' }}>
        <button
          onClick={() => setActiveTab('pricing')}
          style={{
            padding: '1rem 2rem',
            border: 'none',
            background: activeTab === 'pricing' ? '#007bff' : 'transparent',
            color: activeTab === 'pricing' ? 'white' : '#333',
            cursor: 'pointer',
            marginRight: '1rem'
          }}
        >
          💰 Pricing Management
        </button>
        <button
          onClick={() => setActiveTab('cancel-reasons')}
          style={{
            padding: '1rem 2rem',
            border: 'none',
            background: activeTab === 'cancel-reasons' ? '#007bff' : 'transparent',
            color: activeTab === 'cancel-reasons' ? 'white' : '#333',
            cursor: 'pointer'
          }}
        >
          🚫 Cancel Reasons
        </button>
      </div>

      {/* Pricing Tab */}
      {activeTab === 'pricing' && (
        <div>
          <h2>💰 Pricing Settings</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Slot Booking Fee (₹):
              </label>
              <input
                type="number"
                value={pricing.slotBookingFee}
                onChange={(e) => setPricing({ ...pricing, slotBookingFee: Number(e.target.value) })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Extra Guest Fee (₹):
              </label>
              <input
                type="number"
                value={pricing.extraGuestFee}
                onChange={(e) => setPricing({ ...pricing, extraGuestFee: Number(e.target.value) })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Convenience Fee (₹):
              </label>
              <input
                type="number"
                value={pricing.convenienceFee}
                onChange={(e) => setPricing({ ...pricing, convenienceFee: Number(e.target.value) })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Decoration Fees (₹):
              </label>
              <input
                type="number"
                value={pricing.decorationFees}
                onChange={(e) => setPricing({ ...pricing, decorationFees: Number(e.target.value) })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
          </div>
          <div style={{ marginBottom: '2rem' }}>
            <button
              onClick={updatePricing}
              disabled={loading}
              style={{
                padding: '1rem 2rem',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '1rem'
              }}
            >
              {loading ? 'Updating...' : 'Update Pricing JSON'}
            </button>
            <button
              onClick={loadPricing}
              disabled={loading}
              style={{
                padding: '1rem 2rem',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Reload Pricing
            </button>
          </div>
        </div>
      )}

      {/* Cancel Reasons Tab */}
      {activeTab === 'cancel-reasons' && (
        <div>
          <h2>🚫 Cancel Reasons Management</h2>
          
          {/* Add New Reason */}
          <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '4px', marginBottom: '2rem' }}>
            <h3>Add New Cancel Reason</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Cancel Reason:
                </label>
                <input
                  type="text"
                  value={newReason.reason}
                  onChange={(e) => setNewReason({ ...newReason, reason: e.target.value })}
                  placeholder="Enter cancel reason..."
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Category:
                </label>
                <select
                  value={newReason.category}
                  onChange={(e) => setNewReason({ ...newReason, category: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  <option value="General">General</option>
                  <option value="Customer">Customer</option>
                  <option value="Technical">Technical</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </div>
              <button
                onClick={addCancelReason}
                disabled={loading}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {loading ? 'Adding...' : 'Add to JSON'}
              </button>
            </div>
          </div>

          {/* Existing Reasons List */}
          <div>
            <h3>Existing Cancel Reasons ({cancelReasons.length})</h3>
            {cancelReasons.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic' }}>No cancel reasons found. Add some above!</p>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {cancelReasons.map((reason: any) => (
                  <div
                    key={reason.id}
                    style={{
                      background: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      padding: '1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <strong>{reason.reason}</strong>
                      <div style={{ color: '#666', fontSize: '0.9rem' }}>
                        Category: {reason.category} | 
                        Status: {reason.isActive ? '✅ Active' : '❌ Inactive'} |
                        Created: {new Date(reason.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteCancelReason(reason.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Last Operation Result:</h3>
          <pre style={{
            background: result.error ? '#f8d7da' : '#d4edda',
            color: result.error ? '#721c24' : '#155724',
            padding: '1rem',
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '300px'
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
