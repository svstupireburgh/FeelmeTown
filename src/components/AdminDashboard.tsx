'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  CheckSquare,
  Theater,
  Grid3X3,
  HelpCircle,
  TrendingUp,
  Users,
  Clock,
  Eye,
  Edit,
  X,
  Check,
  DollarSign
} from 'lucide-react';
import MoviesModal from './MoviesModal';
import ConfirmationModal from './ConfirmationModal';
import ToastManager from './ToastManager';
import BookingDetailsPopup from './BookingDetailsPopup';
import { useToast } from '@/hooks/useToast';
import { useRouter } from 'next/navigation';

import { BookingProvider } from '@/contexts/BookingContext';
import { DatePickerProvider } from '@/contexts/DatePickerContext';

interface Stats {
  onlineBookings: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
    total: number;
  };
  manualBookings: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
    total: number;
  };
  allBookings: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
    total: number;
  };
  activeHalls: {
    total: number;
  };
  cancelledBookings: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
    total: number;
  };
  confirmedToday: {
    confirmed: number;
    completed: number;
  };
  completedBookings: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
    total: number;
  };
  incompleteBookings: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
    total: number;
  };
  unreadInquiries: {
    total: number;
    today: number;
  };
}

interface Booking {
  id: number;
  customerName: string;
  email?: string;
  phone?: string;
  theater: string;
  theaterName?: string;
  date: string;
  time: string;
  status: string;
  amount: number;
  totalAmount?: number;
  advancePayment?: number;
  venuePayment?: number;
  pricingData?: {
    slotBookingFee?: number;
    extraGuestFee?: number;
    convenienceFee?: number;
    theaterBasePrice?: number;
  };
  extraGuestCharges?: number;
  extraGuestsCount?: number;
  numberOfPeople?: number;
  occasion?: string;
  occasionPersonName?: string;
  birthdayName?: string;
  birthdayGender?: string;
  partner1Name?: string;
  partner1Gender?: string;
  partner2Name?: string;
  partner2Gender?: string;
  dateNightName?: string;
  proposerName?: string;
  proposalPartnerName?: string;
  valentineName?: string;
  customCelebration?: string;
  selectedMovies?: string[];
  selectedCakes?: string[];
  selectedDecorItems?: string[];
  selectedGifts?: string[];
  // Dynamic occasion fields - any field from database
  [key: string]: any;
}

interface AdminDashboardProps {
  stats: Stats;
  recentBookings: Booking[];
  onRefresh?: () => void;
  refreshing?: boolean;
  lastUpdated?: Date | null;
  currentTime?: Date;
  updateCounter?: number;
}

