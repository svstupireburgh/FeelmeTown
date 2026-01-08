'use client';

import { useState } from 'react';

export default function TestCountersPage() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testCounters = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug-counters');
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const testIncrement = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug-counters', { method: 'POST' });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🧪 Counter System Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testCounters}
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
          {loading ? 'Testing...' : 'Test Counter System'}
        </button>
        
        <button 
          onClick={testIncrement}
          disabled={loading}
          style={{ 
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Testing...' : 'Test Increment'}
        </button>
      </div>

      {results && (
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '5px',
          border: '1px solid #dee2e6'
        }}>
          <h3>Test Results:</h3>
          <pre style={{ 
            whiteSpace: 'pre-wrap', 
            fontSize: '12px',
            maxHeight: '600px',
            overflow: 'auto'
          }}>
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
