'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';
import { Save, Mail, Lock, User, Globe, Bell, Shield, Database } from 'lucide-react';

interface Settings {
  // Site Settings
  siteName: string;
  siteEmail: string;
  sitePhone: string;
  siteWhatsapp: string;
  siteAddress: string;
  websiteUrl: string;
  chatbotMemoryJson: string;
  
  // Email Settings
  emailUser: string;
  emailPass?: string;
  emailFrom: string;
  smtpHost: string;
  smtpPort: string;
  
  // Notification Settings
  enableEmailNotifications: boolean;
  enableSMSNotifications: boolean;
  enableBookingAlerts: boolean;
  
  // Security Settings
  sessionTimeout: number;
  maxLoginAttempts: number;
  
  // Booking Settings
  bookingExpiryHours: number;
  cancellationHours: number;
  refundPercentage: number;
  
  // Cloudinary Settings
  cloudinaryCloudName: string;
  cloudinaryFolder: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
}

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    siteName: '',
    siteEmail: '',
    sitePhone: '',
    siteWhatsapp: '',
    siteAddress: '',
    websiteUrl: '',
    chatbotMemoryJson: '',
    emailUser: '',
    emailPass: '',
    emailFrom: '',
    smtpHost: '',
    smtpPort: '',
    enableEmailNotifications: false,
    enableSMSNotifications: false,
    enableBookingAlerts: false,
    sessionTimeout: 0,
    maxLoginAttempts: 0,
    bookingExpiryHours: 0,
    cancellationHours: 0,
    refundPercentage: 0,
    cloudinaryCloudName: '',
    cloudinaryFolder: '',
    cloudinaryApiKey: '',
    cloudinaryApiSecret: ''
  });

  // Helpers to read NEXT_PUBLIC env values safely
  const envNumber = (envVal?: string, fallback?: number): number => {
    const v = envVal !== undefined ? Number(envVal) : NaN;
    return Number.isFinite(v) ? v : (typeof fallback === 'number' ? fallback : 0);
  };
  const parseEnvBool = (envVal?: string, fallback?: boolean): boolean => {
    if (envVal === undefined) return typeof fallback === 'boolean' ? fallback : false;
    return envVal === 'true' || envVal === '1';
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showSuccess, showError, toasts, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'general' | 'email' | 'notifications' | 'security' | 'booking' | 'cloudinary' | 'chatbot'>('general');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      const data = await response.json();
      
      if (data.success && data.settings) {
        const s = data.settings;
        const merged: Settings = {
          // General and non-email
          siteName: process.env.NEXT_PUBLIC_SITE_NAME ?? s.siteName ?? '',
          siteEmail: process.env.NEXT_PUBLIC_SITE_EMAIL ?? s.siteEmail ?? '',
          sitePhone: process.env.NEXT_PUBLIC_SITE_PHONE ?? s.sitePhone ?? '',
          siteWhatsapp: process.env.NEXT_PUBLIC_SITE_WHATSAPP ?? s.siteWhatsapp ?? '',
          siteAddress: process.env.NEXT_PUBLIC_SITE_ADDRESS ?? s.siteAddress ?? '',
          websiteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? s.websiteUrl ?? '',

          chatbotMemoryJson: typeof s.chatbotMemoryJson === 'string' ? s.chatbotMemoryJson : '',

          // Email strictly from DB
          emailUser: s.emailUser ?? '',
          emailPass: s.emailPass ?? '',
          emailFrom: s.emailFrom ?? '',
          smtpHost: s.smtpHost ?? '',
          smtpPort: s.smtpPort ?? '',

          // Notifications: email from DB; others from env
          enableEmailNotifications: s.enableEmailNotifications ?? false,
          enableSMSNotifications: parseEnvBool(process.env.NEXT_PUBLIC_ENABLE_SMS_NOTIFICATIONS, s.enableSMSNotifications),
          enableBookingAlerts: parseEnvBool(process.env.NEXT_PUBLIC_ENABLE_BOOKING_ALERTS, s.enableBookingAlerts),

          // Security: interpret as days; prefer env
          sessionTimeout: envNumber(process.env.NEXT_PUBLIC_SESSION_TIMEOUT_DAYS, s.sessionTimeout),
          maxLoginAttempts: envNumber(process.env.NEXT_PUBLIC_MAX_LOGIN_ATTEMPTS, s.maxLoginAttempts),

          // Booking: prefer env
          bookingExpiryHours: envNumber(process.env.NEXT_PUBLIC_BOOKING_EXPIRY_HOURS, s.bookingExpiryHours),
          cancellationHours: envNumber(process.env.NEXT_PUBLIC_CANCELLATION_HOURS, s.cancellationHours),
          refundPercentage: envNumber(process.env.NEXT_PUBLIC_REFUND_PERCENTAGE, s.refundPercentage),

          // Cloudinary: strictly from DB
          cloudinaryCloudName: s.cloudinaryCloudName ?? '',
          cloudinaryFolder: s.cloudinaryFolder ?? '',
          cloudinaryApiKey: s.cloudinaryApiKey ?? '',
          cloudinaryApiSecret: s.cloudinaryApiSecret ?? ''
        };

        setSettings(merged);
        showSuccess('Settings loaded successfully!');
      }
    } catch (error) {
      showError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (settings.chatbotMemoryJson && settings.chatbotMemoryJson.trim()) {
        try {
          JSON.parse(settings.chatbotMemoryJson);
        } catch {
          showError('Chatbot Memory JSON is invalid. Please fix JSON and save again.');
          setSaving(false);
          return;
        }
      }
      
      // Persist email-related and Cloudinary settings to database
      const payload = {
        siteName: settings.siteName,
        siteEmail: settings.siteEmail,
        sitePhone: settings.sitePhone,
        siteWhatsapp: settings.siteWhatsapp,
        siteAddress: settings.siteAddress,
        websiteUrl: settings.websiteUrl,
        chatbotMemoryJson: settings.chatbotMemoryJson,
        emailUser: settings.emailUser,
        emailPass: settings.emailPass,
        emailFrom: settings.emailFrom,
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        enableEmailNotifications: settings.enableEmailNotifications,
        cloudinaryCloudName: settings.cloudinaryCloudName,
        cloudinaryFolder: settings.cloudinaryFolder,
        cloudinaryApiKey: settings.cloudinaryApiKey,
        cloudinaryApiSecret: settings.cloudinaryApiSecret
      };

      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Settings saved successfully!');
      } else {
        showError(data.error || 'Failed to save settings');
      }
    } catch (error) {
      showError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div className="loading">Loading settings...</div>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'booking', label: 'Booking', icon: Database },
    { id: 'cloudinary', label: 'Cloudinary', icon: Database },
    { id: 'chatbot', label: 'Chatbot Memory', icon: Shield }
  ];

  return (
    <div className="settings-page">
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
      <div className="page-header">
        <h1>System Settings</h1>
        <button className="save-btn" onClick={handleSave} disabled={saving}>
          <Save size={20} />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="settings-container">
        <div className="tabs-sidebar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id as 'general' | 'email' | 'notifications' | 'security' | 'booking' | 'cloudinary' | 'chatbot')}
              >
                <Icon size={20} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="settings-content">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="settings-section">
              <h2>General Settings</h2>
              
              <div className="form-group">
                <label>Site Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={settings.siteName}
                  onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Contact Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={settings.siteEmail}
                  onChange={(e) => setSettings({ ...settings, siteEmail: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Contact Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  value={settings.sitePhone}
                  onChange={(e) => setSettings({ ...settings, sitePhone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>WhatsApp Number</label>
                <input
                  type="tel"
                  className="form-input"
                  value={settings.siteWhatsapp}
                  onChange={(e) => setSettings({ ...settings, siteWhatsapp: e.target.value })}
                  placeholder="+91 9876543210"
                />
              </div>

              <div className="form-group">
                <label>Address</label>
                <textarea
                  className="form-input"
                  value={settings.siteAddress}
                  onChange={(e) => setSettings({ ...settings, siteAddress: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Website URL</label>
                <input
                  type="url"
                  className="form-input"
                  value={settings.websiteUrl}
                  onChange={(e) => setSettings({ ...settings, websiteUrl: e.target.value })}
                  placeholder="https://feelme-town.com"
                />
              </div>
            </div>
          )}

          {activeTab === 'chatbot' && (
            <div className="settings-section">
              <h2>Chatbot Memory (JSON)</h2>

              <div className="form-group">
                <label>Chatbot Memory JSON</label>
                <textarea
                  className="form-input"
                  value={settings.chatbotMemoryJson}
                  onChange={(e) => setSettings({ ...settings, chatbotMemoryJson: e.target.value })}
                  rows={12}
                  placeholder='{
  "about": "FeelME Town is a private theatre in Dwarka...",
  "policies": {
    "cancellation": "..."
  },
  "faq": [
    {"q": "...", "a": "..."}
  ]
}'
                />
                <p className="form-hint">Paste valid JSON only. This will be used by the chatbot to answer customers.</p>
              </div>
            </div>
          )}

          {/* Email Settings */}
          {activeTab === 'email' && (
            <div className="settings-section">
              <h2>Email Configuration</h2>
              
              <div className="form-group">
                <label>Email User (Gmail)</label>
                <input
                  type="email"
                  className="form-input"
                  value={settings.emailUser}
                  onChange={(e) => setSettings({ ...settings, emailUser: e.target.value })}
                  placeholder="your-email@gmail.com"
                />
              </div>

              <div className="form-group">
                <label>Email Password (App Password)</label>
                <input
                  type="password"
                  className="form-input"
                  value={settings.emailPass || ''}
                  onChange={(e) => setSettings({ ...settings, emailPass: e.target.value })}
                  placeholder="Enter email app password"
                />
                <p className="form-hint">Use an app password (recommended for Gmail).</p>
              </div>

              <div className="form-group">
                <label>From Name & Email</label>
                <input
                  type="text"
                  className="form-input"
                  value={settings.emailFrom}
                  onChange={(e) => setSettings({ ...settings, emailFrom: e.target.value })}
                  placeholder="FeelME Town <noreply@feelmetown.com>"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>SMTP Host</label>
                  <input
                    type="text"
                    className="form-input"
                    value={settings.smtpHost}
                    onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>SMTP Port</label>
                  <input
                    type="text"
                    className="form-input"
                    value={settings.smtpPort}
                    onChange={(e) => setSettings({ ...settings, smtpPort: e.target.value })}
                  />
                </div>
              </div>

              <div className="info-box">
                <p>📧 You can configure SMTP via these fields. For Gmail, use an App Password.</p>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="settings-section">
              <h2>Notification Preferences</h2>
              
              <div className="toggle-group">
                <label className="toggle-label">
                  <span>Email Notifications</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.enableEmailNotifications}
                      onChange={(e) => setSettings({ ...settings, enableEmailNotifications: e.target.checked })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </label>
                <p className="toggle-hint">Send email notifications for bookings and updates</p>
              </div>

              <div className="toggle-group">
                <label className="toggle-label">
                  <span>SMS Notifications</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.enableSMSNotifications}
                      onChange={(e) => setSettings({ ...settings, enableSMSNotifications: e.target.checked })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </label>
                <p className="toggle-hint">Send SMS alerts for important updates</p>
              </div>

              <div className="toggle-group">
                <label className="toggle-label">
                  <span>Booking Alerts</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.enableBookingAlerts}
                      onChange={(e) => setSettings({ ...settings, enableBookingAlerts: e.target.checked })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </label>
                <p className="toggle-hint">Receive alerts for new bookings</p>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="settings-section">
              <h2>Security Settings</h2>
              
              <div className="form-group">
                <label>Session Lifetime (days)</label>
                <input
                  type="number"
                  className="form-input"
                  value={settings.sessionTimeout}
                  onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                />
                <p className="form-hint">Auto logout after configured days (not activity-based)</p>
              </div>

              <div className="form-group">
                <label>Max Login Attempts</label>
                <input
                  type="number"
                  className="form-input"
                  value={settings.maxLoginAttempts}
                  onChange={(e) => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) })}
                />
                <p className="form-hint">Lock account after failed attempts</p>
              </div>
            </div>
          )}

          {/* Booking Settings */}
          {activeTab === 'booking' && (
            <div className="settings-section">
              <h2>Booking Configuration</h2>
              
              <div className="form-group">
                <label>Booking Expiry (hours)</label>
                <input
                  type="number"
                  className="form-input"
                  value={settings.bookingExpiryHours}
                  onChange={(e) => setSettings({ ...settings, bookingExpiryHours: parseInt(e.target.value) })}
                />
                <p className="form-hint">Incomplete bookings expire after</p>
              </div>

              <div className="form-group">
                <label>Cancellation Window (hours before booking)</label>
                <input
                  type="number"
                  className="form-input"
                  value={settings.cancellationHours}
                  onChange={(e) => setSettings({ ...settings, cancellationHours: parseInt(e.target.value) })}
                />
                <p className="form-hint">Minimum hours required for cancellation</p>
              </div>

              <div className="form-group">
                <label>Refund Percentage (%)</label>
                <input
                  type="number"
                  className="form-input"
                  value={settings.refundPercentage}
                  onChange={(e) => setSettings({ ...settings, refundPercentage: parseInt(e.target.value) })}
                  min="0"
                  max="100"
                />
                <p className="form-hint">Percentage of amount to refund on cancellation</p>
              </div>
            </div>
          )}

          {/* Cloudinary Settings */}
          {activeTab === 'cloudinary' && (
          <div className="settings-section">
            <h2>Cloudinary Configuration</h2>
            
            <div className="form-group">
              <label>Cloud Name</label>
              <input
                type="text"
                className="form-input"
                value={settings.cloudinaryCloudName}
                onChange={(e) => setSettings({ ...settings, cloudinaryCloudName: e.target.value })}
                placeholder="your-cloud-name"
              />
            </div>

            <div className="form-group">
              <label>Base Folder</label>
              <input
                type="text"
                className="form-input"
                value={settings.cloudinaryFolder}
                onChange={(e) => setSettings({ ...settings, cloudinaryFolder: e.target.value })}
                placeholder="feelmetown"
              />
            </div>

            <div className="form-group">
              <label>API Key</label>
              <input
                type="text"
                className="form-input"
                value={settings.cloudinaryApiKey}
                onChange={(e) => setSettings({ ...settings, cloudinaryApiKey: e.target.value })}
                placeholder="Enter Cloudinary API Key"
              />
            </div>

            <div className="form-group">
              <label>API Secret</label>
              <input
                type="password"
                className="form-input"
                value={settings.cloudinaryApiSecret}
                onChange={(e) => setSettings({ ...settings, cloudinaryApiSecret: e.target.value })}
                placeholder="Enter Cloudinary API Secret"
              />
            </div>
          </div>
        )}
        </div>
      </div>

      <style jsx>{`
        .settings-page {
          padding: 2rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .page-header h1 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 2rem;
          color: #333;
        }

        .save-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: var(--accent-color);
          color: white;
          border: none;
          border-radius: 8px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .save-btn:hover {
          background: #c41e3a;
        }

        .save-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .settings-container {
          display: grid;
          grid-template-columns: 250px 1fr;
          gap: 2rem;
        }

        .tabs-sidebar {
          background: white;
          border-radius: 12px;
          padding: 1rem;
          height: fit-content;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .tab-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          background: transparent;
          border: none;
          border-radius: 8px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.95rem;
          color: #666;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: left;
          margin-bottom: 0.5rem;
        }

        .tab-btn:hover {
          background: #f5f5f5;
          color: #333;
        }

        .tab-btn.active {
          background: var(--accent-color);
          color: white;
        }

        .settings-content {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .settings-section h2 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.5rem;
          color: #333;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #f0f0f0;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          color: #000000 !important;
          margin-bottom: 0.5rem;
        }

        .form-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          color: #000;
          background: white;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--accent-color);
        }

        textarea.form-input {
          resize: vertical;
          min-height: 80px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-hint {
          font-size: 0.8rem;
          color: #666;
          margin-top: 0.25rem;
        }

        .toggle-group {
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid #f0f0f0;
        }

        .toggle-group:last-child {
          border-bottom: none;
        }

        .toggle-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .toggle-label span {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 1rem;
          color: #333;
          font-weight: 500;
        }

        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 26px;
          cursor: pointer;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: 0.4s;
          border-radius: 26px;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.4s;
          border-radius: 50%;
        }

        .toggle-switch input:checked + .toggle-slider {
          background-color: #10b981;
        }

        .toggle-switch input:checked + .toggle-slider:before {
          transform: translateX(24px);
        }

        .toggle-hint {
          font-size: 0.85rem;
          color: #666;
          margin-top: 0.5rem;
        }

        .info-box {
          background: #f0f9ff;
          border-left: 4px solid #0369a1;
          padding: 1rem 1.5rem;
          border-radius: 6px;
          margin-top: 1.5rem;
        }

        .info-box p {
          font-size: 0.9rem;
          color: #0c4a6e;
          margin: 0.5rem 0;
        }

        .loading {
          text-align: center;
          padding: 3rem;
          color: #666;
          font-size: 1.1rem;
        }

        /* Make all labels clearly visible in settings */
        .settings-section label,
        .form-group label {
          color: #000 !important;
        }

      `}</style>
    </div>
  );
}

