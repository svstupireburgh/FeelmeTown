'use client';

import { useState, useEffect } from 'react';
import { X, User, Lock, Save, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import ToastContainer from './ToastContainer';

interface StaffProfileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StaffProfileSettings({ isOpen, onClose }: StaffProfileSettingsProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [cooldownRemaining, setCooldownRemaining] = useState<number | null>(null);
  const { toasts, removeToast, showSuccess, showError } = useToast();
  
  // Profile fields
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    gender: '',
    role: ''
  });

  useEffect(() => {
    // Get staff info from localStorage
    const staffUser = localStorage.getItem('staffUser');
    if (staffUser) {
      try {
        const parsed = JSON.parse(staffUser);
        setProfileData({
          name: parsed.name || '',
          email: parsed.email || '',
          phone: parsed.phone || '',
          gender: parsed.gender || '',
          role: parsed.role || 'Staff Member'
        });
        
        // Check for existing cooldown
        const staffId = parsed.userId || parsed.id || parsed._id;
        if (staffId) {
          checkCooldownStatus(staffId);
        }
      } catch (error) {
        
      }
    }
  }, []);

  const checkCooldownStatus = async (staffId: string) => {
    try {
      const response = await fetch(`/api/staff/check-cooldown?staffId=${staffId}`);
      const data = await response.json();
      
      if (data.cooldownRemaining && data.cooldownRemaining > 0) {
        setCooldownRemaining(data.cooldownRemaining);
      } else {
        setCooldownRemaining(null);
      }
    } catch (error) {
      
    }
  };

  // Periodically update cooldown counter
  useEffect(() => {
    if (cooldownRemaining && cooldownRemaining > 0) {
      const interval = setInterval(() => {
        setCooldownRemaining(prev => {
          if (prev && prev > 1) {
            return prev - 1;
          } else {
            return null;
          }
        });
      }, 3600000); // Update every hour

      return () => clearInterval(interval);
    }
  }, [cooldownRemaining]);

  const handleUpdateProfile = async () => {
    if (!profileData.name.trim() || !profileData.email.trim()) {
      showError('Please fill all required fields');
      return;
    }

    setIsLoading(true);

    // Get staff ID from localStorage
    const staffUser = localStorage.getItem('staffUser');
    if (!staffUser) {
      showError('Staff session not found');
      setIsLoading(false);
      return;
    }

    const staffData = JSON.parse(staffUser);

    try {
      const response = await fetch('/api/staff/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...profileData,
          staffId: staffData.userId || staffData.id || staffData._id
        }),
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Profile updated successfully!');
        // Update localStorage
        const staffUser = JSON.parse(localStorage.getItem('staffUser') || '{}');
        const updatedStaffUser = { ...staffUser, ...profileData };
        localStorage.setItem('staffUser', JSON.stringify(updatedStaffUser));
      } else {
        showError(data.error || 'Failed to update profile');
      }
    } catch (error) {
      
      showError('Error updating profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showError('Please fill all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      showError('New password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    // Get staff ID from localStorage
    const staffUser = localStorage.getItem('staffUser');
    if (!staffUser) {
      showError('Staff session not found');
      setIsLoading(false);
      return;
    }

    const staffData = JSON.parse(staffUser);

    try {
      const response = await fetch('/api/staff/password-change-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          staffId: staffData.userId || staffData.id || staffData._id,
          staffName: staffData.name
        }),
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Password change request sent to administrator for approval!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        // Handle cooldown period specifically
        if (response.status === 429 && data.cooldownRemaining) {
          setCooldownRemaining(data.cooldownRemaining);
          showError(`You can only submit one password change request every 24 hours. Please wait ${data.cooldownRemaining} more hour(s).`);
        } else {
          showError(data.error || 'Failed to send password change request');
        }
      }
    } catch (error) {
      
      showError('Error sending password change request');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="staff-profile-modal">
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Staff Profile Settings</h2>
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
              <User size={20} />
              Profile
            </button>
            <button 
              className={`tab ${activeTab === 'password' ? 'active' : ''}`}
              onClick={() => setActiveTab('password')}
            >
              <Lock size={20} />
              Password
            </button>
          </div>

          {activeTab === 'profile' && (
            <div className="tab-content">
              <div className="form-group">
                <label htmlFor="name">Full Name *</label>
                <input
                  type="text"
                  id="name"
                  value={profileData.name}
                  onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  placeholder="Enter your email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone</label>
                <input
                  type="tel"
                  id="phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                  placeholder="Enter your phone number"
                />
              </div>

              <div className="form-group">
                <label htmlFor="gender">Gender</label>
                <select
                  id="gender"
                  value={profileData.gender}
                  onChange={(e) => setProfileData({...profileData, gender: e.target.value})}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="role">Role</label>
                <input
                  type="text"
                  id="role"
                  value={profileData.role}
                  readOnly
                  className="readonly"
                />
              </div>

              <button 
                className="save-button"
                onClick={handleUpdateProfile}
                disabled={isLoading}
              >
                <Save size={20} />
                {isLoading ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="tab-content">
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password *</label>
                <div className="password-input">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    id="currentPassword"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">New Password *</label>
                <div className="password-input">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password *</label>
                <div className="password-input">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {cooldownRemaining && cooldownRemaining > 0 && (
                <div className="cooldown-notice">
                  <div className="cooldown-icon">⏰</div>
                  <div className="cooldown-text">
                    <strong>Cooldown Active</strong>
                    <p>You can submit another password change request in {cooldownRemaining} hour(s).</p>
                  </div>
                </div>
              )}

              <button 
                className="save-button"
                onClick={handleUpdatePassword}
                disabled={isLoading || cooldownRemaining !== null}
              >
                <Save size={20} />
                {isLoading ? 'Sending Request...' : 
                 cooldownRemaining ? `Wait ${cooldownRemaining}h to request again` :
                 'Send Password Request'}
              </button>
            </div>
          )}

        </div>
      </div>

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />

      <style jsx>{`
        .staff-profile-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
        }

        .modal-content {
          position: relative;
          background: #2c2c2c;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 2rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .modal-header h2 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .close-button {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 6px;
          transition: all 0.3s ease;
        }

        .close-button:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-primary);
        }

        .modal-body {
          padding: 2rem;
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

        .tab-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text-primary);
        }

        .form-group input[type="text"],
        .form-group input[type="email"],
        .form-group input[type="tel"],
        .form-group select {
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
        .form-group input[type="tel"]:focus,
        .form-group select:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px rgba(255, 0, 0, 0.1);
        }

        .form-group input[type="text"]::placeholder,
        .form-group input[type="email"]::placeholder,
        .form-group input[type="tel"]::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .form-group input.readonly {
          background: rgba(255, 255, 255, 0.02);
          color: rgba(255, 255, 255, 0.6);
        }

        .password-input {
          position: relative;
        }

        .password-input input {
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

        .password-input input:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px rgba(255, 0, 0, 0.1);
        }

        .password-input input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .password-toggle {
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

        .password-toggle:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.1);
        }

        .save-button {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          color: white;
          border: none;
          border-radius: 6px;
          padding: 0.75rem 1.5rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
          align-self: flex-start;
        }

        .save-button:hover:not(:disabled) {
          background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
          transform: translateY(-1px);
        }

        .cooldown-notice {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          border: 2px solid #f59e0b;
          border-radius: 8px;
          margin: 1rem 0;
        }

        .cooldown-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .cooldown-text strong {
          color: #92400e;
          font-size: 0.9rem;
          font-weight: 600;
          display: block;
          margin-bottom: 0.25rem;
        }

        .cooldown-text p {
          color: #92400e;
          font-size: 0.85rem;
          margin: 0;
          opacity: 0.8;
        }

        .save-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .message {
          padding: 1rem;
          border-radius: 6px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          margin-top: 1rem;
        }

        .message.success {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .message.error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        @media (max-width: 768px) {
          .modal-content {
            width: 95%;
            margin: 1rem;
          }

          .modal-header {
            padding: 1rem 1.5rem;
          }

          .modal-body {
            padding: 1.5rem;
          }

          .modal-header h2 {
            font-size: 1.2rem;
          }
        }
      `}</style>
    </div>
  );
}

