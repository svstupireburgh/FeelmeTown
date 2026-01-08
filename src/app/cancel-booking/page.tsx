'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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

export default function CancelBookingPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: 240 }} />}>
      <CancelBookingPageInner />
    </Suspense>
  );
}

function CancelBookingPageInner() {
  const searchParams = useSearchParams();
  const { openCancelBookingPopup, isCancelBookingPopupOpen } = useBooking();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasOpenedPopup, setHasOpenedPopup] = useState(false);

  useEffect(() => {
    const bookingId = searchParams.get('bookingId');
    const email = searchParams.get('email');

    if (!bookingId) {
      setError('Missing booking ID');
      setLoading(false);
      return;
    }

    // Fetch booking data
    fetchBookingData(bookingId, email);
  }, [searchParams]);

  // Redirect to theater page when popup closes after cancellation
  useEffect(() => {
    if (hasOpenedPopup && !isCancelBookingPopupOpen) {
      // Popup was opened and now closed - wait 2 seconds then redirect to theater page
      setTimeout(() => {
        window.location.href = '/theater';
      }, 2000); // 2 seconds delay
    }
  }, [isCancelBookingPopupOpen, hasOpenedPopup]);

  const fetchBookingData = async (bookingId: string, email: string | null) => {
    try {
      // Build URL with or without email parameter
      const url = email 
        ? `/api/booking/${bookingId}?email=${encodeURIComponent(email)}`
        : `/api/booking/${bookingId}`;
      
      const response = await fetch(url);
      const result = await response.json();

      if (result.success && result.booking) {
        // Open cancel booking popup using context
        openCancelBookingPopup(result.booking);
        setHasOpenedPopup(true);
      } else {
        setError(result.error || 'Booking not found');
      }
    } catch (error) {
      console.error('Error fetching booking data:', error);
      setError('Failed to load booking data');
    } finally {
      setLoading(false);
    }
  };

  // Remove handleClosePopup since we're using context now

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-6">
            <h1 className="text-red-500 text-2xl font-bold mb-4">Error</h1>
            <p className="text-white mb-4">{error}</p>
            <button 
              onClick={() => window.location.href = '/'}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Popup is now handled by ClientLayout through context */}
    </div>
  );
}

