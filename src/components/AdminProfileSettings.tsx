'use client';

import { useState, useEffect } from 'react';
import { X, User, Lock, Save, Eye, EyeOff } from 'lucide-react';

interface AdminProfileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminProfileSettings({ isOpen, onClose }: AdminProfileSettingsProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile fields
  const [profileData, setProfileData] = useState({
    username: 'admin',
    fullName: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    // Get admin info from localStorage and fetch from database
    const adminUser = localStorage.getItem('adminUser');
    if (adminUser) {
      try {
        const parsed = JSON.parse(adminUser);
        setProfileData(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        
      }
    }
    
    // Fetch complete admin profile from database
    fetchAdminProfile();
  }, []);

  const fetchAdminProfile = async () => {
    try {
      const response = await fetch('/api/admin/profile');
      const data = await response.json();
      
      if (data.success) {
        setProfileData(prev => ({ ...prev, ...data.admin }));
      }
    } catch (error) {
      
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    if (newPassword !== confirmPassword) {
      setMessage('New passwords do not match');
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setMessage('New password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage(data.message || 'Failed to update password');
      }
    } catch (error) {
      
      setMessage('Connection error. Please try again.');
    }

    setIsLoading(false);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Profile updated successfully!');
        // Update localStorage with new data
        localStorage.setItem('adminUser', JSON.stringify(data.admin));
      } else {
        setMessage(data.message || 'Failed to update profile');
      }
    } catch (error) {
      
      setMessage('Connection error. Please try again.');
    }

    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Admin Profile Settings</h2>
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <User size={18} />
              <span>Profile</span>
            </button>
            <button 
              className={`tab ${activeTab === 'password' ? 'active' : ''}`}
              onClick={() => setActiveTab('password')}
            >
              <Lock size={18} />
              <span>Password</span>
            </button>
          </div>

          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="profile-form">
              <h3>Profile Information</h3>
              
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  value={profileData.username}
                  onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter username"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <input
                  type="text"
                  id="fullName"
                  value={profileData.fullName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">Role</label>
                <input
                  type="text"
                  id="role"
                  value="Administrator"
                  disabled
                  className="disabled-field"
                />
              </div>


              {message && activeTab === 'profile' && (
                <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="save-button"
              >
                {isLoading ? (
                  <div className="loading-spinner">
                    <div className="spinner"></div>
                    <span>Updating...</span>
                  </div>
                ) : (
                  <>
                    <Save size={18} />
                    <span>Update Profile</span>
                  </>
                )}
              </button>
            </form>
          )}

          {activeTab === 'password' && (

          <form onSubmit={handleUpdatePassword} className="password-form">
            <h3>Change Password</h3>
            
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <div className="password-input-container">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="toggle-password"
                >
                  {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <div className="password-input-container">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="toggle-password"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <div className="password-input-container">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="toggle-password"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {message && activeTab === 'password' && (
              <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="save-button"
            >
              {isLoading ? (
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  <span>Updating...</span>
                </div>
              ) : (
                <>
                  <Save size={18} />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </form>
          )}
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          backdrop-filter: blur(5px);
        }

        .modal-content {
          background: #2c2c2c;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .modal-header h2 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.5rem;
          color: var(--text-primary);
          margin: 0;
        }

        .close-button {
          background: none;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 0.5rem;
          transition: all 0.3s ease;
        }

        .close-button:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .modal-body {
          padding: 1.5rem;
        }

        .tabs {
          display: flex;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 1.5rem;
        }

        .tab {
          background: none;
          border: none;
          padding: 0.75rem 1.5rem;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          transition: all 0.3s ease;
          border-bottom: 2px solid transparent;
        }

        .tab:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }

        .tab.active {
          color: var(--accent-color);
          border-bottom-color: var(--accent-color);
        }

        .profile-form, .password-form {
          margin-top: 1rem;
        }

        .admin-info {
          margin-bottom: 2rem;
        }

        .info-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .info-item label {
          display: block;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 0.25rem;
        }

        .info-item span {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 1rem;
          color: var(--text-primary);
        }

        .password-form h3 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.2rem;
          color: var(--text-primary);
          margin: 0 0 1.5rem 0;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text-primary);
        }

        .password-input-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .password-input-container input {
          width: 100%;
          padding: 0.75rem 2.5rem 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: var(--text-primary);
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          transition: all 0.3s ease;
        }

        .password-input-container input:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px rgba(255, 0, 0, 0.1);
        }

        .password-input-container input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .form-group input[type="text"],
        .form-group input[type="email"],
        .form-group input[type="tel"] {
          width: 100%;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: var(--text-primary);
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          transition: all 0.3s ease;
        }

        .form-group input[type="text"]:focus,
        .form-group input[type="email"]:focus,
        .form-group input[type="tel"]:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px rgba(255, 0, 0, 0.1);
        }

        .form-group input[type="text"]::placeholder,
        .form-group input[type="email"]::placeholder,
        .form-group input[type="tel"]::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .disabled-field {
          background: rgba(255, 255, 255, 0.02) !important;
          border-color: rgba(255, 255, 255, 0.05) !important;
          color: rgba(255, 255, 255, 0.5) !important;
          cursor: not-allowed !important;
        }

        .disabled-field:focus {
          border-color: rgba(255, 255, 255, 0.05) !important;
          box-shadow: none !important;
        }

        .toggle-password {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
          transition: all 0.3s ease;
        }

        .toggle-password:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.1);
        }

        .message {
          padding: 0.75rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }

        .message.success {
          background: rgba(40, 167, 69, 0.1);
          border: 1px solid rgba(40, 167, 69, 0.3);
          color: #28a745;
        }

        .message.error {
          background: rgba(220, 53, 69, 0.1);
          border: 1px solid rgba(220, 53, 69, 0.3);
          color: #dc3545;
        }

        .save-button {
          background: var(--accent-color);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
        }

        .save-button:hover {
          background: var(--accent-hover);
          transform: translateY(-2px);
        }

        .save-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .loading-spinner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .modal-content {
            width: 95%;
            margin: 1rem;
          }

          .modal-header {
            padding: 1rem;
          }

          .modal-body {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}

