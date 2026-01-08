'use client';

import { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, Filter, RefreshCw, Users, Calendar, DollarSign, Clock } from 'lucide-react';
import { color } from 'framer-motion';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';

interface ExcelBooking {
  'S.No': number;
  'Booking ID': string;
  'Staff ID': string;
  'Staff Name': string;
  'Customer Name': string;
  'Email': string;
  'Phone': string;
  'Theater': string;
  'Date': string;
  'Time': string;
  'Occasion': string;
  'People Count': number;
  'Total Amount': number;
  'Status': string;
  'Booking Type': string;
  'Created At': string;
  'Updated At': string;
}

interface ExcelStats {
  totalEntries: number;
  uniqueStaff: number;
  staffBreakdown: Array<{
    _id: string;
    count: number;
    staffName: string;
    totalAmount: number;
  }>;
}

export default function ExcelManagerPage() {
  const { showSuccess, showError, toasts, removeToast } = useToast();
  const [excelData, setExcelData] = useState<ExcelBooking[]>([]);
  const [excelStats, setExcelStats] = useState<ExcelStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchExcelData();
    fetchExcelStats();
  }, []);

  const fetchExcelData = async (staffId: string = 'all') => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/excel/staff-bookings?staffId=${staffId}&format=json`);
      const result = await response.json();
      
      if (result.success) {
        setExcelData(result.data || []);
        
      } else {
        
        setExcelData([]);
      }
    } catch (error) {
      
      setExcelData([]);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  const fetchExcelStats = async () => {
    try {
      const response = await fetch('/api/admin/excel/staff-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_excel_stats' })
      });
      
      const result = await response.json();
      if (result.success) {
        setExcelStats(result.stats);
      }
    } catch (error) {
      
    }
  };

  const handleStaffFilter = async (staffId: string) => {
    setSelectedStaff(staffId);
    await fetchExcelData(staffId);
  };

  const downloadCSV = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/excel/staff-bookings?staffId=${selectedStaff}&format=csv`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `staff-bookings-${selectedStaff}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        
      } else {
        showError('Failed to download CSV file');
      }
    } catch (error) {
      
      showError('Error downloading CSV file');
    } finally {
      setLoading(false);
    }
  };

  const syncAllBookingsToExcel = async () => {
    try {
      setLoading(true);
      
      
      const response = await fetch(`/api/admin/excel/staff-bookings?staffId=all&format=json`);
      const result = await response.json();
      
      if (result.success && result.data) {
        const syncPromises = result.data.map(async (booking: ExcelBooking) => {
          try {
            const syncResponse = await fetch('/api/admin/excel/staff-bookings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'save_to_excel_db',
                staffId: booking['Staff ID'],
                bookingData: {
                  bookingId: booking['Booking ID'],
                  name: booking['Customer Name'],
                  email: booking['Email'],
                  phone: booking['Phone'],
                  theaterName: booking['Theater'],
                  date: booking['Date'],
                  time: booking['Time'],
                  occasion: booking['Occasion'],
                  numberOfPeople: booking['People Count'],
                  totalAmount: booking['Total Amount'],
                  status: booking['Status'],
                  staffName: booking['Staff Name']
                }
              })
            });
            
            return await syncResponse.json();
          } catch (error) {
            
            return { success: false };
          }
        });
        
        const results = await Promise.all(syncPromises);
        const successCount = results.filter(r => r.success).length;
        
        showSuccess(`Synced ${successCount}/${result.data.length} bookings to Excel database`);
        
        await fetchExcelStats();
      }
    } catch (error) {
      
      showError('Error syncing bookings to Excel database');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="excel-manager-page">
      

      {/* Coming Soon Section */}
      <div className="coming-soon-section">
        <div className="coming-soon-background">
          <div className="coming-soon-pattern"></div>
          <div className="coming-soon-gradient"></div>
        </div>
        <div className="coming-soon-content">
          <div className="coming-soon-icon-wrapper">
            <div className="coming-soon-icon">
              <FileSpreadsheet size={64} />
            </div>
            <div className="icon-glow"></div>
          </div>
          <h2 className="coming-soon-title">Advanced Features Coming Soon!</h2>
          <div className="coming-soon-badge">Under Development</div>
          <p className="coming-soon-description">
            We're working hard to bring you powerful Excel management features including staff performance analytics, 
            detailed booking reports, and comprehensive data export capabilities.
          </p>
          <div className="features-preview">
            <div className="feature-item">
              <div className="feature-icon">
                <Users size={24} />
              </div>
              <div className="feature-text">
                <h4>Staff Performance</h4>
                <p>Detailed analytics per staff member</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <FileSpreadsheet size={24} />
              </div>
              <div className="feature-text">
                <h4>Excel Reports</h4>
                <p>Comprehensive booking data export</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <DollarSign size={24} />
              </div>
              <div className="feature-text">
                <h4>Revenue Tracking</h4>
                <p>Real-time revenue analytics</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <Calendar size={24} />
              </div>
              <div className="feature-text">
                <h4>Date Filters</h4>
                <p>Custom date range selection</p>
              </div>
            </div>
          </div>
          <div className="progress-section">
            <div className="progress-label">Development Progress</div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill"></div>
            </div>
            <div className="progress-percentage">75% Complete</div>
          </div>
          <div className="coming-soon-footer">
            <p>🚀 Expected Launch: 25 Oct 2025</p>
            <p>Stay tuned for updates!</p>
            <p>Get Connected <a href='https://www.cybershoora.com/' target='_blank' ><span style={{color: 'red'}}>CYBERSHOORA</span></a> </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .excel-manager-page {
          min-width: 100vh;
          background: 
            radial-gradient(circle at 10% 20%, rgba(255, 68, 68, 0.03) 0%, transparent 50%),
            radial-gradient(circle at 90% 80%, rgba(139, 92, 246, 0.03) 0%, transparent 50%),
            linear-gradient(180deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%);
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          
          overflow-x: hidden;
          position: relative;
          padding: 0;
          margin: 0;
        }

        /* Modern Hero Header */
        .hero-header {
          position: relative;
          margin: clamp(0.5rem, 3vw, 2rem);
          border-radius: clamp(16px, 3vw, 24px);
          overflow: hidden;
          box-shadow: 
            0 20px 60px rgba(0, 0, 0, 0.12),
            0 0 0 1px rgba(255, 255, 255, 0.5);
          width: calc(100% - clamp(1rem, 6vw, 4rem));
        }

        .hero-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 0;
        }

        .hero-pattern {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            linear-gradient(30deg, rgba(255, 68, 68, 0.05) 12%, transparent 12.5%, transparent 87%, rgba(255, 68, 68, 0.05) 87.5%, rgba(255, 68, 68, 0.05)),
            linear-gradient(150deg, rgba(255, 68, 68, 0.05) 12%, transparent 12.5%, transparent 87%, rgba(255, 68, 68, 0.05) 87.5%, rgba(255, 68, 68, 0.05)),
            linear-gradient(30deg, rgba(255, 68, 68, 0.05) 12%, transparent 12.5%, transparent 87%, rgba(255, 68, 68, 0.05) 87.5%, rgba(255, 68, 68, 0.05)),
            linear-gradient(150deg, rgba(255, 68, 68, 0.05) 12%, transparent 12.5%, transparent 87%, rgba(255, 68, 68, 0.05) 87.5%, rgba(255, 68, 68, 0.05));
          background-size: 80px 140px;
          background-position: 0 0, 0 0, 40px 70px, 40px 70px;
          opacity: 0.3;
        }

        .hero-gradient {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, 
            rgba(255, 68, 68, 0.95) 0%, 
            rgba(255, 107, 107, 0.9) 50%, 
            rgba(139, 92, 246, 0.85) 100%);
        }

        .hero-content {
          position: relative;
          z-index: 1;
          padding: clamp(1.5rem, 4vw, 3rem);
          display: flex;
          flex-direction: column;
          gap: clamp(1rem, 3vw, 2rem);
        }

        @media (min-width: 768px) {
          .hero-content {
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-start;
          }
        }

        .hero-left {
          flex: 1;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          padding: 0.5rem 1rem;
          border-radius: 50px;
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .hero-title {
          margin: 0 0 1rem 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .title-main {
          font-size: clamp(2rem, 5vw, 3.5rem);
          font-weight: 800;
          color: white;
          line-height: 1.1;
          text-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .title-accent {
          font-size: clamp(1.25rem, 3vw, 2rem);
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
        }

        .hero-description {
          font-size: clamp(0.95rem, 2vw, 1.1rem);
          color: rgba(255, 255, 255, 0.95);
          line-height: 1.6;
          margin: 0 0 2rem 0;
          max-width: 600px;
        }

        .hero-stats-mini {
          display: flex;
          gap: clamp(0.75rem, 2vw, 2rem);
          flex-wrap: wrap;
        }

        .mini-stat {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: white;
          font-weight: 600;
          font-size: clamp(0.875rem, 1.5vw, 1rem);
          background: rgba(255, 255, 255, 0.15);
          padding: 0.75rem 1.25rem;
          border-radius: 12px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .hero-actions {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 100%;
        }

        @media (min-width: 768px) {
          .hero-actions {
            width: auto;
            flex-shrink: 0;
          }
        }

        .btn-hero-primary, .btn-hero-secondary, .btn-hero-accent {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: clamp(0.875rem, 2vw, 1rem) clamp(1.5rem, 3vw, 2rem);
          border-radius: 14px;
          border: none;
          font-weight: 600;
          font-size: clamp(0.875rem, 2vw, 1rem);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          width: 100%;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
        }

        @media (min-width: 768px) {
          .btn-hero-primary, .btn-hero-secondary, .btn-hero-accent {
            min-width: 200px;
            width: auto;
          }
        }

        .btn-hero-primary {
          background: white;
          color: #ff4444;
        }

        .btn-hero-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
        }

        .btn-hero-secondary {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
          backdrop-filter: blur(10px);
        }

        .btn-hero-secondary:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }

        .btn-hero-accent {
          background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
          color: white;
        }

        .btn-hero-accent:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(139, 92, 246, 0.4);
        }

        .btn-hero-primary:disabled, .btn-hero-secondary:disabled, .btn-hero-accent:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .hero-timestamp {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: clamp(0.75rem, 2vw, 1rem) clamp(1.5rem, 4vw, 3rem);
          color: rgba(255, 255, 255, 0.9);
          font-size: clamp(0.8rem, 1.5vw, 0.875rem);
          border-top: 1px solid rgba(255, 255, 255, 0.2);
        }

        /* Modern Stats Cards */
        .modern-stats {
          margin: clamp(0.5rem, 3vw, 2rem);
          width: calc(100% - clamp(1rem, 6vw, 4rem));
        }

        .stats-grid-modern {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
          gap: clamp(1rem, 2vw, 1.5rem);
        }

        .modern-stat-card {
          position: relative;
          background: white;
          border-radius: 20px;
          padding: clamp(1.5rem, 3vw, 2rem);
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 
            0 4px 20px rgba(0, 0, 0, 0.08),
            0 0 0 1px rgba(0, 0, 0, 0.05);
        }

        .modern-stat-card:hover {
          transform: translateY(-8px);
          box-shadow: 
            0 20px 40px rgba(0, 0, 0, 0.15),
            0 0 0 1px rgba(0, 0, 0, 0.05);
        }

        .card-glow {
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          opacity: 0;
          transition: opacity 0.4s ease;
        }

        .modern-stat-card:hover .card-glow {
          opacity: 1;
        }

        .card-blue .card-glow {
          background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
        }

        .card-green .card-glow {
          background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%);
        }

        .card-orange .card-glow {
          background: radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%);
        }

        .card-purple .card-glow {
          background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .card-icon {
          width: clamp(48px, 10vw, 64px);
          height: clamp(48px, 10vw, 64px);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .card-blue .card-icon {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          color: #3b82f6;
        }

        .card-green .card-icon {
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          color: #10b981;
        }

        .card-orange .card-icon {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          color: #f59e0b;
        }

        .card-purple .card-icon {
          background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
          color: #8b5cf6;
        }

        .modern-stat-card:hover .card-icon {
          transform: scale(1.1) rotate(5deg);
        }

        .card-trend {
          padding: 0.5rem 1rem;
          border-radius: 50px;
          font-size: clamp(0.8rem, 1.5vw, 0.875rem);
          font-weight: 600;
        }

        .card-blue .card-trend {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }

        .card-green .card-trend {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .card-orange .card-trend {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }

        .card-purple .card-trend {
          background: rgba(139, 92, 246, 0.1);
          color: #8b5cf6;
        }

        .card-body {
          position: relative;
          z-index: 1;
        }

        .card-title {
          font-size: clamp(0.8rem, 1.5vw, 0.875rem);
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 1rem 0;
        }

        .card-value {
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 800;
          color: #1e293b;
          line-height: 1;
          margin-bottom: 0.5rem;
        }

        .card-subtitle {
          font-size: clamp(0.8rem, 1.5vw, 0.875rem);
          color: #94a3b8;
          margin: 0;
        }

        /* Modern Filter Bar */
        .filter-bar {
          margin: clamp(0.5rem, 3vw, 2rem);
          background: white;
          border-radius: clamp(16px, 3vw, 20px);
          padding: clamp(1rem, 2vw, 1.5rem) clamp(1.5rem, 3vw, 2rem);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          width: calc(100% - clamp(1rem, 6vw, 4rem));
        }

        .filter-bar-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        @media (min-width: 768px) {
          .filter-bar-content {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            gap: 2rem;
          }
        }

        .filter-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        @media (min-width: 768px) {
          .filter-section {
            flex-direction: row;
            align-items: center;
            gap: 1.5rem;
          }
        }

        .filter-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #475569;
          font-weight: 600;
          font-size: clamp(0.9rem, 2vw, 1rem);
          white-space: nowrap;
        }

        .modern-select {
          flex: 1;
          width: 100%;
          padding: clamp(0.875rem, 2vw, 1rem) clamp(1rem, 2vw, 1.5rem);
          border: 2px solid #e2e8f0;
          border-radius: 14px;
          font-size: clamp(0.875rem, 2vw, 1rem);
          font-weight: 500;
          color: #1e293b;
          background: white;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        @media (min-width: 768px) {
          .modern-select {
            max-width: 500px;
          }
        }

        .modern-select:focus {
          outline: none;
          border-color: #ff4444;
          box-shadow: 0 0 0 4px rgba(255, 68, 68, 0.1);
        }

        .modern-select:hover {
          border-color: #cbd5e1;
        }

        .filter-info {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @media (min-width: 768px) {
          .filter-info {
            justify-content: flex-end;
          }
        }

        .info-badge {
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          padding: 0.75rem 1.5rem;
          border-radius: 50px;
          font-weight: 600;
          color: #475569;
          font-size: clamp(0.8rem, 1.5vw, 0.875rem);
          border: 1px solid #cbd5e1;
        }

        .staff-performance-section {
          background: white;
          border-radius: clamp(16px, 3vw, 20px);
          padding: clamp(1rem, 3vw, 2rem);
          margin: clamp(0.5rem, 3vw, 2rem);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(0, 0, 0, 0.05);
          width: calc(100% - clamp(1rem, 6vw, 4rem));
        }

        .section-header {
          margin-bottom: clamp(1.5rem, 3vw, 2rem);
        }

        .section-title {
          font-size: clamp(1.25rem, 3vw, 1.5rem);
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 0.5rem 0;
        }

        .section-subtitle {
          color: #64748b;
          margin: 0;
          font-size: clamp(0.9rem, 2vw, 1rem);
        }

        .staff-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
          gap: clamp(1rem, 2vw, 1.5rem);
        }

        .staff-card {
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: clamp(1rem, 2vw, 1.5rem);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .staff-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
          border-color: #cbd5e1;
        }

        .staff-card.selected {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          border-color: #3b82f6;
          box-shadow: 0 8px 25px rgba(59, 130, 246, 0.2);
        }

        .staff-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .staff-avatar {
          width: clamp(40px, 8vw, 48px);
          height: clamp(40px, 8vw, 48px);
          background: linear-gradient(135deg, #ff4444 0%, #ff6b6b 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 12px rgba(255, 68, 68, 0.3);
          flex-shrink: 0;
        }

        .staff-card.selected .staff-avatar {
          background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .staff-info {
          flex: 1;
          min-width: 0;
        }

        .staff-name {
          font-size: clamp(0.95rem, 2vw, 1.1rem);
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 0.25rem 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .staff-id {
          font-size: clamp(0.8rem, 1.5vw, 0.875rem);
          color: #64748b;
          font-family: monospace;
          background: rgba(100, 116, 139, 0.1);
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          display: inline-block;
        }

        .staff-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(0.75rem, 2vw, 1rem);
        }

        .staff-stat {
          text-align: center;
          padding: clamp(0.75rem, 2vw, 1rem);
          background: rgba(255, 255, 255, 0.7);
          border-radius: 8px;
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .staff-card.selected .staff-stat {
          background: rgba(255, 255, 255, 0.9);
        }

        .stat-label {
          display: block;
          font-size: clamp(0.8rem, 1.5vw, 0.875rem);
          color: #64748b;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }

        .stat-value {
          display: block;
          font-size: clamp(1.25rem, 3vw, 1.5rem);
          font-weight: 700;
          color: #1e293b;
        }

        .data-table-section {
          background: white;
          border-radius: clamp(16px, 3vw, 20px);
          padding: clamp(1rem, 3vw, 2rem);
          margin: clamp(0.5rem, 3vw, 2rem);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(0, 0, 0, 0.05);
          width: calc(100% - clamp(1rem, 6vw, 4rem));
        }

        .loading-state {
          text-align: center;
          padding: clamp(2rem, 5vw, 3rem);
          color: #64748b;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f4f6;
          border-top: 4px solid #ff4444;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        .empty-state {
          text-align: center;
          padding: clamp(2rem, 5vw, 3rem);
          color: #64748b;
        }

        .empty-state svg {
          color: #cbd5e1;
          margin-bottom: 1rem;
        }

        .empty-state h4 {
          font-size: clamp(1.1rem, 2.5vw, 1.25rem);
          color: #1e293b;
          margin: 1rem 0 0.5rem;
        }

        .empty-state p {
          color: #64748b;
          margin: 0;
          font-size: clamp(0.9rem, 2vw, 1rem);
        }

        .table-wrapper {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
        }

        .table-scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: clamp(0.75rem, 1.5vw, 0.875rem);
          min-width: 600px;
        }

        @media (min-width: 768px) {
          .data-table {
            min-width: 800px;
          }
        }

        .data-table thead {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .data-table th {
          padding: clamp(0.75rem, 2vw, 1rem) clamp(0.5rem, 1.5vw, 0.75rem);
          text-align: left;
          font-weight: 600;
          color: #475569;
          border-bottom: 2px solid #e2e8f0;
          white-space: nowrap;
          text-transform: uppercase;
          font-size: clamp(0.7rem, 1.5vw, 0.75rem);
          letter-spacing: 0.5px;
        }

        .data-table tbody tr {
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.2s ease;
        }

        .data-table tbody tr:nth-child(even) {
          background: #fafbfc;
        }

        .data-table tbody tr:hover {
          background: #f0f9ff;
        }

        .data-table td {
          padding: clamp(0.75rem, 2vw, 0.875rem) clamp(0.5rem, 1.5vw, 0.75rem);
          color: #334155;
          white-space: nowrap;
          max-width: 250px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @media (max-width: 768px) {
          .data-table td {
            max-width: 150px;
          }
        }

        .table-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: clamp(0.875rem, 2vw, 1rem);
          background: #f8fafc;
          color: #64748b;
          font-size: clamp(0.8rem, 1.5vw, 0.875rem);
          border-top: 1px solid #e2e8f0;
          flex-wrap: wrap;
          text-align: center;
        }

        /* Coming Soon Section */
        .coming-soon-section {
          position: relative;
          margin: clamp(0.5rem, 3vw, 2rem);
          border-radius: clamp(16px, 3vw, 24px);
          overflow: hidden;
          min-height: 600px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: calc(100% - clamp(1rem, 6vw, 4rem));
        }

        .coming-soon-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 0;
        }

        .coming-soon-pattern {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            radial-gradient(circle at 20% 50%, rgba(255, 68, 68, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);
          opacity: 0.5;
        }

        .coming-soon-gradient {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.98) 0%, 
            rgba(248, 250, 252, 0.95) 50%, 
            rgba(241, 245, 249, 0.98) 100%);
        }

        .coming-soon-content {
          position: relative;
          z-index: 1;
          text-align: center;
          padding: clamp(2rem, 5vw, 4rem);
          max-width: 1000px;
        }

        .coming-soon-icon-wrapper {
          position: relative;
          display: inline-block;
          margin-bottom: 2rem;
        }

        .coming-soon-icon {
          width: 120px;
          height: 120px;
          background: linear-gradient(135deg, #ff4444 0%, #ff6b6b 100%);
          border-radius: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 20px 60px rgba(255, 68, 68, 0.4);
          animation: float 3s ease-in-out infinite;
          position: relative;
          z-index: 2;
        }

        .icon-glow {
          position: absolute;
          top: -20px;
          left: -20px;
          right: -20px;
          bottom: -20px;
          background: linear-gradient(135deg, #ff4444, #ff6b6b);
          border-radius: 40px;
          opacity: 0.3;
          animation: pulse 2s ease-in-out infinite;
          z-index: 1;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.1); opacity: 0.1; }
        }

        .coming-soon-title {
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 1.5rem 0;
          background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .coming-soon-badge {
          display: inline-block;
          background: linear-gradient(135deg, #ff4444 0%, #ff6b6b 100%);
          color: white;
          padding: 0.75rem 2rem;
          border-radius: 50px;
          font-size: clamp(0.875rem, 2vw, 1rem);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 2px;
          box-shadow: 0 8px 25px rgba(255, 68, 68, 0.4);
          margin-bottom: 2rem;
          animation: shimmer 2s ease-in-out infinite;
        }

        @keyframes shimmer {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .coming-soon-description {
          font-size: clamp(1rem, 2vw, 1.2rem);
          color: #64748b;
          line-height: 1.8;
          margin: 0 0 3rem 0;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
        }

        .features-preview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr));
          gap: clamp(1rem, 2vw, 1.5rem);
          margin-bottom: 3rem;
        }

        .feature-item {
          background: white;
          padding: clamp(1.5rem, 3vw, 2rem);
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
          text-align: left;
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }

        .feature-item:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        }

        .feature-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ff4444;
          flex-shrink: 0;
        }

        .feature-text h4 {
          font-size: clamp(1rem, 2vw, 1.1rem);
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 0.5rem 0;
        }

        .feature-text p {
          font-size: clamp(0.875rem, 1.5vw, 0.95rem);
          color: #64748b;
          margin: 0;
        }

        .progress-section {
          background: white;
          padding: clamp(1.5rem, 3vw, 2rem);
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          margin-bottom: 2rem;
        }

        .progress-label {
          font-size: clamp(0.875rem, 2vw, 1rem);
          font-weight: 600;
          color: #475569;
          margin-bottom: 1rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .progress-bar-container {
          width: 100%;
          height: 12px;
          background: #e2e8f0;
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 0.75rem;
        }

        .progress-bar-fill {
          height: 100%;
          width: 75%;
          background: linear-gradient(135deg, #ff4444 0%, #ff6b6b 100%);
          border-radius: 6px;
          animation: progress 3s ease-in-out infinite;
        }

        @keyframes progress {
          0%, 100% { width: 75%; }
          50% { width: 80%; }
        }

        .progress-percentage {
          font-size: clamp(1.25rem, 3vw, 1.5rem);
          font-weight: 700;
          color: #ff4444;
        }

        .coming-soon-footer {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          padding: clamp(1rem, 2vw, 1.5rem);
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .coming-soon-footer p {
          margin: 0.5rem 0;
          font-size: clamp(0.95rem, 2vw, 1.1rem);
          color: #475569;
          font-weight: 500;
        }

        .coming-soon-footer p:first-child {
          font-weight: 700;
          color: #1e293b;
        }

        @media (max-width: 768px) {
          .coming-soon-section {
            min-height: auto;
          }

          .coming-soon-icon {
            width: 80px;
            height: 80px;
          }

          .coming-soon-icon svg {
            width: 48px;
            height: 48px;
          }

          .features-preview {
            grid-template-columns: 1fr;
          }

          .feature-item {
            flex-direction: column;
            text-align: center;
            align-items: center;
          }

          .feature-text {
            text-align: center;
          }
        }
      `}</style>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
}
