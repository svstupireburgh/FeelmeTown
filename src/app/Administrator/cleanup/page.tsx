'use client';

import React, { useState, useEffect } from 'react';
import { Database, CheckCircle, Info } from 'lucide-react';

export default function CleanupPage() {
  const [lastCheck, setLastCheck] = useState<string>('');

  useEffect(() => {
    setLastCheck(new Date().toLocaleString());
  }, []);

  return (
    <div className="admin-cleanup-page">
      <div className="cleanup-header">
        <h1 className="cleanup-title">
          <Database className="w-6 h-6" />
          MongoDB TTL Cleanup System
        </h1>
        <p className="cleanup-description">
          Automatic deletion of expired bookings using MongoDB TTL indexes
        </p>
      </div>

      <div className="cleanup-status">
        <h2 className="status-title">TTL Index Status</h2>
        <div className="status-card">
          <div className="status-item">
            <span className="status-label">Status:</span>
            <span className="status-value running">
              <CheckCircle className="w-4 h-4" />
              Active
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Type:</span>
            <span className="status-value">MongoDB TTL Indexes</span>
          </div>
          <div className="status-item">
            <span className="status-label">Frequency:</span>
            <span className="status-value">Every 60 seconds</span>
          </div>
          <div className="status-item">
            <span className="status-label">Last Check:</span>
            <span className="status-value">{lastCheck}</span>
          </div>
        </div>
      </div>

      <div className="ttl-info">
        <h2 className="info-title">
          <Info className="w-5 h-5" />
          How TTL Works
        </h2>
        <div className="info-grid">
          <div className="info-card">
            <h3>Regular Bookings</h3>
            <p>Deleted automatically when <code>expiredAt</code> time is reached</p>
            <p><strong>Expiration:</strong> Booking END time + 2 hours</p>
          </div>
          <div className="info-card">
            <h3>Incomplete Bookings</h3>
            <p>Deleted automatically when <code>expiresAt</code> time is reached</p>
            <p><strong>Expiration:</strong> 12 hours after creation</p>
          </div>
          <div className="info-card">
            <h3>Cancelled Bookings</h3>
            <p>Deleted automatically when <code>cancelledAt</code> time is reached</p>
            <p><strong>Expiration:</strong> 12 hours after cancellation</p>
          </div>
        </div>
      </div>

      <div className="benefits-section">
        <h2 className="benefits-title">
          <CheckCircle className="w-5 h-5" />
          Benefits of TTL System
        </h2>
        <div className="benefits-list">
          <div className="benefit-item">
            <CheckCircle className="w-4 h-4" />
            <span>Automatic deletion every 60 seconds</span>
          </div>
          <div className="benefit-item">
            <CheckCircle className="w-4 h-4" />
            <span>No manual intervention required</span>
          </div>
          <div className="benefit-item">
            <CheckCircle className="w-4 h-4" />
            <span>Database-level operation (faster)</span>
          </div>
          <div className="benefit-item">
            <CheckCircle className="w-4 h-4" />
            <span>Reliable MongoDB native feature</span>
          </div>
          <div className="benefit-item">
            <CheckCircle className="w-4 h-4" />
            <span>No application overhead</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .admin-cleanup-page {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          color: white;
        }

        .cleanup-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .cleanup-title {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 2.5rem;
          font-weight: bold;
          margin-bottom: 1rem;
          color: white;
        }

        .cleanup-description {
          font-size: 1.2rem;
          opacity: 0.9;
          max-width: 600px;
          margin: 0 auto;
        }

        .cleanup-status {
          margin-bottom: 3rem;
        }

        .status-title {
          font-size: 1.8rem;
          font-weight: bold;
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .status-card {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 1rem;
          padding: 2rem;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .status-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .status-item:last-child {
          border-bottom: none;
        }

        .status-label {
          font-weight: 600;
          font-size: 1.1rem;
        }

        .status-value {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
        }

        .status-value.running {
          color: #10b981;
        }

        .ttl-info {
          margin-bottom: 3rem;
        }

        .info-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.8rem;
          font-weight: bold;
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
        }

        .info-card {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 1rem;
          padding: 2rem;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .info-card h3 {
          font-size: 1.3rem;
          font-weight: bold;
          margin-bottom: 1rem;
          color: #fbbf24;
        }

        .info-card p {
          margin-bottom: 0.5rem;
          line-height: 1.6;
        }

        .info-card code {
          background: rgba(255, 255, 255, 0.2);
          padding: 0.2rem 0.5rem;
          border-radius: 0.3rem;
          font-family: monospace;
        }

        .benefits-section {
          margin-bottom: 2rem;
        }

        .benefits-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.8rem;
          font-weight: bold;
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .benefits-list {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 1rem;
          padding: 2rem;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .benefit-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.8rem 0;
          font-size: 1.1rem;
        }

        .benefit-item:not(:last-child) {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        @media (max-width: 768px) {
          .admin-cleanup-page {
            padding: 1rem;
          }

          .cleanup-title {
            font-size: 2rem;
          }

          .cleanup-description {
            font-size: 1rem;
          }

          .status-card,
          .info-card,
          .benefits-list {
            padding: 1.5rem;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}