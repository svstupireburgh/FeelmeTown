'use client';

import { useState } from 'react';
import { Menu, User, LogOut, Settings } from 'lucide-react';
import AdminProfileSettings from './AdminProfileSettings';

interface AdminHeaderProps {
  onToggleSidebar: () => void;
}

export default function AdminHeader({ onToggleSidebar }: AdminHeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);

  const handleLogout = () => {
    // Clear all admin session data
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminLoginTime');
    localStorage.removeItem('adminUser');
    
    // Redirect to home page
    window.location.href = '/';
  };

  return (
    <header className="admin-header">
      <div className="header-left">
        <button className="menu-toggle" onClick={onToggleSidebar}>
          <Menu size={24} />
        </button>
        <div className="header-title">
          <h1>FeelMe Town - Admin Panel</h1>
        </div>
      </div>

      <div className="header-right">
        
        
        <div className="user-menu">
          <button 
            className="user-button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            <User size={20} />
            <span>Administrator Admin</span>
          </button>
          
          {userMenuOpen && (
            <div className="user-dropdown">
              <button 
                className="dropdown-item" 
                onClick={() => {
                  setProfileSettingsOpen(true);
                  setUserMenuOpen(false);
                }}
              >
                <Settings size={16} />
                <span>Profile Settings</span>
              </button>
              <button className="dropdown-item" onClick={handleLogout}>
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .admin-header {
          background: #2c2c2c;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .menu-toggle {
          background: none;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 0.5rem;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .menu-toggle:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .header-title h1 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .logout-button {
          background: rgba(220, 53, 69, 0.1);
          border: 1px solid rgba(220, 53, 69, 0.3);
          border-radius: 0.5rem;
          padding: 0.5rem 1rem;
          color: #dc3545;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .logout-button:hover {
          background: rgba(220, 53, 69, 0.2);
          border-color: rgba(220, 53, 69, 0.5);
          color: #ff4757;
          transform: translateY(-1px);
        }

        .user-menu {
          position: relative;
        }

        .user-button {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
          padding: 0.5rem 1rem;
          color: var(--text-primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
        }

        .user-button:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .user-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          background: #2c2c2c;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
          padding: 0.5rem 0;
          margin-top: 0.5rem;
          min-width: 150px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          z-index: 1000;
        }

        .dropdown-item {
          width: 100%;
          background: none;
          border: none;
          padding: 0.75rem 1rem;
          color: var(--text-primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          text-align: left;
        }

        .dropdown-item:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .dropdown-item:first-child {
          border-radius: 0.5rem 0.5rem 0 0;
        }

        .dropdown-item:last-child {
          border-radius: 0 0 0.5rem 0.5rem;
        }

        @media (max-width: 768px) {
          .admin-header {
            padding: 1rem;
          }

          .header-title h1 {
            font-size: 1.2rem;
          }

          .logout-button span {
            display: none;
          }

          .user-button span {
            display: none;
          }
        }
      `}</style>

      <AdminProfileSettings 
        isOpen={profileSettingsOpen} 
        onClose={() => setProfileSettingsOpen(false)} 
      />
    </header>
  );
}