export default function AdminDashboard({ stats, recentBookings, onRefresh, refreshing, lastUpdated, currentTime }: AdminDashboardProps) {
  const { showSuccess, showError } = useToast();
  const router = useRouter();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingDetail, setShowBookingDetail] = useState(false);
  const [occasions, setOccasions] = useState<any[]>([]);
  const [resettingCounters, setResettingCounters] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [selectedItems, setSelectedItems] = useState({
    movies: [],
    cakes: [],
    decor: [],
    gifts: []
  });
  const [showEditBookingPopup, setShowEditBookingPopup] = useState(false);
  
  // Payment method modal states
  const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] = useState(false);
  const [bookingPendingPayment, setBookingPendingPayment] = useState<Booking | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'online' | 'upi' | 'cash'>('online');
  const [paymentUpdatingId, setPaymentUpdatingId] = useState<string | null>(null);
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null);
  const [completingBookingId, setCompletingBookingId] = useState<string | null>(null);

  const normalizeBookingId = (value: any) => String(value || '').replace(/^#/, '');

  const paymentMethodOptions = useMemo(() => [
    {
      key: 'online',
      label: 'Online Payment',
    },
    {
      key: 'upi',
      label: 'UPI Payment',
    },
    {
      key: 'cash',
      label: 'Cash Payment',
    },
  ], []);

  const normalizedPendingPaymentId = useMemo(() => {
    if (!bookingPendingPayment) return '';
    return normalizeBookingId(
      (bookingPendingPayment as any).originalBookingId ||
        (bookingPendingPayment as any).bookingId ||
        bookingPendingPayment.id,
    );
  }, [bookingPendingPayment]);

  const isManualBookingEntry = (booking: Booking) => {
    const statusLower = (booking.status || '').toLowerCase();
    const bookingTypeLower = booking.bookingType?.toLowerCase();
    const paymentModeLower = ((booking as any)?.paymentMode ?? '').toString().toLowerCase();
    const bookingSourceLower = ((booking as any)?.bookingSource ?? '').toString().toLowerCase();
    const venuePaymentMethodLower = (booking.venuePaymentMethod || '').toLowerCase();
    const createdBy = (booking as any)?.createdBy;

    return (
      statusLower === 'manual' ||
      bookingTypeLower === 'manual' ||
      Boolean(booking.isManualBooking) ||
      paymentModeLower === 'pay_at_venue' ||
      bookingSourceLower === 'manual' ||
      venuePaymentMethodLower === 'cash' ||
      Boolean(createdBy)
    );
  };

  // Helper function to convert UTC to IST
  const convertToIST = (utcDate: string) => {
    if (!utcDate) return '';
    const date = new Date(utcDate);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Show reset confirmation modal
  const showResetModal = () => {
    setShowResetConfirmation(true);
  };

  // Reset all counters function
  const resetAllCounters = async () => {
    setShowResetConfirmation(false);
    setResettingCounters(true);

    try {
      const response = await fetch('/api/admin/reset-counters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ resetAll: true })
      });

      const data = await response.json();

      if (data.success) {
        // Show success toast
        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast({
            type: 'success',
            message: '✅ Counters Reset Successfully!\nToday/Week/Month/Year counters reset to 0. Total counters preserved.',
            duration: 5000
          });
        }

        if (onRefresh) {
          onRefresh(); // Refresh the dashboard to show updated counters
        }
      } else {
        // Show error toast
        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast({
            type: 'error',
            message: '❌ Failed to reset counters: ' + data.error,
            duration: 5000
          });
        }
      }
    } catch (error) {

      // Show error toast
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast({
          type: 'error',
          message: '❌ Error resetting counters. Please try again.',
          duration: 5000
        });
      }
    } finally {
      setResettingCounters(false);
    }
  };
  const [showMovieModal, setShowMovieModal] = useState(false);
  const [showDecorationOptions, setShowDecorationOptions] = useState(false);
  const [decorationValue, setDecorationValue] = useState('no');
  const [showCakesModal, setShowCakesModal] = useState(false);
  const [showDecorModal, setShowDecorModal] = useState(false);
  const [showGiftsModal, setShowGiftsModal] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState('');
  const [selectedCakes, setSelectedCakes] = useState<string[]>([]);
  const [selectedDecor, setSelectedDecor] = useState<string[]>([]);
  const [selectedGifts, setSelectedGifts] = useState<string[]>([]);
  const [cakeSelectionMode, setCakeSelectionMode] = useState<'multiple' | 'single'>('multiple');
  const [decorSelectionMode, setDecorSelectionMode] = useState<'multiple' | 'single'>('multiple');
  const [giftSelectionMode, setGiftSelectionMode] = useState<'multiple' | 'single'>('multiple');
  const [showDecorationAlert, setShowDecorationAlert] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTheater, setEditTheater] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editAmount, setEditAmount] = useState(0);
  const [editNumberOfPeople, setEditNumberOfPeople] = useState(2);
  const [editOccasion, setEditOccasion] = useState('');
  const [editBirthdayName, setEditBirthdayName] = useState('');
  const [editBirthdayGender, setEditBirthdayGender] = useState('');
  const [editPartner1Name, setEditPartner1Name] = useState('');
  const [editPartner1Gender, setEditPartner1Gender] = useState('');
  const [editPartner2Name, setEditPartner2Name] = useState('');
  const [editPartner2Gender, setEditPartner2Gender] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);
  const [editDateNightName, setEditDateNightName] = useState('');
  const [editProposerName, setEditProposerName] = useState('');
  const [editProposalPartnerName, setEditProposalPartnerName] = useState('');
  const [editValentineName, setEditValentineName] = useState('');
  const [editCustomCelebration, setEditCustomCelebration] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [editDynamicFields, setEditDynamicFields] = useState<Record<string, string>>({});
  const [pricingData, setPricingData] = useState({
    slotBookingFee: 1000,
    extraGuestFee: 400,
    convenienceFee: 50
  });

  // Fetch pricing data
  useEffect(() => {
    const fetchPricingData = async () => {
      try {
        const response = await fetch('/api/pricing');
        const data = await response.json();

        if (data.success && data.pricing) {
          setPricingData(data.pricing);
        }
      } catch (error) {
        console.error('Failed to fetch pricing data:', error);
      }
    };

    fetchPricingData();
  }, []);

  // Fetch occasions from database
  useEffect(() => {
    const fetchOccasions = async () => {
      try {
        const response = await fetch('/api/occasions');
        const data = await response.json();
        if (data.success && data.occasions) {
          setOccasions(data.occasions);

        }
      } catch (error) {

      }
    };

    fetchOccasions();
  }, []);

  // Fetch gallery images for slideshow
  useEffect(() => {
    const fetchGalleryImages = async () => {
      try {
        const response = await fetch('/api/admin/gallery');
        const data = await response.json();
        if (data.success && data.images) {
          setGalleryImages(data.images);
        }
      } catch (error) {
        console.error('Error fetching gallery images:', error);
      }
    };

    fetchGalleryImages();
  }, []);

  // Slideshow auto-advance
  useEffect(() => {
    if (galleryImages.length > 0) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prevIndex) =>
          prevIndex === galleryImages.length - 1 ? 0 : prevIndex + 1
        );
      }, 5000); // Change image every 5 seconds

      return () => clearInterval(interval);
    }
  }, [galleryImages.length]);

  // Update calculated price when selections change
  React.useEffect(() => {
    if (selectedBooking) {
      const newPrice = calculatePrice(selectedBooking.theater, {
        movie: selectedMovie,
        cakes: selectedCakes,
        decor: selectedDecor,
        gifts: selectedGifts
      });
      setCalculatedPrice(newPrice);
    }
  }, [selectedMovie, selectedCakes, selectedDecor, selectedGifts, selectedBooking]);

  // Detect unsaved changes
  React.useEffect(() => {
    if ((showEditForm || isEditMode) && selectedBooking) {
      const hasChanges =
        editCustomerName !== (selectedBooking.customerName || '') ||
        editEmail !== (selectedBooking.email || '') ||
        editPhone !== (selectedBooking.phone || '') ||
        editTheater !== (selectedBooking.theaterName || selectedBooking.theater || '') ||
        editDate !== (selectedBooking.date || '') ||
        editTime !== (selectedBooking.time || '') ||
        editStatus !== (selectedBooking.status || '') ||
        editNumberOfPeople !== ((selectedBooking as any).numberOfPeople || 2) ||
        editOccasion !== (selectedBooking.occasion || '') ||
        editBirthdayName !== (selectedBooking.birthdayName || '') ||
        editBirthdayGender !== (selectedBooking.birthdayGender || '') ||
        editPartner1Name !== (selectedBooking.partner1Name || '') ||
        editPartner1Gender !== (selectedBooking.partner1Gender || '') ||
        editPartner2Name !== (selectedBooking.partner2Name || '') ||
        editPartner2Gender !== (selectedBooking.partner2Gender || '') ||
        editDateNightName !== (selectedBooking.dateNightName || '') ||
        editProposerName !== (selectedBooking.proposerName || '') ||
        editProposalPartnerName !== (selectedBooking.proposalPartnerName || '') ||
        editValentineName !== (selectedBooking.valentineName || '') ||
        editCustomCelebration !== (selectedBooking.customCelebration || '') ||
        selectedMovie !== (selectedBooking.selectedMovies?.[0] || '') ||
        selectedCakes.length !== (selectedBooking.selectedCakes?.length || 0) ||
        selectedDecor.length !== (selectedBooking.selectedDecorItems?.length || 0) ||
        selectedGifts.length !== (selectedBooking.selectedGifts?.length || 0);

      setHasUnsavedChanges(hasChanges);
    }
  }, [
    showEditForm, isEditMode, selectedBooking, editCustomerName, editEmail, editPhone, editTheater,
    editDate, editTime, editStatus, editNumberOfPeople, editOccasion, editBirthdayName, editBirthdayGender,
    editPartner1Name, editPartner1Gender, editPartner2Name, editPartner2Gender,
    editDateNightName, editProposerName, editProposalPartnerName, editValentineName,
    editCustomCelebration, selectedMovie, selectedCakes, selectedDecor, selectedGifts
  ]);

  const handleExportBookings = async (type: 'completed' | 'cancelled' | 'manual') => {
    try {
      const response = await fetch(`/api/admin/export-bookings?type=${type}`);

      if (!response.ok) {
        throw new Error('Failed to export bookings');
      }

      // Get filename from header or create default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${type}_bookings_${new Date().toISOString().split('T')[0]}.xlsx`;

      if (contentDisposition) {
        const matches = /filename="(.+)"/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Show success toast
      const typeLabel = type === 'completed' ? 'Completed' : type === 'manual' ? 'Manual' : 'Cancelled';
      showSuccess(`${typeLabel} bookings exported successfully!`);
    } catch (error) {
      console.error('Error exporting bookings:', error);
      showError('Failed to export bookings. Please try again.');
    }
  };

  const handleViewBooking = async (booking: Booking) => {
    try {
      // First try to get the booking from regular bookings
      let response = await fetch(`/api/admin/bookings`);
      let data = await response.json();

      let completeBooking = null;

      if (data.success) {
        // Find the booking in regular bookings
        completeBooking = data.bookings?.find((b: any) =>
          (b.bookingId || b.id) === booking.id ||
          (b.bookingId || b.id) === booking.id.toString()
        );
      }

      // If not found in regular bookings, try manual bookings
      if (!completeBooking) {
        response = await fetch(`/api/admin/manual-bookings`);
        data = await response.json();

        if (data.success) {
          completeBooking = data.manualBookings?.find((b: any) =>
            (b.bookingId || b.id) === booking.id ||
            (b.bookingId || b.id) === booking.id.toString()
          );
        }
      }

      if (completeBooking) {
        // Map the complete booking data to our Booking interface
        const fullBookingData: Booking = {
          id: completeBooking.bookingId || completeBooking.id,
          customerName: completeBooking.name || completeBooking.customerName,
          email: completeBooking.email,
          phone: completeBooking.phone,
          theater: completeBooking.theaterName || completeBooking.theater,
          theaterName: completeBooking.theaterName,
          date: completeBooking.date,
          time: completeBooking.time,
          status: completeBooking.status,
          amount: completeBooking.totalAmount || completeBooking.amount,
          totalAmount: completeBooking.totalAmount,
          advancePayment: completeBooking.advancePayment,
          venuePayment: completeBooking.venuePayment,
          pricingData: completeBooking.pricingData,
          extraGuestCharges: completeBooking.extraGuestCharges,
          extraGuestsCount: completeBooking.extraGuestsCount,
          numberOfPeople: completeBooking.numberOfPeople,
          occasion: completeBooking.occasion,
          occasionPersonName: completeBooking.occasionPersonName,
          birthdayName: completeBooking.birthdayName,
          birthdayGender: completeBooking.birthdayGender,
          partner1Name: completeBooking.partner1Name,
          partner1Gender: completeBooking.partner1Gender,
          partner2Name: completeBooking.partner2Name,
          partner2Gender: completeBooking.partner2Gender,
          dateNightName: completeBooking.dateNightName,
          proposerName: completeBooking.proposerName,
          proposalPartnerName: completeBooking.proposalPartnerName,
          valentineName: completeBooking.valentineName,
          customCelebration: completeBooking.customCelebration,
          selectedMovies: completeBooking.selectedMovies,
          selectedCakes: completeBooking.selectedCakes,
          selectedDecorItems: completeBooking.selectedDecorItems,
          selectedGifts: completeBooking.selectedGifts,
          // Include all other fields from the complete booking
          ...completeBooking
        };

        setSelectedBooking(fullBookingData);
        setShowBookingDetail(true);
      } else {
        // Fallback to the original booking data if complete data not found
        setSelectedBooking(booking);
        setShowBookingDetail(true);
      }
    } catch (error) {
      console.error('Error fetching complete booking details:', error);
      // Fallback to the original booking data if there's an error
      setSelectedBooking(booking);
      setShowBookingDetail(true);
    }
  };

  const handleCancelOrActivateBooking = async (booking: Booking) => {
    try {
      const oldStatus = booking.status;
      const statusLower = booking.status.toLowerCase();
      const isManualBooking = isManualBookingEntry(booking);
      const bookingId = String(booking.originalBookingId || (booking as any).bookingId || booking.id);

      let newStatus: Booking['status'];
      if (statusLower === 'manual') {
        newStatus = 'cancelled';
      } else if (statusLower === 'cancelled') {
        newStatus = isManualBooking ? 'manual' : 'confirmed';
      } else if (statusLower === 'confirmed') {
        newStatus = 'cancelled';
      } else {
        newStatus = isManualBooking ? 'manual' : 'confirmed';
      }

      // Get current user info (admin or staff)
      let cancelledBy = 'Administrator';
      let staffName = null;
      let userId = null;

      // Check if logged in as staff
      const staffUser = localStorage.getItem('staffUser');
      if (staffUser) {
        try {
          const staffData = JSON.parse(staffUser);
          if (staffData.role === 'staff') {
            cancelledBy = 'Staff';
            staffName = staffData.name;
            userId = staffData.userId; // FMT0001, FMT0002, etc.
          }
        } catch (e) {
          console.error('Failed to parse staff user data:', e);
        }
      }

      const response = await fetch('/api/admin/update-booking', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          status: newStatus,
          // Add cancellation tracking info
          ...(newStatus === 'cancelled' && {
            cancelledBy: cancelledBy,
            staffName: staffName,
            userId: userId
          })
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Sync Excel records after status change
        try {
          await fetch('/api/admin/sync-excel-records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bookingId: booking.id,
              oldStatus,
              newStatus,
              action: newStatus === 'cancelled' ? 'cancel' : 'activate'
            })
          });
          console.log('✅ Excel records synced');
        } catch (syncError) {
          console.error('⚠️ Excel sync failed:', syncError);
        }

        // Call the refresh function to update bookings without page reload
        if (onRefresh) {
          onRefresh();
        }
      } else {
        (window as any).showToast?.({ type: 'error', message: 'Failed to update booking status' });
      }
    } catch (error) {

      (window as any).showToast?.({ type: 'error', message: 'Error updating booking status' });
    }
  };

  const handleSendInvoice = async (booking: Booking) => {
    const bookingId = normalizeBookingId(
      (booking as any).originalBookingId || (booking as any).bookingId || booking.id,
    );

    if (!bookingId) {
      (window as any).showToast?.({ type: 'error', message: 'Booking ID missing' });
      return;
    }

    try {
      setSendingInvoiceId(bookingId);

      const response = await fetch('/api/admin/send-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId }),
      });

      const result = await response.json();

      if (result.success) {
        (window as any).showToast?.({
          type: 'success',
          message: 'Invoice email sent to customer.',
        });
      } else {
        (window as any).showToast?.({
          type: 'error',
          message: result.error || 'Failed to send invoice email',
        });
      }
    } catch (error) {
      console.error('Error sending invoice email:', error);
      (window as any).showToast?.({ type: 'error', message: 'Error sending invoice email' });
    } finally {
      setSendingInvoiceId(null);
    }
  };

  const handleMarkAsPaid = (booking: Booking) => {
    // Open payment method modal
    setBookingPendingPayment(booking);
    setSelectedPaymentMethod('online');
    setIsPaymentMethodModalOpen(true);
  };

  const handleConfirmPaymentMethod = async () => {
    if (!bookingPendingPayment) return;

    const booking = bookingPendingPayment;
    const bookingId = String(booking.originalBookingId || (booking as any).bookingId || booking.id).replace(/^#/, '');
    const statusLower = (booking.status || '').toLowerCase();
    const isManualBooking =
      booking.bookingType?.toLowerCase() === 'manual' ||
      statusLower === 'manual' ||
      Boolean((booking as any)?.isManualBooking);
    
    try {
      setPaymentUpdatingId(bookingId);

      // Get current user info (admin or staff)
      let paidBy = 'Administrator';
      let staffName = null;
      let userId = null;

      // Check if logged in as staff
      const staffUser = localStorage.getItem('staffUser');
      console.log('🔍 [Payment] staffUser from localStorage:', staffUser);
      
      if (staffUser) {
        try {
          const staffData = JSON.parse(staffUser);
          console.log('🔍 [Payment] Parsed staffData:', staffData);
          
          if (staffData.role === 'staff') {
            paidBy = 'Staff';
            staffName = staffData.name;
            userId = staffData.userId;
            console.log('✅ [Payment] Staff detected:', { paidBy, staffName, userId });
          } else {
            console.log('⚠️ [Payment] Not a staff role:', staffData.role);
          }
        } catch (e) {
          console.error('❌ [Payment] Failed to parse staff user data:', e);
        }
      } else {
        console.log('ℹ️ [Payment] No staffUser in localStorage - using Administrator');
      }

      // Prepare request body - only include staff fields if staff marked it
      const requestBody: any = {
        bookingId,
        paymentStatus: 'paid',
        venuePaymentMethod: selectedPaymentMethod,
        paidBy: paidBy,
        paidAt: new Date().toISOString(),
        sendInvoice: true,
        isManualBooking
      };

      // Add staff fields - null for Admin, actual values for Staff
      if (paidBy === 'Staff' && userId) {
        requestBody.staffName = staffName;
        requestBody.userId = userId;
        console.log('✅ [Payment] Adding staff fields to request:', { staffName, userId });
      } else {
        requestBody.staffName = null;
        requestBody.userId = null;
        console.log('ℹ️ [Payment] Adding null staff fields (Administrator)');
      }

      console.log('📤 [Payment] Final request body:', requestBody);

      const response = await fetch('/api/admin/update-booking', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.success) {
        const methodLabel = selectedPaymentMethod === 'cash' ? 'Cash' : selectedPaymentMethod === 'upi' ? 'UPI' : 'Online';
        (window as any).showToast?.({
          type: 'success',
          message: `Payment marked as paid (${methodLabel}). Invoice email sent.`,
        });
        
        setIsPaymentMethodModalOpen(false);
        setBookingPendingPayment(null);

        // Call the refresh function to update bookings without page reload
        if (onRefresh) {
          onRefresh();
        }
      } else {
        (window as any).showToast?.({ type: 'error', message: result.error || 'Failed to mark booking as paid' });
      }
    } catch (error) {
      console.error('Error marking booking as paid:', error);
      (window as any).showToast?.({ type: 'error', message: 'Error marking booking as paid' });
    } finally {
      setPaymentUpdatingId(null);
    }
  };

  const handleMarkAsCompleted = async (booking: Booking) => {
    const bookingId = normalizeBookingId(
      (booking as any).originalBookingId || (booking as any).bookingId || booking.id,
    );

    if (!bookingId) {
      (window as any).showToast?.({ type: 'error', message: 'Booking ID missing' });
      return;
    }

    try {
      setCompletingBookingId(bookingId);

      const statusLower = (booking.status || '').toLowerCase();
      const isManualBooking =
        (booking.bookingType || '').toLowerCase() === 'manual' ||
        statusLower === 'manual' ||
        Boolean((booking as any)?.isManualBooking);

      const response = await fetch('/api/admin/update-booking', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          status: 'completed',
          sendInvoice: false,
          isManualBooking,
        }),
      });

      const result = await response.json();

      if (result.success) {
        (window as any).showToast?.({ type: 'success', message: 'Booking moved to Completed.' });
        if (onRefresh) onRefresh();
      } else {
        (window as any).showToast?.({ type: 'error', message: result.error || 'Failed to complete booking' });
      }
    } catch (error) {
      console.error('Error marking booking as completed:', error);
      (window as any).showToast?.({ type: 'error', message: 'Error marking booking as completed' });
    } finally {
      setCompletingBookingId(null);
    }
  };

  const handleClosePaymentMethodModal = () => {
    if (paymentUpdatingId !== null && bookingPendingPayment && paymentUpdatingId === normalizedPendingPaymentId) {
      return;
    }
    setIsPaymentMethodModalOpen(false);
    setBookingPendingPayment(null);
  };



  const handleEditBooking = (booking: Booking) => {
    setSelectedBooking(booking);

    // Convert date format from "Tuesday, September 30, 2025" to "2025-09-30"
    const convertDate = (dateStr: string) => {
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          // If direct parsing fails, try to extract date parts
          const parts = dateStr.split(', ');
          if (parts.length >= 2) {
            const datePart = parts[1]; // "September 30, 2025"
            const parsedDate = new Date(datePart);
            if (!isNaN(parsedDate.getTime())) {
              return parsedDate.toISOString().split('T')[0];
            }
          }
          return '';
        }
        return date.toISOString().split('T')[0];
      } catch (error) {

        return '';
      }
    };

    setEditDate(convertDate(booking.date));

    // Convert time format to match available options
    const convertTime = (timeStr: string) => {
      if (!timeStr) return '';

      // Map database time formats to available options (from theater page)
      const timeMapping: { [key: string]: string } = {
        '07:30 PM - 10:30 PM': '07:30 PM - 10:30 PM',  // Exact match
        '09:00 AM - 12:00 PM': '9:00 am - 12:00 pm',   // Convert format
        '12:30 PM - 03:30 PM': '12:30 PM - 03:30 PM',  // Exact match
        '04:00 PM - 07:00 PM': '04:00 PM - 07:00 PM',  // Exact match
        '9:00 am - 12:00 pm': '9:00 am - 12:00 pm',    // Exact match
        '12:00 pm - 3:00 pm': '12:30 PM - 03:30 PM',   // Map to closest
        '3:00 pm - 6:00 pm': '04:00 PM - 07:00 PM',    // Map to closest
        '6:00 pm - 9:00 pm': '07:30 PM - 10:30 PM'     // Map to closest
      };

      // Check if exact match exists
      if (timeMapping[timeStr]) {

        return timeMapping[timeStr];
      }

      // If no exact match, try to find closest option
      const converted = timeStr
        .replace(/0(\d):/g, '$1:')  // Remove leading zero from hour
        .replace(/AM/g, 'am')      // Convert AM to am
        .replace(/PM/g, 'pm');      // Convert PM to pm


      return converted;
    };

    setEditTime(convertTime(booking.time));
    setEditCustomerName(booking.customerName || '');
    setEditEmail(booking.email || '');
    setEditPhone(booking.phone || '');
    setEditTheater(booking.theaterName || booking.theater || '');
    setEditStatus(booking.status || '');
    setEditAmount(booking.amount || 0);
    setEditNumberOfPeople((booking as any).numberOfPeople || 2);
    setEditOccasion(booking.occasion || '');
    setEditBirthdayName(booking.birthdayName || '');
    setEditBirthdayGender(booking.birthdayGender || '');
    setEditPartner1Name(booking.partner1Name || '');
    setEditPartner1Gender(booking.partner1Gender || '');
    setEditPartner2Name(booking.partner2Name || '');
    setEditPartner2Gender(booking.partner2Gender || '');
    setEditDateNightName(booking.dateNightName || '');
    setEditProposerName(booking.proposerName || '');
    setEditProposalPartnerName(booking.proposalPartnerName || '');
    setEditValentineName(booking.valentineName || '');
    setEditCustomCelebration(booking.customCelebration || '');

    // Debug: Log all booking data to see what's being fetched








    // Initialize dynamic editable fields based on booking data
    const dynamicInitial: Record<string, string> = {};
    Object.keys(booking).forEach((key) => {
      if (key.endsWith('_label')) {
        const fieldKey = key.replace('_label', '');
        const value = (booking as any)[fieldKey];
        if (typeof value !== 'undefined' && value !== null) {
          dynamicInitial[fieldKey] = String(value);
        }
      }
    });
    if ((booking as any).occasionData) {
      Object.entries((booking as any).occasionData).forEach(([k, v]) => {
        if (typeof v !== 'undefined' && v !== null) {
          dynamicInitial[k] = String(v);
        }
      });
    }
    setEditDynamicFields(dynamicInitial);
    // Enable edit mode in the same popup
    setIsEditMode(true);
  };

  const handleSaveBooking = async () => {
    if (!selectedBooking) return;

    setIsSaving(true);

    try {
      // Convert date back to original format
      const convertDateBack = (dateStr: string) => {
        try {
          if (!dateStr) return '';
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return dateStr;

          // Convert to "Tuesday, September 30, 2025" format
          const options: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          };
          return date.toLocaleDateString('en-US', options);
        } catch (error) {

          return dateStr;
        }
      };

      const updateData: Record<string, any> = {
        bookingId: selectedBooking.id,
        customerName: editCustomerName,
        email: editEmail,
        phone: editPhone,
        theater: editTheater,
        date: convertDateBack(editDate),
        time: editTime,
        status: editStatus,
        amount: editAmount,
        numberOfPeople: editNumberOfPeople,
        occasion: editOccasion,
        birthdayName: editBirthdayName,
        birthdayGender: editBirthdayGender,
        partner1Name: editPartner1Name,
        partner1Gender: editPartner1Gender,
        partner2Name: editPartner2Name,
        partner2Gender: editPartner2Gender,
        dateNightName: editDateNightName,
        proposerName: editProposerName,
        proposalPartnerName: editProposalPartnerName,
        valentineName: editValentineName,
        customCelebration: editCustomCelebration,
        isManualBooking: selectedBooking.status === 'manual' // Check if it's a manual booking
      };

      Object.entries(editDynamicFields || {}).forEach(([fieldKey, fieldValue]) => {
        if (typeof fieldValue === 'string' && fieldValue.trim() !== '') {
          updateData[fieldKey] = fieldValue.trim();
        }
      });

      if (decorationValue === 'yes' && typeof calculatedPrice === 'number' && !Number.isNaN(calculatedPrice)) {
        const decorationFee = Number((pricingData as any)?.decorationFees || (editDynamicFields.decorationFee ? Number(editDynamicFields.decorationFee) : 0));
        if (decorationFee > 0) {
          updateData.decorationFee = decorationFee;
          updateData.appliedDecorationFee = decorationFee;
        }
      } else {
        updateData.decorationFee = 0;
        updateData.appliedDecorationFee = 0;
      }





      const response = await fetch('/api/admin/update-booking', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (result.success) {

        (window as any).showToast?.({ type: 'success', message: 'Booking updated successfully!' });
        handleClosePopup();
        // Refresh the page to show updated data
        window.location.reload();
      } else {

        (window as any).showToast?.({ type: 'error', message: 'Failed to update booking: ' + result.error });
      }
    } catch (error) {

      (window as any).showToast?.({ type: 'error', message: 'Error updating booking: ' + error });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClosePopup = () => {
    if (hasUnsavedChanges) {
      setShowCloseConfirm(true);
      return;
    }

    setShowBookingDetail(false);
    setShowEditForm(false);
    setIsEditMode(false);
    setSelectedBooking(null);
    setCalculatedPrice(0);
    setSelectedItems({ movies: [], cakes: [], decor: [], gifts: [] });
    setShowMovieModal(false);
    setShowDecorationOptions(false);
    setShowCakesModal(false);
    setShowDecorModal(false);
    setShowGiftsModal(false);
    setSelectedMovie('');
    setSelectedCakes([]);
    setSelectedDecor([]);
    setSelectedGifts([]);
    setEditDate('');
    setEditTime('');
    setEditCustomerName('');
    setEditEmail('');
    setEditPhone('');
    setEditTheater('');
    setEditStatus('');
    setEditAmount(0);
    setEditNumberOfPeople(2);
    setEditOccasion('');
    setEditBirthdayName('');
    setEditBirthdayGender('');
    setEditPartner1Name('');
    setEditPartner1Gender('');
    setEditPartner2Name('');
    setEditPartner2Gender('');
    setEditDateNightName('');
    setEditProposerName('');
    setEditProposalPartnerName('');
    setEditValentineName('');
    setEditCustomCelebration('');
    setDecorationValue('no');
    setHasUnsavedChanges(false);
    setShowCloseConfirm(false);
  };

  const handleConfirmClose = () => {
    setShowBookingDetail(false);
    setShowEditForm(false);
    setIsEditMode(false);
    setSelectedBooking(null);
    setCalculatedPrice(0);
    setSelectedItems({ movies: [], cakes: [], decor: [], gifts: [] });
    setShowMovieModal(false);
    setShowDecorationOptions(false);
    setShowCakesModal(false);
    setShowDecorModal(false);
    setShowGiftsModal(false);
    setSelectedMovie('');
    setSelectedCakes([]);
    setSelectedDecor([]);
    setSelectedGifts([]);
    setEditDate('');
    setEditTime('');
    setEditCustomerName('');
    setEditEmail('');
    setEditPhone('');
    setEditTheater('');
    setEditStatus('');
    setEditAmount(0);
    setEditNumberOfPeople(2);
    setEditOccasion('');
    setEditBirthdayName('');
    setEditBirthdayGender('');
    setEditPartner1Name('');
    setEditPartner1Gender('');
    setEditPartner2Name('');
    setEditPartner2Gender('');
    setEditDateNightName('');
    setEditProposerName('');
    setEditProposalPartnerName('');
    setEditValentineName('');
    setEditCustomCelebration('');
    setDecorationValue('no');
    setHasUnsavedChanges(false);
    setShowCloseConfirm(false);
  };

  // Price calculation function
  const calculatePrice = (theater: string, items: { movie?: unknown; cakes?: unknown[]; decor?: unknown[]; gifts?: unknown[] }) => {
    let totalPrice = 0;



    // Add movie price
    if (selectedMovie) {
      totalPrice += 500;
    }

    // Add cakes price
    selectedCakes.forEach((cake: string) => {
      const cakeNum = parseInt(cake.replace('cake', ''));
      totalPrice += 300 + (cakeNum * 50); // ₹350, ₹400, ₹450, etc.
    });

    // Add decor price
    selectedDecor.forEach((decor: string) => {
      const decorNum = parseInt(decor.replace('decor', ''));
      totalPrice += 200 + (decorNum * 100); // ₹300, ₹400, ₹500, etc.
    });

    // Add gifts price
    selectedGifts.forEach((gift: string) => {
      const giftNum = parseInt(gift.replace('gift', ''));
      totalPrice += 150 + (giftNum * 50); // ₹200, ₹250, ₹300, etc.
    });

    return totalPrice;
  };

  return (
    <BookingProvider>
      <DatePickerProvider>
        <div className="admin-dashboard">
          <div className="dashboard-header">
            <div className="header-content">
              <div className="header-text">
                <h2>Welcome to FeelMe Town - Admin Panel</h2>
                <p>Manage your bookings, theaters, and customer inquiries</p>
              </div>
              <div className="header-actions">
                <button
                  onClick={showResetModal}
                  disabled={resettingCounters}
                  className="reset-counters-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    fontFamily: 'Paralucent-Medium',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: resettingCounters ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginRight: '15px',
                    opacity: resettingCounters ? 0.6 : 1,
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 8px rgba(220, 53, 69, 0.3)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    if (!resettingCounters) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!resettingCounters) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(220, 53, 69, 0.3)';
                    }
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 1536 1536"
                    style={{
                      animation: resettingCounters ? 'spin 1s linear infinite' : 'none'
                    }}
                  >
                    <path fill="currentColor" d="M1511 928q0 5-1 7q-64 268-268 434.5T764 1536q-146 0-282.5-55T238 1324l-129 129q-19 19-45 19t-45-19t-19-45V960q0-26 19-45t45-19h448q26 0 45 19t19 45t-19 45l-137 137q71 66 161 102t187 36q134 0 250-65t186-179q11-17 53-117q8-23 30-23h192q13 0 22.5 9.5t9.5 22.5m25-800v448q0 26-19 45t-45 19h-448q-26 0-45-19t-19-45t19-45l138-138Q969 256 768 256q-134 0-250 65T332 500q-11 17-53 117q-8 23-30 23H50q-13 0-22.5-9.5T18 608v-7q65-268 270-434.5T768 0q146 0 284 55.5T1297 212l130-129q19-19 45-19t45 19t19 45" />
                  </svg>
                  {resettingCounters ? 'Resetting...' : 'Reset Counters'}
                </button>
                {currentTime && (
                  <div className="real-time-indicator">
                    <span className={`status-dot ${refreshing ? 'updating' : 'updated'}`}></span>
                    <div className="time-display">
                      <span className="current-time">
                        Current: {currentTime.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </span>
                      {lastUpdated && (
                        <span className="last-updated">
                          {refreshing ? 'Updating...' : `Updated: ${lastUpdated.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}`}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="stats-grid">
            {/* Online Bookings Widget */}
            <div className="stat-widget online-bookings">
              <div className="widget-header">
                <div className="widget-icon">
                  <Calendar size={24} />
                </div>
                <div className="widget-title">Online Bookings</div>
              </div>
              <div className="widget-content">
                <div className="stat-row">
                  <span className="stat-label">Today:</span>
                  <span className="stat-value">{stats.onlineBookings.today}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">This Week:</span>
                  <span className="stat-value">{stats.onlineBookings.thisWeek}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">This Month:</span>
                  <span className="stat-value">{stats.onlineBookings.thisMonth}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">This Year:</span>
                  <span className="stat-value">{stats.onlineBookings.thisYear}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Total:</span>
                  <span className="stat-value">{stats.onlineBookings.total}</span>
                </div>
              </div>
            </div>

            {/* Manual Bookings Widget */}
            <div className="stat-widget manual-bookings">
              <div className="widget-header">
                <div className="widget-icon">
                  <Users size={24} />
                </div>
                <div className="widget-title">Manual Bookings</div>
              </div>
              <div className="widget-content">
                <div className="stat-row">
                  <span className="stat-label">Today:</span>
                  <span className="stat-value">{stats.manualBookings.today}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">This Week:</span>
                  <span className="stat-value">{stats.manualBookings.thisWeek}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">This Month:</span>
                  <span className="stat-value">{stats.manualBookings.thisMonth}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">This Year:</span>
                  <span className="stat-value">{stats.manualBookings.thisYear}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Total:</span>
                  <span className="stat-value">{stats.manualBookings.total}</span>
                </div>
              </div>
            </div>

            {/* Completed Bookings Widget */}
            <div className="stat-widget completed-bookings">
              <div className="widget-header">
                <div className="widget-icon">
                  <CheckSquare size={24} />
                </div>
                <div className="widget-title">Completed Bookings</div>
              </div>
              <div className="widget-content">
                <div className="stat-row">
                  <span className="stat-label">Today:</span>
                  <span className="stat-value">{stats.completedBookings?.today || 0}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">This Week:</span>
                  <span className="stat-value">{stats.completedBookings?.thisWeek || 0}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">This Month:</span>
                  <span className="stat-value">{stats.completedBookings?.thisMonth || 0}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">This Year:</span>
                  <span className="stat-value">{stats.completedBookings?.thisYear || 0}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Total:</span>
                  <span className="stat-value">{stats.completedBookings?.total || 0}</span>
                </div>
              </div>
            </div>

            <div className="stat-widget all-bookings">
              <div className="widget-header">
                <div className="widget-icon">
                  <TrendingUp size={24} />
                </div>
                <div className="widget-title">Total Bookings</div>
              </div>
              <div className="widget-content">
                <div className="stat-row">
                  <span className="stat-label">Today:</span>
                  <span className="stat-value">{stats.allBookings?.today || 0}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">This Week:</span>
                  <span className="stat-value">{stats.allBookings?.thisWeek || 0}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">This Month:</span>
                  <span className="stat-value">{stats.allBookings?.thisMonth || 0}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">This Year:</span>
                  <span className="stat-value">{stats.allBookings?.thisYear || 0}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Total:</span>
                  <span className="stat-value">{stats.allBookings?.total || 0}</span>
                </div>
              </div>
            </div>

            {/* Active Halls Widget */}
            <div className="stat-widget active-halls">
              <div className="widget-header">
                <div className="widget-icon">
                  <Theater size={24} />
                </div>
                <div className="widget-title">Active Halls</div>
              </div>
              <div className="widget-content">
                <div className="stat-row">
                  <span className="stat-label">Total:</span>
                  <span className="stat-value">{stats.activeHalls.total} Theatres</span>
                </div>
              </div>
            </div>

            {/* Cancelled Bookings Widget */}
            <div className="stat-widget cancelled-bookings">
              <div className="widget-header">
                <div className="widget-icon">
                  <Grid3X3 size={24} />
                </div>
                <div className="widget-title">Cancelled Bookings</div>
              </div>
              <div className="widget-content">
                <div className="stat-row">
                  <span className="stat-label">Today:</span>
                  <span className="stat-value">{stats.cancelledBookings.today}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">This Week:</span>
                  <span className="stat-value">{stats.cancelledBookings.thisWeek}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">This Month:</span>
                  <span className="stat-value">{stats.cancelledBookings.thisMonth}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">This Year:</span>
                  <span className="stat-value">{stats.cancelledBookings.thisYear}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Total:</span>
                  <span className="stat-value">{stats.cancelledBookings.total}</span>
                </div>
              </div>
            </div>

            {/* Incomplete Bookings Widget */}
            <div className="stat-widget incomplete-bookings">
              <div className="widget-header">
                <div className="widget-icon">
                  <Clock size={24} />
                </div>
                <div className="widget-title">Incomplete Bookings</div>
              </div>
              <div className="widget-content">
                <div className="stat-row">
                  <span className="stat-label">Today:</span>
                  <span className="stat-value">{stats.incompleteBookings.today}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">This Week:</span>
                  <span className="stat-value">{stats.incompleteBookings.thisWeek}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">This Month:</span>
                  <span className="stat-value">{stats.incompleteBookings.thisMonth}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">This Year:</span>
                  <span className="stat-value">{stats.incompleteBookings.thisYear}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Total:</span>
                  <span className="stat-value">{stats.incompleteBookings.total}</span>
                </div>
              </div>
            </div>

            {/* Unread Inquiries Widget */}
            <div className="stat-widget unread-inquiries">
              <div className="widget-header">
                <div className="widget-icon">
                  <HelpCircle size={24} />
                </div>
                <div className="widget-title">Unread Inquiries</div>
              </div>
              <div className="widget-content">
                <div className="stat-row">
                  <span className="stat-label">Total:</span>
                  <span className="stat-value">{stats.unreadInquiries.total}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Today:</span>
                  <span className="stat-value">{stats.unreadInquiries.today}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Bookings Table */}
          <div className="recent-bookings">
            <div className="section-header">
              <h3>Recent Bookings</h3>
            </div>
            <div className="bookings-table">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Theater</th>
                    <th>Booking For</th>
                    <th>Created</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map((booking, index) => (
                    <tr key={booking.id || `booking-${index}`}>
                      <td>{booking.customerName}</td>
                      <td>{booking.theater}</td>
                      <td>
                        <div style={{ fontSize: '0.9em' }}>
                          {booking.date}
                          <br />
                          <span style={{ color: '#666' }}>{booking.time}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85em', color: '#666' }}>
                          {booking.createdAt ? new Date(booking.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'N/A'}
                        </div>
                      </td>
                      <td>
                        <span 
                          className={`payment-badge ${booking.paymentStatus === 'paid' ? 'paid' : 'unpaid'}`}
                          title={booking.paymentStatus === 'paid' 
                            ? `Paid via ${booking.venuePaymentMethod === 'cash' ? 'Cash' : 'Online'} | Marked by: ${booking.paidBy || 'Admin'}${booking.staffName ? ` (${booking.staffName})` : ''}${booking.userId ? ` - ${booking.userId}` : ''}`
                            : 'Payment pending'}
                        >
                          {booking.paymentStatus === 'paid' 
                            ? `💰 ${booking.venuePaymentMethod === 'cash' ? 'Cash' : 'Online'}${booking.staffName ? ` - ${booking.staffName}` : (booking.paidBy === 'Administrator' ? ' - Admin' : '')}`
                            : '⏳ Unpaid'
                          }
                        </span>
                      </td>
                      <td>₹{booking.amount ? booking.amount.toLocaleString() : '0'}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn view-btn"
                            onClick={() => handleViewBooking(booking)}
                            title="View Details"
                          >
                            <Eye size={14} />
                            View
                          </button>
                          <button
                            className="action-btn edit-btn"
                            onClick={() => {
                              const query = new URLSearchParams({
                                bookingId: String(booking.id ?? ''),
                                email: String(booking.email ?? ''),
                                theaterName: String(booking.theaterName || booking.theater || ''),
                                date: String(booking.date ?? ''),
                                time: String(booking.time ?? ''),
                              }).toString();
                              router.push(`/Editbooking?${query}`);
                            }}
                            title="Edit Booking"
                          >
                            <Edit size={14} />
                            Edit
                          </button>
                          {(() => {
                            const statusLower = booking.status.toLowerCase();
                            const isManual = isManualBookingEntry(booking);
                            const isActiveBooking = statusLower === 'confirmed' || (isManual && statusLower !== 'cancelled');

                            return (
                              <>
                                {isActiveBooking && booking.paymentStatus !== 'paid' && (() => {
                                  const actionBookingId = normalizeBookingId(
                                    (booking as any).originalBookingId ||
                                      (booking as any).bookingId ||
                                      booking.id,
                                  );
                                  const isSendingInvoice = sendingInvoiceId === actionBookingId;

                                  return (
                                    <>
                                      <button
                                        className="action-btn pay-btn"
                                        onClick={() => handleSendInvoice(booking)}
                                        title="Send Invoice"
                                        disabled={isSendingInvoice}
                                      >
                                        {isSendingInvoice ? 'Sending…' : 'Send Invoice'}
                                      </button>
                                      <button
                                        className="action-btn paid-btn"
                                        onClick={() => handleMarkAsPaid(booking)}
                                        title="Mark as Paid"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"><path fill="currentColor" d="M10.565 2.075c-.394.189-.755.497-1.26.928l-.079.066a2.56 2.56 0 0 1-1.58.655l-.102.008c-.662.053-1.135.09-1.547.236a3.33 3.33 0 0 0-2.03 2.029c-.145.412-.182.885-.235 1.547l-.008.102a2.56 2.56 0 0 1-.655 1.58l-.066.078c-.431.506-.74.867-.928 1.261a3.33 3.33 0 0 0 0 2.87c.189.394.497.755.928 1.26l.066.079c.41.48.604.939.655 1.58l.008.102c.053.662.09 1.135.236 1.547a3.33 3.33 0 0 0 2.029 2.03c.412.145.885.182 1.547.235l.102.008c.629.05 1.09.238 1.58.655l.079.066c.505.431.866.74 1.26.928a3.33 3.33 0 0 0 2.87 0c.394-.189.755-.497 1.26-.928l.079-.066c.48-.41.939-.604 1.58-.655l.102-.008c.662-.053 1.135-.09 1.547-.236a3.33 3.33 0 0 0 2.03-2.029c.145-.412.182-.885.235-1.547l-.008-.102c-.05-.629-.238-1.09-.655-1.58l-.066-.079c-.431-.505-.74-.866-.928-1.26a3.33 3.33 0 0 0 0-2.87c-.189-.394-.497-.755-.928-1.26l-.066-.079a2.56 2.56 0 0 1-.655-1.58l-.008-.102c-.053-.662-.09-1.135-.236-1.547a3.33 3.33 0 0 0-2.029-2.03c-.412-.145-.885-.182-1.547-.235l-.102-.008a2.56 2.56 0 0 1-1.58-.655l-.079-.066c-.505-.431-.866-.74-1.26-.928a3.33 3.33 0 0 0-2.87 0M8.25 7.5A.75.75 0 0 1 9 6.75h6a.75.75 0 0 1 0 1.5h-1.794c.238.393.395.83.476 1.278H15a.75.75 0 0 1 0 1.5h-1.318a3.65 3.65 0 0 1-.721 1.628a3.03 3.03 0 0 1-2.214 1.141l3.045 3.185a.75.75 0 0 1-1.084 1.036l-4.25-4.444A.75.75 0 0 1 9 12.306h1.5c.6 0 1.012-.24 1.29-.587a2 2 0 0 0 .352-.691H9a.75.75 0 0 1 0-1.5h3.142a2 2 0 0 0-.352-.691c-.278-.347-.69-.587-1.29-.587H9a.75.75 0 0 1-.75-.75" /></svg>
                                        Paid
                                      </button>
                                    </>
                                  );
                                })()}
                                {isActiveBooking && booking.paymentStatus === 'paid' && (() => {
                                  const actionBookingId = normalizeBookingId(
                                    (booking as any).originalBookingId ||
                                      (booking as any).bookingId ||
                                      booking.id,
                                  );
                                  const isCompleting = completingBookingId === actionBookingId;

                                  return (
                                    <button
                                      className="action-btn complete-btn"
                                      onClick={() => handleMarkAsCompleted(booking)}
                                      title="Move to Completed"
                                      disabled={isCompleting}
                                    >
                                      <Check size={14} />
                                      {isCompleting ? 'Completing…' : 'Complete'}
                                    </button>
                                  );
                                })()}
                                <button
                                  className={`action-btn ${isActiveBooking ? 'cancel-btn' : 'activate-btn'}`}
                                  onClick={() => handleCancelOrActivateBooking(booking)}
                                  title={isActiveBooking ? 'Cancel Booking' : 'Activate Booking'}
                                >
                                  {isActiveBooking ? (
                                    <>
                                      <X size={14} />
                                      Cancel
                                    </>
                                  ) : (
                                    <>
                                      <Check size={14} />
                                      Activate
                                    </>
                                  )}
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>




          {/* Booking Detail Popup */}
          <BookingDetailsPopup
            isOpen={showBookingDetail}
            onClose={handleClosePopup}
            booking={selectedBooking}
            occasions={occasions}
            onEdit={(booking) => {
              // Prepare booking data for edit
              sessionStorage.setItem('editingBooking', JSON.stringify({
                bookingId: booking.id || booking.bookingId || booking._id,
                isEditing: true,
                isAdminEdit: true,
                ...booking
              }));
              setShowBookingDetail(false);
              setShowEditBookingPopup(true);
            }}
            showEditButton={false}
          />

          {/* Movie Selection Modal */}
          <MoviesModal
            isOpen={showMovieModal}
            onClose={() => setShowMovieModal(false)}
            onMovieSelect={(movieTitle) => {
              setSelectedMovie(movieTitle);

              setShowMovieModal(false);
            }}
            selectedMovies={selectedMovie ? [selectedMovie] : []}
          />

          {/* Cakes Selection Modal */}
          {showCakesModal && (
            <div className="booking-detail-popup">
              <div className="popup-overlay" onClick={() => setShowCakesModal(false)}></div>
              <div className="popup-content">
                <div className="popup-header">
                  <h3>Select Cakes</h3>
                  <div className="header-controls">
                    <select
                      className="selection-mode-dropdown"
                      value={cakeSelectionMode}
                      onChange={(e) => {
                        setCakeSelectionMode(e.target.value as 'multiple' | 'single');
                        if (e.target.value === 'single') {
                          setSelectedCakes([]);
                        }
                      }}
                    >
                      <option value="multiple">Multiple Items</option>
                      <option value="single">Single Item</option>
                    </select>
                    <button className="close-btn" onClick={() => setShowCakesModal(false)}>×</button>
                  </div>
                </div>
                <div className="popup-body">
                  <div className="item-selection">
                    <div className="item-options">
                      {/* Show selected items first */}
                      {selectedCakes.map((cakeId) => {
                        const cakeNum = parseInt(cakeId.replace('cake', ''));
                        return (
                          <label key={`selected-${cakeNum}`} className="item-option selected-item">
                            <input
                              type={cakeSelectionMode === 'multiple' ? 'checkbox' : 'radio'}
                              name={cakeSelectionMode === 'single' ? 'cake-selection' : undefined}
                              value={`cake${cakeNum}`}
                              checked={selectedCakes.includes(`cake${cakeNum}`)}
                              onChange={(e) => {
                                if (cakeSelectionMode === 'multiple') {
                                  if (e.target.checked) {
                                    setSelectedCakes([...selectedCakes, `cake${cakeNum}`]);
                                  } else {
                                    setSelectedCakes(selectedCakes.filter(item => item !== `cake${cakeNum}`));
                                  }
                                } else {
                                  // Single mode - toggle selection
                                  if (selectedCakes.includes(`cake${cakeNum}`)) {
                                    setSelectedCakes([]);
                                  } else {
                                    setSelectedCakes([`cake${cakeNum}`]);
                                  }
                                }
                              }}
                            />
                            <div className="item-card">
                              <img
                                src={`/images/cakes/cake${cakeNum}.webp`}
                                alt={`Cake ${cakeNum}`}
                                className="item-image"
                              />
                              <h4>Cake {cakeNum}</h4>
                              <p>Delicious Cake - ₹{300 + (cakeNum * 50)}</p>
                            </div>
                          </label>
                        );
                      })}

                      {/* Show unselected items */}
                      {Array.from({ length: 12 }, (_, i) => i + 1)
                        .filter(cakeNum => !selectedCakes.includes(`cake${cakeNum}`))
                        .map((cakeNum) => (
                          <label key={cakeNum} className="item-option">
                            <input
                              type={cakeSelectionMode === 'multiple' ? 'checkbox' : 'radio'}
                              name={cakeSelectionMode === 'single' ? 'cake-selection' : undefined}
                              value={`cake${cakeNum}`}
                              onChange={(e) => {
                                if (cakeSelectionMode === 'multiple') {
                                  if (e.target.checked) {
                                    setSelectedCakes([...selectedCakes, `cake${cakeNum}`]);
                                  } else {
                                    setSelectedCakes(selectedCakes.filter(item => item !== `cake${cakeNum}`));
                                  }
                                } else {
                                  setSelectedCakes([`cake${cakeNum}`]);
                                }
                              }}
                            />
                            <div className="item-card">
                              <img
                                src={`/images/cakes/cake${cakeNum}.webp`}
                                alt={`Cake ${cakeNum}`}
                                className="item-image"
                              />
                              <h4>Cake {cakeNum}</h4>
                              <p>Delicious Cake - ₹{300 + (cakeNum * 50)}</p>
                            </div>
                          </label>
                        ))}
                    </div>
                  </div>
                </div>
                <div className="popup-footer">
                  <button className="btn-secondary" onClick={() => setShowCakesModal(false)}>Cancel</button>
                  <button className="btn-primary" onClick={() => {

                    setShowCakesModal(false);
                  }}>
                    {cakeSelectionMode === 'single'
                      ? selectedCakes.length > 0
                        ? `Select ${selectedCakes[0].replace('cake', 'Cake ')}`
                        : 'Select Cakes'
                      : selectedCakes.length > 0
                        ? `Select Cakes (${selectedCakes.length})`
                        : 'Select Cakes'
                    }
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Decor Selection Modal */}
          {showDecorModal && (
            <div className="booking-detail-popup">
              <div className="popup-overlay" onClick={() => setShowDecorModal(false)}></div>
              <div className="popup-content">
                <div className="popup-header">
                  <h3>Select Decor Items</h3>
                  <div className="header-controls">
                    <select
                      className="selection-mode-dropdown"
                      value={decorSelectionMode}
                      onChange={(e) => {
                        setDecorSelectionMode(e.target.value as 'multiple' | 'single');
                        if (e.target.value === 'single') {
                          setSelectedDecor([]);
                        }
                      }}
                    >
                      <option value="multiple">Multiple Items</option>
                      <option value="single">Single Item</option>
                    </select>
                    <button className="close-btn" onClick={() => setShowDecorModal(false)}>×</button>
                  </div>
                </div>
                <div className="popup-body">
                  <div className="item-selection">
                    <div className="item-options">
                      {/* Show selected items first */}
                      {selectedDecor.map((decorId) => {
                        const partyNum = parseInt(decorId.replace('decor', ''));
                        return (
                          <label key={`selected-${partyNum}`} className="item-option selected-item">
                            <input
                              type={decorSelectionMode === 'multiple' ? 'checkbox' : 'radio'}
                              name={decorSelectionMode === 'single' ? 'decor-selection' : undefined}
                              value={`decor${partyNum}`}
                              checked={selectedDecor.includes(`decor${partyNum}`)}
                              onChange={(e) => {
                                if (decorSelectionMode === 'multiple') {
                                  if (e.target.checked) {
                                    setSelectedDecor([...selectedDecor, `decor${partyNum}`]);
                                  } else {
                                    setSelectedDecor(selectedDecor.filter(item => item !== `decor${partyNum}`));
                                  }
                                } else {
                                  // Single mode - toggle selection
                                  if (selectedDecor.includes(`decor${partyNum}`)) {
                                    setSelectedDecor([]);
                                  } else {
                                    setSelectedDecor([`decor${partyNum}`]);
                                  }
                                }
                              }}
                            />
                            <div className="item-card">
                              <img
                                src={`/images/party/party${partyNum}.webp`}
                                alt={`Decor ${partyNum}`}
                                className="item-image"
                              />
                              <h4>Decor {partyNum}</h4>
                              <p>Party Decor - ₹{200 + (partyNum * 100)}</p>
                            </div>
                          </label>
                        );
                      })}

                      {/* Show unselected items */}
                      {Array.from({ length: 6 }, (_, i) => i + 1)
                        .filter(partyNum => !selectedDecor.includes(`decor${partyNum}`))
                        .map((partyNum) => (
                          <label key={partyNum} className="item-option">
                            <input
                              type={decorSelectionMode === 'multiple' ? 'checkbox' : 'radio'}
                              name={decorSelectionMode === 'single' ? 'decor-selection' : undefined}
                              value={`decor${partyNum}`}
                              onChange={(e) => {
                                if (decorSelectionMode === 'multiple') {
                                  if (e.target.checked) {
                                    setSelectedDecor([...selectedDecor, `decor${partyNum}`]);
                                  } else {
                                    setSelectedDecor(selectedDecor.filter(item => item !== `decor${partyNum}`));
                                  }
                                } else {
                                  setSelectedDecor([`decor${partyNum}`]);
                                }
                              }}
                            />
                            <div className="item-card">
                              <img
                                src={`/images/party/party${partyNum}.webp`}
                                alt={`Decor ${partyNum}`}
                                className="item-image"
                              />
                              <h4>Decor {partyNum}</h4>
                              <p>Party Decor - ₹{200 + (partyNum * 100)}</p>
                            </div>
                          </label>
                        ))}
                    </div>
                  </div>
                </div>
                <div className="popup-footer">
                  <button className="btn-secondary" onClick={() => setShowDecorModal(false)}>Cancel</button>
                  <button className="btn-primary" onClick={() => {

                    setShowDecorModal(false);
                  }}>
                    {decorSelectionMode === 'single'
                      ? selectedDecor.length > 0
                        ? `Select ${selectedDecor[0].replace('decor', 'Decor ')}`
                        : 'Select Decor'
                      : selectedDecor.length > 0
                        ? `Select Decor (${selectedDecor.length})`
                        : 'Select Decor'
                    }
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Gifts Selection Modal */}
          {showGiftsModal && (
            <div className="booking-detail-popup">
              <div className="popup-overlay" onClick={() => setShowGiftsModal(false)}></div>
              <div className="popup-content">
                <div className="popup-header">
                  <h3>Select Gifts</h3>
                  <div className="header-controls">
                    <select
                      className="selection-mode-dropdown"
                      value={giftSelectionMode}
                      onChange={(e) => {
                        setGiftSelectionMode(e.target.value as 'multiple' | 'single');
                        if (e.target.value === 'single') {
                          setSelectedGifts([]);
                        }
                      }}
                    >
                      <option value="multiple">Multiple Items</option>
                      <option value="single">Single Item</option>
                    </select>
                    <button className="close-btn" onClick={() => setShowGiftsModal(false)}>×</button>
                  </div>
                </div>
                <div className="popup-body">
                  <div className="item-selection">
                    <div className="item-options">
                      {/* Show selected items first */}
                      {selectedGifts.map((giftId) => {
                        const giftNum = parseInt(giftId.replace('gift', ''));
                        return (
                          <label key={`selected-${giftNum}`} className="item-option selected-item">
                            <input
                              type={giftSelectionMode === 'multiple' ? 'checkbox' : 'radio'}
                              name={giftSelectionMode === 'single' ? 'gift-selection' : undefined}
                              value={`gift${giftNum}`}
                              checked={selectedGifts.includes(`gift${giftNum}`)}
                              onChange={(e) => {
                                if (giftSelectionMode === 'multiple') {
                                  if (e.target.checked) {
                                    setSelectedGifts([...selectedGifts, `gift${giftNum}`]);
                                  } else {
                                    setSelectedGifts(selectedGifts.filter(item => item !== `gift${giftNum}`));
                                  }
                                } else {
                                  // Single mode - toggle selection
                                  if (selectedGifts.includes(`gift${giftNum}`)) {
                                    setSelectedGifts([]);
                                  } else {
                                    setSelectedGifts([`gift${giftNum}`]);
                                  }
                                }
                              }}
                            />
                            <div className="item-card">
                              <img
                                src={`/images/gifts/gift${giftNum}.webp`}
                                alt={`Gift ${giftNum}`}
                                className="item-image"
                              />
                              <h4>Gift {giftNum}</h4>
                              <p>Special Gift - ₹{150 + (giftNum * 50)}</p>
                            </div>
                          </label>
                        );
                      })}

                      {/* Show unselected items */}
                      {Array.from({ length: 7 }, (_, i) => i + 1)
                        .filter(giftNum => !selectedGifts.includes(`gift${giftNum}`))
                        .map((giftNum) => (
                          <label key={giftNum} className="item-option">
                            <input
                              type={giftSelectionMode === 'multiple' ? 'checkbox' : 'radio'}
                              name={giftSelectionMode === 'single' ? 'gift-selection' : undefined}
                              value={`gift${giftNum}`}
                              onChange={(e) => {
                                if (giftSelectionMode === 'multiple') {
                                  if (e.target.checked) {
                                    setSelectedGifts([...selectedGifts, `gift${giftNum}`]);
                                  } else {
                                    setSelectedGifts(selectedGifts.filter(item => item !== `gift${giftNum}`));
                                  }
                                } else {
                                  setSelectedGifts([`gift${giftNum}`]);
                                }
                              }}
                            />
                            <div className="item-card">
                              <img
                                src={`/images/gifts/gift${giftNum}.webp`}
                                alt={`Gift ${giftNum}`}
                                className="item-image"
                              />
                              <h4>Gift {giftNum}</h4>
                              <p>Special Gift - ₹{150 + (giftNum * 50)}</p>
                            </div>
                          </label>
                        ))}
                    </div>
                  </div>
                </div>
                <div className="popup-footer">
                  <button className="btn-secondary" onClick={() => setShowGiftsModal(false)}>Cancel</button>
                  <button className="btn-primary" onClick={() => {

                    setShowGiftsModal(false);
                  }}>
                    {giftSelectionMode === 'single'
                      ? selectedGifts.length > 0
                        ? `Select ${selectedGifts[0].replace('gift', 'Gift ')}`
                        : 'Select Gifts'
                      : selectedGifts.length > 0
                        ? `Select Gifts (${selectedGifts.length})`
                        : 'Select Gifts'
                    }
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Decoration Alert Popup */}
          {showDecorationAlert && (
            <div className="booking-detail-popup">
              <div className="popup-overlay" onClick={() => setShowDecorationAlert(false)}></div>
              <div className="popup-content">
                <div className="popup-header">
                  <h3>Decoration Required</h3>
                  <button className="close-btn" onClick={() => setShowDecorationAlert(false)}>×</button>
                </div>
                <div className="popup-body">
                  <p>You have selected decoration but haven&apos;t selected any items. Please select at least one item or cancel decoration.</p>
                </div>
                <div className="popup-footer">
                  <button className="btn-secondary" onClick={() => {
                    setDecorationValue('no');
                    setShowDecorationOptions(false);
                    setShowDecorationAlert(false);
                  }}>Cancel Decoration</button>
                  <button className="btn-primary" onClick={() => setShowDecorationAlert(false)}>OK</button>
                </div>
              </div>
            </div>
          )}

          {/* Decorative Image Section - Gallery Slideshow */}
          <div className="decorative-section">
            <div className="decorative-image slideshow">
              {galleryImages.length > 0 ? (
                <>
                  {galleryImages.map((image, index) => (
                    <img
                      key={image._id || index}
                      src={image.imageUrl}
                      alt={image.title || 'Gallery Image'}
                      className={`slideshow-image ${index === currentImageIndex ? 'active' : ''}`}
                    />
                  ))}
                  <div className="image-overlay">
                    <h3>{galleryImages[currentImageIndex]?.title || 'Beautiful Event Spaces'}</h3>
                    <p>{galleryImages[currentImageIndex]?.description || 'Create unforgettable memories in our premium theaters'}</p>
                  </div>
                </>
              ) : (
                <div className="no-gallery">No images in gallery</div>
              )}
            </div>
          </div>

          <style jsx>{`
        .admin-dashboard {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .dashboard-header {
          margin-bottom: 2rem;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 2rem;
        }

        .header-text {
          flex: 1;
        }

        .dashboard-header h2 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 2rem;
          font-weight: 600;
          color: #333;
          margin: 0 0 0.5rem 0;
        }

        .dashboard-header p {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 1rem;
          color: #666;
          margin: 0;
        }

        .real-time-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #28a745;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }

        .status-dot.updating {
          background: #ffc107;
          animation: pulse 1.5s infinite;
        }

        .time-display {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .current-time {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 0.85rem;
          color: #28a745;
          font-weight: 600;
        }

        .last-updated {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.75rem;
          color: #666;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .stat-widget {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
        }

        .stat-widget:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
        }

        .widget-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .widget-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .online-bookings .widget-icon {
          background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
        }

        .manual-bookings .widget-icon {
          background: linear-gradient(135deg, #4ecdc4, #6dd5ed);
        }

        .completed-bookings .widget-icon {
          background: linear-gradient(135deg, #27ae60, #2ecc71);
        }

        .all-bookings .widget-icon {
          background: linear-gradient(135deg, #45b7d1, #96c7ed);
        }

        .active-halls .widget-icon {
          background: linear-gradient(135deg, #2c3e50, #34495e);
        }

        .cancelled-bookings .widget-icon {
          background: linear-gradient(135deg, #e74c3c, #c0392b);
        }

        .incomplete-bookings .widget-icon {
          background: linear-gradient(135deg, #ff9500, #ffb347);
        }

        .unread-inquiries .widget-icon {
          background: linear-gradient(135deg, #e74c3c, #c0392b);
        }

        .widget-title {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.1rem;
          font-weight: 600;
          color: #333;
        }

        .widget-content {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .stat-row:last-child {
          border-bottom: none;
        }

        .stat-label {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          color: #000000 !important;
        }

        .stat-value {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1rem;
          font-weight: 600;
          color: #333;
        }

        .recent-bookings {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          margin-bottom: 3rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .section-header h3 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.3rem;
          font-weight: 600;
          color: #333;
          margin: 0;
        }

        .export-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .export-btn {
          background: var(--accent-color);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.6rem 1.2rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .export-btn:hover {
          background: var(--accent-hover);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(138, 43, 226, 0.3);
        }

        .export-btn.completed {
          background: #28a745;
        }

        .export-btn.completed:hover {
          background: #218838;
        }

        .export-btn.manual {
          background: #007bff;
        }

        .export-btn.manual:hover {
          background: #0056b3;
        }

        .export-btn.cancelled {
          background: #dc3545;
        }

        .export-btn.cancelled:hover {
          background: #c82333;
        }

        .view-all-btn {
          background: var(--accent-color);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.5rem 1rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .view-all-btn:hover {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }

        .bookings-table {
          overflow-x: auto;
        }

        .bookings-table table {
          width: 100%;
          border-collapse: collapse;
        }

        .bookings-table th,
        .bookings-table td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .bookings-table th {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          color: #333;
          background: #f8f9fa;
        }

        .bookings-table td {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          color: #666;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
          text-transform: uppercase;
        }

        .status-badge.confirmed {
          background: #d4edda;
          color: #155724;
        }

        .status-badge.pending {
          background: #fff3cd;
          color: #856404;
        }

        .status-badge.manual {
          background: #f8d7da;
          color: #721c24;
        }

        .payment-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }

        .payment-badge.paid {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #10b981;
        }

        .payment-badge.unpaid {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #f59e0b;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .action-btn {
          background: #007bff;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 0.25rem 0.75rem;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .action-btn:hover {
          background: #0056b3;
        }

        .view-btn {
          background: #28a745;
        }

        .view-btn:hover {
          background: #218838;
        }

        .edit-btn {
          background: #ffc107;
          color: #212529;
        }

        .edit-btn:hover {
          background: #e0a800;
        }

        .cancel-btn {
          background: #dc3545;
          color: white;
        }

        .cancel-btn:hover {
          background: #c82333;
        }

        .activate-btn {
          background: #28a745;
          color: white;
        }

        .activate-btn:hover {
          background: #218838;
        }

        .paid-btn {
          background: #10b981;
          color: white;
        }

        .paid-btn:hover {
          background: #059669;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        }

        .complete-btn {
          background: #22c55e;
          color: white;
        }

        .complete-btn:hover {
          background: #16a34a;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
        }

        /* Payment Method Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }

        .payment-method-modal {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }

        .payment-method-modal .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .payment-method-modal .modal-header h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #333;
          margin: 0;
        }

        .payment-method-modal .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          color: #666;
          transition: color 0.2s;
        }

        .payment-method-modal .close-btn:hover {
          color: #333;
        }

        .payment-method-modal .modal-subtitle {
          color: #666;
          margin-bottom: 1.5rem;
        }

        .payment-method-options {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .payment-method-option {
          flex: 1;
          padding: 1.5rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .payment-method-option:hover {
          border-color: #10b981;
          background: #f0fdf4;
        }

        .payment-method-option.selected {
          border-color: #10b981;
          background: #d1fae5;
        }

        .payment-method-option:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .method-icon {
          font-size: 2rem;
        }

        .method-title {
          font-weight: 600;
          color: #333;
        }

        .method-subtitle {
          font-size: 0.85rem;
          color: #666;
          text-align: center;
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }

        .modal-actions .cancel-btn,
        .modal-actions .save-btn {
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .modal-actions .cancel-btn {
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          color: #666;
        }

        .modal-actions .cancel-btn:hover {
          background: #e5e7eb;
        }

        .modal-actions .save-btn {
          background: #10b981;
          border: none;
          color: white;
        }

        .modal-actions .save-btn:hover {
          background: #059669;
        }

        .modal-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Booking Detail Popup */
        .booking-detail-popup {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .popup-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          cursor: pointer;
        }

        .popup-content {
          position: relative;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #eee;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .edit-btn-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .edit-btn-header:hover {
          background: #0056b3;
          transform: translateY(-1px);
        }

        .edit-btn-header span {
          font-size: 16px;
        }

        .save-btn-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .save-btn-header:hover:not(:disabled) {
          background: #218838;
          transform: translateY(-1px);
        }

        .save-btn-header:disabled {
          background: #6c757d;
          cursor: not-allowed;
          transform: none;
        }

        .save-btn-header:hover:not(:disabled) {
          background: #218838;
          transform: translateY(-1px);
        }

        .header-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .selection-mode-dropdown {
          padding: 6px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          background: white;
          font-size: 14px;
          color: #333;
        }

        .selection-mode-dropdown:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .popup-header h3 {
          margin: 0;
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.3rem;
          color: #333;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #666;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.3s ease;
        }

        .close-btn:hover {
          background: #f5f5f5;
          color: #333;
        }

        .popup-body {
          padding: 1.5rem;
        }

        .detail-section {
          margin-bottom: 2rem;
        }

        .detail-section:last-child {
          margin-bottom: 0;
        }

        .detail-section h4 {
          margin: 0 0 1rem 0;
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.1rem;
          color: #333;
          border-bottom: 2px solid #007bff;
          padding-bottom: 0.5rem;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .detail-item:last-child {
          border-bottom: none;
        }

        .detail-item .label {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-weight: 500;
          color: #000000 !important;
          min-width: 100px;
        }

        .detail-item .value {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          color: #333;
          text-align: right;
        }

        .popup-footer {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          padding: 1.5rem;
          border-top: 1px solid #eee;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 0.5rem 1rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-secondary:hover {
          background: #5a6268;
        }

        .btn-primary {
          background: #007bff;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 0.5rem 1rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-primary:hover {
          background: #0056b3;
        }

        /* Edit Mode Styles */
        .edit-input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          color: #000;
          background-color: #fff;
          font-size: 0.9rem;
          background: #f8f9fa;
          transition: all 0.3s ease;
        }

        .edit-input:focus {
          outline: none;
          border-color: #007bff;
          background: white;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .edit-select {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          color: #000;
          background-color: #fff;
          font-size: 0.9rem;
          background: #f8f9fa;
          transition: all 0.3s ease;
        }

        .edit-select:focus {
          outline: none;
          border-color: #007bff;
          background: white;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        /* Edit Booking Form Styles */
        .edit-popup {
          max-width: 800px;
          width: 95%;
        }

        .edit-booking-form {
          padding: 0;
        }

        .form-section {
          margin-bottom: 2rem;
        }

        .form-section:last-child {
          margin-bottom: 0;
        }

        .form-section h4 {
          margin: 0 0 1rem 0;
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.1rem;
          color: #333;
          border-bottom: 2px solid #007bff;
          padding-bottom: 0.5rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          color: #000000 !important;
        }

        /* Force all labels to be black */
        label {
          color: #000000 !important;
        }

        .edit-booking-form label {
          color: #000000 !important;
        }

        .form-section label {
          color: #000000 !important;
        }

        .form-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          background: #f8f9fa;
          color: #333;
          transition: all 0.3s ease;
        }

        .form-input:focus {
          outline: none;
          border-color: #007bff;
          background: white;
          color: #333;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .form-select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          background: #f8f9fa;
          color: #333;
          transition: all 0.3s ease;
        }

        .form-select:focus {
          outline: none;
          border-color: #007bff;
          background: white;
          color: #333;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        /* Checkbox Group Styles */
        .checkbox-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 150px;
          overflow-y: auto;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          background: #f8f9fa;
        }

        .checkbox-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
          transition: background-color 0.2s ease;
        }

        .checkbox-item:hover {
          background: rgba(0, 123, 255, 0.1);
        }

        .checkbox-item input[type="checkbox"] {
          margin: 0;
          cursor: pointer;
        }

        .checkbox-item span {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          color: #333;
        }

        /* Decoration Options Styles */
        .decoration-options {
          margin-top: 15px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #e9ecef;
        }

        .decoration-buttons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .decoration-btn {
          padding: 8px 16px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }

        .decoration-btn:hover {
          background: #0056b3;
        }

        /* Movie and Item Selection Styles */
        .movie-selection, .item-selection {
          padding: 20px 0;
        }

        .movie-options, .item-options {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }

        .movie-option, .item-option {
          display: flex;
          flex-direction: column;
          cursor: pointer;
          padding: 15px;
          border: 2px solid #e9ecef;
          border-radius: 12px;
          transition: all 0.2s;
          background: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .movie-option:hover, .item-option:hover {
          border-color: #007bff;
          background: #f8f9fa;
        }

        .movie-option:has(input[type="radio"]:checked),
        .movie-option:has(input[type="checkbox"]:checked),
        .item-option:has(input[type="radio"]:checked),
        .item-option:has(input[type="checkbox"]:checked) {
          border: 3px solid #dc3545 !important;
          box-shadow: 0 0 15px rgba(220, 53, 69, 0.5) !important;
          background: #fff5f5 !important;
        }

        .movie-option input[type="checkbox"], .item-option input[type="checkbox"] {
          display: none;
        }

        .movie-option input[type="radio"], .item-option input[type="radio"] {
          display: none;
        }

        .movie-option, .item-option {
          position: relative;
        }

        .selected-item {
          order: -1;
          border: 2px solid #28a745 !important;
          background: #f8fff9 !important;
        }

        .movie-card, .item-card {
          flex: 1;
          text-align: center;
          border: 2px solid transparent;
          border-radius: 8px;
          padding: 10px;
          transition: all 0.2s;
        }

        .movie-card h4, .item-card h4 {
          margin: 0 0 5px 0;
          color: #333;
          font-size: 16px;
        }

        .movie-card p, .item-card p {
          margin: 0;
          color: #666;
          font-size: 14px;
        }

        .item-image {
          width: 100%;
          height: 150px;
          object-fit: cover;
          border-radius: 8px;
          margin-bottom: 10px;
        }

        .decorative-section {
          margin-top: 0;
          margin-bottom: 0;
        }

        .decorative-image {
          position: relative;
          width: 100%;
          height: 200px;
          border-radius: 0;
          overflow: hidden;
          box-shadow: none;
        }

        .decorative-image.slideshow {
          position: relative;
        }

        .slideshow-image {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transition: opacity 1s ease-in-out;
        }

        .slideshow-image.active {
          opacity: 1;
          z-index: 1;
        }

        .decorative-image img:not(.slideshow-image) {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
          padding: 2rem;
          z-index: 2;
        }

        .image-overlay h3 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 2rem;
          color: white;
          margin: 0 0 0.5rem 0;
        }

        .image-overlay p {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
        }

        .no-gallery {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background: #f0f0f0;
          color: #666;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 1rem;
        }

        /* Decoration Alert Popup Styling */
        .booking-detail-popup .popup-body p {
          color: #333 !important;
          font-size: 16px;
          line-height: 1.5;
          margin: 0;
        }

        .booking-detail-popup .popup-header h3 {
          color: #333 !important;
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }

        .booking-detail-popup .popup-content {
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .booking-detail-popup .popup-body {
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          margin: 15px 0;
        }

        .decorative-image {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
        }

        .decorative-image img {
          width: 100%;
          height: 300px;
          object-fit: cover;
        }

        .image-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
          color: white;
          padding: 2rem;
        }

        .image-overlay h3 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0 0 0.5rem 0;
        }

        .image-overlay p {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 1rem;
          margin: 0;
          opacity: 0.9;
        }

        @media (max-width: 768px) {
          .admin-dashboard {
            padding: 1rem;
          }

          .stats-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .header-content {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .dashboard-header h2 {
            font-size: 1.5rem;
          }

          .real-time-indicator {
            align-self: flex-start;
          }

          .bookings-table {
            font-size: 0.8rem;
          }

          .bookings-table th,
          .bookings-table td {
            padding: 0.5rem;
          }
        }
      `}</style>

          {/* Reset Confirmation Modal */}
          <ConfirmationModal
            isOpen={showResetConfirmation}
            title="Reset Counters"
            message="Are you sure you want to reset Today/Week/Month/Year counters to 0?

Note: Total counters will be preserved and never reset."
            confirmText="Reset Counters"
            cancelText="Cancel"
            onConfirm={resetAllCounters}
            onCancel={() => setShowResetConfirmation(false)}
            type="warning"
          />

          {/* Payment Method Modal */}
          {isPaymentMethodModalOpen && bookingPendingPayment && (
            <div className="modal-overlay" onClick={handleClosePaymentMethodModal}>
              <div className="payment-method-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>How was the payment received?</h2>
                  <button className="close-btn" onClick={handleClosePaymentMethodModal} disabled={paymentUpdatingId === String(bookingPendingPayment.id)}>
                    <X size={20} />
                  </button>
                </div>

                <p className="modal-subtitle">
                  Select the payment method used for booking #{bookingPendingPayment.id}.
                </p>

                <div className="send-invoice-actions">
                  <button
                    type="button"
                    className="send-invoice-btn"
                    onClick={() => handleSendInvoice(bookingPendingPayment)}
                    disabled={paymentUpdatingId === String(bookingPendingPayment.id) || sendingInvoiceId === String(bookingPendingPayment.id)}
                  >
                    {sendingInvoiceId === String(bookingPendingPayment.id) ? 'Sending…' : 'Send Invoice'}
                  </button>
                </div>

                <div className="payment-method-options">
                  <button
                    type="button"
                    className={`payment-method-option ${selectedPaymentMethod === 'online' ? 'selected' : ''}`}
                    onClick={() => setSelectedPaymentMethod('online')}
                    disabled={paymentUpdatingId === String(bookingPendingPayment.id)}
                  >
                    <span className="method-icon">💳</span>
                    <span className="method-title">Paid Online</span>
                    <span className="method-subtitle">Card, netbanking, or any online mode</span>
                  </button>

                  <button
                    type="button"
                    className={`payment-method-option ${selectedPaymentMethod === 'upi' ? 'selected' : ''}`}
                    onClick={() => setSelectedPaymentMethod('upi')}
                    disabled={paymentUpdatingId === String(bookingPendingPayment.id)}
                  >
                    <span className="method-icon">📲</span>
                    <span className="method-title">Paid via UPI</span>
                    <span className="method-subtitle">UPI payment received</span>
                  </button>

                  <button
                    type="button"
                    className={`payment-method-option ${selectedPaymentMethod === 'cash' ? 'selected' : ''}`}
                    onClick={() => setSelectedPaymentMethod('cash')}
                    disabled={paymentUpdatingId === String(bookingPendingPayment.id)}
                  >
                    <span className="method-icon">💵</span>
                    <span className="method-title">Paid in Cash</span>
                    <span className="method-subtitle">Amount collected at the venue</span>
                  </button>
                </div>

                <div className="modal-actions">
                  <button
                    className="cancel-btn"
                    onClick={handleClosePaymentMethodModal}
                    disabled={paymentUpdatingId === String(bookingPendingPayment.id)}
                  >
                    Cancel
                  </button>
                  <button
                    className="save-btn"
                    onClick={handleConfirmPaymentMethod}
                    disabled={paymentUpdatingId === String(bookingPendingPayment.id)}
                  >
                    {paymentUpdatingId === String(bookingPendingPayment.id) ? 'Processing...' : 'Mark as Paid'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Toast Manager */}
          <ToastManager />

          {/* Edit booking popup removed */}

        </div>
      </DatePickerProvider >
    </BookingProvider >
  );
}

