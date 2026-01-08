'use client';

import { useState } from 'react';

export default function TestBlobPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testBlobConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-blob-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check-config' })
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
    setLoading(false);
  };

  const testRead = async (fileName: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-blob-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read', fileName })
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
    setLoading(false);
  };

  const testWrite = async (fileName: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-blob-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'write', 
          fileName,
          testData: {
            testId: Date.now(),
            message: `Test record for ${fileName}`,
            createdAt: new Date().toISOString()
          }
        })
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
    setLoading(false);
  };

  const testPricingRead = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/pricing');
      const data = await response.json();
      setResult({ action: 'pricing-read', ...data });
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
    setLoading(false);
  };

  const testPricingUpdate = async () => {
    setLoading(true);
    try {
      const testPricing = {
        slotBookingFee: 100,
        extraGuestFee: 50,
        convenienceFee: 25,
        decorationFees: 200
      };
      
      const response = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPricing)
      });
      const data = await response.json();
      setResult({ action: 'pricing-update', testData: testPricing, ...data });
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
    setLoading(false);
  };

  const testCancelBookingSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-cancel-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-cancel-save' })
      });
      const data = await response.json();
      setResult({ action: 'test-cancel-save', ...data });
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
    setLoading(false);
  };

  const testReadCancelledBookings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-cancel-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read-cancelled' })
      });
      const data = await response.json();
      setResult({ action: 'read-cancelled', ...data });
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
    setLoading(false);
  };

  const testCleanupDuplicates = async (fileName: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-blob-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'cleanup', 
          fileName 
        })
      });
      const data = await response.json();
      setResult({ action: 'cleanup-duplicates', fileName, ...data });
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
    setLoading(false);
  };

  const testCancelReasonsRead = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/cancel-reasons');
      const data = await response.json();
      setResult({ action: 'cancel-reasons-read', ...data });
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
    setLoading(false);
  };

  const testCancelReasonsAdd = async () => {
    setLoading(true);
    try {
      const testReason = {
        reason: `Test Cancel Reason ${Date.now()}`,
        category: 'Test Category',
        isActive: true
      };
      
      const response = await fetch('/api/admin/cancel-reasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testReason)
      });
      const data = await response.json();
      setResult({ action: 'cancel-reasons-add', testData: testReason, ...data });
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h1>🧪 Blob Storage Test</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2>Configuration Test</h2>
        <button onClick={testBlobConfig} disabled={loading}>
          Check Blob Config
        </button>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>Read Tests</h2>
        <button onClick={() => testRead('completed-bookings.json')} disabled={loading}>
          Read completed-bookings.json
        </button>
        <button onClick={() => testRead('cancelled-bookings.json')} disabled={loading} style={{ marginLeft: '1rem' }}>
          Read cancelled-bookings.json
        </button>
        <button onClick={() => testRead('cancel-reasons.json')} disabled={loading} style={{ marginLeft: '1rem' }}>
          Read cancel-reasons.json
        </button>
        <button onClick={() => testRead('pricing.json')} disabled={loading} style={{ marginLeft: '1rem' }}>
          Read pricing.json
        </button>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>Write Tests</h2>
        <button onClick={() => testWrite('completed-bookings.json')} disabled={loading}>
          Test Write completed-bookings.json
        </button>
        <button onClick={() => testWrite('cancelled-bookings.json')} disabled={loading} style={{ marginLeft: '1rem' }}>
          Test Write cancelled-bookings.json
        </button>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>Pricing Tests</h2>
        <button onClick={testPricingRead} disabled={loading}>
          Read Pricing
        </button>
        <button onClick={testPricingUpdate} disabled={loading} style={{ marginLeft: '1rem' }}>
          Update Pricing (Test)
        </button>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>Cancel Reasons Tests</h2>
        <button onClick={testCancelReasonsRead} disabled={loading}>
          Read Cancel Reasons
        </button>
        <button onClick={testCancelReasonsAdd} disabled={loading} style={{ marginLeft: '1rem' }}>
          Add Cancel Reason (Test)
        </button>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>Booking Tests</h2>
        <button onClick={testCancelBookingSave} disabled={loading}>
          Test Cancel Booking Save
        </button>
        <button onClick={testReadCancelledBookings} disabled={loading} style={{ marginLeft: '1rem' }}>
          Read Cancelled Bookings
        </button>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>Cleanup Tests</h2>
        <button onClick={() => testCleanupDuplicates('cancelled-bookings.json')} disabled={loading}>
          Cleanup Cancelled Bookings
        </button>
        <button onClick={() => testCleanupDuplicates('completed-bookings.json')} disabled={loading} style={{ marginLeft: '1rem' }}>
          Cleanup Completed Bookings
        </button>
        <button onClick={() => testCleanupDuplicates('pricing.json')} disabled={loading} style={{ marginLeft: '1rem' }}>
          Cleanup Pricing
        </button>
      </div>

      {loading && <p>⏳ Loading...</p>}

      {result && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Result:</h2>
          <pre style={{ 
            background: '#f5f5f5', 
            padding: '1rem', 
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '400px'
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
