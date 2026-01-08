'use client';

import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, Filter } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface ExcelRecord {
    _id: string;
  type: 'completed' | 'manual' | 'cancelled';
  filename: string;
  createdAt: Date;
  updatedAt: Date;
  totalRecords: number;
}

export default function ExcelManagerPage() {
  const [selectedType, setSelectedType] = useState<'completed' | 'manual' | 'cancelled'>('completed');
  const [excelRecords, setExcelRecords] = useState<ExcelRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [warnings, setWarnings] = useState<any[]>([]);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchExcelRecords();
    fetchWarnings();
  }, []);
  
  const fetchWarnings = async () => {
    try {
      const response = await fetch('/api/admin/cleanup-old-json-data');
      const data = await response.json();
      if (data.success && data.hasWarnings) {
        setWarnings(data.warnings);
      }
    } catch (error) {
      console.error('Error fetching warnings:', error);
    }
  };

  const fetchExcelRecords = async () => {
    try {
      // Fetch counts from JSON files
      const response = await fetch('/api/admin/excel-records-count');
      const data = await response.json();
      if (data.success) {
        setExcelRecords(data.records || []);
      }
    } catch (error) {
      console.error('Error fetching excel records:', error);
    }
  };

  const handleDownloadExcel = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/export-bookings?type=${selectedType}`);
      
      if (!response.ok) {
        throw new Error('Failed to download Excel');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedType}_bookings_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showSuccess('Excel downloaded successfully!');
      fetchExcelRecords();
    } catch (error) {
      console.error('Error downloading Excel:', error);
      showError('Failed to download Excel. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setLoading(true);
    try {
      // Fetch data from API
      const response = await fetch(`/api/admin/export-bookings-pdf?type=${selectedType}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch bookings');
      }

      // Import jsPDF dynamically (client-side only)
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
      const autoTable = (await import('jspdf-autotable')).default;
      
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Title
      const title = `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Bookings Report`;
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 148, 15, { align: 'center' } as any);
      
      // Subtitle
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Records: ${data.total}`, 148, 22, { align: 'center' } as any);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 148, 28, { align: 'center' } as any);
      
      // Table data - different columns for manual bookings
      let tableData: any[];
      let tableHeaders: string[];
      
      if (selectedType === 'manual') {
        // Format createdBy information for manual bookings
        const formatCreatedBy = (booking: any) => {
          if (booking.createdBy) {
            if (typeof booking.createdBy === 'object' && booking.createdBy !== null) {
              const createdBy = booking.createdBy;
              if (createdBy.type === 'admin' && createdBy.adminName) {
                return `Admin: ${createdBy.adminName}`;
              } else if (createdBy.type === 'staff' && createdBy.staffName) {
                return `Staff: ${createdBy.staffName}`;
              } else if (createdBy.adminName) {
                return `Admin: ${createdBy.adminName}`;
              } else if (createdBy.staffName) {
                return `Staff: ${createdBy.staffName}`;
              }
            } else if (typeof booking.createdBy === 'string') {
              return booking.createdBy;
            }
          }
          return 'Staff';
        };

        tableData = data.bookings.map((booking: any) => [
          (booking.bookingId || booking.id || 'N/A').substring(0, 20),
          (booking.name || 'N/A').substring(0, 15),
          (booking.phone || 'N/A'),
          (booking.theaterName || booking.theater || 'N/A').substring(0, 12),
          (booking.date || 'N/A').substring(0, 15),
          String(booking.numberOfPeople || 'N/A'),
          `₹${booking.slotBookingFee || booking.pricingData?.slotBookingFee || 0}`,
          `₹${booking.theaterBasePrice || booking.pricingData?.theaterBasePrice || 0}`,
          String(booking.extraGuestsCount || 0),
          `₹${booking.extraGuestCharges || 0}`,
          `₹${booking.advancePayment || 0}`,
          `₹${booking.venuePayment || 0}`,
          `₹${booking.totalAmount || booking.amount || 0}`,
          formatCreatedBy(booking).substring(0, 15)
        ]);
        
        tableHeaders = ['Booking ID', 'Name', 'Phone', 'Theater', 'Date', 'People', 'Slot Fee', 'Base Price', 'Extra Guests', 'Extra Charges', 'Advance', 'Venue', 'Total', 'Created By'];
      } else {
        tableData = data.bookings.map((booking: any) => [
          (booking.bookingId || booking.id || 'N/A').substring(0, 25),
          (booking.name || 'N/A').substring(0, 20),
          (booking.phone || 'N/A'),
          (booking.theaterName || booking.theater || 'N/A').substring(0, 15),
          (booking.date || 'N/A').substring(0, 20),
          String(booking.numberOfPeople || 'N/A'),
          `₹${booking.totalAmount || booking.amount || 0}`
        ]);
        
        tableHeaders = ['Booking ID', 'Name', 'Phone', 'Theater', 'Date', 'People', 'Amount'];
      }
      
      // Auto table
      autoTable(doc, {
        startY: 35,
        head: [tableHeaders],
        body: tableData,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        margin: { top: 35, left: 10, right: 10 }
      });
      
      // Add page numbers
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Page ${i} of ${pageCount}`, 148, 200, { align: 'center' } as any);
      }
      
      // Save PDF
      doc.save(`${selectedType}_bookings_${new Date().toISOString().split('T')[0]}.pdf`);
      
      showSuccess('PDF downloaded successfully!');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      showError('Failed to download PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'completed':
        return 'Completed Bookings';
      case 'manual':
        return 'Manual Bookings';
      case 'cancelled':
        return 'Cancelled Bookings';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'completed':
        return '#28a745';
      case 'manual':
        return '#007bff';
      case 'cancelled':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  const filteredRecords = excelRecords.filter(record => record.type === selectedType);

  return (
    <div className="excel-manager-container">
      <div className="page-header">
        <div className="header-content">
          <FileSpreadsheet size={32} />
          <div>
            <h1>Excel Manager</h1>
            <p>Manage and download booking Excel sheets</p>
        </div>
            </div>
          </div>

      <div className="manager-content">
        {/* Warning Alert */}
        {warnings.length > 0 && (
          <div className="warning-alert">
            <div className="warning-header">
              <span className="warning-icon">⚠️</span>
              <h3>Data Deletion Warning!</h3>
            </div>
            <p className="warning-message">
              {warnings.length} booking{warnings.length > 1 ? 's' : ''} will be deleted in the next 5 days. 
              Download Excel files now to save the data!
            </p>
            <div className="warning-list">
              {warnings.slice(0, 5).map((warning: any, index: number) => (
                <div key={index} className="warning-item">
                  <span className="warning-type">{warning.type}</span>
                  <span className="warning-booking">{warning.bookingId} - {warning.name}</span>
                  <span className="warning-days">{warning.daysLeft} days left</span>
                </div>
              ))}
              {warnings.length > 5 && (
                <p className="warning-more">... and {warnings.length - 5} more</p>
              )}
            </div>
            <button className="warning-download-btn" onClick={handleDownloadExcel}>
              <Download size={16} />
              Download {selectedType} Excel Now
            </button>
          </div>
        )}
        
        {/* Filter Section */}
        <div className="filter-section">
          <div className="filter-header">
            <Filter size={20} />
            <h3>Select Booking Type</h3>
              </div>
          <div className="filter-options">
            <button
              className={`filter-btn ${selectedType === 'completed' ? 'active completed' : ''}`}
              onClick={() => setSelectedType('completed')}
            >
              <span className="filter-icon">✅</span>
              <div>
                <strong>Completed Bookings</strong>
                <small>All confirmed and completed bookings</small>
              </div>
            </button>
            <button
              className={`filter-btn ${selectedType === 'manual' ? 'active manual' : ''}`}
              onClick={() => setSelectedType('manual')}
            >
              <span className="filter-icon">✍️</span>
              <div>
                <strong>Manual Bookings</strong>
                <small>Staff created bookings</small>
            </div>
            </button>
            <button
              className={`filter-btn ${selectedType === 'cancelled' ? 'active cancelled' : ''}`}
              onClick={() => setSelectedType('cancelled')}
            >
              <span className="filter-icon">❌</span>
              <div>
                <strong>Cancelled Bookings</strong>
                <small>All cancelled bookings</small>
              </div>
            </button>
              </div>
            </div>

        {/* Action Buttons */}
        <div className="action-section">
          <button
            className="action-btn download excel"
            onClick={handleDownloadExcel}
            disabled={loading}
          >
            <Download size={20} />
            {loading ? 'Downloading...' : 'Download Excel'}
          </button>
          <button
            className="action-btn download pdf"
            onClick={handleDownloadPDF}
            disabled={loading}
          >
            <Download size={20} />
            {loading ? 'Downloading...' : 'Download PDF'}
          </button>
              </div>


        {/* Records Display */}
        <div className="records-section">
          <h3>Excel Records - {getTypeLabel(selectedType)}</h3>
          {filteredRecords.length > 0 ? (
            <div className="records-grid">
              {filteredRecords.map((record) => (
                <div key={record._id} className="record-card">
                  <div className="record-header">
                    <FileSpreadsheet size={24} style={{ color: getTypeColor(record.type) }} />
                    <span className="record-type" style={{ background: getTypeColor(record.type) }}>
                      {getTypeLabel(record.type)}
                    </span>
              </div>
                  <div className="record-info">
                    <p><strong>Filename:</strong> {record.filename}</p>
                    <p><strong>Total Records:</strong> {record.totalRecords}</p>
                    <p><strong>Last Updated:</strong> {new Date(record.updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                    <p><strong>Created:</strong> {new Date(record.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
            </div>
              </div>
              ))}
              </div>
          ) : (
            <div className="no-records">
              <FileSpreadsheet size={48} />
              <p>No Excel records found for {getTypeLabel(selectedType)}</p>
              <small>Download an Excel file to create a record</small>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .excel-manager-container {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
          min-height: 100vh;
          background: #f8f9fa;
        }

        .page-header {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .header-content h1 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 2rem;
          color: #333;
          margin: 0 0 0.5rem 0;
        }

        .header-content p {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          color: #666;
          margin: 0;
        }

        .manager-content {
          display: flex;
          flex-direction: column;
            gap: 2rem;
        }
        
        .warning-alert {
          background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
          border: 2px solid #ffc107;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 4px 12px rgba(255, 193, 7, 0.3);
        }
        
        .warning-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        
        .warning-icon {
          font-size: 2rem;
        }
        
        .warning-header h3 {
          color: #856404;
          font-size: 1.5rem;
          margin: 0;
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
        }
        
        .warning-message {
          color: #856404;
          font-size: 1rem;
          margin-bottom: 1rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
        }
        
        .warning-list {
          background: white;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
          max-height: 200px;
          overflow-y: auto;
        }
        
        .warning-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .warning-item:last-child {
          border-bottom: none;
        }
        
        .warning-type {
          background: #ffc107;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.85rem;
          text-transform: capitalize;
          font-weight: 600;
        }
        
        .warning-booking {
          flex: 1;
          margin: 0 1rem;
          color: #333;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
        }
        
        .warning-days {
          color: #dc3545;
          font-weight: 600;
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
        }
        
        .warning-more {
          color: #666;
          text-align: center;
          margin: 0.5rem 0 0 0;
          font-style: italic;
        }
        
        .warning-download-btn {
          background: #dc3545;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          transition: all 0.3s ease;
        }
        
        .warning-download-btn:hover {
          background: #c82333;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
        }

        .filter-section {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .filter-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .filter-header h3 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.3rem;
          color: #333;
          margin: 0;
        }

        .filter-options {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
        }

        .filter-btn {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          background: white;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
        }

        .filter-btn:hover {
          border-color: var(--accent-color);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(138, 43, 226, 0.2);
        }

        .filter-btn.active {
          border-width: 3px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .filter-btn.active.completed {
          border-color: #28a745;
          background: #f0fff4;
        }

        .filter-btn.active.manual {
          border-color: #007bff;
          background: #f0f8ff;
        }

        .filter-btn.active.cancelled {
          border-color: #dc3545;
          background: #fff5f5;
        }

        .filter-icon {
          font-size: 2rem;
        }

        .filter-btn strong {
          display: block;
          font-size: 1.1rem;
          color: #333;
          margin-bottom: 0.25rem;
        }

        .filter-btn small {
          display: block;
          color: #666;
          font-size: 0.85rem;
        }

        .action-section {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 2rem;
          background: var(--accent-color);
          color: white;
          border: none;
          border-radius: 12px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .action-btn:hover:not(:disabled) {
          background: var(--accent-hover);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(138, 43, 226, 0.3);
        }

        .action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .action-btn.excel {
          background: #28a745;
        }

        .action-btn.excel:hover:not(:disabled) {
          background: #218838;
        }

        .action-btn.pdf {
          background: #dc3545;
        }

        .action-btn.pdf:hover:not(:disabled) {
          background: #c82333;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .records-section {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          width: min(520px, 92vw);
          box-shadow: 0 10px 30px rgba(0,0,0,0.25);
        }

        .modal h3 {
          margin: 0 0 0.5rem 0;
          color: #333;
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
        }

        .modal p {
          margin: 0 0 1rem 0;
          color: #666;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
        }

        .modal-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }

        .records-section h3 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.3rem;
          color: #333;
          margin: 0 0 1.5rem 0;
        }

        .records-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .record-card {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 1.5rem;
          border: 2px solid #e0e0e0;
          transition: all 0.3s ease;
        }

        .record-card:hover {
          border-color: var(--accent-color);
          box-shadow: 0 4px 12px rgba(138, 43, 226, 0.2);
        }

        .record-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .record-type {
          padding: 0.4rem 0.8rem;
          border-radius: 20px;
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .record-info p {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          color: #666;
          margin: 0.5rem 0;
        }

        .record-info strong {
          color: #333;
        }

        .no-records {
          text-align: center;
          padding: 4rem 2rem;
          color: #999;
        }

        .no-records p {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 1.1rem;
          margin: 1rem 0 0.5rem 0;
        }

        .no-records small {
          font-size: 0.9rem;
          color: #bbb;
        }

        @media (max-width: 768px) {
          .excel-manager-container {
            padding: 1rem;
          }

          .filter-options {
            grid-template-columns: 1fr;
          }

          .action-section {
            flex-direction: column;
          }

          .action-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
