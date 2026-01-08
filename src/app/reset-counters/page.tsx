'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';
import ConfirmationModal from '@/components/ConfirmationModal';

export default function TestCountersPage() {
  const { showSuccess, showError, toasts, removeToast } = useToast();
  const [counters, setCounters] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [testBookings, setTestBookings] = useState<any[]>([]);
  
  // For confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const initializeCounters = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/init-counters', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCounters(data.counters);
        setMessage('✅ Counters initialized successfully!');
      } else {
        setMessage('❌ Failed to initialize counters: ' + data.error);
      }
    } catch (error) {
      setMessage('❌ Error: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const getCounters = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/init-counters');
      const data = await response.json();
      
      if (data.success) {
        setCounters(data.counters);
        setMessage('✅ Counters retrieved successfully!');
      } else {
        setMessage('❌ Failed to get counters: ' + data.error);
      }
    } catch (error) {
      setMessage('❌ Error: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const testIncrement = async (counterType: string) => {
    setLoading(true);
    setMessage('');
    
    try {
      // Create a test booking to increment counter
      const response = await fetch('/api/admin/test-increment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ counterType })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage(`✅ ${counterType} counter incremented!`);
        // Refresh counters
        await getCounters();
      } else {
        setMessage('❌ Failed to increment counter: ' + data.error);
      }
    } catch (error) {
      setMessage('❌ Error: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const addTestData = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/add-test-data', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCounters(data.counters);
        setMessage('✅ Test booking data added successfully!');
      } else {
        setMessage('❌ Failed to add test data: ' + data.error);
      }
    } catch (error) {
      setMessage('❌ Error: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const testBookingFlow = async (action: string, bookingId?: string) => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/test-booking-flow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, bookingId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCounters(data.counters);
        if (data.result?.booking?.id) {
          setTestBookings(prev => [...prev, { 
            id: data.result.booking.id, 
            type: action,
            name: data.result.booking.name || 'Test Booking'
          }]);
        }
        setMessage(`✅ ${action.replace('_', ' ')} completed successfully!`);
      } else {
        setMessage('❌ Failed: ' + data.error);
      }
    } catch (error) {
      setMessage('❌ Error: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const testCounterLogic = async (action: string) => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/test-counter-logic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCounters(data.counters);
        setMessage(`✅ ${data.message}`);
      } else {
        setMessage('❌ Failed: ' + data.error);
      }
    } catch (error) {
      setMessage('❌ Error: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const resetAllToZero = async () => {
    setShowConfirmModal(true);
  };

  const confirmResetAllToZero = async () => {
    
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/reset-all-to-zero', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCounters(data.counters);
        showSuccess('ALL counters reset to 0! Fresh start ready.');
      } else {
        showError('Failed: ' + data.error);
      }
    } catch (error) {
      showError('Error: ' + error);
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };

  const testExpiredWithDelay = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/test-expired-with-delay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage(`✅ ${data.message}\n\n📊 Check dashboard now - completed counter should increase!\n⏰ Bookings will be deleted in 1 minute.`);
        
        // Refresh counters to show the change
        setTimeout(() => {
          getCounters();
        }, 1000);
      } else {
        setMessage('❌ Failed: ' + data.error);
      }
    } catch (error) {
      setMessage('❌ Error: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const createTestExpiredBooking = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/create-test-expired-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage(`✅ Test expired booking created!\n\n📋 Booking Details:\n- Name: ${data.booking.name}\n- Date: ${data.booking.date}\n- Time: ${data.booking.time}\n- Status: ${data.booking.status}\n\n🎯 Next Steps:\n1. Go to Admin Dashboard\n2. See the booking in Recent Bookings\n3. Click "Test Expired (1min delay)" to trigger auto-completion`);
        
        // Refresh counters to show the new booking
        setTimeout(() => {
          getCounters();
        }, 1000);
      } else {
        setMessage('❌ Failed: ' + data.error);
      }
    } catch (error) {
      setMessage('❌ Error: ' + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f8f9fa',
      margin: 0
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ 
            color: '#333',
            margin: 0
          }}>🧪 Counter System Test Page</h1>
          
          <a 
            href="/Administrator" 
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '5px',
              fontSize: '14px'
            }}
          >
            📊 Go to Admin Dashboard
          </a>
        </div>
      
        <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={initializeCounters} 
          disabled={loading}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          Initialize Counters
        </button>
        
        <button 
          onClick={resetAllToZero} 
          disabled={loading}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          🔥 Reset ALL to 0 (Fresh Start)
        </button>
        
        <button 
          onClick={createTestExpiredBooking} 
          disabled={loading}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: '#6f42c1',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          🕐 Create Test Expired Booking (1min delay)
        </button>
      </div>

      {message && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '20px',
          backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
          border: `1px solid ${message.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '5px',
          color: message.includes('✅') ? '#155724' : '#721c24'
        }}>
          {message}
        </div>
      )}

      {counters && (
        <div>
          <h2>📊 Current Counter Values</h2>
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '5px',
            border: '1px solid #dee2e6'
          }}>
            <pre style={{ margin: 0 }}>
              {JSON.stringify(counters, null, 2)}
            </pre>
          </div>
                    <div style={{ marginTop: '20px' }}>
            <h3>🧪 Test Booking Flow (Real System)</h3>
            <div style={{ marginBottom: '15px' }}>
              <button 
                onClick={() => testBookingFlow('create_manual_booking')} 
                disabled={loading}
                style={{ 
                  padding: '8px 16px', 
                  margin: '5px',
                  backgroundColor: '#ffc107',
                  color: 'black',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                📝 Create Manual Booking
              </button>
              
              <button 
                onClick={() => testBookingFlow('create_online_booking')} 
                disabled={loading}
                style={{ 
                  padding: '8px 16px', 
                  margin: '5px',
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                🌐 Create Online Booking
              </button>
            </div>
            
            {testBookings.length > 0 && (
              <div style={{ marginBottom: '15px' }}>
                <h4>📋 Test Bookings Created:</h4>
                {testBookings.map((booking, index) => (
                  <div key={index} style={{ 
                    padding: '8px', 
                    margin: '5px 0',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    borderRadius: '3px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>{booking.name} (ID: {booking.id})</span>
                    <div>
                      <button 
                        onClick={() => testBookingFlow('complete_booking', booking.id)} 
                        disabled={loading}
                        style={{ 
                          padding: '4px 8px', 
                          margin: '0 2px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          fontSize: '12px',
                          cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                      >
                        ✅ Complete
                      </button>
                      
                      <button 
                        onClick={() => testBookingFlow('cancel_booking', booking.id)} 
                        disabled={loading}
                        style={{ 
                          padding: '4px 8px', 
                          margin: '0 2px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          fontSize: '12px',
                          cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                      >
                        ❌ Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ marginTop: '15px' }}>
              <h4>🔧 Direct Counter Tests</h4>
              <button 
                onClick={() => testIncrement('confirmed')} 
                disabled={loading}
                style={{ 
                  padding: '6px 12px', 
                  margin: '3px',
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  fontSize: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                +1 Confirmed
              </button>
              
              <button 
                onClick={() => testIncrement('manual')} 
                disabled={loading}
                style={{ 
                  padding: '6px 12px', 
                  margin: '3px',
                  backgroundColor: '#ffc107',
                  color: 'black',
                  border: 'none',
                  borderRadius: '3px',
                  fontSize: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                +1 Manual
              </button>
              
              <button 
                onClick={() => testIncrement('completed')} 
                disabled={loading}
                style={{ 
                  padding: '6px 12px', 
                  margin: '3px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  fontSize: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                +1 Completed
              </button>
              
              <button 
                onClick={() => testIncrement('cancelled')} 
                disabled={loading}
                style={{ 
                  padding: '6px 12px', 
                  margin: '3px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  fontSize: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                +1 Cancelled
              </button>
            </div>
          </div>
        </div>
      )}
      
        <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
          <h3>📝 How the Counter System Works:</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <h4>⏰ Reset Schedule:</h4>
              <ul>
                <li><strong>Today:</strong> Resets daily at midnight IST (आज के counters)</li>
                <li><strong>Weekly:</strong> Resets every Sunday at midnight IST (हफ्ते के counters)</li>
                <li><strong>Monthly:</strong> Resets on 1st of every month (महीने के counters)</li>
                <li><strong>Yearly:</strong> Resets on January 1st (साल के counters)</li>
                <li><strong>Total:</strong> Never resets - lifetime total (कुल counters)</li>
              </ul>
            </div>
            <div>
              <h4>📊 Counter Logic Example:</h4>
              <ul>
                <li><strong>Day 1:</strong> 3 bookings → Today:3, Week:3, Month:3, Total:3</li>
                <li><strong>Day 2:</strong> 2 bookings → Today:2, Week:5, Month:5, Total:5</li>
                <li><strong>Week Reset:</strong> → Today:current, Week:0, Month:current, Total:current</li>
                <li><strong>Month Reset:</strong> → Today:current, Week:current, Month:0, Total:current</li>
              </ul>
            </div>
          </div>
          
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#d1ecf1', borderRadius: '5px' }}>
            <h4>🧪 Test Counter Logic:</h4>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => testCounterLogic('add_booking')} 
                disabled={loading}
                style={{ 
                  padding: '6px 12px', 
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  fontSize: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                Add Booking
              </button>
              
              <button 
                onClick={() => testCounterLogic('reset_daily')} 
                disabled={loading}
                style={{ 
                  padding: '6px 12px', 
                  backgroundColor: '#ffc107',
                  color: 'black',
                  border: 'none',
                  borderRadius: '3px',
                  fontSize: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                Test Daily Reset
              </button>
              
              <button 
                onClick={() => testCounterLogic('reset_weekly')} 
                disabled={loading}
                style={{ 
                  padding: '6px 12px', 
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  fontSize: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                Test Weekly Reset
              </button>
              
              <button 
                onClick={() => testCounterLogic('reset_monthly')} 
                disabled={loading}
                style={{ 
                  padding: '6px 12px', 
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  fontSize: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                Test Monthly Reset
              </button>
              
              <button 
                onClick={testExpiredWithDelay} 
                disabled={loading}
                style={{ 
                  padding: '6px 12px', 
                  backgroundColor: '#6f42c1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  fontSize: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                Test Expired (1min delay)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        title="Reset All Counters"
        message="⚠️ Are you sure you want to reset ALL counters to 0? This will give you a fresh start for testing."
        confirmText="Yes, Reset All"
        cancelText="No, Cancel"
        onConfirm={confirmResetAllToZero}
        onCancel={() => setShowConfirmModal(false)}
        type="danger"
      />
    </div>
  );
}
