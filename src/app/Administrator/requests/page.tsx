'use client';

import { useState, useEffect } from 'react';
import { Check, X, Clock, User, Eye, EyeOff, RefreshCw } from 'lucide-react';
import ToastContainer from '@/components/ToastContainer';
import { useToast } from '@/hooks/useToast';

interface PasswordChangeRequest {
  id: string;
  type: 'password_change';
  staffId: string;
  staffName: string;
  currentPassword: string;
  newPassword: string;
  status: 'pending' | 'approved' | 'denied';
  requestedAt: Date;
  requestedBy: string;
  adminApprovedBy: string | null;
  adminApprovedAt: Date | null;
  adminComments: string | null;
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<PasswordChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const { toasts, removeToast, showSuccess, showError } = useToast();

  useEffect(() => {
    fetchRequests(true); // Initial load with loading state
    
    // Set up silent real-time updates every 15 seconds for better responsiveness
    const interval = setInterval(async () => {
      await fetchRequests(false); // Silent real-time updates
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchRequests = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      }
      
      const response = await fetch('/api/admin/requests');
      const data = await response.json();
      
      if (data.success) {
        // Transform database format to component format
        const transformedRequests: PasswordChangeRequest[] = data.requests.map((req: any) => ({
          id: req._id,
          type: req.type,
          staffId: req.staffId,
          staffName: req.staffName,
          currentPassword: req.currentPassword,
          newPassword: req.newPassword,
          status: req.status,
          requestedAt: new Date(req.requestedAt),
          requestedBy: req.requestedBy,
          adminApprovedBy: req.adminApprovedBy,
          adminApprovedAt: req.adminApprovedAt ? new Date(req.adminApprovedAt) : null,
          adminComments: req.adminComments
        }));
        
        // Filter to show only pending requests
        const pendingRequests = transformedRequests.filter(req => req.status === 'pending');
        setRequests(pendingRequests);
      } else {
        
        setRequests([]);
      }
    } catch (error) {
      
      setRequests([]);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      const response = await fetch('/api/admin/requests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: requestId,
          action: 'approved',
          adminComments: null,
          adminName: 'Administrator'
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Remove the approved request from the list immediately
        setRequests(prev => prev.filter(req => req.id !== requestId));
        showSuccess('Request approved successfully! Password has been updated for the staff member.');
        
        // Refresh sidebar count
        if ((window as any).refreshSidebarRequestsCount) {
          (window as any).refreshSidebarRequestsCount();
        }
      } else {
        
        showError('Error approving request: ' + data.error);
      }
    } catch (error) {
      
      showError('Error approving request. Please try again.');
    }
  };

  const handleDenyRequest = async (requestId: string) => {
    try {
      const response = await fetch('/api/admin/requests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: requestId,
          action: 'denied',
          adminComments: null,
          adminName: 'Administrator'
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Remove the denied request from the list immediately
        setRequests(prev => prev.filter(req => req.id !== requestId));
        showSuccess('Request denied successfully!');
        
        // Refresh sidebar count
        if ((window as any).refreshSidebarRequestsCount) {
          (window as any).refreshSidebarRequestsCount();
        }
      } else {
        
        showError('Error denying request: ' + data.error);
      }
    } catch (error) {
      
      showError('Error denying request. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'approved': return 'text-green-600 bg-green-100';
      case 'denied': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={16} />;
      case 'approved': return <Check size={16} />;
      case 'denied': return <X size={16} />;
      default: return <Clock size={16} />;
    }
  };

  if (loading) {
    return (
      <div className="admin-requests-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-requests-page">
      <div className="page-header">
        <h1>Staff Requests</h1>
        <p>Manage staff password change requests and other requests</p>
      </div>



      <div className="requests-container">
        <div className="requests-list">
          <div className="section-header">
            <h2>Pending Password Change Requests</h2>
            <div className="header-actions">
              <button
                className="refresh-btn"
                onClick={() => {
                  fetchRequests(false);
                }}
              >
                <RefreshCw size={16} />
                Refresh
              </button>
              <span className="count-badge">{requests.length}</span>
            </div>
          </div>

          {requests.length === 0 ? (
            <div className="empty-state">
              <User size={48} className="empty-icon" />
              <h3>No pending requests</h3>
              <p>All password change requests have been processed. New requests will appear here when staff members submit them.</p>
            </div>
          ) : (
            <div className="requests-grid">
              {requests.map((request) => (
                <div key={request.id} className="request-card">
                  <div className="request-header">
                    <div className="staff-info">
                      <User size={20} />
                      <span className="staff-name">{request.staffName}</span>
                    </div>
                    <div className={`status-badge ${getStatusColor(request.status)}`}>
                      {getStatusIcon(request.status)}
                      <span>{request.status}</span>
                    </div>
                  </div>

                  <div className="request-details">
                    <div className="detail-item">
                      <label>Request Type:</label>
                      <span>Password Change</span>
                    </div>
                    <div className="detail-item">
                      <label>Requested At:</label>
                      <span>{request.requestedAt.toLocaleString()}</span>
                    </div>
                    <div className="detail-item">
                      <label>Current Password:</label>
                      <div className="password-display">
                        <span className="password-text">{showPassword ? request.currentPassword : '••••••••'}</span>
                        <button 
                          className="password-toggle-small"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div className="detail-item">
                      <label>New Password:</label>
                      <div className="password-display">
                        <span className="password-text">{showPassword ? request.newPassword : '••••••••'}</span>
                        <button 
                          className="password-toggle-small"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="request-actions">
                    {request.status === 'pending' && (
                      <div className="action-buttons-group">
                        <button 
                          className="action-btn approve-btn"
                          onClick={() => {
                            handleApproveRequest(request.id);
                          }}
                        >
                          <Check size={16} />
                          Approve
                        </button>
                        <button 
                          className="action-btn deny-btn"
                          onClick={() => {
                            handleDenyRequest(request.id);
                          }}
                        >
                          <X size={16} />
                          Deny
                        </button>
                      </div>
                    )}
                    {request.status !== 'pending' && (
                      <div className="completed-info">
                        {request.adminApprovedBy && (
                          <span>Processed by {request.adminApprovedBy}</span>
                        )}
                        {request.adminApprovedAt && (
                          <span>on {request.adminApprovedAt.toLocaleDateString()}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />

      <style jsx>{`
        .admin-requests-page {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          min-height: 100vh;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 400px;
          gap: 1.5rem;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid rgba(220, 38, 38, 0.1);
          border-top: 4px solid #dc2626;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .page-header {
          margin-bottom: 3rem;
          text-align: center;
          background: white;
          padding: 2.5rem;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(220, 38, 38, 0.1);
        }

        .page-header h1 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 2.5rem;
          font-weight: 700;
          background: linear-gradient(135deg, #dc2626, #ef4444);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 1rem 0;
          letter-spacing: -0.02em;
        }

        .page-header p {
          color: #64748b;
          font-size: 1.2rem;
          margin: 0;
          font-weight: 400;
        }

        .refresh-indicator {
          position: fixed;
          top: 20px;
          right: 20px;
          background: rgba(220, 38, 38, 0.9);
          color: white;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          backdrop-filter: blur(10px);
        }
        
        .refresh-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }


        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
          background: white;
          padding: 1.5rem 2rem;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
          border: 1px solid rgba(220, 38, 38, 0.08);
        }

        .section-header h2 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.75rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .section-header h2::before {
          content: '';
          width: 4px;
          height: 24px;
          background: linear-gradient(135deg, #dc2626, #ef4444);
          border-radius: 2px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
        }

        .refresh-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #b91c1c, #991b1b);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
        }

        .refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        .count-badge {
          background: linear-gradient(135deg, #dc2626, #ef4444);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 25px;
          font-size: 0.9rem;
          font-weight: 700;
          box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);
          border: 2px solid rgba(255, 255, 255, 0.2);
        }

        .empty-state {
          text-align: center;
          padding: 5rem 2rem;
          background: white;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(220, 38, 38, 0.1);
        }

        .empty-icon {
          color: #cbd5e1;
          margin-bottom: 1.5rem;
          opacity: 0.7;
        }

        .empty-state h3 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #475569;
          margin: 0 0 0.75rem 0;
        }

        .empty-state p {
          color: #64748b;
          font-size: 1.1rem;
        }

        .requests-grid {
          display: grid;
          gap: 2rem;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
        }

        .request-card {
          background: white;
          border: 1px solid rgba(220, 38, 38, 0.1);
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .request-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(135deg, #dc2626, #ef4444);
        }

        .request-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.12);
          border-color: rgba(220, 38, 38, 0.2);
        }

        .request-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .staff-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          padding: 0.75rem 1rem;
          border-radius: 12px;
          border: 1px solid rgba(220, 38, 38, 0.1);
        }

        .staff-info svg {
          color: #dc2626;
        }

        .staff-name {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-weight: 700;
          color: #1e293b;
          font-size: 1.1rem;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 25px;
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .request-details {
          margin-bottom: 1.5rem;
          background: #f8fafc;
          padding: 1.5rem;
          border-radius: 12px;
          border: 1px solid rgba(220, 38, 38, 0.05);
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.75rem;
          align-items: center;
        }

        .detail-item:last-child {
          margin-bottom: 0;
        }

        .detail-item label {
          font-weight: 600;
          color: #475569;
          font-size: 0.9rem;
        }

        .detail-item span {
          color: #1e293b;
          font-weight: 500;
        }

        .password-display {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .password-text {
          font-family: monospace;
          font-size: 0.85rem;
          background: #f1f5f9;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
          min-width: 100px;
        }

        .password-toggle-small {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .password-toggle-small:hover {
          background: rgba(220, 38, 38, 0.1);
          color: #dc2626;
        }

        .request-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .action-buttons-group {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .view-btn {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
        }

        .view-btn:hover {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
        }

        .approve-btn {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }

        .approve-btn:hover {
          background: linear-gradient(135deg, #059669, #047857);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }

        .deny-btn {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
        }

        .deny-btn:hover {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
        }

        .completed-info {
          font-size: 0.9rem;
          color: #64748b;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          background: #f1f5f9;
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid rgba(220, 38, 38, 0.05);
        }


        @media (max-width: 768px) {
          .admin-requests-page {
            padding: 1rem;
          }

          .requests-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }


          .request-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .action-buttons-group {
            flex-direction: column;
            width: 100%;
            gap: 0.5rem;
          }

          .action-buttons-group .action-btn {
            width: 100%;
            justify-content: center;
          }


          .page-header h1 {
            font-size: 2rem;
          }

          .section-header {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
        }

        @media (max-width: 480px) {
          .page-header {
            padding: 2rem 1.5rem;
          }

          .request-card {
            padding: 1.5rem;
          }

        }
      `}</style>
    </div>
  );
}

