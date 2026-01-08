'use client';

import { useState } from 'react';
import { Menu, User, LogOut, Settings } from 'lucide-react';
import StaffProfileSettings from './StaffProfileSettings';

interface ManagementHeaderProps {
  onToggleSidebar: () => void;
  staffUser: any;
}

export default function ManagementHeader({ onToggleSidebar, staffUser }: ManagementHeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);

  const handleLogout = () => {
    // Clear all staff session data
    localStorage.removeItem('staffToken');
    localStorage.removeItem('staffLoginTime');
    localStorage.removeItem('staffUser');
    
    // Redirect to login page
    window.location.href = '/management';
  };

  return (
    <header className="management-header">
      <div className="header-left">
        <button className="menu-toggle" onClick={onToggleSidebar}>
          <Menu size={24} />
        </button>
        <div className="header-title">
          <h1>FeelMe Town - Management Panel</h1>
        </div>
      </div>

      <div className="header-right">
        <div className="user-menu">
          <button 
            className="user-button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            <img 
              src={staffUser?.profilePhoto || '/default-avatar.png'} 
              alt={staffUser?.name || 'Staff Member'}
              className="user-avatar"
            />
            <span>{staffUser?.name || 'Staff Member'}</span>
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
        .management-header {
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

        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(255, 255, 255, 0.2);
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
          .management-header {
            padding: 1rem;
          }

          .header-title h1 {
            font-size: 1.2rem;
          }

          .user-button span {
            display: none;
          }

          .user-avatar {
            width: 28px;
            height: 28px;
          }
        }
      `}</style>

      <StaffProfileSettings 
        isOpen={profileSettingsOpen} 
        onClose={() => setProfileSettingsOpen(false)} 
      />
    </header>
  );
}
