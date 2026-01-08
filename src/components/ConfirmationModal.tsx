'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'warning' | 'danger' | 'info';
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'warning'
}: ConfirmationModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm();
    setIsVisible(false);
  };

  const handleCancel = () => {
    onCancel();
    setIsVisible(false);
  };

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          iconColor: '#dc3545',
          confirmBg: '#dc3545',
          confirmHover: '#c82333'
        };
      case 'warning':
        return {
          iconColor: '#ffc107',
          confirmBg: '#ffc107',
          confirmHover: '#e0a800'
        };
      case 'info':
        return {
          iconColor: '#17a2b8',
          confirmBg: '#17a2b8',
          confirmHover: '#138496'
        };
      default:
        return {
          iconColor: '#ffc107',
          confirmBg: '#ffc107',
          confirmHover: '#e0a800'
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <div className={`modal-overlay ${isVisible ? 'modal-visible' : 'modal-hidden'}`}>
      <div className="modal-container">
        <div className="modal-header">
          <div className="modal-icon" style={{ color: typeStyles.iconColor }}>
            <AlertTriangle size={32} />
          </div>
          <button 
            className="modal-close"
            onClick={handleCancel}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-content">
          <h3 className="modal-title">{title}</h3>
          <p className="modal-message">{message}</p>
        </div>
        
        <div className="modal-actions">
          <button 
            className="modal-button modal-cancel"
            onClick={handleCancel}
          >
            {cancelText}
          </button>
          <button 
            className="modal-button modal-confirm"
            onClick={handleConfirm}
            style={{ 
              backgroundColor: typeStyles.confirmBg,
              borderColor: typeStyles.confirmBg
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = typeStyles.confirmHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = typeStyles.confirmBg;
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          padding: 1rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .modal-visible {
          opacity: 1;
        }

        .modal-hidden {
          opacity: 0;
          pointer-events: none;
        }

        .modal-container {
          background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.95) 0%, 
            rgba(255, 255, 255, 0.9) 100%);
          border-radius: 16px;
          box-shadow: 
            0 20px 60px rgba(0, 0, 0, 0.3),
            0 8px 32px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.3);
          max-width: 480px;
          width: 100%;
          max-height: 90vh;
          overflow: hidden;
          transform: scale(${isVisible ? '1' : '0.9'});
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 1.5rem 0 1.5rem;
        }

        .modal-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.8);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .modal-close {
          background: rgba(0, 0, 0, 0.1);
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #666;
        }

        .modal-close:hover {
          background: rgba(0, 0, 0, 0.2);
          color: #333;
        }

        .modal-content {
          padding: 1.5rem;
          text-align: center;
        }

        .modal-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #333;
          margin: 0 0 1rem 0;
          line-height: 1.3;
        }

        .modal-message {
          font-size: 1rem;
          color: #666;
          margin: 0;
          line-height: 1.5;
          white-space: pre-line;
        }

        .modal-actions {
          display: flex;
          gap: 0.75rem;
          padding: 0 1.5rem 1.5rem 1.5rem;
        }

        .modal-button {
          flex: 1;
          padding: 0.875rem 1.5rem;
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid transparent;
          min-height: 48px;
        }

        .modal-cancel {
          background: rgba(108, 117, 125, 0.1);
          color: #6c757d;
          border-color: rgba(108, 117, 125, 0.3);
        }

        .modal-cancel:hover {
          background: rgba(108, 117, 125, 0.2);
          color: #495057;
        }

        .modal-confirm {
          color: white;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .modal-confirm:active {
          transform: translateY(1px);
        }

        @media (max-width: 480px) {
          .modal-container {
            margin: 1rem;
            max-width: calc(100vw - 2rem);
          }

          .modal-header {
            padding: 1rem 1rem 0 1rem;
          }

          .modal-content {
            padding: 1rem;
          }

          .modal-actions {
            padding: 0 1rem 1rem 1rem;
            flex-direction: column;
          }

          .modal-title {
            font-size: 1.25rem;
          }

          .modal-message {
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
}
