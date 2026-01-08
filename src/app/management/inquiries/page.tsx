'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';
import { Mail, Phone, MessageSquare, Clock, User, Calendar, Filter, Search } from 'lucide-react';

interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  notes?: string;
}

export default function InquiriesPage() {
  const { showSuccess, showError, toasts, removeToast } = useToast();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [showInquiryDetail, setShowInquiryDetail] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [replyText, setReplyText] = useState('');
  const [notes, setNotes] = useState('');

  // Mock data for demonstration
  const mockInquiries: Inquiry[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      subject: 'Theater Booking Inquiry',
      message: 'I would like to know about availability for next weekend for a birthday party.',
      status: 'new',
      priority: 'medium',
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z'
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+1234567891',
      subject: 'Pricing Information',
      message: 'Could you please provide detailed pricing for all your theater packages?',
      status: 'in_progress',
      priority: 'high',
      createdAt: '2024-01-14T14:20:00Z',
      updatedAt: '2024-01-15T09:15:00Z',
      assignedTo: 'Staff Member 1',
      notes: 'Sent pricing brochure via email'
    },
    {
      id: '3',
      name: 'Mike Johnson',
      email: 'mike@example.com',
      phone: '+1234567892',
      subject: 'Cancellation Request',
      message: 'I need to cancel my booking for next week due to emergency.',
      status: 'resolved',
      priority: 'high',
      createdAt: '2024-01-13T16:45:00Z',
      updatedAt: '2024-01-14T11:30:00Z',
      assignedTo: 'Staff Member 2',
      notes: 'Cancellation processed, refund initiated'
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setInquiries(mockInquiries);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredInquiries = inquiries.filter(inquiry => {
    const matchesStatus = filterStatus === 'all' || inquiry.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      inquiry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.subject.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const handleStatusUpdate = (inquiryId: string, newStatus: Inquiry['status']) => {
    setInquiries(prev => prev.map(inquiry => 
      inquiry.id === inquiryId 
        ? { ...inquiry, status: newStatus, updatedAt: new Date().toISOString() }
        : inquiry
    ));
    showSuccess(`Inquiry status updated to ${newStatus}`);
  };

  const handleReply = () => {
    if (!replyText.trim()) {
      showError('Please enter a reply message');
      return;
    }
    
    // In a real app, this would send the reply
    showSuccess('Reply sent successfully!');
    setReplyText('');
  };

  const handleAddNote = () => {
    if (!notes.trim()) {
      showError('Please enter a note');
      return;
    }
    
    if (selectedInquiry) {
      setInquiries(prev => prev.map(inquiry => 
        inquiry.id === selectedInquiry.id 
          ? { ...inquiry, notes: notes, updatedAt: new Date().toISOString() }
          : inquiry
      ));
      showSuccess('Note added successfully!');
      setNotes('');
    }
  };

  const getStatusColor = (status: Inquiry['status']) => {
    switch (status) {
      case 'new': return '#007bff';
      case 'in_progress': return '#ffc107';
      case 'resolved': return '#28a745';
      case 'closed': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const getPriorityColor = (priority: Inquiry['priority']) => {
    switch (priority) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div className="inquiries-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading inquiries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inquiries-page">
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
      
      <div className="page-header">
        <h1>Customer Inquiries</h1>
        <p>Manage and respond to customer inquiries and support requests</p>
      </div>

      <div className="inquiries-container">
        {/* Filters and Search */}
        <div className="filters-section">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search inquiries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              All ({inquiries.length})
            </button>
            <button 
              className={`filter-btn ${filterStatus === 'new' ? 'active' : ''}`}
              onClick={() => setFilterStatus('new')}
            >
              New ({inquiries.filter(i => i.status === 'new').length})
            </button>
            <button 
              className={`filter-btn ${filterStatus === 'in_progress' ? 'active' : ''}`}
              onClick={() => setFilterStatus('in_progress')}
            >
              In Progress ({inquiries.filter(i => i.status === 'in_progress').length})
            </button>
            <button 
              className={`filter-btn ${filterStatus === 'resolved' ? 'active' : ''}`}
              onClick={() => setFilterStatus('resolved')}
            >
              Resolved ({inquiries.filter(i => i.status === 'resolved').length})
            </button>
          </div>
        </div>

        <div className="inquiries-layout">
          {/* Inquiries List */}
          <div className="inquiries-list">
            <div className="list-header">
              <h3>Inquiries ({filteredInquiries.length})</h3>
            </div>
            
            <div className="inquiries-items">
              {filteredInquiries.map((inquiry) => (
                <div 
                  key={inquiry.id}
                  className={`inquiry-item ${selectedInquiry?.id === inquiry.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedInquiry(inquiry);
                    setShowInquiryDetail(true);
                  }}
                >
                  <div className="inquiry-header">
                    <div className="inquiry-meta">
                      <span className="inquiry-name">{inquiry.name}</span>
                      <span className="inquiry-date">
                        {new Date(inquiry.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="inquiry-badges">
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(inquiry.status) }}
                      >
                        {inquiry.status.replace('_', ' ')}
                      </span>
                      <span 
                        className="priority-badge"
                        style={{ backgroundColor: getPriorityColor(inquiry.priority) }}
                      >
                        {inquiry.priority}
                      </span>
                    </div>
                  </div>
                  
                  <div className="inquiry-subject">{inquiry.subject}</div>
                  <div className="inquiry-preview">
                    {inquiry.message.substring(0, 100)}...
                  </div>
                  
                  <div className="inquiry-contact">
                    <span><Mail size={14} /> {inquiry.email}</span>
                    <span><Phone size={14} /> {inquiry.phone}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Inquiry Detail */}
          {selectedInquiry && showInquiryDetail && (
            <div className="inquiry-detail">
              <div className="detail-header">
                <div className="detail-info">
                  <h3>{selectedInquiry.subject}</h3>
                  <div className="detail-meta">
                    <span><User size={16} /> {selectedInquiry.name}</span>
                    <span><Mail size={16} /> {selectedInquiry.email}</span>
                    <span><Phone size={16} /> {selectedInquiry.phone}</span>
                    <span><Calendar size={16} /> {new Date(selectedInquiry.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <button 
                  className="close-btn"
                  onClick={() => setShowInquiryDetail(false)}
                >
                  ×
                </button>
              </div>

              <div className="detail-content">
                <div className="message-section">
                  <h4>Message</h4>
                  <div className="message-content">
                    {selectedInquiry.message}
                  </div>
                </div>

                {selectedInquiry.notes && (
                  <div className="notes-section">
                    <h4>Notes</h4>
                    <div className="notes-content">
                      {selectedInquiry.notes}
                    </div>
                  </div>
                )}

                <div className="actions-section">
                  <h4>Quick Actions</h4>
                  <div className="action-buttons">
                    <button 
                      className="action-btn status-btn"
                      onClick={() => handleStatusUpdate(selectedInquiry.id, 'in_progress')}
                      disabled={selectedInquiry.status === 'in_progress'}
                    >
                      Mark In Progress
                    </button>
                    <button 
                      className="action-btn status-btn"
                      onClick={() => handleStatusUpdate(selectedInquiry.id, 'resolved')}
                      disabled={selectedInquiry.status === 'resolved'}
                    >
                      Mark Resolved
                    </button>
                    <button 
                      className="action-btn status-btn"
                      onClick={() => handleStatusUpdate(selectedInquiry.id, 'closed')}
                      disabled={selectedInquiry.status === 'closed'}
                    >
                      Close Inquiry
                    </button>
                  </div>
                </div>

                <div className="reply-section">
                  <h4>Reply to Customer</h4>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply here..."
                    rows={4}
                  />
                  <button className="reply-btn" onClick={handleReply}>
                    <Mail size={16} />
                    Send Reply
                  </button>
                </div>

                <div className="notes-section">
                  <h4>Add Internal Note</h4>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add internal notes..."
                    rows={3}
                  />
                  <button className="note-btn" onClick={handleAddNote}>
                    <MessageSquare size={16} />
                    Add Note
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .inquiries-page {
          padding: 2rem;
          background: #f8f9fa;
          min-height: 100vh;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 50vh;
          gap: 1rem;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .page-header h1 {
          color: #2c3e50;
          margin-bottom: 0.5rem;
        }

        .page-header p {
          color: #6c757d;
          margin: 0;
        }

        .filters-section {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 2rem;
          display: flex;
          gap: 2rem;
          align-items: center;
        }

        .search-box {
          position: relative;
          flex: 1;
          max-width: 400px;
        }

        .search-box input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 0.9rem;
        }

        .search-box svg {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: #6c757d;
        }

        .filter-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .filter-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #ced4da;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .filter-btn:hover {
          background: #f8f9fa;
        }

        .filter-btn.active {
          background: #007bff;
          color: white;
          border-color: #007bff;
        }

        .inquiries-layout {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 2rem;
          height: calc(100vh - 300px);
        }

        .inquiries-list {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
        }

        .list-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e9ecef;
        }

        .list-header h3 {
          margin: 0;
          color: #2c3e50;
        }

        .inquiries-items {
          flex: 1;
          overflow-y: auto;
        }

        .inquiry-item {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #f1f3f4;
          cursor: pointer;
          transition: all 0.2s;
        }

        .inquiry-item:hover {
          background: #f8f9fa;
        }

        .inquiry-item.selected {
          background: #e3f2fd;
          border-left: 4px solid #007bff;
        }

        .inquiry-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.5rem;
        }

        .inquiry-meta {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .inquiry-name {
          font-weight: 600;
          color: #2c3e50;
        }

        .inquiry-date {
          font-size: 0.8rem;
          color: #6c757d;
        }

        .inquiry-badges {
          display: flex;
          gap: 0.5rem;
        }

        .status-badge,
        .priority-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 500;
          color: white;
          text-transform: uppercase;
        }

        .inquiry-subject {
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 0.5rem;
        }

        .inquiry-preview {
          color: #6c757d;
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }

        .inquiry-contact {
          display: flex;
          gap: 1rem;
          font-size: 0.8rem;
          color: #6c757d;
        }

        .inquiry-contact span {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .inquiry-detail {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
        }

        .detail-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e9ecef;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .detail-info h3 {
          margin: 0 0 0.5rem 0;
          color: #2c3e50;
        }

        .detail-meta {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          color: #6c757d;
          font-size: 0.9rem;
        }

        .detail-meta span {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6c757d;
          padding: 0.5rem;
        }

        .close-btn:hover {
          color: #dc3545;
        }

        .detail-content {
          flex: 1;
          padding: 1.5rem;
          overflow-y: auto;
        }

        .message-section,
        .notes-section,
        .actions-section,
        .reply-section {
          margin-bottom: 2rem;
        }

        .message-section h4,
        .notes-section h4,
        .actions-section h4,
        .reply-section h4 {
          margin: 0 0 1rem 0;
          color: #2c3e50;
        }

        .message-content,
        .notes-content {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 4px;
          border-left: 4px solid #007bff;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .action-btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .status-btn {
          background: #6c757d;
          color: white;
        }

        .status-btn:hover:not(:disabled) {
          background: #545b62;
        }

        .status-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .reply-btn,
        .note-btn {
          background: #007bff;
          color: white;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .reply-btn:hover,
        .note-btn:hover {
          background: #0056b3;
        }

        .reply-section textarea,
        .notes-section textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ced4da;
          border-radius: 4px;
          resize: vertical;
          font-family: inherit;
          margin-bottom: 1rem;
        }

        .reply-section textarea:focus,
        .notes-section textarea:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
        }

        @media (max-width: 768px) {
          .inquiries-layout {
            grid-template-columns: 1fr;
            height: auto;
          }
          
          .filters-section {
            flex-direction: column;
            align-items: stretch;
          }
          
          .filter-buttons {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
}
