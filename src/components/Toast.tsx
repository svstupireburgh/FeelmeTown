'use client';

import { useState, useEffect } from 'react';
import { Check, X, AlertCircle, Info } from 'lucide-react';

interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

export default function Toast({ id, type, message, duration = 4000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);

    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(id), 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Check size={20} />;
      case 'error':
        return <X size={20} />;
      case 'warning':
        return <AlertCircle size={20} />;
      case 'info':
        return <Info size={20} />;
      default:
        return <Info size={20} />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return 'toast-success';
      case 'error':
        return 'toast-error';
      case 'warning':
        return 'toast-warning';
      case 'info':
        return 'toast-info';
      default:
        return 'toast-info';
    }
  };

  return (
    <div
      className={`toast ${getColors()} ${isVisible ? 'toast-visible' : 'toast-hidden'}`}
      onClick={handleClose}
    >
      <div className="toast-icon">{getIcon()}</div>
      <div className="toast-content">
        <p className="toast-message">{message}</p>
      </div>

      <style jsx global>{`
        .toast {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-radius: 16px;
          cursor: pointer;
          min-width: 280px;
          max-width: 520px;
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(20px) saturate(180%);
           -webkit-backdrop-filter: blur(20px) saturate(180%);
          transition: all 0.4s ease-in-out;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;

          /* Glassmorphism Effect */
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow:
            0 8px 24px rgba(0, 0, 0, 0.15),
            inset 0 1px 1px rgba(255, 255, 255, 0.1);
          color: white;
        }

        .toast-visible {
          transform: translateX(0);
          opacity: 1;
        }

        .toast-hidden {
          transform: translateX(100%);
          opacity: 0;
        }

        .toast-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
        }

        .toast-content {
          flex: 1;
        }

        .toast-message {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 500;
          line-height: 1.4;
          text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
        }

        /* Toast Types */
        .toast-success .toast-icon {
          color: #22c55e;
        }

        .toast-error .toast-icon {
          color: #ef4444;
        }

        .toast-warning .toast-icon {
          color: #fbbf24;
        }

        .toast-info .toast-icon {
          color: #3b82f6;
        }

        /* Toast container (for positioning multiple toasts) */
        .toast-container {
          position: fixed;
          top: 2rem;
          right: 2rem;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          pointer-events: none;
        }

        .toast-container > * {
          pointer-events: auto;
        }

        @media (max-width: 768px) {
          .toast-container {
            top: 1rem;
            right: 1rem;
            left: 1rem;
          }

          .toast {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
