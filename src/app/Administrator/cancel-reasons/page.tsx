'use client';

import { useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminCancelReasons from '@/components/AdminCancelReasons';
import { Menu } from 'lucide-react';

export default function CancelReasonsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="admin-layout">
      <AdminSidebar isOpen={sidebarOpen} />
      
      <div className={`admin-main ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <header className="admin-header">
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={24} />
          </button>
          <h1>Cancel Reasons Management</h1>
        </header>
        
        <main className="admin-content">
          <AdminCancelReasons />
        </main>
      </div>

      <style jsx>{`
        .admin-layout {
          display: flex;
          min-height: 100vh;
          background: #f5f5f5;
        }

        .admin-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          transition: margin-left 0.3s ease;
        }

        .admin-main.sidebar-open {
          margin-left: 280px;
        }

        .admin-main.sidebar-closed {
          margin-left: 80px;
        }

        .admin-header {
          background: white;
          border-bottom: 1px solid #e5e5e5;
          padding: 16px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .sidebar-toggle {
          background: #f5f5f5;
          border: none;
          border-radius: 8px;
          padding: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .sidebar-toggle:hover {
          background: #e5e5e5;
        }

        .admin-header h1 {
          color: #1a1a1a;
          font-size: 24px;
          font-weight: 600;
          margin: 0;
        }

        .admin-content {
          flex: 1;
          padding: 0;
          overflow-y: auto;
        }

        @media (max-width: 768px) {
          .admin-main.sidebar-open,
          .admin-main.sidebar-closed {
            margin-left: 0;
          }
        }
      `}</style>
    </div>
  );
}
