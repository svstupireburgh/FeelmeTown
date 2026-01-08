'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, RefreshCw, Search, Filter } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';
import ConfirmationModal from '@/components/ConfirmationModal';

interface FAQ {
  _id: string;
  question: string;
  answer: string;
  category: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function FAQManagement() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState<string[]>(['All']);
  const { toasts, removeToast, showSuccess, showError } = useToast();

  // Form states
  const [newFAQ, setNewFAQ] = useState({
    question: '',
    answer: '',
    category: 'General'
  });
  const [editFAQ, setEditFAQ] = useState({
    question: '',
    answer: '',
    category: 'General'
  });
  
  // For confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [faqToDelete, setFaqToDelete] = useState<string | null>(null);

  // Fetch FAQs from API
  const fetchFAQs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/faqs');
      const data = await response.json();
      
      if (data.success && Array.isArray(data.faqs)) {
        setFaqs(data.faqs as FAQ[]);
        // Extract unique categories with null/undefined guard and explicit typing
        const categoriesFromApi = (data.faqs as FAQ[])
          .map((faq) => faq.category)
          .filter((c): c is string => typeof c === 'string' && c.trim().length > 0);
        const uniqueCategories = ['All', ...Array.from(new Set(categoriesFromApi))];
        setCategories(uniqueCategories);
      } else {
        console.error('Failed to fetch FAQs:', data.error);
        setFaqs([]);
        setCategories(['All']);
      }
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      setFaqs([]);
      setCategories(['All']);
    } finally {
      setLoading(false);
    }
  };

  // Add new FAQ
  const handleAddFAQ = async () => {
    if (!newFAQ.question.trim() || !newFAQ.answer.trim()) {
      showError('Please fill in both question and answer');
      return;
    }

    try {
      const response = await fetch('/api/admin/faqs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newFAQ),
      });

      const data = await response.json();
      
      if (data.success) {
        setNewFAQ({ question: '', answer: '', category: 'General' });
        setIsAdding(false);
        fetchFAQs();
        showSuccess('FAQ added successfully!');
      } else {
        showError('Failed to add FAQ: ' + data.error);
      }
    } catch (error) {
      console.error('Error adding FAQ:', error);
      showError('Failed to add FAQ');
    }
  };

  // Update FAQ
  const handleUpdateFAQ = async (id: string) => {
    if (!editFAQ.question.trim() || !editFAQ.answer.trim()) {
      showError('Please fill in both question and answer');
      return;
    }

    try {
      const response = await fetch(`/api/admin/faqs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFAQ),
      });

      const data = await response.json();
      
      if (data.success) {
        setEditingId(null);
        setEditFAQ({ question: '', answer: '', category: 'General' });
        fetchFAQs();
        showSuccess('FAQ updated successfully!');
      } else {
        showError('Failed to update FAQ: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating FAQ:', error);
      showError('Failed to update FAQ');
    }
  };

  // Delete FAQ
  const handleDeleteFAQ = async (id: string) => {
    setFaqToDelete(id);
    setShowConfirmModal(true);
  };

  const confirmDeleteFAQ = async () => {
    if (!faqToDelete) return;

    try {
      const response = await fetch(`/api/admin/faqs/${faqToDelete}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        fetchFAQs();
        showSuccess('FAQ deleted successfully!');
      } else {
        showError('Failed to delete FAQ: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      showError('Failed to delete FAQ');
    } finally {
      setShowConfirmModal(false);
      setFaqToDelete(null);
    }
  };

  // Start editing
  const startEditing = (faq: FAQ) => {
    setEditingId(faq._id);
    setEditFAQ({
      question: faq.question,
      answer: faq.answer,
      category: faq.category
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null);
    setEditFAQ({ question: '', answer: '', category: 'General' });
  };

  // Filter FAQs based on search and category
  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    fetchFAQs();
  }, []);

  return (
    <div className="faq-management">
      <style jsx>{`
        /* FAQ Management - Professional Modern Design */
        .faq-management {
          max-width: 1400px;
          margin: 0 auto;
          padding: 40px 24px;
          background: linear-gradient(135deg, #fafbfc 0%, #f1f3f4 50%, #ffffff 100%);
          min-height: 100vh;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #1a1a1a;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 48px;
          padding: 32px 40px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
        }

        .header h1 {
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
          letter-spacing: -0.025em;
          line-height: 1.2;
        }

        @media (min-width: 768px) {
          .header h1 {
            font-size: 2.5rem;
          }
        }

        @media (min-width: 1024px) {
          .header h1 {
            font-size: 3rem;
          }
        }

        .controls {
          display: flex;
          gap: 16px;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 32px;
        }

        .search-box {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-box input {
          background: #ffffff;
          border: 1px solid #d1d5db;
          color: #374151;
          padding: 12px 16px 12px 44px;
          border-radius: 12px;
          width: 320px;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .search-box input:focus {
          outline: none;
          border-color: #ED2024;
          box-shadow: 0 0 0 3px rgba(237, 32, 36, 0.1);
        }

        .search-box .search-icon {
          position: absolute;
          left: 16px;
          color: #6b7280;
          width: 16px;
          height: 16px;
        }

        .filter-select {
          background: #ffffff;
          border: 1px solid #d1d5db;
          color: #374151;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .filter-select:focus {
          outline: none;
          border-color: #ED2024;
          box-shadow: 0 0 0 3px rgba(237, 32, 36, 0.1);
        }

        .btn {
          padding: 12px 20px;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
          letter-spacing: 0.025em;
        }

        .btn-primary {
          background: #ED2024;
          color: white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
        }

        .btn-primary:hover {
          background: #dc1e1e;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(237, 32, 36, 0.15);
        }

        .btn-secondary {
          background: #ffffff;
          color: #6b7280;
          border: 1px solid #d1d5db;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .btn-secondary:hover {
          background: #f9fafb;
          color: #374151;
          border-color: #9ca3af;
          transform: translateY(-1px);
        }

        .btn-danger {
          background: #dc2626;
          color: white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
        }

        .btn-danger:hover {
          background: #b91c1c;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.15);
        }

        .btn-success {
          background: #059669;
          color: white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
        }

        .btn-success:hover {
          background: #047857;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(5, 150, 105, 0.15);
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 24px;
          margin-bottom: 40px;
        }

        .stat-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
        }

        .stat-card:hover {
          border-color: #ED2024;
          box-shadow: 0 4px 12px rgba(237, 32, 36, 0.1);
          transform: translateY(-1px);
        }

        .stat-number {
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 8px;
          line-height: 1;
        }

        .stat-label {
          color: #6b7280;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .faq-item {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 24px;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
        }

        .faq-item:hover {
          border-color: #ED2024;
          box-shadow: 0 4px 12px rgba(237, 32, 36, 0.1);
          transform: translateY(-1px);
        }

        .faq-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .faq-content {
          margin-bottom: 16px;
        }

        .faq-question {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 12px;
          line-height: 1.5;
        }

        @media (min-width: 768px) {
          .faq-question {
            font-size: 1.25rem;
          }
        }

        .faq-answer {
          color: #4b5563;
          line-height: 1.6;
          font-size: 0.875rem;
          margin-left: 16px;
          border-left: 3px solid #ED2024;
          padding-left: 16px;
          background: rgba(237, 32, 36, 0.02);
          border-radius: 0 8px 8px 0;
          padding: 16px;
        }

        .faq-category {
          background: #ED2024;
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .faq-actions {
          display: flex;
          gap: 8px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #374151;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          background: #ffffff;
          border: 1px solid #d1d5db;
          color: #374151;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #ED2024;
          box-shadow: 0 0 0 3px rgba(237, 32, 36, 0.1);
        }

        .form-group textarea {
          min-height: 120px;
          resize: vertical;
          line-height: 1.5;
        }

        .add-faq-form {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 40px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
        }

        .add-faq-form h3 {
          color: #1f2937;
          margin-bottom: 24px;
          font-size: 1.5rem;
          font-weight: 700;
          text-align: center;
        }

        @media (min-width: 768px) {
          .add-faq-form h3 {
            font-size: 1.875rem;
          }
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 24px;
        }

        .loading {
          text-align: center;
          padding: 60px;
          color: #ED2024;
        }

        .loading p {
          font-size: 1rem;
          margin-top: 16px;
          color: #6b7280;
        }

        .no-faqs {
          text-align: center;
          padding: 60px;
          color: #6b7280;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
          max-width: 600px;
          margin: 0 auto;
        }

        .no-faqs p {
          font-size: 1rem;
          line-height: 1.5;
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .header {
            flex-direction: column;
            gap: 24px;
            text-align: center;
          }
          
          .controls {
            flex-direction: column;
            gap: 12px;
          }
          
          .search-box input {
            width: 100%;
            max-width: 400px;
          }
        }

        @media (max-width: 768px) {
          .faq-management {
            padding: 24px 16px;
          }
          
          .header {
            padding: 24px;
          }
          
          .faq-item {
            padding: 20px;
          }
          
          .add-faq-form {
            padding: 24px;
          }
          
          .form-actions {
            flex-direction: column;
          }
          
          .btn {
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .faq-item {
            padding: 16px;
          }
          
          .faq-question {
            font-size: 1rem;
          }
          
          .faq-answer {
            font-size: 0.8125rem;
            margin-left: 8px;
            padding-left: 12px;
            padding: 12px;
          }
        }

        /* Animation for smooth interactions */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .faq-item {
          animation: fadeInUp 0.3s ease-out;
        }

        /* Loading animation */
        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      <div className="header">
        <h1>FAQ Management</h1>
        <div className="controls">
          <button 
            className="btn btn-secondary" 
            onClick={fetchFAQs}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => setIsAdding(!isAdding)}
          >
            <Plus size={16} />
            Add FAQ
          </button>
        </div>
      </div>

      <div className="stats">
        <div className="stat-card">
          <div className="stat-number">{faqs.length}</div>
          <div className="stat-label">Total FAQs</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{filteredFAQs.length}</div>
          <div className="stat-label">Filtered FAQs</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{categories.length - 1}</div>
          <div className="stat-label">Categories</div>
        </div>
      </div>

      <div className="controls">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search FAQs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      {isAdding && (
        <div className="add-faq-form">
          <h3>Add New FAQ</h3>
          <div className="form-group">
            <label>Category</label>
            <select
              value={newFAQ.category}
              onChange={(e) => setNewFAQ({ ...newFAQ, category: e.target.value })}
            >
              <option value="General">General</option>
              <option value="Booking">Booking</option>
              <option value="Payment">Payment</option>
              <option value="Services">Services</option>
              <option value="Cancellation">Cancellation</option>
              <option value="Technical">Technical</option>
            </select>
          </div>
          <div className="form-group">
            <label>Question</label>
            <input
              type="text"
              value={newFAQ.question}
              onChange={(e) => setNewFAQ({ ...newFAQ, question: e.target.value })}
              placeholder="Enter the FAQ question..."
            />
          </div>
          <div className="form-group">
            <label>Answer</label>
            <textarea
              value={newFAQ.answer}
              onChange={(e) => setNewFAQ({ ...newFAQ, answer: e.target.value })}
              placeholder="Enter the detailed answer..."
            />
          </div>
          <div className="form-actions">
            <button 
              className="btn btn-secondary" 
              onClick={() => setIsAdding(false)}
            >
              <X size={16} />
              Cancel
            </button>
            <button 
              className="btn btn-success" 
              onClick={handleAddFAQ}
            >
              <Save size={16} />
              Add FAQ
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">
          <RefreshCw size={24} className="animate-spin" />
          <p>Loading FAQs...</p>
        </div>
      ) : filteredFAQs.length === 0 ? (
        <div className="no-faqs">
          <p>No FAQs found. {searchTerm || selectedCategory !== 'All' ? 'Try adjusting your filters.' : 'Add your first FAQ!'}</p>
        </div>
      ) : (
        <div className="faq-list">
          {filteredFAQs.map((faq) => (
            <div key={faq._id} className="faq-item">
              {editingId === faq._id ? (
                <div>
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={editFAQ.category}
                      onChange={(e) => setEditFAQ({ ...editFAQ, category: e.target.value })}
                    >
                      <option value="General">General</option>
                      <option value="Booking">Booking</option>
                      <option value="Payment">Payment</option>
                      <option value="Services">Services</option>
                      <option value="Cancellation">Cancellation</option>
                      <option value="Technical">Technical</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Question</label>
                    <input
                      type="text"
                      value={editFAQ.question}
                      onChange={(e) => setEditFAQ({ ...editFAQ, question: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Answer</label>
                    <textarea
                      value={editFAQ.answer}
                      onChange={(e) => setEditFAQ({ ...editFAQ, answer: e.target.value })}
                    />
                  </div>
                  <div className="form-actions">
                    <button 
                      className="btn btn-secondary" 
                      onClick={cancelEditing}
                    >
                      <X size={16} />
                      Cancel
                    </button>
                    <button 
                      className="btn btn-success" 
                      onClick={() => handleUpdateFAQ(faq._id)}
                    >
                      <Save size={16} />
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="faq-header">
                    <div className="faq-category">{faq.category}</div>
                    <div className="faq-actions">
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => startEditing(faq)}
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                      <button 
                        className="btn btn-danger" 
                        onClick={() => handleDeleteFAQ(faq._id)}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="faq-content">
                    <div className="faq-question">{faq.question}</div>
                    <div className="faq-answer">{faq.answer}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        title="Delete FAQ"
        message="Are you sure you want to delete this FAQ?"
        confirmText="Yes, Delete"
        cancelText="No, Keep"
        onConfirm={confirmDeleteFAQ}
        onCancel={() => {
          setShowConfirmModal(false);
          setFaqToDelete(null);
        }}
        type="danger"
      />
    </div>
  );
}
