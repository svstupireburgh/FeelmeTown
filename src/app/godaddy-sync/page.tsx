'use client';

import { useState } from 'react';

export default function GoDaddySyncPage() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sync-to-godaddy', { method: 'GET' });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const createTables = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sync-to-godaddy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', createTables: true })
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const syncData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sync-to-godaddy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', createTables: true })
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const prismaFastSync = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/prisma-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' })
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const testPrisma = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/prisma-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' })
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: '#333', borderBottom: '2px solid #007bff', paddingBottom: '10px' }}>
        🗄️ GoDaddy SQL Database Sync
      </h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px', border: '1px solid #dee2e6' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>📋 Instructions</h3>
        <p style={{ margin: '5px 0', color: '#6c757d' }}>
          <strong>Step 1:</strong> Test database connection to your GoDaddy cPanel SQL database
        </p>
        <p style={{ margin: '5px 0', color: '#6c757d' }}>
          <strong>Step 2:</strong> Create required tables (cancelled_bookings, completed_bookings)
        </p>
        <p style={{ margin: '5px 0', color: '#6c757d' }}>
          <strong>Step 3:</strong> Sync JSON data from blob storage to SQL database
        </p>
        <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#dc3545' }}>
          <strong>Note:</strong> Make sure to configure your GoDaddy database credentials in environment variables
        </p>
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button 
          onClick={testConnection}
          disabled={loading}
          style={{ 
            padding: '12px 24px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? '⏳ Testing...' : '🔍 Test Connection'}
        </button>
        
        <button 
          onClick={createTables}
          disabled={loading}
          style={{ 
            padding: '12px 24px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? '⏳ Creating...' : '🔧 Create Tables'}
        </button>
        
        <button 
          onClick={syncData}
          disabled={loading}
          style={{ 
            padding: '12px 24px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? '⏳ Syncing...' : '📊 Sync JSON to SQL'}
        </button>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '5px', border: '1px solid #c3e6cb' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#155724' }}>⚡ Prisma Fast Sync (Recommended)</h3>
        <p style={{ margin: '5px 0', color: '#155724', fontSize: '14px' }}>
          <strong>Ultra-fast sync using Prisma ORM with optimized queries, transactions, and connection pooling.</strong>
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '15px' }}>
          <button 
            onClick={testPrisma}
            disabled={loading}
            style={{ 
              padding: '12px 24px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '⏳ Testing...' : '⚡ Test Prisma'}
          </button>
          
          <button 
            onClick={prismaFastSync}
            disabled={loading}
            style={{ 
              padding: '12px 24px',
              backgroundColor: '#6f42c1',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '⏳ Syncing...' : '🚀 Fast Prisma Sync'}
          </button>
        </div>
      </div>

      {results && (
        <div style={{ 
          backgroundColor: results.success ? '#d4edda' : '#f8d7da', 
          padding: '20px', 
          borderRadius: '5px',
          border: `1px solid ${results.success ? '#c3e6cb' : '#f5c6cb'}`,
          marginBottom: '20px'
        }}>
          <h3 style={{ 
            margin: '0 0 15px 0', 
            color: results.success ? '#155724' : '#721c24' 
          }}>
            {results.success ? '✅ Success' : '❌ Error'}
          </h3>
          
          <p style={{ 
            margin: '0 0 15px 0', 
            fontWeight: 'bold',
            color: results.success ? '#155724' : '#721c24' 
          }}>
            {results.message}
          </p>

          {results.results && results.results.steps && (
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>📋 Process Steps:</h4>
              {results.results.steps.map((step: string, index: number) => (
                <div key={index} style={{ 
                  margin: '5px 0', 
                  padding: '5px 10px',
                  backgroundColor: 'rgba(255,255,255,0.7)',
                  borderRadius: '3px',
                  fontSize: '14px',
                  fontFamily: 'monospace'
                }}>
                  {step}
                </div>
              ))}
            </div>
          )}

          {results.results && results.results.finalStats && (
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>📊 Database Statistics:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                <div style={{ 
                  padding: '15px', 
                  backgroundColor: 'rgba(255,255,255,0.8)', 
                  borderRadius: '5px',
                  border: '1px solid #dee2e6'
                }}>
                  <h5 style={{ margin: '0 0 10px 0', color: '#dc3545' }}>❌ Cancelled Bookings</h5>
                  <div style={{ fontSize: '14px', fontFamily: 'monospace' }}>
                    <div>Today: {results.results.finalStats.cancelled.today}</div>
                    <div>This Week: {results.results.finalStats.cancelled.this_week}</div>
                    <div>This Month: {results.results.finalStats.cancelled.this_month}</div>
                    <div>This Year: {results.results.finalStats.cancelled.this_year}</div>
                    <div><strong>Total: {results.results.finalStats.cancelled.total}</strong></div>
                  </div>
                </div>
                
                <div style={{ 
                  padding: '15px', 
                  backgroundColor: 'rgba(255,255,255,0.8)', 
                  borderRadius: '5px',
                  border: '1px solid #dee2e6'
                }}>
                  <h5 style={{ margin: '0 0 10px 0', color: '#28a745' }}>✅ Completed Bookings</h5>
                  <div style={{ fontSize: '14px', fontFamily: 'monospace' }}>
                    <div>Today: {results.results.finalStats.completed.today}</div>
                    <div>This Week: {results.results.finalStats.completed.this_week}</div>
                    <div>This Month: {results.results.finalStats.completed.this_month}</div>
                    <div>This Year: {results.results.finalStats.completed.this_year}</div>
                    <div><strong>Total: {results.results.finalStats.completed.total}</strong></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <details style={{ marginTop: '15px' }}>
            <summary style={{ 
              cursor: 'pointer', 
              fontWeight: 'bold',
              color: '#495057',
              padding: '5px 0'
            }}>
              🔍 View Full Response
            </summary>
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              fontSize: '12px',
              maxHeight: '400px',
              overflow: 'auto',
              backgroundColor: 'rgba(255,255,255,0.9)',
              padding: '15px',
              borderRadius: '3px',
              marginTop: '10px'
            }}>
              {JSON.stringify(results, null, 2)}
            </pre>
          </details>
        </div>
      )}

      <div style={{ 
        marginTop: '30px', 
        padding: '15px', 
        backgroundColor: '#fff3cd', 
        borderRadius: '5px',
        border: '1px solid #ffeaa7'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>⚙️ Environment Variables Required</h4>
        <div style={{ fontSize: '14px', fontFamily: 'monospace', color: '#856404' }}>
          <div>GODADDY_DB_HOST=your-database-host</div>
          <div>GODADDY_DB_USER=your-database-username</div>
          <div>GODADDY_DB_PASSWORD=your-database-password</div>
          <div>GODADDY_DB_NAME=your-database-name</div>
          <div>GODADDY_DB_PORT=3306</div>
        </div>
      </div>
    </div>
  );
}
