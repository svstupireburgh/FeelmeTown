'use client';

import { useState, useCallback } from 'react';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastMessage = {
      id,
      duration: 4000,
      ...toast,
    };
    
    setToasts(prev => [...prev, newToast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showSuccess = useCallback((message: string, duration?: number) => {
    addToast({ type: 'success', message, duration });
  }, [addToast]);

  const showError = useCallback((message: string, duration?: number) => {
    addToast({ type: 'error', message, duration });
  }, [addToast]);

  const showWarning = useCallback((message: string, duration?: number) => {
    addToast({ type: 'warning', message, duration });
  }, [addToast]);

  const showInfo = useCallback((message: string, duration?: number) => {
    addToast({ type: 'info', message, duration });
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}
