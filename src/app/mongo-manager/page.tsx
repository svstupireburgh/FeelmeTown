'use client';

import { useState, useEffect } from 'react';

export default function MongoManagerPage() {
  const [activeTab, setActiveTab] = useState('pricing');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  
  // Pricing state
  const [pricing, setPricing] = useState<any>(null);
  
  // Cancel reasons state
  const [cancelReasons, setCancelReasons] = useState<string[]>([]);
  const [newReason, setNewReason] = useState('');
  
  // Bookings state
  const [bookings, setBookings] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load initial data
  useEffect(() => {
    if (activeTab === 'pricing') {
      loadPricing();
    } else if (activeTab === 'cancel-reasons') {
      loadCancelReasons();
    } else if (activeTab === 'bookings') {
      loadBookings();
    }
  }, [activeTab]);

  const loadPricing = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/mongo-pricing');
      const data = await response.json();
      if (data.success) {
        setPricing(data.pricing);
        setResults({ success: true, message: 'Pricing loaded from MongoDB' });
      } else {
        setResults({ success: false, error: data.error });
      }
    } catch (error) {
      setResults({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const savePricing = async () => {
    if (!pricing) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/mongo-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pricing)
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const loadCancelReasons = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/mongo-cancel-reasons');
      const data = await response.json();
      if (data.success) {
        const reasons = Array.isArray(data.reasons) ? data.reasons : data.reasons.reasons || [];
        setCancelReasons(reasons);
        setResults({ success: true, message: 'Cancel reasons loaded from MongoDB' });
      } else {
        setResults({ success: false, error: data.error });
      }
    } catch (error) {
      setResults({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const addCancelReason = async () => {
    if (!newReason.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/mongo-cancel-reasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', newReason: newReason.trim() })
      });
      const data = await response.json();
      setResults(data);
      if (data.success) {
        setNewReason('');
        loadCancelReasons();
      }
    } catch (error) {
      setResults({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const removeCancelReason = async (reason: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/mongo-cancel-reasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', removeReason: reason })
      });
      const data = await response.json();
      setResults(data);
      if (data.success) {
        loadCancelReasons();
      }
    } catch (error) {
      setResults({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/mongo-bookings?type=all&limit=50');
      const data = await response.json();
      if (data.success) {
        setBookings(data.data);
        setResults({ success: true, message: 'Bookings loaded from MongoDB' });
      } else {
        setResults({ success: false, error: data.error });
      }
    } catch (error) {
      setResults({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const searchBookings = async () => {
    if (!searchQuery.trim()) {
      loadBookings();
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/mongo-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', query: searchQuery.trim() })
      });
      const data = await response.json();
      if (data.success) {
        setBookings(data.results);
        setResults({ success: true, message: `Search completed for: ${searchQuery}` });
      } else {
        setResults({ success: false, error: data.error });
      }
    } catch (error) {
      setResults({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: '#333', borderBottom: '2px solid #28a745', paddingBottom: '10px' }}>
        🗄️ MongoDB Data Manager (No Blob Storage)
      </h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#d4edda', borderRadius: '5px', border: '1px solid #c3e6cb' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#155724' }}>✅ Blob Storage Removed</h3>
        <p style={{ margin: '5px 0', color: '#155724' }}>
          All data is now stored and fetched directly from MongoDB collections. No more JSON files in blob storage!
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', borderBottom: '1px solid #dee2e6' }}>
        {[
          { id: 'pricing', label: '💰 Pricing Data', color: '#007bff' },
          { id: 'cancel-reasons', label: '📋 Cancel Reasons', color: '#dc3545' },
          { id: 'bookings', label: '📊 Bookings Data', color: '#28a745' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === tab.id ? tab.color : 'transparent',
              color: activeTab === tab.id ? 'white' : tab.color,
              border: `2px solid ${tab.color}`,
              borderBottom: 'none',
              borderRadius: '5px 5px 0 0',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pricing Tab */}
      {activeTab === 'pricing' && (
        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '5px', border: '1px solid #dee2e6' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#007bff' }}>💰 Pricing Data Management</h3>
          
          <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
            <button 
              onClick={loadPricing}
              disabled={loading}
              style={{ 
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? '⏳ Loading...' : '📊 Load Pricing'}
            </button>
            
            <button 
              onClick={savePricing}
              disabled={loading || !pricing}
              style={{ 
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: (loading || !pricing) ? 'not-allowed' : 'pointer',
                opacity: (loading || !pricing) ? 0.6 : 1
              }}
            >
              {loading ? '⏳ Saving...' : '💾 Save Pricing'}
            </button>
          </div>

          {pricing && (
            <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '5px', border: '1px solid #dee2e6' }}>
              <h4>Current Pricing Data:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                <div>
                  <label>Theater Base Price:</label>
                  <input
                    type="number"
                    value={pricing.theaterBasePrice || 0}
                    onChange={(e) => setPricing({...pricing, theaterBasePrice: parseInt(e.target.value)})}
                    style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                  />
                </div>
                <div>
                  <label>Extra Guest Fee:</label>
                  <input
                    type="number"
                    value={pricing.extraGuestFee || 0}
                    onChange={(e) => setPricing({...pricing, extraGuestFee: parseInt(e.target.value)})}
                    style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                  />
                </div>
                <div>
                  <label>Slot Booking Fee:</label>
                  <input
                    type="number"
                    value={pricing.slotBookingFee || 0}
                    onChange={(e) => setPricing({...pricing, slotBookingFee: parseInt(e.target.value)})}
                    style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                  />
                </div>
              </div>
              <p style={{ fontSize: '12px', color: '#6c757d', marginTop: '10px' }}>
                Last Updated: {pricing.lastUpdated || 'Never'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Cancel Reasons Tab */}
      {activeTab === 'cancel-reasons' && (
        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '5px', border: '1px solid #dee2e6' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#dc3545' }}>📋 Cancel Reasons Management</h3>
          
          <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="Enter new cancel reason..."
              style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
            />
            <button 
              onClick={addCancelReason}
              disabled={loading || !newReason.trim()}
              style={{ 
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: (loading || !newReason.trim()) ? 'not-allowed' : 'pointer',
                opacity: (loading || !newReason.trim()) ? 0.6 : 1
              }}
            >
              {loading ? '⏳ Adding...' : '➕ Add Reason'}
            </button>
          </div>

          <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '5px', border: '1px solid #dee2e6' }}>
            <h4>Current Cancel Reasons ({cancelReasons.length}):</h4>
            <div style={{ display: 'grid', gap: '10px', marginTop: '10px' }}>
              {cancelReasons.map((reason, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '10px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '5px',
                  border: '1px solid #dee2e6'
                }}>
                  <span>{reason}</span>
                  <button
                    onClick={() => removeCancelReason(reason)}
                    disabled={loading}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    ❌ Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '5px', border: '1px solid #dee2e6' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#28a745' }}>📊 Bookings Data</h3>
          
          <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by booking ID, email, name, or phone..."
              style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
            />
            <button 
              onClick={searchBookings}
              disabled={loading}
              style={{ 
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? '⏳ Searching...' : '🔍 Search'}
            </button>
            <button 
              onClick={loadBookings}
              disabled={loading}
              style={{ 
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? '⏳ Loading...' : '📊 Load All'}
            </button>
          </div>

          {bookings && (
            <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '5px', border: '1px solid #dee2e6' }}>
              {bookings.cancelled && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: '#dc3545' }}>❌ Cancelled Bookings ({bookings.cancelled.total || bookings.cancelled.length || 0})</h4>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {(bookings.cancelled.bookings || bookings.cancelled || []).slice(0, 10).map((booking: any, index: number) => (
                      <div key={index} style={{ 
                        padding: '10px', 
                        marginBottom: '5px',
                        backgroundColor: '#f8d7da',
                        borderRadius: '3px',
                        fontSize: '14px'
                      }}>
                        <strong>{booking.bookingId}</strong> - {booking.name} ({booking.email})
                        <br />
                        <small>Theater: {booking.theaterName} | Date: {booking.date} | Amount: ₹{booking.totalAmount}</small>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bookings.completed && (
                <div>
                  <h4 style={{ color: '#28a745' }}>✅ Completed Bookings ({bookings.completed.total || bookings.completed.length || 0})</h4>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {(bookings.completed.bookings || bookings.completed || []).slice(0, 10).map((booking: any, index: number) => (
                      <div key={index} style={{ 
                        padding: '10px', 
                        marginBottom: '5px',
                        backgroundColor: '#d4edda',
                        borderRadius: '3px',
                        fontSize: '14px'
                      }}>
                        <strong>{booking.bookingId}</strong> - {booking.name} ({booking.email})
                        <br />
                        <small>Theater: {booking.theaterName} | Date: {booking.date} | Amount: ₹{booking.totalAmount}</small>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Results Display */}
      {results && (
        <div style={{ 
          marginTop: '20px',
          backgroundColor: results.success ? '#d4edda' : '#f8d7da', 
          padding: '15px', 
          borderRadius: '5px',
          border: `1px solid ${results.success ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          <h4 style={{ 
            margin: '0 0 10px 0', 
            color: results.success ? '#155724' : '#721c24' 
          }}>
            {results.success ? '✅ Success' : '❌ Error'}
          </h4>
          <p style={{ margin: '0', color: results.success ? '#155724' : '#721c24' }}>
            {results.message || results.error}
          </p>
        </div>
      )}
    </div>
  );
}
