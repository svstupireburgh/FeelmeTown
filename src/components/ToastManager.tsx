'use client';

import { useState, useCallback, useEffect } from 'react';
import Toast from './Toast';

interface ToastData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export default function ToastManager() {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [enabled, setEnabled] = useState<boolean>(true);

  const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Fetch settings to gate booking alerts toasts
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings');
        const data = await res.json();
        const isEnabled = !!(data?.settings?.enableBookingAlerts);
        setEnabled(isEnabled);
        if (typeof window !== 'undefined') {
          (window as any).showToast = isEnabled ? addToast : (() => {});
        }
      } catch (e) {
        setEnabled(true);
        if (typeof window !== 'undefined') {
          (window as any).showToast = addToast;
        }
      }
    };
    fetchSettings();
  }, [addToast]);

  return (
    <div className="toast-container" style={{ display: enabled ? undefined : 'none' }}>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          onClose={removeToast}
        />
      ))}
    </div>
  );
}
