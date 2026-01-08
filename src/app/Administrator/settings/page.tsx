'use client';

import { useState, useEffect } from 'react';
import { Save, Mail, Lock, User, Globe, Bell, Shield, Database, RotateCcw, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';

const DEFAULT_WHATSAPP_PREFILLS = [
  "Hi! I'd like to book a show.",
  "Hello, I have a question about my booking.",
  "Can you tell me more about the theatre?"
];

interface Settings {
  // Site Settings
  siteName: string;
  siteEmail: string;
  sitePhone: string;
  siteWhatsapp: string;
  siteAddress: string;
  websiteUrl: string;
  whatsappPrefilledMessages: string[];
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
  bookingAutoCompleteEnabled: boolean;
  bookingAutoCompleteTime: string;
  
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
    whatsappPrefilledMessages: DEFAULT_WHATSAPP_PREFILLS,
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
    bookingAutoCompleteEnabled: false,
    bookingAutoCompleteTime: '12:00 AM',
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
  const [activeTab, setActiveTab] = useState<'general' | 'email' | 'notifications' | 'security' | 'booking' | 'cloudinary' | 'whatsapp' | 'chatbot' | 'counters'>('general');
  const { toasts, removeToast, showSuccess, showError } = useToast();
  
  // Reset counters state
  const [resettingCounters, setResettingCounters] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [currentCounters, setCurrentCounters] = useState<any>(null);
  const [realTimeInterval, setRealTimeInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Show/hide password state
  const [showApiSecret, setShowApiSecret] = useState(false);

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
          // General and non-email from env (fallback to DB)
          siteName: process.env.NEXT_PUBLIC_SITE_NAME ?? s.siteName ?? '',
          siteEmail: process.env.NEXT_PUBLIC_SITE_EMAIL ?? s.siteEmail ?? '',
          sitePhone: process.env.NEXT_PUBLIC_SITE_PHONE ?? s.sitePhone ?? '',
          siteWhatsapp: process.env.NEXT_PUBLIC_SITE_WHATSAPP ?? s.siteWhatsapp ?? '',
          siteAddress: process.env.NEXT_PUBLIC_SITE_ADDRESS ?? s.siteAddress ?? '',
          websiteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? s.websiteUrl ?? '',
          whatsappPrefilledMessages: Array.isArray(s.whatsappPrefilledMessages) && s.whatsappPrefilledMessages.length
            ? s.whatsappPrefilledMessages
            : DEFAULT_WHATSAPP_PREFILLS,

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
          bookingAutoCompleteEnabled: s.bookingAutoCompleteEnabled ?? false,
          bookingAutoCompleteTime: typeof s.bookingAutoCompleteTime === 'string' && s.bookingAutoCompleteTime.trim()
            ? s.bookingAutoCompleteTime.trim()
            : '12:00 AM',

          // Cloudinary: strictly from DB
          cloudinaryCloudName: s.cloudinaryCloudName ?? '',
          cloudinaryFolder: s.cloudinaryFolder ?? '',
          cloudinaryApiKey: s.cloudinaryApiKey ?? '',
          cloudinaryApiSecret: s.cloudinaryApiSecret ?? ''
        };
        setSettings(merged);
      }
    } catch (error) {
      showError('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleResetTimeBasedCounters = async () => {
    try {
      setResettingCounters(true);
      setShowResetConfirm(false);

      const response = await fetch('/api/admin/reset-counters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ resetAll: true })
      });

      const data = await response.json();
      if (data.success) {
        showSuccess('Counters reset! Today/Week/Month/Year set to 0 (Totals preserved).');

        setCurrentCounters((prev: any) => {
          if (!prev) return prev;
          const zeroTime = (block: any) => ({
            ...block,
            today: 0,
            thisWeek: 0,
            thisMonth: 0,
            thisYear: 0,
          });
          return {
            ...prev,
            onlineBookings: zeroTime(prev.onlineBookings),
            manualBookings: zeroTime(prev.manualBookings),
            completedBookings: zeroTime(prev.completedBookings),
            cancelledBookings: zeroTime(prev.cancelledBookings),
            incompleteBookings: zeroTime(prev.incompleteBookings),
          };
        });

        setTimeout(() => {
          fetchCurrentCounters();
        }, 500);
      } else {
        showError(data.error || 'Failed to reset counters');
      }
    } catch (error) {
      showError('Failed to reset counters');
    } finally {
      setResettingCounters(false);
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
      
      // Persist current settings state (general + email + notification + security + booking + cloudinary)
      const payload = {
        // General
        siteName: settings.siteName,
        siteEmail: settings.siteEmail,
        sitePhone: settings.sitePhone,
        siteWhatsapp: settings.siteWhatsapp,
        siteAddress: settings.siteAddress,
        websiteUrl: settings.websiteUrl,
        whatsappPrefilledMessages: settings.whatsappPrefilledMessages,

        chatbotMemoryJson: settings.chatbotMemoryJson,

        // Email
        emailUser: settings.emailUser,
        emailPass: settings.emailPass,
        emailFrom: settings.emailFrom,
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,

        // Notifications
        enableEmailNotifications: settings.enableEmailNotifications,
        enableSMSNotifications: settings.enableSMSNotifications,
        enableBookingAlerts: settings.enableBookingAlerts,

        // Security
        sessionTimeout: settings.sessionTimeout,
        maxLoginAttempts: settings.maxLoginAttempts,

        // Booking
        bookingExpiryHours: settings.bookingExpiryHours,
        cancellationHours: settings.cancellationHours,
        refundPercentage: settings.refundPercentage,
        bookingAutoCompleteEnabled: settings.bookingAutoCompleteEnabled,
        bookingAutoCompleteTime: settings.bookingAutoCompleteTime,

        // Cloudinary
        cloudinaryCloudName: settings.cloudinaryCloudName,
        cloudinaryFolder: settings.cloudinaryFolder,
        cloudinaryApiKey: settings.cloudinaryApiKey,
        cloudinaryApiSecret: settings.cloudinaryApiSecret,
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

  // Reset counters functions
  const fetchCurrentCounters = async () => {
    try {
      const response = await fetch('/api/admin/dashboard-stats');
      const data = await response.json();
      if (data.success) {
        setCurrentCounters(data.stats);
        console.log('🔄 Real-time counters updated:', new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('Failed to fetch counters:', error);
    }
  };

  // Start real-time counter updates
  const startRealTimeUpdates = () => {
    if (realTimeInterval) {
      clearInterval(realTimeInterval);
    }
    
    // Fetch immediately
    fetchCurrentCounters();
    
    // Then fetch every 3 seconds for real-time updates
    const interval = setInterval(() => {
      fetchCurrentCounters();
    }, 3000);
    
    setRealTimeInterval(interval);
    console.log('🚀 Real-time counter updates started (every 3 seconds)');
  };

  // Stop real-time counter updates
  const stopRealTimeUpdates = () => {
    if (realTimeInterval) {
      clearInterval(realTimeInterval);
      setRealTimeInterval(null);
      console.log('⏹️ Real-time counter updates stopped');
    }
  };

  const handleResetAllCounters = async () => {
    if (!showResetConfirm) {
      // First click - show confirmation
      await fetchCurrentCounters();
      setShowResetConfirm(true);
      return;
    }

    // Second click - actually reset
    try {
      setResettingCounters(true);
      const response = await fetch('/api/admin/reset-all-counters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ confirmReset: true })
      });

      const data = await response.json();
      
      if (data.success) {
        showSuccess('ALL counters have been reset to 0! This includes total counts from database.');
        setShowResetConfirm(false);
        
        // Immediately update counters to show 0 values
        setCurrentCounters({
          onlineBookings: { today: 0, thisWeek: 0, thisMonth: 0, thisYear: 0, total: 0 },
          manualBookings: { today: 0, thisWeek: 0, thisMonth: 0, thisYear: 0, total: 0 },
          completedBookings: { today: 0, thisWeek: 0, thisMonth: 0, thisYear: 0, total: 0 },
          cancelledBookings: { today: 0, thisWeek: 0, thisMonth: 0, thisYear: 0, total: 0 },
          incompleteBookings: { today: 0, thisWeek: 0, thisMonth: 0, thisYear: 0, total: 0 }
        });
        
        // Then fetch fresh data from server to confirm
        setTimeout(() => {
          fetchCurrentCounters();
        }, 1000);
      } else {
        showError(data.error || 'Failed to reset all counters');
      }
    } catch (error) {
      showError('Failed to reset all counters');
    } finally {
      setResettingCounters(false);
    }
  };

  const cancelResetConfirm = () => {
    setShowResetConfirm(false);
  };

  // Fetch counters when counters tab is selected and start real-time updates
  useEffect(() => {
    if (activeTab === 'counters') {
      startRealTimeUpdates();
    } else {
      stopRealTimeUpdates();
    }
    
    // Cleanup on unmount
    return () => {
      stopRealTimeUpdates();
    };
  }, [activeTab]);

  // Cleanup interval on component unmount
  useEffect(() => {
    return () => {
      if (realTimeInterval) {
        clearInterval(realTimeInterval);
      }
    };
  }, [realTimeInterval]);

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
    { id: 'whatsapp', label: 'WhatsApp Prefills', icon: User },
    { id: 'chatbot', label: 'Chatbot Memory', icon: Shield },
    { id: 'counters', label: 'Reset Counters', icon: RotateCcw }
  ];

  const handlePrefillChange = (index: number, value: string) => {
    setSettings(prev => {
      const updated = [...prev.whatsappPrefilledMessages];
      updated[index] = value;
      return { ...prev, whatsappPrefilledMessages: updated };
    });
  };

  const addPrefilledMessage = () => {
    setSettings(prev => ({
      ...prev,
      whatsappPrefilledMessages: [...prev.whatsappPrefilledMessages, '']
    }));
  };

  const removePrefilledMessage = (index: number) => {
    setSettings(prev => ({
      ...prev,
      whatsappPrefilledMessages: prev.whatsappPrefilledMessages.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="settings-page">
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
                onClick={() => setActiveTab(tab.id as 'general' | 'email' | 'notifications' | 'security' | 'booking' | 'cloudinary' | 'whatsapp' | 'chatbot' | 'counters')}
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

          {activeTab === 'whatsapp' && (
            <div className="settings-section">
              <h2>WhatsApp Prefilled Messages</h2>
              <p className="section-subtitle">These quick replies appear in the floating WhatsApp popup.</p>
              <div className="prefills-list">
                {settings.whatsappPrefilledMessages.map((message, index) => (
                  <div key={index} className="prefill-item">
                    <label>Message {index + 1}</label>
                    <div className="prefill-input-row">
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => handlePrefillChange(index, e.target.value)}
                        placeholder="Type prefilled message"
                      />
                      {settings.whatsappPrefilledMessages.length > 1 && (
                        <button
                          type="button"
                          className="remove-prefill-btn"
                          onClick={() => removePrefilledMessage(index)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="add-prefill-btn" onClick={addPrefilledMessage}>
                + Add Message
              </button>
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

              <div className="toggle-group">
                <label className="toggle-label">
                  <span>Booking Auto Complete</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.bookingAutoCompleteEnabled}
                      onChange={(e) => setSettings({ ...settings, bookingAutoCompleteEnabled: e.target.checked })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </label>
                <p className="toggle-hint">Automatically move paid Confirmed/Manual bookings to Completed at the configured IST time</p>
              </div>

              <div className="form-group">
                <label>Booking Auto Complete Time (IST)</label>
                <input
                  type="text"
                  className="form-input"
                  value={settings.bookingAutoCompleteTime}
                  onChange={(e) => setSettings({ ...settings, bookingAutoCompleteTime: e.target.value })}
                  placeholder="12:30 AM"
                />
                <p className="form-hint">If set to 12:00 AM, it will auto-complete previous day bookings (midnight boundary)</p>
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
              <div className="password-input-container">
                <input
                  type={showApiSecret ? "text" : "password"}
                  className="form-input password-input"
                  value={settings.cloudinaryApiSecret}
                  onChange={(e) => setSettings({ ...settings, cloudinaryApiSecret: e.target.value })}
                  placeholder="Enter Cloudinary API Secret"
                />
                <button
                  type="button"
                  className="eye-button"
                  onClick={() => setShowApiSecret(!showApiSecret)}
                  title={showApiSecret ? "Hide API Secret" : "Show API Secret"}
                >
                  {showApiSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reset Counters Settings */}
        {activeTab === 'counters' && (
          <div className="settings-section">
            <h2>Reset Counters</h2>
            <p className="section-description">
              ⚠️ <strong>DANGEROUS OPERATION:</strong> This will permanently reset ALL counter data including historical totals stored in the database.
            </p>
            
            {currentCounters && (
              <div className="current-counters-display">
                <div className="counters-header">
                  <h3>Current Counter Values</h3>
                  <div className="real-time-indicator">
                    <div className="pulse-dot"></div>
                    <span>Real-time Updates</span>
                  </div>
                </div>
                <div className="counters-grid">
                  <div className="counter-card">
                    <h4>Online Bookings</h4>
                    <div className="counter-values">
                      <span>Today: {currentCounters.onlineBookings?.today || 0}</span>
                      <span>Week: {currentCounters.onlineBookings?.thisWeek || 0}</span>
                      <span>Month: {currentCounters.onlineBookings?.thisMonth || 0}</span>
                      <span>Year: {currentCounters.onlineBookings?.thisYear || 0}</span>
                      <span className="total-count">Total: {currentCounters.onlineBookings?.total || 0}</span>
                    </div>
                  </div>
                  
                  <div className="counter-card">
                    <h4>Manual Bookings</h4>
                    <div className="counter-values">
                      <span>Today: {currentCounters.manualBookings?.today || 0}</span>
                      <span>Week: {currentCounters.manualBookings?.thisWeek || 0}</span>
                      <span>Month: {currentCounters.manualBookings?.thisMonth || 0}</span>
                      <span>Year: {currentCounters.manualBookings?.thisYear || 0}</span>
                      <span className="total-count">Total: {currentCounters.manualBookings?.total || 0}</span>
                    </div>
                  </div>
                  
                  <div className="counter-card">
                    <h4>Completed Bookings</h4>
                    <div className="counter-values">
                      <span>Today: {currentCounters.completedBookings?.today || 0}</span>
                      <span>Week: {currentCounters.completedBookings?.thisWeek || 0}</span>
                      <span>Month: {currentCounters.completedBookings?.thisMonth || 0}</span>
                      <span>Year: {currentCounters.completedBookings?.thisYear || 0}</span>
                      <span className="total-count">Total: {currentCounters.completedBookings?.total || 0}</span>
                    </div>
                  </div>
                  
                  <div className="counter-card">
                    <h4>Cancelled Bookings</h4>
                    <div className="counter-values">
                      <span>Today: {currentCounters.cancelledBookings?.today || 0}</span>
                      <span>Week: {currentCounters.cancelledBookings?.thisWeek || 0}</span>
                      <span>Month: {currentCounters.cancelledBookings?.thisMonth || 0}</span>
                      <span>Year: {currentCounters.cancelledBookings?.thisYear || 0}</span>
                      <span className="total-count">Total: {currentCounters.cancelledBookings?.total || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {!showResetConfirm ? (
              <div className="reset-action">
                <button 
                  className="reset-time-btn"
                  onClick={handleResetTimeBasedCounters}
                  disabled={resettingCounters}
                >
                  <RotateCcw size={20} />
                  Reset Only Counters (Today/Week/Month/Year)
                </button>
                <p className="reset-warning">
                  This will reset time-based counters only. Database totals will remain the same.
                </p>

                <button 
                  className="reset-all-btn"
                  onClick={handleResetAllCounters}
                  disabled={resettingCounters}
                >
                  <AlertTriangle size={20} />
                  Reset ALL Counters (Including Database Totals)
                </button>
                <p className="reset-warning">
                  This will reset both time-based counters (JSON) AND total counters (database). 
                  All historical data will be permanently lost.
                </p>
              </div>
            ) : (
              <div className="reset-confirmation">
                <div className="confirmation-box">
                  <AlertTriangle size={48} color="#dc2626" />
                  <h3>⚠️ CONFIRM DANGEROUS OPERATION</h3>
                  <p>
                    You are about to permanently delete ALL counter data including:
                  </p>
                  <ul>
                    <li>✅ Time-based counters (Today/Week/Month/Year) - stored in JSON</li>
                    <li>⚠️ <strong>Total counters (Historical data) - stored in DATABASE</strong></li>
                  </ul>
                  <p className="final-warning">
                    <strong>This action CANNOT be undone!</strong> All booking statistics will be lost forever.
                  </p>
                  
                  <div className="confirmation-actions">
                    <button 
                      className="cancel-reset-btn"
                      onClick={cancelResetConfirm}
                      disabled={resettingCounters}
                    >
                      Cancel - Keep Data Safe
                    </button>
                    <button 
                      className="confirm-reset-btn"
                      onClick={handleResetAllCounters}
                      disabled={resettingCounters}
                    >
                      {resettingCounters ? (
                        <>
                          <div className="spinner" />
                          Resetting...
                        </>
                      ) : (
                        <>
                          <RotateCcw size={16} />
                          YES - Delete ALL Counter Data
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />

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
        }

        .tab-btn.active {
          background: var(--accent-color);
          color: white !important;
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

        .section-subtitle {
          color: #555;
          margin-top: -1.5rem;
          margin-bottom: 1.5rem;
          font-size: 0.95rem;
        }

        .prefills-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .prefill-item {
          padding: 1rem 1.25rem;
          border: 1px solid #e5e5e5;
          border-radius: 10px;
          background: #fafafa;
          box-shadow: 0 4px 12px rgba(0,0,0,0.04);
        }

        .prefill-item label {
          margin-bottom: 0.4rem;
          font-weight: 600;
          display: inline-block;
          color: #333;
        }

        .prefill-input-row {
          display: flex;
          gap: 0.75rem;
        }

        .prefill-input-row input {
          flex: 1;
          padding: 0.8rem 1rem;
          border: 1px solid #d9d9d9;
          border-radius: 8px;
          font-size: 0.95rem;
          background: white;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.04);
          color: #111;
        }

        .prefill-input-row input::placeholder {
          color: #777;
        }

        .prefill-input-row input:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px rgba(237,32,36,0.15);
        }

        .remove-prefill-btn {
          align-self: stretch;
          padding: 0 1rem;
          border-radius: 8px;
          border: 1px solid rgba(220,38,38,0.3);
          background: rgba(220,38,38,0.08);
          color: #b91c1c;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .remove-prefill-btn:hover {
          background: rgba(220,38,38,0.16);
          border-color: rgba(220,38,38,0.45);
        }

        .add-prefill-btn {
          border: 1px dashed var(--accent-color);
          background: rgba(237,32,36,0.08);
          color: var(--accent-color);
          border-radius: 10px;
          padding: 0.85rem 1.25rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .add-prefill-btn:hover {
          background: rgba(237,32,36,0.15);
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          color: #000;
          margin-bottom: 0.5rem;
        }

        .form-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          color: #000 !important;
          background: white !important;
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

        .password-input-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .password-input {
          padding-right: 3rem !important;
          border: 1px solid #00000027 !important;
        }

        .password-input:focus {
          border-color: var(--accent-color) !important;
          box-shadow: 0 0 0 2px rgba(237, 32, 36, 0.2) !important;
        }

        .eye-button {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #666 !important;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          z-index: 10;
          height: 24px;
          width: 24px;
        }

        .eye-button:hover {
          color: var(--accent-color) !important;
          background: rgba(237, 32, 36, 0.1) !important;
        }

        .eye-button:focus {
          outline: none;
          color: var(--accent-color) !important;
        }

        .eye-button:active {
          transform: translateY(-50%) scale(0.95);
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

        .section-description {
          color: #333 !important;
          font-size: 0.95rem;
          line-height: 1.5;
          margin-bottom: 1.5rem;
        }

        /* Reset Counters Styles */
        .current-counters-display {
          margin: 2rem 0;
          padding: 1.5rem;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #e5e5e5;
        }

        .counters-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .current-counters-display h3 {
          color: #333;
          margin: 0;
          font-size: 1.2rem;
        }

        .real-time-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: #10b981;
          font-weight: 500;
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
          }
          
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }

        .counters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .counter-card {
          background: white;
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid #ddd;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .counter-card h4 {
          color: #333;
          margin-bottom: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
        }

        .counter-values {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .counter-values span {
          font-size: 0.9rem;
          color: #666;
        }

        .counter-values .total-count {
          font-weight: 600;
          color: #ED2024;
          font-size: 1rem;
          margin-top: 0.25rem;
          padding-top: 0.25rem;
          border-top: 1px solid #eee;
        }

        .reset-action {
          margin-top: 2rem;
          text-align: center;
        }

        .reset-all-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #dc2626, #ef4444);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 1rem;
        }

        .reset-all-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(220, 38, 38, 0.3);
        }

        .reset-all-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .reset-time-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 2rem;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 8px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-bottom: 1rem;
        }

        .reset-time-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(37, 99, 235, 0.25);
        }

        .reset-time-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .reset-warning {
          color: #dc2626;
          font-size: 0.9rem;
          max-width: 500px;
          margin: 0 auto;
          line-height: 1.4;
        }

        .reset-confirmation {
          margin-top: 2rem;
          display: flex;
          justify-content: center;
        }

        .confirmation-box {
          background: #fef2f2;
          border: 2px solid #fecaca;
          border-radius: 12px;
          padding: 2rem;
          max-width: 600px;
          text-align: center;
        }

        .confirmation-box h3 {
          color: #dc2626;
          margin: 1rem 0;
          font-size: 1.3rem;
        }

        .confirmation-box p {
          color: #666;
          margin-bottom: 1rem;
          line-height: 1.5;
        }

        .confirmation-box ul {
          text-align: left;
          margin: 1rem 0;
          padding-left: 1.5rem;
        }

        .confirmation-box li {
          margin-bottom: 0.5rem;
          color: #666;
        }

        .final-warning {
          color: #dc2626 !important;
          font-weight: 600 !important;
          font-size: 1rem !important;
        }

        .confirmation-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 2rem;
        }

        .cancel-reset-btn {
          background: #f5f5f5;
          color: #666;
          border: 1px solid #ddd;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cancel-reset-btn:hover:not(:disabled) {
          background: #e5e5e5;
          border-color: #ccc;
        }

        .confirm-reset-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #dc2626, #ef4444);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .confirm-reset-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
        }

        .confirm-reset-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #f3f3f3;
          border-top: 2px solid #ED2024;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
      `}</style>
    </div>
  );
}

