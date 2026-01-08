'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, AlertCircle, CheckCircle } from 'lucide-react';

interface AdminCancelReasonsProps {
  onClose?: () => void;
}

interface CancelReason {
  id: string;
  reason: string;
  category?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export default function AdminCancelReasons({ onClose }: AdminCancelReasonsProps) {
  const [reasons, setReasons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newReason, setNewReason] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ show: boolean; reason: any | null }>({ show: false, reason: null });
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper: normalize reason text (supports string or object)
  const getReasonText = (r: any): string => (typeof r === 'string' ? r : (r?.reason ?? ''));

  // Fetch cancel reasons on component mount
  useEffect(() => {
    fetchCancelReasons();
  }, []);

  const fetchCancelReasons = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/cancel-reasons', { cache: 'no-store' });
      const data = await response.json();
      
      if (data.success && Array.isArray(data.cancelReasons)) {
        setReasons(data.cancelReasons);
        console.log('✅ Cancel reasons loaded:', data.cancelReasons.length, 'reasons');
      } else {
        throw new Error(data.error || 'Failed to fetch cancel reasons');
      }
    } catch (error) {
      console.error('❌ Failed to fetch cancel reasons:', error);
      showMessage('error', 'Failed to load cancel reasons');
    } finally {
      setIsLoading(false);
    }
  };

  const addCancelReason = async () => {
    if (!newReason.trim()) {
      showMessage('error', 'Please enter a cancel reason');
      return;
    }

    try {
      setIsAdding(true);
      const response = await fetch('/api/admin/cancel-reasons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: newReason.trim() })
      });

      const data = await response.json();
      
      if (data.success) {
        if (data.cancelReason) {
          setReasons(prev => [...prev, data.cancelReason]);
        } else if (Array.isArray(data.cancelReasons)) {
          setReasons(data.cancelReasons);
        } else {
          // Fallback to refetch
          fetchCancelReasons();
        }
        setNewReason('');
        const addedText = data.cancelReason?.reason || newReason.trim();
        showMessage('success', `Cancel reason "${addedText}" added successfully! ✅`);
      } else {
        throw new Error(data.error || 'Failed to add cancel reason');
      }
    } catch (error) {
      console.error('❌ Failed to add cancel reason:', error);
      showMessage('error', error instanceof Error ? error.message : 'Failed to add cancel reason');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteClick = (reasonToRemove: any) => {
    if (getReasonText(reasonToRemove).toLowerCase() === 'other') {
      showMessage('error', 'Cannot remove "Other" reason as it is required');
      return;
    }
    
    setShowDeleteConfirm({ show: true, reason: reasonToRemove });
  };

  const confirmDelete = async () => {
    const reasonObj = showDeleteConfirm.reason as any;
    if (!reasonObj) return;
    const id = typeof reasonObj === 'object' ? reasonObj.id : undefined;
    const text = getReasonText(reasonObj);
    setIsDeleting(true);

    try {
      const params = new URLSearchParams();
      if (id) params.set('id', id);
      if (text) params.set('reason', text);
      const response = await fetch(`/api/admin/cancel-reasons?${params.toString()}`, { method: 'DELETE' });

      const data = await response.json();
      
      if (data.success) {
        setReasons(prev => prev.filter((r: any) => {
          if (id && r && typeof r === 'object' && 'id' in r) return r.id !== id;
          return getReasonText(r).toLowerCase() !== text.toLowerCase();
        }));
        setShowDeleteConfirm({ show: false, reason: null });
        showMessage('success', `Cancel reason "${text}" removed successfully! 🗑️`);
      } else {
        // Treat not found as idempotent success and optimistically update UI
        if ((response.status === 404) || (typeof data.error === 'string' && data.error.toLowerCase().includes('not found'))) {
          setReasons(prev => prev.filter((r: any) => {
            if (id && r && typeof r === 'object' && 'id' in r) return r.id !== id;
            return getReasonText(r).toLowerCase() !== text.toLowerCase();
          }));
          setShowDeleteConfirm({ show: false, reason: null });
          showMessage('success', `Cancel reason "${text}" was already removed.`);
          // Soft re-fetch to ensure server state is in sync
          fetchCancelReasons();
        } else {
          throw new Error(data.error || 'Failed to remove cancel reason');
        }
      }
    } catch (error) {
      console.error('❌ Failed to remove cancel reason:', error);
      showMessage('error', error instanceof Error ? error.message : 'Failed to remove cancel reason');
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm({ show: false, reason: null });
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addCancelReason();
    }
  };

  const resetToDefaultReasons = async () => {
    if (!confirm('This will delete all current cancel reasons and add default ones. Are you sure?')) {
      return;
    }

    try {
      setIsLoading(true);
      showMessage('success', 'Resetting to default reasons...');

      // Delete all existing reasons except "Other"
      for (const reason of reasons) {
        const reasonText = getReasonText(reason);
        if (reasonText.toLowerCase() !== 'other') {
          const id = (reason as any)?.id || (reason as any)?._id;
          if (id) {
            await fetch(`/api/admin/cancel-reasons?id=${id}`, { method: 'DELETE' });
          }
        }
      }

      // Add default reasons
      const defaultReasons = [
        'Personal Emergency',
        'Transportation Issue',
        'Weather Conditions', 
        'Health Issue',
        'Work Commitment',
        'Family Emergency',
        'Other'
      ];

      for (const reason of defaultReasons) {
        await fetch('/api/admin/cancel-reasons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reason: reason,
            category: 'General',
            description: '',
            isActive: true
          })
        });
      }

      // Refresh the list
      await fetchCancelReasons();
      showMessage('success', 'Cancel reasons reset to defaults successfully! ✅');

    } catch (error) {
      console.error('❌ Failed to reset reasons:', error);
      showMessage('error', 'Failed to reset cancel reasons');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-cancel-reasons">
      <div className="admin-cancel-reasons-header">
        <h2>Cancel Reasons Management</h2>
        <p>Manage the list of cancellation reasons available to customers</p>
        {onClose && (
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        )}
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="add-reason-section">
        <h3>Add New Cancel Reason</h3>
        <div className="add-reason-form">
          <input
            type="text"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter new cancel reason..."
            disabled={isAdding}
            maxLength={100}
          />
          <button 
            onClick={addCancelReason}
            disabled={isAdding || !newReason.trim()}
            className="add-button"
          >
            {isAdding ? (
              <>
                <div className="spinner" />
                Adding...
              </>
            ) : (
              <>
                <Plus size={16} />
                Add Reason
              </>
            )}
          </button>
        </div>
      </div>

      <div className="reasons-list-section">
        <div className="reasons-list-header">
          <h3>Current Cancel Reasons ({reasons.length})</h3>
          <button 
            onClick={resetToDefaultReasons}
            disabled={isLoading}
            className="reset-button"
            title="Reset to default cancel reasons"
          >
            🔄 Reset to Defaults
          </button>
        </div>
        
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner" />
            <span>Loading cancel reasons...</span>
          </div>
        ) : reasons.length === 0 ? (
          <div className="empty-state">
            <AlertCircle size={48} />
            <h4>No Cancel Reasons Found</h4>
            <p>Add your first cancel reason above</p>
          </div>
        ) : (
          <div className="reasons-list">
            {reasons.map((reason, index) => (
              <div key={(reason as any)?.id ?? index} className="reason-item">
                <div className="reason-content">
                  <span className="reason-number">{index + 1}</span>
                  <span className="reason-text">{getReasonText(reason)}</span>
                  {getReasonText(reason).toLowerCase() === 'other' && (
                    <span className="required-badge">Required</span>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteClick(reason)}
                  disabled={getReasonText(reason).toLowerCase() === 'other'}
                  className="remove-button"
                  title={getReasonText(reason).toLowerCase() === 'other' ? 'Cannot remove required reason' : `Remove "${getReasonText(reason)}"`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Popup */}
      {showDeleteConfirm.show && (
        <div className="delete-confirm-overlay">
          <div className="delete-confirm-popup">
            <div className="delete-confirm-header">
              <AlertCircle size={24} color="#dc2626" />
              <h3>Confirm Deletion</h3>
            </div>
            <div className="delete-confirm-content">
              <p>Are you sure you want to remove this cancel reason?</p>
              <div className="reason-to-delete">
                <strong>"{getReasonText(showDeleteConfirm.reason)}"</strong>
              </div>
              <p className="warning-text">This action cannot be undone.</p>
            </div>
            <div className="delete-confirm-actions">
              <button 
                className="cancel-button" 
                onClick={cancelDelete}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                className="delete-button" 
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="spinner" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete Reason
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-cancel-reasons {
          padding: 24px;
          max-width: 800px;
          margin: 0 auto;
        }

        .admin-cancel-reasons-header {
          position: relative;
          margin-bottom: 32px;
        }

        .admin-cancel-reasons-header h2 {
          color: #1a1a1a;
          font-size: 28px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .admin-cancel-reasons-header p {
          color: #666;
          font-size: 16px;
          margin-bottom: 0;
        }

        .close-button {
          position: absolute;
          top: 0;
          right: 0;
          background: #f5f5f5;
          border: none;
          border-radius: 8px;
          padding: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .close-button:hover {
          background: #e5e5e5;
        }

        .message {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          font-size: 14px;
          font-weight: 500;
        }

        .message.success {
          background: #f0f9f0;
          color: #2d5a2d;
          border: 1px solid #c3e6c3;
        }

        .message.error {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .add-reason-section {
          background: #f8f9fa;
          padding: 24px;
          border-radius: 12px;
          margin-bottom: 32px;
        }

        .add-reason-section h3 {
          color: #1a1a1a;
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .add-reason-form {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .add-reason-form input {
          flex: 1;
          padding: 12px 16px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s ease;
          background: #ffffff;
          color: #000000;
          caret-color: #000000;
        }

        .add-reason-form input:focus {
          outline: none;
          border-color: #ED2024;
        }

        .add-reason-form input::placeholder {
          color: #666666;
          opacity: 1;
        }

        .add-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #ED2024, #ff4444);
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .add-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(237, 32, 36, 0.3);
        }

        .add-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .reasons-list-section h3 {
          color: #1a1a1a;
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }

        .reasons-list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .reset-button {
          background: #f59e0b;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .reset-button:hover:not(:disabled) {
          background: #d97706;
          transform: translateY(-1px);
        }

        .reset-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .loading-state, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          text-align: center;
          color: #666;
        }

        .empty-state h4 {
          color: #1a1a1a;
          font-size: 18px;
          font-weight: 600;
          margin: 16px 0 8px 0;
        }

        .reasons-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .reason-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          padding: 16px;
          transition: all 0.2s ease;
        }

        .reason-item:hover {
          border-color: #ddd;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .reason-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .reason-number {
          background: #f5f5f5;
          color: #666;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 4px;
          min-width: 24px;
          text-align: center;
        }

        .reason-text {
          color: #1a1a1a;
          font-size: 14px;
          font-weight: 500;
        }

        .required-badge {
          background: #ED2024;
          color: white;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .remove-button {
          background: #fee2e2;
          color: #dc2626;
          border: none;
          padding: 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .remove-button:hover:not(:disabled) {
          background: #fecaca;
        }

        .remove-button:disabled {
          background: #f5f5f5;
          color: #ccc;
          cursor: not-allowed;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #f3f3f3;
          border-top: 2px solid #ED2024;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Delete Confirmation Popup Styles */
        .delete-confirm-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          backdrop-filter: blur(4px);
        }

        .delete-confirm-popup {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          max-width: 400px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          animation: popupSlideIn 0.3s ease-out;
        }

        @keyframes popupSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .delete-confirm-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 24px 24px 16px 24px;
          border-bottom: 1px solid #f0f0f0;
        }

        .delete-confirm-header h3 {
          color: #1a1a1a;
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }

        .delete-confirm-content {
          padding: 20px 24px;
        }

        .delete-confirm-content p {
          color: #666;
          font-size: 14px;
          margin: 0 0 16px 0;
          line-height: 1.5;
        }

        .reason-to-delete {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 12px;
          margin: 16px 0;
          text-align: center;
        }

        .reason-to-delete strong {
          color: #dc2626;
          font-size: 16px;
        }

        .warning-text {
          color: #dc2626 !important;
          font-weight: 500 !important;
          font-size: 13px !important;
        }

        .delete-confirm-actions {
          display: flex;
          gap: 12px;
          padding: 16px 24px 24px 24px;
          justify-content: flex-end;
        }

        .cancel-button {
          background: #f5f5f5;
          color: #666;
          border: 1px solid #ddd;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cancel-button:hover:not(:disabled) {
          background: #e5e5e5;
          border-color: #ccc;
        }

        .cancel-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .delete-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #dc2626, #ef4444);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .delete-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
        }

        .delete-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
      `}</style>
    </div>
  );
}
