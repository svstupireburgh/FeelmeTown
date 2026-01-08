'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, X, Check, AlertTriangle, Clock, DollarSign } from 'lucide-react';
import { useBooking } from '@/contexts/BookingContext';

interface BookingData {
  id: string;
  name: string;
  email: string;
  phone: string;
  theaterName: string;
  date: string;
  time: string;
  occasion: string;
  numberOfPeople: number;
  totalAmount: number;
  createdAt: string;
}

interface CancelBookingPopupProps {
  isOpen: boolean;
  onClose: () => void;
  bookingData: BookingData | null;
}

export default function CancelBookingPopup({ isOpen, onClose, bookingData }: CancelBookingPopupProps) {
  const { openBookingPopup } = useBooking();
  const [isLoaded, setIsLoaded] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [cancellationResult, setCancellationResult] = useState<{ success: boolean; message: string; refundAmount?: number } | null>(null);
  const [reasons, setReasons] = useState<string[]>([]);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setIsLoaded(true);
      setAgreeToTerms(false);
      setIsCancelling(false);
      setIsCancelled(false);
      setCancellationResult(null);
      setSelectedReason('');
      setCustomReason('');
      
      // Store original styles
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const originalWidth = document.body.style.width;
      const originalHeight = document.body.style.height;
      
      // Get current scroll position
      const scrollY = window.scrollY;
      
      // Disable body scroll when popup is open
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      
      // Add class to body for additional CSS control
      document.body.classList.add('popup-open');
      
      // Store cleanup function
      const cleanup = () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = originalWidth;
        document.body.style.height = originalHeight;
        document.body.classList.remove('popup-open');
        window.scrollTo(0, scrollY);
      };
      
      return cleanup;
    } else {
      // Enable body scroll when popup is closed
      document.body.style.overflow = 'unset';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.classList.remove('popup-open');
    }
  }, [isOpen]);

  useEffect(() => {
    (async () => {
      try {
        // Fetch cancel reasons from blob-backed API
        const res = await fetch('/api/cancel-reasons', { cache: 'no-cache' });
        const data = await res.json();
        
        if (data.success && Array.isArray(data.reasons)) {
          setReasons(data.reasons);
          console.log('✅ Cancel reasons loaded from API:', data.reasons.length, 'reasons');
        } else {
          console.warn('⚠️ Invalid cancel reasons response:', data);
          // Fallback to default reasons
          setReasons([
            "Change of plans",
            "Booked wrong date/time",
            "Found a better price",
            "Personal emergency",
            "Weather concerns", 
            "Transportation issues",
            "Other"
          ]);
        }
      } catch (error) {
        console.error('❌ Failed to fetch cancel reasons:', error);
        // Fallback to default reasons
        setReasons([
          "Change of plans",
          "Booked wrong date/time", 
          "Found a better price",
          "Personal emergency",
          "Weather concerns",
          "Transportation issues", 
          "Other"
        ]);
      }
    })();
  }, []);

  const calculateRefundAmount = () => {
    if (!bookingData) return 0;
    const bookingDate = new Date(bookingData.date);
    const now = new Date();
    const hoursUntilBooking = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // If more than 72 hours, full refund
    if (hoursUntilBooking > 72) {
      return Math.round(bookingData.totalAmount * 0.25); // 25% advance amount
    }
    
    // If less than 72 hours, no refund
    return 0;
  };

  const isRefundable = () => {
    if (!bookingData) return false;
    const bookingDate = new Date(bookingData.date);
    const now = new Date();
    const hoursUntilBooking = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilBooking > 72;
  };

  const handleCancelBooking = async () => {
    if (!bookingData || !agreeToTerms) return;
    
    setIsCancelling(true);
    
    try {
      const reasonToSend = selectedReason === 'Other' ? (customReason || '').trim() : selectedReason;
      const response = await fetch('/api/cancel-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: bookingData.id,
          email: bookingData.email,
          reason: reasonToSend
        })
      });

      const result = await response.json();

      if (result.success) {
        
        
        
        
        // Show success animation
        setCancellationResult(result);
        setIsCancelled(true);
      } else {
        
        
        
      }
    } catch (error) {
      
      
      
    } finally {
      setIsCancelling(false);
    }
  };

  const handleClose = () => {
    // Restore body scroll when closing popup
    document.body.style.overflow = 'unset';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.height = '';
    document.body.classList.remove('popup-open');
    onClose();
  };

  // Prevent scroll events from bubbling to background
  const handleOverlayScroll = (e: React.WheelEvent) => {
    e.stopPropagation();
  };

  const handleOverlayTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
  };

  if (!isOpen) {
    return null;
  }

  const refundAmount = calculateRefundAmount();
  const refundable = isRefundable();

  const popupContent = (
    <div 
      className="cancel-booking-popup-overlay" 
      onClick={handleClose}
      onWheel={handleOverlayScroll}
      onTouchMove={handleOverlayTouchMove}
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        zIndex: 999999,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        pointerEvents: 'auto'
      }}
    >
      <div 
        className={`cancel-booking-popup ${isLoaded ? 'cancel-booking-popup-loaded' : ''}`} 
        onClick={(e) => e.stopPropagation()}
        style={{
        position: 'relative',
        zIndex: 1000000,
        backgroundColor: '#000000',
        borderRadius: '1rem',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        width: '100%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'hidden',
        overflowY: 'auto',
        opacity: isLoaded ? 1 : 0,
        transform: isLoaded ? 'scale(1)' : 'scale(0.9)',
        transition: 'all 0.3s ease',
        pointerEvents: 'auto'
      }}>
        {/* Header */}
        <div className="cancel-booking-popup-header">
          <div className="cancel-booking-popup-nav">
            <button className="cancel-booking-popup-back-btn" onClick={handleClose}>
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <div className="cancel-booking-popup-brand">
              <div className="cancel-booking-popup-logo">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h1 className="cancel-booking-popup-title">Cancel Booking</h1>
            </div>
            <button className="cancel-booking-popup-close-btn" onClick={handleClose}>
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Hero Section */}
        {bookingData ? (
          <div className="cancel-booking-popup-hero">
            <div className="cancel-booking-popup-booking-info">
              <h2 className="cancel-booking-popup-booking-title">
                {bookingData.theaterName}
              </h2>
              <div className="cancel-booking-popup-meta">
                <div className="cancel-booking-popup-meta-item">
                  <Clock className="w-4 h-4" />
                  <span>{bookingData.date} at {bookingData.time}</span>
                </div>
                <div className="cancel-booking-popup-meta-item">
                  <span>{bookingData.numberOfPeople} Guests</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="cancel-booking-popup-hero">
            <div className="cancel-booking-popup-booking-info">
              <h2 className="cancel-booking-popup-booking-title">
                Booking Not Found
              </h2>
              <div className="cancel-booking-popup-meta">
                <div className="cancel-booking-popup-meta-item">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Your booking has already been deleted</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {bookingData ? (
          <div className="cancel-booking-popup-content">
          {/* Booking Details */}
          <div className="cancel-booking-popup-section">
            <h3 className="cancel-booking-popup-section-title">
              <Check className="w-5 h-5" />
              Booking Details
            </h3>
            
            <div className="cancel-booking-popup-details">
              <div className="cancel-booking-popup-detail-item">
                <span className="cancel-booking-popup-detail-label">Customer Name</span>
                <span className="cancel-booking-popup-detail-value">{bookingData.name}</span>
              </div>
              <div className="cancel-booking-popup-detail-item">
                <span className="cancel-booking-popup-detail-label">Email</span>
                <span className="cancel-booking-popup-detail-value">{bookingData.email}</span>
              </div>
              <div className="cancel-booking-popup-detail-item">
                <span className="cancel-booking-popup-detail-label">Phone</span>
                <span className="cancel-booking-popup-detail-value">{bookingData.phone}</span>
              </div>
              <div className="cancel-booking-popup-detail-item">
                <span className="cancel-booking-popup-detail-label">Occasion</span>
                <span className="cancel-booking-popup-detail-value">{bookingData.occasion}</span>
              </div>
              <div className="cancel-booking-popup-detail-item">
                <span className="cancel-booking-popup-detail-label">Total Amount</span>
                <span className="cancel-booking-popup-detail-value">₹{bookingData.totalAmount}</span>
              </div>
            </div>
          </div>

          {/* Refund Information */}
          <div className="cancel-booking-popup-section">
            <h3 className="cancel-booking-popup-section-title">
              <DollarSign className="w-5 h-5" />
              Refund Information
            </h3>
            
            <div className={`cancel-booking-popup-refund-info ${refundable ? 'refundable' : 'non-refundable'}`}>
              {refundable ? (
                <div>
                  <h4>✅ Refundable</h4>
                  <p>Your booking is more than 72 hours away. You are eligible for a full refund of your advance payment.</p>
                  <div className="cancel-booking-popup-refund-amount">
                    <span>Refund Amount: ₹{refundAmount}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <h4>❌ Non-Refundable</h4>
                  <p>Your booking is less than 72 hours away. As per our refund policy, no refund will be processed.</p>
                  <div className="cancel-booking-popup-refund-amount">
                    <span>Refund Amount: ₹0</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cancellation Reason */}
          <div className="cancel-booking-popup-section">
            <h3 className="cancel-booking-popup-section-title">
              <AlertTriangle className="w-5 h-5" />
              Cancellation Reason
            </h3>
            <div style={{ padding: '1.5rem' }}>
              {reasons.length > 0 ? (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {reasons.map((r, idx) => (
                    <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffffff' }}>
                      <input
                        type="radio"
                        name="cancel-reason"
                        value={r}
                        checked={selectedReason === r}
                        onChange={() => setSelectedReason(r)}
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Loading reasons...</div>
              )}
              {selectedReason === 'Other' && (
                <div style={{ marginTop: '0.75rem' }}>
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Enter custom reason"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#ffffff' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="cancel-booking-popup-section">
            <h3 className="cancel-booking-popup-section-title">
              <Check className="w-5 h-5" />
              Terms & Conditions
            </h3>
            
            <div className="cancel-booking-popup-terms-container">
              <div className="cancel-booking-popup-terms-section">
                <h4 className="cancel-booking-popup-terms-title">Cancellation Policy</h4>
                <div className="cancel-booking-popup-terms-content">
                  <ul className="cancel-booking-popup-terms-list">
                    <li>Advance amount is fully refundable if slot is cancelled at least 72 hrs before the slot time.</li>
                    <li>If your slot is less than 72 hrs away from time of payment then advance is non-refundable.</li>
                    <li>Cancellation will permanently delete your booking from our system.</li>
                    <li>Refund will be processed within 5-7 business days to your original payment method.</li>
                    <li>Once cancelled, you cannot rebook the same slot without going through the booking process again.</li>
                  </ul>
                </div>
              </div>

              <div className="cancel-booking-popup-agreement">
                <label className="cancel-booking-popup-checkbox-label">
                  <input
                    type="checkbox"
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    className="cancel-booking-popup-checkbox"
                  />
                  <span className="cancel-booking-popup-checkbox-text">
                    I understand and agree to the cancellation policy and terms & conditions.
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {!isCancelled && (
            <div className="cancel-booking-popup-action">
              <button 
                onClick={handleCancelBooking} 
                className={`cancel-booking-popup-btn ${(!agreeToTerms || isCancelling || !selectedReason || (selectedReason === 'Other' && !(customReason || '').trim())) ? 'disabled' : ''}`}
                disabled={!agreeToTerms || isCancelling || !selectedReason || (selectedReason === 'Other' && !(customReason || '').trim())}
              >
                <span>{isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}</span>
              </button>
            </div>
          )}
          </div>
        ) : (
          <div className="cancel-booking-popup-content">
            {/* Booking Not Found Message */}
            <div className="cancel-booking-popup-section">
              <div className="cancel-booking-popup-not-found">
                <div className="cancel-booking-popup-not-found-icon">
                  <AlertTriangle className="w-16 h-16" />
                </div>
                <h3 className="cancel-booking-popup-not-found-title">
                  Your booking already deleted
                </h3>
                <p className="cancel-booking-popup-not-found-message">
                  The booking you&apos;re trying to cancel has already been removed from our system. 
                  You can create a new booking if needed.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="cancel-booking-popup-action">
              <button 
                onClick={() => {
                  onClose();
                  openBookingPopup();
                }}
                className="cancel-booking-popup-btn primary"
              >
                <span>New Booking</span>
              </button>
              <button 
                onClick={onClose}
                className="cancel-booking-popup-btn secondary"
              >
                <span>Close</span>
              </button>
            </div>
          </div>
        )}

        {/* Success Animation */}
        {isCancelled && cancellationResult && (
          <div className="cancel-booking-popup-success">
            <div className="cancel-booking-popup-success-content">
              <div className="cancel-booking-popup-success-animation">
                <div className="cancel-booking-popup-success-checkmark">
                  <div className="cancel-booking-popup-success-checkmark-circle">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="64" 
                      height="64" 
                      viewBox="0 0 16 16"
                      className="cancel-booking-popup-success-checkmark-svg"
                    >
                      <polyline 
                        fill="none" 
                        stroke="currentColor" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth="2" 
                        points="2.75 8.75 6.25 12.25 13.25 4.75"
                        className="cancel-booking-popup-success-checkmark-path"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              
              <h2 className="cancel-booking-popup-success-title">
                Booking Cancelled Successfully!
              </h2>
              
              <div className="cancel-booking-popup-success-message">
                <p>Your booking has been cancelled and removed from our system.</p>
                {cancellationResult.refundAmount && cancellationResult.refundAmount > 0 ? (
                  <div className="cancel-booking-popup-success-refund">
                    <p>💰 Refund of ₹{cancellationResult.refundAmount} will be processed within 5-7 business days.</p>
                  </div>
                ) : (
                  <div className="cancel-booking-popup-success-no-refund">
                    <p>ℹ️ No refund applicable as per cancellation policy.</p>
                  </div>
                )}
              </div>
              
              <div className="cancel-booking-popup-success-actions">
                <button 
                  onClick={() => {
                    onClose();
                    // Open new booking popup
                    openBookingPopup();
                  }}
                  className="cancel-booking-popup-success-btn primary"
                >
                  New Booking
                </button>
                <button 
                  onClick={onClose}
                  className="cancel-booking-popup-success-btn secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Styles */}
        <style jsx global>{`
          body.popup-open {
            overflow: hidden !important;
            position: fixed !important;
            width: 100% !important;
            height: 100% !important;
          }
        `}</style>
        <style jsx>{`
          .cancel-booking-popup-overlay {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(0, 0, 0, 0.9) !important;
            backdrop-filter: blur(10px) !important;
            z-index: 999999 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 1rem !important;
            margin: 0 !important;
            overflow: hidden !important;
            overscroll-behavior: contain !important;
          }

          .cancel-booking-popup {
            width: 100% !important;
            max-width: 800px !important;
            max-height: 95vh !important;
            background: #000000 !important;
            border-radius: 1rem !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            overflow: hidden !important;
            overflow-y: auto !important;
            opacity: 0 !important;
            transform: scale(0.9) !important;
            transition: all 0.3s ease !important;
            position: relative !important;
            z-index: 1000000 !important;
            overscroll-behavior: contain !important;
            -webkit-overflow-scrolling: touch !important;
            margin: 0.5rem !important;
          }

          .cancel-booking-popup-loaded {
            opacity: 1 !important;
            transform: scale(1) !important;
          }

          .cancel-booking-popup-header {
            background: rgba(255, 255, 255, 0.05);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding: 1rem 1.5rem;
            position: sticky;
            top: 0;
            z-index: 10;
          }

          .cancel-booking-popup-nav {
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .cancel-booking-popup-back-btn {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: transparent;
            border: none;
            color: #ffffff;
            cursor: pointer;
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            transition: all 0.3s ease;
          }

          .cancel-booking-popup-back-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #FF0005;
          }

          .cancel-booking-popup-brand {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .cancel-booking-popup-logo {
            width: 2.5rem;
            height: 2.5rem;
            background: linear-gradient(135deg, #dc3545, #c82333);
            border-radius: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
          }

          .cancel-booking-popup-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: #ffffff;
            margin: 0;
          }

          .cancel-booking-popup-close-btn {
            background: transparent;
            border: none;
            color: #ffffff;
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 50%;
            transition: all 0.3s ease;
          }

          .cancel-booking-popup-close-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #FF0005;
          }

          .cancel-booking-popup-hero {
            background: linear-gradient(135deg, #dc3545, #c82333, #000000);
            padding: 1.5rem 2rem;
            text-align: center;
          }

          .cancel-booking-popup-booking-title {
            font-size: 1.5rem;
            font-weight: 900;
            color: #ffffff;
            margin: 0 0 1rem 0;
            line-height: 1.2;
          }

          .cancel-booking-popup-meta {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            flex-wrap: wrap;
          }

          .cancel-booking-popup-meta-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: rgba(0, 0, 0, 0.4);
            border-radius: 2rem;
            color: #ffffff;
          }

          .cancel-booking-popup-content {
            padding: 1rem 1.5rem;
            max-height: 65vh;
            overflow-y: auto;
            overscroll-behavior: contain;
            -webkit-overflow-scrolling: touch;
          }

          .cancel-booking-popup-section {
            background: rgba(255, 255, 255, 0.02);
            border-radius: 1rem;
            border: 1px solid rgba(255, 255, 255, 0.1);
            overflow: hidden;
            margin-bottom: 1.5rem;
          }

          .cancel-booking-popup-section-title {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 1.25rem;
            font-weight: 700;
            color: #ffffff;
            margin: 0;
            padding: 1rem 1.5rem;
            background: rgba(255, 255, 255, 0.05);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }

          .cancel-booking-popup-details {
            padding: 1.5rem;
          }

          .cancel-booking-popup-detail-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          }

          .cancel-booking-popup-detail-item:last-child {
            border-bottom: none;
          }

          .cancel-booking-popup-detail-label {
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.9rem;
            font-weight: 500;
          }

          .cancel-booking-popup-detail-value {
            color: #ffffff;
            font-size: 0.9rem;
            font-weight: 600;
          }

          .cancel-booking-popup-refund-info {
            padding: 1.5rem;
            border-radius: 0.75rem;
            margin: 1rem;
          }

          .cancel-booking-popup-refund-info.refundable {
            background: linear-gradient(135deg, rgba(40, 167, 69, 0.2), rgba(25, 135, 84, 0.2));
            border: 1px solid rgba(40, 167, 69, 0.3);
          }

          .cancel-booking-popup-refund-info.non-refundable {
            background: linear-gradient(135deg, rgba(220, 53, 69, 0.2), rgba(200, 35, 51, 0.2));
            border: 1px solid rgba(220, 53, 69, 0.3);
          }

          .cancel-booking-popup-refund-info h4 {
            font-size: 1.1rem;
            font-weight: 700;
            margin: 0 0 0.5rem 0;
            color: #ffffff;
          }

          .cancel-booking-popup-refund-info p {
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.9rem;
            line-height: 1.5;
            margin: 0 0 1rem 0;
          }

          .cancel-booking-popup-refund-amount {
            background: rgba(0, 0, 0, 0.3);
            padding: 0.75rem 1rem;
            border-radius: 0.5rem;
            text-align: center;
          }

          .cancel-booking-popup-refund-amount span {
            font-size: 1.25rem;
            font-weight: 700;
            color: #ffffff;
          }

          .cancel-booking-popup-terms-container {
            padding: 1.5rem;
          }

          .cancel-booking-popup-terms-section {
            margin-bottom: 1.5rem;
          }

          .cancel-booking-popup-terms-title {
            font-size: 1.1rem;
            font-weight: 700;
            color: #FF0005;
            margin: 0 0 1rem 0;
          }

          .cancel-booking-popup-terms-content {
            background: rgba(255, 255, 255, 0.02);
            border-radius: 0.75rem;
            padding: 1.25rem;
            border: 1px solid rgba(255, 255, 255, 0.05);
          }

          .cancel-booking-popup-terms-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }

          .cancel-booking-popup-terms-list li {
            color: rgba(255, 255, 255, 0.9);
            font-size: 0.9rem;
            line-height: 1.6;
            margin-bottom: 0.75rem;
            padding-left: 1.5rem;
            position: relative;
          }

          .cancel-booking-popup-terms-list li:before {
            content: '•';
            color: #FF0005;
            font-weight: bold;
            position: absolute;
            left: 0;
            top: 0;
          }

          .cancel-booking-popup-terms-list li:last-child {
            margin-bottom: 0;
          }

          .cancel-booking-popup-agreement {
            background: rgba(255, 0, 5, 0.1);
            border-radius: 0.75rem;
            padding: 1.25rem;
            border: 1px solid rgba(255, 0, 5, 0.2);
            margin-top: 1rem;
          }

          .cancel-booking-popup-checkbox-label {
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
            cursor: pointer;
            color: rgba(255, 255, 255, 0.9);
            font-size: 0.9rem;
            line-height: 1.5;
          }

          .cancel-booking-popup-checkbox {
            width: 1.25rem;
            height: 1.25rem;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 0.25rem;
            background: transparent;
            cursor: pointer;
            flex-shrink: 0;
            margin-top: 0.125rem;
            transition: all 0.3s ease;
          }

          .cancel-booking-popup-checkbox:checked {
            background: #FF0005;
            border-color: #FF0005;
            position: relative;
          }

          .cancel-booking-popup-checkbox:checked:after {
            content: '✓';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 0.75rem;
            font-weight: bold;
          }

          .cancel-booking-popup-checkbox-text {
            flex: 1;
            font-weight: 500;
          }

          .cancel-booking-popup-action {
            padding: 1rem 1.5rem;
            background: rgba(255, 255, 255, 0.02);
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            justify-content: center;
            position: sticky;
            bottom: 0;
            z-index: 10;
          }

          .cancel-booking-popup-btn {
            background: linear-gradient(135deg, #dc3545, #c82333);
            color: #ffffff;
            border: none;
            padding: 0.875rem 1.5rem;
            border-radius: 2rem;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            box-shadow: 0 4px 15px rgba(220, 53, 69, 0.4);
            width: 100%;
            max-width: 300px;
            justify-content: center;
          }

          .cancel-booking-popup-btn:hover:not(.disabled) {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(220, 53, 69, 0.6);
          }

          .cancel-booking-popup-btn.disabled {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.5);
            cursor: not-allowed;
            box-shadow: none;
          }

          /* Mobile Responsive */
          @media (max-width: 480px) {
            .cancel-booking-popup {
              margin: 0.25rem !important;
              max-height: 98vh !important;
              border-radius: 0.75rem !important;
            }

            .cancel-booking-popup-overlay {
              padding: 0.25rem !important;
            }

            .cancel-booking-popup-header {
              padding: 0.75rem 1rem;
            }

            .cancel-booking-popup-title {
              font-size: 1.25rem;
            }

            .cancel-booking-popup-hero {
              padding: 1rem 1.5rem;
            }

            .cancel-booking-popup-booking-title {
              font-size: 1.25rem;
            }

            .cancel-booking-popup-meta {
              flex-direction: column;
              gap: 0.5rem;
            }

            .cancel-booking-popup-meta-item {
              font-size: 0.8rem;
              padding: 0.4rem 0.8rem;
            }

            .cancel-booking-popup-content {
              padding: 0.75rem 1rem;
              max-height: 70vh;
            }

            .cancel-booking-popup-details {
              padding: 1rem;
            }

            .cancel-booking-popup-detail-item {
              flex-direction: column;
              align-items: flex-start;
              gap: 0.25rem;
            }

            .cancel-booking-popup-refund-info {
              margin: 0.5rem;
              padding: 1rem;
            }

            .cancel-booking-popup-terms-container {
              padding: 1rem;
            }

            .cancel-booking-popup-terms-content {
              padding: 1rem;
            }

            .cancel-booking-popup-terms-list li {
              font-size: 0.85rem;
              margin-bottom: 0.5rem;
            }

            .cancel-booking-popup-agreement {
              padding: 1rem;
            }

            .cancel-booking-popup-checkbox-label {
              font-size: 0.85rem;
            }

            .cancel-booking-popup-action {
              padding: 0.75rem 1rem;
            }

            .cancel-booking-popup-btn {
              padding: 0.75rem 1.25rem;
              font-size: 0.85rem;
            }
          }

          /* Success Animation Styles */
          .cancel-booking-popup-success {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            animation: fadeIn 0.5s ease-in-out;
          }

          .cancel-booking-popup-success-content {
            text-align: center;
            padding: 2rem;
            max-width: 400px;
            width: 100%;
          }

          .cancel-booking-popup-success-animation {
            position: relative;
            margin-bottom: 2rem;
          }

          .cancel-booking-popup-success-checkmark {
            position: relative;
            width: 80px;
            height: 80px;
            margin: 0 auto;
          }

          .cancel-booking-popup-success-checkmark-circle {
            position: relative;
            width: 80px;
            height: 80px;
            border: 4px solid #00ff00;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: scaleIn 0.4s ease-out;
            background: rgba(0, 255, 0, 0.1);
          }

          .cancel-booking-popup-success-checkmark-svg {
            color: #00ff00;
            width: 40px;
            height: 40px;
          }

          .cancel-booking-popup-success-checkmark-path {
            stroke-dasharray: 20;
            stroke-dashoffset: 20;
            animation: drawCheckmark 0.6s ease-out 0.4s forwards;
          }

          .cancel-booking-popup-success-title {
            color: #ffffff;
            font-size: 1.5rem;
            font-weight: bold;
            margin-bottom: 1rem;
            animation: slideUp 0.5s ease-out 0.8s both;
          }

          .cancel-booking-popup-success-message {
            color: #cccccc;
            margin-bottom: 2rem;
            animation: slideUp 0.5s ease-out 1s both;
          }

          .cancel-booking-popup-success-message p {
            margin-bottom: 0.5rem;
          }

          .cancel-booking-popup-success-refund {
            background: rgba(0, 255, 0, 0.1);
            border: 1px solid rgba(0, 255, 0, 0.3);
            border-radius: 0.5rem;
            padding: 1rem;
            margin-top: 1rem;
          }

          .cancel-booking-popup-success-refund p {
            color: #00ff00;
            font-weight: 500;
          }

          .cancel-booking-popup-success-no-refund {
            background: rgba(255, 255, 0, 0.1);
            border: 1px solid rgba(255, 255, 0, 0.3);
            border-radius: 0.5rem;
            padding: 1rem;
            margin-top: 1rem;
          }

          .cancel-booking-popup-success-no-refund p {
            color: #ffff00;
            font-weight: 500;
          }

          .cancel-booking-popup-success-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
            animation: slideUp 0.5s ease-out 1.2s both;
          }

          .cancel-booking-popup-success-btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 0.5rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            min-width: 120px;
          }

          .cancel-booking-popup-success-btn.primary {
            background: #FF0005;
            color: #ffffff;
          }

          .cancel-booking-popup-success-btn.primary:hover {
            background: #e60004;
            transform: translateY(-2px);
          }

          .cancel-booking-popup-success-btn.secondary {
            background: transparent;
            color: #ffffff;
            border: 1px solid rgba(255, 255, 255, 0.3);
          }

          .cancel-booking-popup-success-btn.secondary:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.5);
            transform: translateY(-2px);
          }

          /* Booking Not Found Styles */
          .cancel-booking-popup-not-found {
            text-align: center;
            padding: 2rem;
          }

          .cancel-booking-popup-not-found-icon {
            color: #ff6b6b;
            margin-bottom: 1.5rem;
            animation: bounceIn 0.6s ease-out;
          }

          .cancel-booking-popup-not-found-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: #ffffff;
            margin: 0 0 1rem 0;
            animation: slideUp 0.4s ease-out 0.2s both;
          }

          .cancel-booking-popup-not-found-message {
            color: rgba(255, 255, 255, 0.8);
            font-size: 1rem;
            line-height: 1.6;
            margin: 0 0 2rem 0;
            animation: slideUp 0.4s ease-out 0.3s both;
          }

          .cancel-booking-popup-btn.primary {
            background: linear-gradient(135deg, #FF0005, #CC0000);
            color: #ffffff;
            border: none;
            padding: 0.875rem 1.5rem;
            border-radius: 2rem;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-right: 0.75rem;
          }

          .cancel-booking-popup-btn.primary:hover {
            background: linear-gradient(135deg, #e60004, #b30000);
            transform: translateY(-2px);
          }

          .cancel-booking-popup-btn.secondary {
            background: transparent;
            color: #ffffff;
            border: 1px solid rgba(255, 255, 255, 0.3);
            padding: 0.875rem 1.5rem;
            border-radius: 2rem;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .cancel-booking-popup-btn.secondary:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.5);
            transform: translateY(-2px);
          }

          /* Animations */
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes scaleIn {
            0% { transform: scale(0); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }

          @keyframes drawCheckmark {
            0% { stroke-dashoffset: 20; }
            100% { stroke-dashoffset: 0; }
          }

          @keyframes slideUp {
            0% { transform: translateY(20px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }

          /* Mobile Responsive */
          @media (max-width: 768px) {
            .cancel-booking-popup-success-content {
              padding: 1.5rem;
            }

            .cancel-booking-popup-success-title {
              font-size: 1.25rem;
            }

            .cancel-booking-popup-success-actions {
              flex-direction: column;
              gap: 0.75rem;
            }

            .cancel-booking-popup-success-btn {
              width: 100%;
            }
          }
        `}</style>
      </div>
    </div>
  );

  // Use portal to render popup at the root level
  if (typeof window !== 'undefined') {
    return createPortal(popupContent, document.body);
  }
  
  return popupContent;
}

