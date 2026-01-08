'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Filter, Eye, Edit, Trash2, CheckCircle, XCircle, Calendar, X } from 'lucide-react';

import { BookingProvider } from '@/contexts/BookingContext';
import { DatePickerProvider } from '@/contexts/DatePickerContext';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';
import ConfirmationModal from '@/components/ConfirmationModal';
import GlobalDatePicker from '@/components/GlobalDatePicker';
import BookingDetailsPopup from '@/components/BookingDetailsPopup';
import { useRouter } from 'next/navigation';

interface OccasionOption {
  _id: string;
  occasionId: string;
  name: string;
  icon: string;
  popular: boolean;
  requiredFields: string[];
  fieldLabels: { [key: string]: string };
  isActive: boolean;
}

export default function BookingsPage() {
  const { toasts, showSuccess, showError, removeToast } = useToast();
  const router = useRouter();
  const staffUserRaw = typeof window !== 'undefined' ? localStorage.getItem('staffUser') : null;
  const staffUser = (() => {
    if (!staffUserRaw) return null;
    try {
      return JSON.parse(staffUserRaw);
    } catch {
      return null;
    }
  })();
  const isViewOnlyStaff = staffUser?.role === 'staff' && (staffUser?.bookingAccess || 'view') !== 'edit';
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

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

  const handleMarkAsCompleted = async (booking: any) => {
    if (isViewOnlyStaff) {
      showError('You have View-only access. Editing bookings is disabled.');
      return;
    }
    const bookingId = String(booking.originalBookingId || booking.bookingId || booking.id);
    if (!bookingId) {
      showError('Booking ID missing');
      return;
    }

    const statusLower = String(booking.statusKey || booking.status || '').toLowerCase();
    const isManualBooking =
      (booking.bookingType || '').toLowerCase() === 'manual' ||
      statusLower === 'manual' ||
      Boolean(booking.isManualBooking);

    try {
      setCompletingBookingId(bookingId);
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

      const data = await response.json();
      if (data.success) {
        showSuccess('Booking moved to Completed.');
        await fetchBookings();
      } else {
        showError(data.error || 'Failed to complete booking');
      }
    } catch (error) {
      console.error('Error marking booking as completed:', error);
      showError('Error marking booking as completed');
    } finally {
      setCompletingBookingId(null);
    }
  };

  // Helper function to get current date in IST
  const getCurrentDateIST = () => {
    const now = new Date();
    return now.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Helper function to check if booking is from current date
  const isCurrentDateBooking = (bookingDate: string) => {
    if (!bookingDate) return false;
    const currentDate = getCurrentDateIST();
    const bookingDateIST = new Date(bookingDate).toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return bookingDateIST === currentDate;
  };

  // Helper function to check if booking is from tomorrow
  const isTomorrowBooking = (bookingDate: string) => {
    if (!bookingDate) return false;
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const bookingDateIST = new Date(bookingDate).toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return bookingDateIST === tomorrowDate;
  };

  // Helper function to check if booking is from selected date
  const isSelectedDateBooking = (bookingDate: string) => {
    if (!selectedDate) return true;
    if (!bookingDate) return false;

    try {
      // Convert selectedDate (YYYY-MM-DD) to DD/MM/YYYY format
      const selectedDateFormatted = new Date(selectedDate).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });

      // Parse booking date - handle different formats
      let bookingDateParsed;
      if (bookingDate.includes(',')) {
        // Format: "Saturday, October 18, 2025"
        bookingDateParsed = new Date(bookingDate);
      } else {
        // Format: "2025-10-18" or other ISO formats
        bookingDateParsed = new Date(bookingDate);
      }

      // Convert booking date to DD/MM/YYYY format
      const bookingDateIST = bookingDateParsed.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });

      console.log('Date comparison:', {
        selectedDate,
        selectedDateFormatted,
        bookingDate,
        bookingDateIST,
        match: bookingDateIST === selectedDateFormatted
      });

      return bookingDateIST === selectedDateFormatted;
    } catch (error) {
      console.error('Date parsing error:', error, { selectedDate, bookingDate });
      return false;
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  const [showTomorrowOnly, setShowTomorrowOnly] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isManualBookingOpen, setIsManualBookingOpen] = useState(false);
  const [paymentUpdatingId, setPaymentUpdatingId] = useState<string | null>(null);
  const [completingBookingId, setCompletingBookingId] = useState<string | null>(null);
  const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] = useState(false);
  const [bookingPendingPayment, setBookingPendingPayment] = useState<any | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'online' | 'upi' | 'cash'>('online');
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null);

  // Infinite scroll state
  const [displayedCount, setDisplayedCount] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  // For viewing/editing booking details
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // For dynamic occasion fields
  const [occasionOptions, setOccasionOptions] = useState<OccasionOption[]>([]);
  const [isLoadingOccasions, setIsLoadingOccasions] = useState(true);

  // For confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<any>(null);

  // Fetch occasions from database
  const formatPaymentBadge = (booking: any) => {
    const status = (booking.paymentStatus || 'unpaid').toLowerCase();
    if (status !== 'paid' && status !== 'partial') {
      return {
        primaryText: '⏳ Unpaid',
        secondaryText: null,
        title: 'Payment pending',
        className: 'unpaid',
        animate: false
      };
    }

    if (status === 'partial') {
      const paymentReceivedRaw = booking.paymentReceived || booking.payment_received;
      const paymentReceivedText = (paymentReceivedRaw || '').toString().trim();
      const label = paymentReceivedText || 'Partial Payment';
      return {
        primaryText: `🟡 ${label}`,
        secondaryText: null,
        title: label,
        className: 'partial',
        animate: false
      };
    }

    const normalizeMethodLabel = (raw: any) => {
      const normalizedMethod = (raw || '').toString().toLowerCase();
      if (normalizedMethod === 'cash' || normalizedMethod === 'cash_payment') return 'Cash';
      if (normalizedMethod === 'upi') return 'UPI';
      if (
        normalizedMethod === 'pay_at_venue' ||
        normalizedMethod === 'venue' ||
        normalizedMethod.includes('venue')
      ) return 'Pay at Venue';
      if (normalizedMethod.includes('online') || normalizedMethod === 'razorpay') return 'Online';
      return normalizedMethod ? normalizedMethod.toUpperCase() : 'Paid';
    };

    const normalizeActor = (raw: any) => {
      const v = (raw || '').toString().trim();
      if (!v) return '';
      const lower = v.toLowerCase();
      if (lower === 'administrator' || lower === 'admin') return 'Admin';
      if (lower === 'staff') return 'Staff';
      return v;
    };

    const paymentReceivedRaw = booking.paymentReceived || booking.payment_received;
    const paymentReceivedText = (paymentReceivedRaw || '').toString().trim();

    const rawMethod =
      booking.venuePaymentMethod ||
      booking.finalPaymentMethod ||
      booking.paymentMode ||
      booking.paymentMethod ||
      booking.advancePaymentMethod ||
      (booking as any).final_payment_method ||
      (booking as any).payment_mode ||
      (booking as any).payment_method ||
      (booking as any).venue_payment_method;

    const methodLabel = normalizeMethodLabel(rawMethod);

    const actor =
      booking.staffName ||
      booking.paidBy ||
      booking.userId ||
      booking.manualCreatedBy;
    const actorLabel = normalizeActor(actor) || 'Admin';

    const finalLabel = paymentReceivedText || `${methodLabel} - ${actorLabel}`;

    return {
      primaryText: `💰 ${finalLabel}`,
      secondaryText: null,
      title: finalLabel,
      className: 'paid',
      animate: false
    };
  };

  const fetchOccasions = async () => {
    try {
      setIsLoadingOccasions(true);
      const response = await fetch('/api/occasions');
      const data = await response.json();

      if (data.success && data.occasions) {

        setOccasionOptions(data.occasions);
      } else {

      }
    } catch (error) {

    } finally {
      setIsLoadingOccasions(false);
    }
  };

  // Fetch booking data from different sources based on status
  const fetchBookings = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      // Fetch confirmed bookings from database and other bookings from JSON files
      const [confirmedBookingsResponse, completedBookingsResponse, manualBookingsResponse, cancelledBookingsResponse, incompleteBookingsResponse] = await Promise.all([
        fetch('/api/admin/bookings'), // Confirmed bookings from database
        fetch('/api/admin/export-godaddy-bookings?type=completed&shape=mongo'),
        fetch('/api/admin/manual-bookings'), // Manual bookings from MongoDB
        fetch('/api/admin/export-bookings-json?type=cancelled'), // Cancelled bookings from JSON file
        fetch('/api/incomplete-booking') // Incomplete bookings from database
      ]);

      const [confirmedData, completedData, manualData, cancelledData, incompleteData] = await Promise.all([
        confirmedBookingsResponse.json(),
        completedBookingsResponse.json(),
        manualBookingsResponse.json(),
        cancelledBookingsResponse.json(),
        incompleteBookingsResponse.json()
      ]);

      const getPublicJson = async (p: string) => {
        try {
          const r = await fetch(p);
          if (!r.ok) return [] as any[];
          const j = await r.json().catch(() => null);
          if (!j) return [] as any[];
          if (Array.isArray(j)) return j as any[];
          if (Array.isArray((j as any).records)) return (j as any).records as any[];
          if (Array.isArray((j as any).bookings)) return (j as any).bookings as any[];
          return [] as any[];
        } catch {
          return [] as any[];
        }
      };

      // Completed bookings from GoDaddy SQL (mongo-shaped)
      let completedArray = ((completedData?.data?.completed || completedData?.bookings || []) as any[]);

      // Manual bookings are fetched from MongoDB via the dedicated API
      let manualArray = (manualData.manualBookings || manualData.bookings || manualData.records || []) as any[];

      // Cancelled bookings from GoDaddy SQL (no fallback to JSON files)
      let cancelledArray = (cancelledData.bookings || []) as any[];

      // Process confirmed bookings from database (confirmed/pending/manual status)
      const confirmedBookings = (confirmedData.bookings || []).map((booking: any) => {
        const rawPaymentStatus = (booking.paymentStatus || booking.payment_status || '').toString().toLowerCase();
        const normalizedPaymentStatus = rawPaymentStatus === 'paid' ? 'paid' : rawPaymentStatus === 'partial' ? 'partial' : 'unpaid';
        // Include confirmed, pending, and manual bookings from database
        if (booking.status === 'confirmed' || booking.status === 'pending' || booking.status === 'manual') {
          return {
            ...booking,
            bookingType: booking.status === 'manual' ? 'manual' : 'online',
            createdAtIST: convertToIST(booking.createdAt),
            paymentStatus: normalizedPaymentStatus,
            venuePaymentMethod: booking.venuePaymentMethod || booking.paymentMethod || booking.finalPaymentMethod || null
          };
        }
        return null;
      }).filter(Boolean);

      // Process completed bookings from GoDaddy SQL
      const completedBookings = completedArray
        .filter((booking: any) => {
          const statusLower = String(booking?.status || booking?.booking_status || '').toLowerCase();
          const hasCompletedAt = Boolean(booking?.completedAt || booking?.completed_at);
          if (statusLower.includes('completed')) return true;
          // Treat as completed if completedAt is present (even if status has different wording)
          return hasCompletedAt;
        })
        .map((booking: any) => {
        return {
          ...booking,
          bookingType: booking.bookingType || 'online',
          status: 'completed',
          paymentStatus: booking.paymentStatus || 'paid',
          venuePaymentMethod: booking.venuePaymentMethod || booking.paymentMethod || booking.finalPaymentMethod || null,
          theaterName: booking.theaterName || booking.theater_name || booking.theater,
          theater: booking.theaterName || booking.theater || booking.theater_name,
          createdAtIST: convertToIST(booking.completedAt || booking.completed_at || booking.createdAt)
        };
      });

      // Process manual bookings from database (manual_booking collection)
      const manualBookings = (manualArray).map((booking: any) => ({
        ...booking,
        bookingType: 'manual',
        status: booking.status || 'manual',
        paymentStatus: (booking.paymentStatus || 'unpaid').toLowerCase() === 'paid' ? 'paid' : (booking.paymentStatus || 'unpaid').toLowerCase() === 'partial' ? 'partial' : 'unpaid',
        venuePaymentMethod: booking.venuePaymentMethod || booking.paymentMethod || booking.finalPaymentMethod || null,
        createdAtIST: convertToIST(booking.createdAt)
      }));

      // Process cancelled bookings from GoDaddy SQL
      const cancelledBookings = (cancelledArray).map((booking: any) => {
        const rawPaymentStatus = (booking.paymentStatus || booking.payment_status || '').toString().toLowerCase();
        const normalizedPaymentStatus = rawPaymentStatus === 'paid' ? 'paid' : rawPaymentStatus === 'partial' ? 'partial' : 'unpaid';
        return {
          ...booking,
          bookingType: 'online',
          status: 'cancelled',
          paymentStatus: normalizedPaymentStatus,
          // Map SQL column names to expected field names
          theaterName: booking.theater_name || booking.theaterName || booking.theater,
          theater: booking.theater_name || booking.theaterName || booking.theater,
          createdAtIST: convertToIST(booking.cancelledAt || booking.cancelled_at || booking.createdAt)
        };
      });

      // Process incomplete bookings from database
      const incompleteBookings = (incompleteData.incompleteBookings || []).map((booking: any) => ({
        ...booking,
        bookingType: 'online',
        status: 'incomplete',
        paymentStatus: (() => {
          const s = (booking.paymentStatus || 'unpaid').toLowerCase();
          if (s === 'paid') return 'paid';
          if (s === 'partial') return 'partial';
          return 'unpaid';
        })(),
        createdAtIST: convertToIST(booking.createdAt)
      }));

      // Combine all bookings from different sources
      const allBookings = [...confirmedBookings, ...completedBookings, ...manualBookings, ...cancelledBookings, ...incompleteBookings];

      const getBookingMergeKey = (booking: any) => {
        const raw =
          booking?.bookingId ||
          booking?.originalBookingId ||
          booking?.id ||
          booking?.booking_id ||
          booking?.bookingID;
        const key = raw ? String(raw).trim() : '';
        if (key) return key;
        if (booking?._id) return String(booking._id);
        return '';
      };

      const getStatusRank = (booking: any) => {
        const status = String(booking?.status || '').toLowerCase();
        if (status === 'completed') return 60;
        if (status === 'cancelled') return 55;
        if (status === 'confirmed') return 50;
        if (status === 'manual') return 40;
        if (status === 'pending') return 30;
        if (status === 'incomplete') return 10;
        return 0;
      };

      const getBookingUpdatedTs = (booking: any) => {
        const raw = booking?.updatedAt || booking?.completedAt || booking?.createdAt || booking?.completed_at || booking?.created_at;
        const ts = raw ? new Date(raw).getTime() : 0;
        return Number.isFinite(ts) ? ts : 0;
      };

      const mergedById = new Map<string, any>();
      const mergedNoKey: any[] = [];

      for (const booking of allBookings) {
        const key = getBookingMergeKey(booking);
        if (!key) {
          mergedNoKey.push(booking);
          continue;
        }

        const existing = mergedById.get(key);
        if (!existing) {
          mergedById.set(key, booking);
          continue;
        }

        const rankExisting = getStatusRank(existing);
        const rankNext = getStatusRank(booking);
        if (rankNext > rankExisting) {
          mergedById.set(key, booking);
          continue;
        }
        if (rankNext < rankExisting) {
          continue;
        }

        const tsExisting = getBookingUpdatedTs(existing);
        const tsNext = getBookingUpdatedTs(booking);
        if (tsNext > tsExisting) {
          mergedById.set(key, booking);
        }
      }

      // Show all bookings (deduped)
      const allBookingsToShow = [...Array.from(mergedById.values()), ...mergedNoKey];

      // Transform data for display (keep status as-is from database)
      const transformedBookings = allBookingsToShow.map((booking: any, index: number) => {
        const rawStatus = (booking.status || 'pending').toString();
        const rawBookingType = (booking.bookingType || (booking.isManualBooking ? 'manual' : 'online')).toString();
        const normalizedBookingType = rawBookingType.toLowerCase();
        const normalizedStatus = rawStatus
          .toLowerCase()
          .replace(/\(.*?\)/g, '')
          .replace(/\s+/g, '')
          .trim() || 'pending';
        const normalizedPaymentStatus = (() => {
          const s = (booking.paymentStatus || booking.payment_status || 'unpaid').toLowerCase();
          if (s === 'paid') return 'paid';
          if (s === 'partial') return 'partial';
          return 'unpaid';
        })();
        // Use MongoDB _id as unique key (always unique) or create composite key
        const uniqueId = booking._id ? booking._id.toString() : `${booking.bookingId || booking.id || 'unknown'}-${index}-${Date.now()}`;
        const transformedBooking = {
          ...booking,
          id: uniqueId,
          originalBookingId: booking.bookingId || booking.id, // Store original ID for API calls
          customerName: booking.name || booking.customerName || 'Unknown',
          email: booking.email || '',
          phone: booking.phone || '',
          theater: booking.theaterName || booking.theater || 'Unknown Theater',
          date: booking.date || '',
          time: booking.time || '',
          status: rawStatus, // Preserve original casing/suffix for display
          statusKey: normalizedStatus,
          amount: booking.totalAmount || booking.amount || 0,
          bookingDate: booking.createdAt ? new Date(booking.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          bookingType: normalizedBookingType,
          bookingTypeLabel: rawBookingType,
          occasion: booking.occasion || '',
          paymentStatus: (booking.status || '').toLowerCase() === 'completed' ? 'paid' : normalizedPaymentStatus,
          paymentReceived: booking.paymentReceived || booking.payment_received || '',
          venuePaymentMethod: booking.venuePaymentMethod || booking.venue_payment_method || '',
          paymentMethod: booking.paymentMethod || booking.payment_method || '',
          paymentMode: booking.paymentMode || booking.payment_mode || '',
          finalPaymentMethod: booking.finalPaymentMethod || booking.final_payment_method || '',
          paidBy: booking.paidBy || booking.paid_by || '',
          userId: booking.userId || booking.user_id || '',
          occasionPersonName: booking.occasionPersonName || '',
          birthdayName: booking.birthdayName || '',
          partner1Name: booking.partner1Name || '',
          partner2Name: booking.partner2Name || '',
          dateNightName: booking.dateNightName || '',
          proposerName: booking.proposerName || '',
          valentineName: booking.valentineName || '',
          customCelebration: booking.customCelebration || '',
          cancelReason: booking.cancelReason || booking.cancellationReason || '',
          createdBy: booking.createdBy || '',
          staffName: booking.staffName || '',
          adminName: booking.adminName || '',
          ticketNumber: booking.ticketNumber || booking.ticket_number || ''
        };

        // Debug: Log booking transformation


        return transformedBooking;
      });

      setBookings(transformedBookings);
      setLastUpdated(new Date());
    } catch (error) {

    } finally {
      if (!silent) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchBookings();
    fetchOccasions(); // Also fetch occasions
  }, []);

  // Real-time updates every 2 seconds (silent)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchBookings(true); // Silent update
    }, 2000); // 2 seconds

    return () => clearInterval(interval);
  }, []);

  // Open edit modal when coming from Edit Booking Requests page
  const [pendingOpenEditIdChecked, setPendingOpenEditIdChecked] = useState(false);
  useEffect(() => {
    if (pendingOpenEditIdChecked) return;
    const targetBookingId = sessionStorage.getItem('openEditBookingId');
    const targetMongoId = sessionStorage.getItem('openEditBookingMongoId');
    const searchHint = sessionStorage.getItem('openEditBookingSearchHint');
    const searchPhone = sessionStorage.getItem('openEditBookingSearchPhone');

    if (bookings && bookings.length > 0 && (targetBookingId || targetMongoId || searchHint)) {
      let found = null as any;
      if (targetBookingId) {
        found = bookings.find(b => String(b.originalBookingId || b.id) === String(targetBookingId));
      }
      if (!found && targetMongoId) {
        found = bookings.find(b => String((b as any)._id || b.id) === String(targetMongoId));
      }
      if (!found && (searchHint || searchPhone)) {
        found = bookings.find(b =>
          (searchHint && (b.email === searchHint || b.customerName === searchHint)) ||
          (searchPhone && b.phone === searchPhone)
        );
      }
      if (found) {
        handleEditBooking(found);
        // Clear hints after opening
        sessionStorage.removeItem('openEditBookingId');
        sessionStorage.removeItem('openEditBookingMongoId');
        sessionStorage.removeItem('openEditBookingSearchHint');
        sessionStorage.removeItem('openEditBookingSearchPhone');
        setPendingOpenEditIdChecked(true);
      }
    }
  }, [bookings, pendingOpenEditIdChecked]);

  // Real-time clock update every second
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // 1 second

    return () => clearInterval(clockInterval);
  }, []);

  // Check if we need to reopen the manual booking popup
  useEffect(() => {
    const checkAndReopenPopup = () => {
      const shouldReopen = sessionStorage.getItem('reopenAdminBookingPopup') === 'true';
      const hasFormData = sessionStorage.getItem('adminBookingFormData');
      const isFromMoviesPage = sessionStorage.getItem('adminBookingFromPopup') === 'true';



      if (shouldReopen || hasFormData || isFromMoviesPage) {

        setIsManualBookingOpen(true);
        sessionStorage.removeItem('reopenAdminBookingPopup');
      }
    };

    // Check on mount
    checkAndReopenPopup();

    // Check when window regains focus (user returns from movies page)
    const handleFocus = () => {
      checkAndReopenPopup();
    };

    // Also check on page visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkAndReopenPopup();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Calculate status counts
  const statusCounts = {
    all: bookings.length,
    pending: bookings.filter(b => (b.statusKey || '').toLowerCase() === 'pending').length,
    confirmed: bookings.filter(b => (b.statusKey || '').toLowerCase() === 'confirmed').length,
    cancelled: bookings.filter(b => (b.statusKey || '').toLowerCase() === 'cancelled').length,
    completed: bookings.filter(b => (b.statusKey || '').toLowerCase() === 'completed').length,
    manual: bookings.filter(b => b.bookingType === 'manual' || (b.statusKey && b.statusKey.toLowerCase() === 'manual')).length,
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.theater.toLowerCase().includes(searchTerm.toLowerCase());

    // Handle date filters
    let matchesDate = true;
    if (showTodayOnly) {
      matchesDate = isCurrentDateBooking(booking.date);
    } else if (showTomorrowOnly) {
      matchesDate = isTomorrowBooking(booking.date);
    } else if (selectedDate) {
      matchesDate = isSelectedDateBooking(booking.date);
    }

    // Handle status and type filtering
    let matchesFilter = true;

    if (statusFilter === 'All') {
      matchesFilter = true;
    } else if (statusFilter === 'Manual') {
      matchesFilter =
        booking.bookingType === 'manual' ||
        (booking.statusKey && booking.statusKey.toLowerCase() === 'manual');
    } else if (statusFilter === 'Cancelled') {
      const bookingStatus = (booking.statusKey || booking.status || '').toLowerCase();
      matchesFilter = bookingStatus === 'cancelled';
    } else if (statusFilter === 'Completed') {
      const bookingStatus = (booking.statusKey || booking.status || '').toLowerCase();
      matchesFilter = bookingStatus === 'completed';
    } else {
      const bookingStatus = (booking.statusKey || booking.status || '').toLowerCase();
      const filterStatus = statusFilter.toLowerCase();
      matchesFilter = bookingStatus === filterStatus;
    }

    return matchesSearch && matchesFilter && matchesDate;
  });

  // Sort bookings by date and time
  const sortedBookings = filteredBookings.sort((a, b) => {
    const statusA = (a.statusKey || a.status || '').toLowerCase();
    const statusB = (b.statusKey || b.status || '').toLowerCase();
    const isConfirmedA = statusA === 'confirmed';
    const isConfirmedB = statusB === 'confirmed';
    const isManualA = (a.bookingType || '').toLowerCase() === 'manual' || statusA === 'manual';
    const isManualB = (b.bookingType || '').toLowerCase() === 'manual' || statusB === 'manual';
    const isActiveA = isConfirmedA || isManualA;
    const isActiveB = isConfirmedB || isManualB;
    const isCompletedA = statusA === 'completed';
    const isCompletedB = statusB === 'completed';

    const getIstDateKey = (dateInput: any) => {
      const d = new Date(dateInput);
      if (Number.isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    };

    const getDayDiffFromTodayIST = (dateInput: any) => {
      const key = getIstDateKey(dateInput);
      if (!key) return null;
      const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const ts = Date.parse(`${key}T00:00:00+05:30`);
      const todayTs = Date.parse(`${todayKey}T00:00:00+05:30`);
      if (!Number.isFinite(ts) || !Number.isFinite(todayTs)) return null;
      return Math.round((ts - todayTs) / (24 * 60 * 60 * 1000));
    };

    // Active bookings (confirmed + manual) always on top
    if (isActiveA && !isActiveB) return -1;
    if (isActiveB && !isActiveA) return 1;

    // Date/time parsing helpers
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    const timeA = a.time || '';
    const timeB = b.time || '';

    // Extract start time from time slot (e.g., "12:00 PM - 3:00 PM" -> "12:00 PM")
    const getStartTime = (timeStr: string) => {
      if (!timeStr) return '';
      const startTime = timeStr.split(' - ')[0] || timeStr;
      return startTime.trim();
    };

    const startTimeA = getStartTime(timeA);
    const startTimeB = getStartTime(timeB);

    // Convert time to comparable format
    const parseTime = (timeStr: string) => {
      if (!timeStr) return 0;
      const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
      if (!match) return 0;

      let [, hours, minutes, period] = match;
      let hour24 = parseInt(hours);
      const mins = parseInt(minutes);

      if (period.toLowerCase() === 'pm' && hour24 !== 12) {
        hour24 += 12;
      } else if (period.toLowerCase() === 'am' && hour24 === 12) {
        hour24 = 0;
      }

      return hour24 * 60 + mins; // Convert to minutes for easy comparison
    };

    const timeMinutesA = parseTime(startTimeA);
    const timeMinutesB = parseTime(startTimeB);

    // Active (confirmed + manual): today first, then future dates ascending (time ascending within same day)
    if (isActiveA && isActiveB) {
      const isTodayA = isCurrentDateBooking(a.date);
      const isTodayB = isCurrentDateBooking(b.date);
      if (isTodayA && !isTodayB) return -1;
      if (isTodayB && !isTodayA) return 1;

      const dayDiffA = getDayDiffFromTodayIST(a.date);
      const dayDiffB = getDayDiffFromTodayIST(b.date);

      const safeA = dayDiffA === null ? 999999 : (dayDiffA < 0 ? 999999 : dayDiffA);
      const safeB = dayDiffB === null ? 999999 : (dayDiffB < 0 ? 999999 : dayDiffB);
      if (safeA !== safeB) return safeA - safeB;
      return timeMinutesA - timeMinutesB;
    }

    // Completed bookings should come after active
    if (isCompletedA && !isCompletedB) return -1;
    if (isCompletedB && !isCompletedA) return 1;

    // Completed: latest first (date desc, then time desc)
    if (isCompletedA && isCompletedB) {
      if (dateA.getTime() !== dateB.getTime()) {
        return dateB.getTime() - dateA.getTime();
      }
      return timeMinutesB - timeMinutesA;
    }

    // Non-confirmed: keep previous behavior (date desc, then time desc)
    if (dateA.getTime() !== dateB.getTime()) {
      return dateB.getTime() - dateA.getTime();
    }

    // Descending: latest time first
    return timeMinutesB - timeMinutesA;
  });

  // Infinite scroll - show only displayedCount bookings
  const displayedBookings = sortedBookings.slice(0, displayedCount);
  const hasMore = displayedCount < sortedBookings.length;

  // Reset displayed count when filters change
  useEffect(() => {
    setDisplayedCount(10);
  }, [searchTerm, statusFilter, showTodayOnly, showTomorrowOnly, selectedDate]);

  // Infinite scroll handler (IntersectionObserver)
  useEffect(() => {
    const target = loadMoreSentinelRef.current;
    if (!target) return;
    if (!hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (!hasMore || isLoadingMore) return;

        setIsLoadingMore(true);
        setTimeout(() => {
          setDisplayedCount((prev) => prev + 10);
          setIsLoadingMore(false);
        }, 150);
      },
      {
        root: null,
        rootMargin: '250px',
        threshold: 0
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, displayedCount]);

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      const response = await fetch('/api/admin/update-booking', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: id.toString(),
          status: newStatus.toLowerCase()
        })
      });

      const data = await response.json();

      if (data.success) {
        // Refresh the bookings list
        await fetchBookings();

      } else {

      }
    } catch (error) {

    }
  };

  const handleManualBooking = () => {
    if (isViewOnlyStaff) {
      showError('You have View-only access. Manual booking is disabled.');
      return;
    }
    // Redirect to ManualBooking page instead of opening popup
    window.open('/ManualBooking', '_blank');
  };

  const handleManualBookingSuccess = () => {
    // Refresh bookings after successful manual booking
    fetchBookings();
  };

  const handleViewBooking = async (booking: any) => {
    try {
      // Prefer original booking id when available
      const lookupId = String(booking.originalBookingId || booking.id);

      const statusKey = String(booking.statusKey || booking.status || '').toLowerCase();

      // First try to get the booking from regular bookings
      let response = await fetch(`/api/admin/bookings`);
      let data = await response.json();

      let completeBooking = null;

      if (data.success) {
        // Find the booking in regular bookings
        completeBooking = data.bookings?.find((b: any) => String(b.bookingId || b.id) === lookupId);
      }

      // If not found in regular bookings, try manual bookings
      if (!completeBooking) {
        response = await fetch(`/api/admin/manual-bookings`);
        data = await response.json();

        if (data.success) {
          completeBooking = data.manualBookings?.find((b: any) => String(b.bookingId || b.id) === lookupId);
        }
      }

      // If completed booking, fetch full details from GoDaddy SQL (mongo-shaped)
      if (!completeBooking && statusKey.includes('completed')) {
        try {
          const sqlResponse = await fetch(`/api/admin/export-godaddy-bookings?type=completed&shape=mongo`);
          const sqlData = await sqlResponse.json();
          const sqlBookings = (sqlData?.data?.completed || []) as any[];
          completeBooking = sqlBookings.find((b: any) => String(b.bookingId || b.id) === lookupId) || null;
        } catch {
          // ignore
        }
      }

      // If cancelled booking, fetch full details snapshot from GoDaddy SQL (decoded original_booking_data)
      if (!completeBooking && statusKey.includes('cancelled')) {
        try {
          const sqlResponse = await fetch(`/api/admin/export-bookings-json?type=cancelled`);
          const sqlData = await sqlResponse.json();
          const sqlBookings = (sqlData?.bookings || []) as any[];
          completeBooking = sqlBookings.find((b: any) => String(b.bookingId || b.id) === lookupId) || null;
        } catch {
          // ignore
        }
      }

      if (completeBooking) {
        // Map the complete booking data
        const fullBookingData = {
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
        setIsEditMode(false);
        setIsViewModalOpen(true);
      } else {
        // Fallback to the original booking data if complete data not found
        setSelectedBooking(booking);
        setIsEditMode(false);
        setIsViewModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching complete booking details:', error);
      // Fallback to the original booking data if there's an error
      setSelectedBooking(booking);
      setIsEditMode(false);
      setIsViewModalOpen(true);
    }
  };

  const handleEditBooking = (booking: any) => {
    if (isViewOnlyStaff) {
      showError('You have View-only access. Editing bookings is disabled.');
      return;
    }
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('editBookingSource', 'management');
      } catch {
        // ignore
      }
    }
    const params = new URLSearchParams();
    const bookingId = booking.originalBookingId || booking.id || booking.bookingId;
    if (bookingId) params.set('bookingId', String(bookingId));
    if (booking._id) params.set('mongoId', String(booking._id));
    if (booking.email) params.set('email', String(booking.email));
    const phoneValue = booking.phone || booking.whatsappNumber;
    if (phoneValue) params.set('phone', String(phoneValue));

    router.push(`/EditBooking?${params.toString()}`);
  };

  // Delete/Cancel booking
  const handleDeleteBooking = async (booking: any) => {
    if (isViewOnlyStaff) {
      showError('You have View-only access. Cancelling bookings is disabled.');
      return;
    }
    setBookingToDelete(booking);
    setShowConfirmModal(true);
  };

  const confirmDeleteBooking = async () => {
    if (!bookingToDelete) return;

    if (isViewOnlyStaff) {
      showError('You have View-only access. Cancelling bookings is disabled.');
      return;
    }

    try {
      const requestBody = {
        bookingId: bookingToDelete.originalBookingId || bookingToDelete.id.toString(), // Use original booking ID for API call
        status: 'cancelled'
      };



      const response = await fetch('/api/admin/update-booking', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();


      if (data.success) {
        // Refresh bookings after cancellation
        await fetchBookings();
        showSuccess('Booking cancelled successfully!');
      } else {
        showError('Failed to cancel booking: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {

      showError('Error cancelling booking');
    } finally {
      setShowConfirmModal(false);
      setBookingToDelete(null);
    }
  };

  const handleTogglePaymentStatus = (booking: any) => {
    if (isViewOnlyStaff) {
      showError('You have View-only access. Payment updates are disabled.');
      return;
    }
    const bookingId = booking.originalBookingId || booking.bookingId || booking.id;
    if (!bookingId) {
      showError('Booking ID missing');
      return;
    }

    const currentStatus = (booking.paymentStatus || 'unpaid').toLowerCase();
    if (currentStatus === 'paid') {
      showSuccess('Payment already marked as paid.');
      return;
    }

    setBookingPendingPayment(booking);
    setSelectedPaymentMethod('online');
    setIsPaymentMethodModalOpen(true);
  };

  const handleSendInvoiceOnly = async (booking: any) => {
    if (isViewOnlyStaff) {
      showError('You have View-only access. Sending invoices is disabled.');
      return;
    }
    const bookingId = String(booking.originalBookingId || booking.bookingId || booking.id);

    if (!bookingId) {
      showError('Booking ID missing');
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

      const data = await response.json();

      if (data.success) {
        showSuccess('Invoice email sent to customer.');
      } else {
        showError(data.error || 'Failed to send invoice email');
      }
    } catch (error) {
      console.error('Error sending invoice email:', error);
      showError('Error sending invoice email');
    } finally {
      setSendingInvoiceId(null);
    }
  };

  const handleConfirmPaymentMethod = async () => {
    if (!bookingPendingPayment) return;

    if (isViewOnlyStaff) {
      showError('You have View-only access. Payment updates are disabled.');
      return;
    }

    const booking = bookingPendingPayment;
    const bookingId = String(booking.originalBookingId || booking.bookingId || booking.id);
    if (!bookingId) {
      showError('Booking ID missing');
      return;
    }

    const targetStatus = 'paid';

    const statusLower = ((booking.statusKey || booking.status || '') as string).toLowerCase();
    const isManualBooking =
      (booking.bookingType || '').toLowerCase() === 'manual' ||
      statusLower === 'manual' ||
      Boolean(booking.isManualBooking);

    try {
      setPaymentUpdatingId(bookingId);

      // Get current user info (admin or staff) - EXACT SAME LOGIC AS DASHBOARD
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
        paymentStatus: targetStatus,
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (data.success) {
        setBookings((prev) =>
          prev.map((item) =>
            item.id === booking.id
              ? {
                  ...item,
                  paymentStatus: targetStatus,
                  venuePaymentMethod: selectedPaymentMethod,
                }
              : item,
          ),
        );

        showSuccess(
          `Payment marked as paid (${selectedPaymentMethod === 'cash' ? 'Cash' : selectedPaymentMethod === 'upi' ? 'UPI' : 'Online'}). Invoice email sent.`,
        );

        setIsPaymentMethodModalOpen(false);
        setBookingPendingPayment(null);
        fetchBookings();
      } else {
        showError(data.error || 'Failed to update payment status');
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      showError('Error updating payment status');
    } finally {
      setPaymentUpdatingId(null);
    }
  };

  const handleClosePaymentMethodModal = () => {
    if (paymentUpdatingId !== null && bookingPendingPayment) {
      const pendingId = String(
        bookingPendingPayment.originalBookingId || bookingPendingPayment.bookingId || bookingPendingPayment.id
      );
      if (paymentUpdatingId === pendingId) {
        return;
      }
    }
    setIsPaymentMethodModalOpen(false);
    setBookingPendingPayment(null);
  };

  // Handle booking update from modal
  const handleBookingUpdated = (updatedBooking: any) => {
    // Refresh bookings after update
    fetchBookings();
    setIsViewModalOpen(false);
    setSelectedBooking(null);
    setIsEditMode(false);
  };

  // Close modal
  const handleCloseModal = () => {
    setIsViewModalOpen(false);
    setSelectedBooking(null);
    setIsEditMode(false);
  };

  // Render dynamic occasion fields
  const renderOccasionFields = (booking: any) => {
    if (!booking.occasion) {

      return null;
    }

    // Find the occasion configuration (handle name variations)
    let occasionConfig = occasionOptions.find(occ => occ.name === booking.occasion);

    // Handle common name variations
    if (!occasionConfig) {
      const occasionMappings: { [key: string]: string } = {
        'Marrige Proposal': 'Marriage Proposal',
        'Marriage Proposal': 'Marrige Proposal',
        'Proposal': 'Marriage Proposal'
      };

      const alternativeName = occasionMappings[booking.occasion];
      if (alternativeName) {
        occasionConfig = occasionOptions.find(occ => occ.name === alternativeName);

      }
    }

    if (!occasionConfig) {

      return null;
    }






    const fields: React.ReactElement[] = [];

    // Render each required field dynamically - Simple approach
    occasionConfig.requiredFields.forEach(fieldKey => {
      const fieldLabel = occasionConfig.fieldLabels[fieldKey] || fieldKey;

      // Try to get actual field value first, then fallback to occasionPersonName
      let fieldValue = booking[fieldKey] || '';

      // If no specific field value, use occasionPersonName as fallback
      if (!fieldValue && booking.occasionPersonName) {
        fieldValue = booking.occasionPersonName;
      }



      if (fieldValue) {

        fields.push(
          <div key={fieldKey} className="detail-item">
            <label>{fieldLabel}:</label>
            {isEditMode ? (
              <input type="text" defaultValue={fieldValue} />
            ) : (
              <span>{fieldValue}</span>
            )}
          </div>
        );
      } else {

      }
    });



    // If no fields found, show a message for old bookings
    if (fields.length === 0) {
      return (
        <div className="detail-item full-width">
          <label>Occasion Details:</label>
          <span style={{ color: '#888', fontStyle: 'italic' }}>
            No additional details available (booking created before dynamic fields were implemented)
          </span>
        </div>
      );
    }

    return fields;
  };

  // No loading state - show bookings immediately
  
  return (
    <div className="bookings-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Management - Booking Applications</h1>
            <p>Manage all your theater bookings in one place</p>
          </div>
          <div className="header-actions">
            <button
              className="manual-booking-btn"
              onClick={handleManualBooking}
              disabled={isViewOnlyStaff}
              title={isViewOnlyStaff ? 'View-only access: manual booking disabled' : undefined}
            >
              <Calendar size={16} />
              Manual Booking
            </button>
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
          </div>
        </div>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 26 26" className="search-icon">
            <path fill="currentColor" d="M10 .188A9.81 9.81 0 0 0 .187 10A9.81 9.81 0 0 0 10 19.813c2.29 0 4.393-.811 6.063-2.125l.875.875a1.845 1.845 0 0 0 .343 2.156l4.594 4.625c.713.714 1.88.714 2.594 0l.875-.875a1.84 1.84 0 0 0 0-2.594l-4.625-4.594a1.82 1.82 0 0 0-2.157-.312l-.875-.875A9.812 9.812 0 0 0 10 .188M10 2a8 8 0 1 1 0 16a8 8 0 0 1 0-16M4.937 7.469a5.45 5.45 0 0 0-.812 2.875a5.46 5.46 0 0 0 5.469 5.469a5.5 5.5 0 0 0 3.156-1a7 7 0 0 1-.75.03a7.045 7.045 0 0 1-7.063-7.062c0-.104-.005-.208 0-.312" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          className={`today-button ${showTodayOnly ? 'active' : ''}`}
          onClick={() => {
            setShowTodayOnly(!showTodayOnly);
            setShowTomorrowOnly(false);
            setSelectedDate('');
            setSearchTerm('');
          }}
          title={showTodayOnly ? "Show all bookings" : "Show today's bookings only"}
        >
          Today
        </button>

        <button
          className={`today-button ${showTomorrowOnly ? 'active' : ''}`}
          onClick={() => {
            setShowTomorrowOnly(!showTomorrowOnly);
            setShowTodayOnly(false);
            setSelectedDate('');
            setSearchTerm('');
          }}
          title={showTomorrowOnly ? "Show all bookings" : "Show tomorrow's bookings only"}
        >
          Tomorrow
        </button>

        <button
          className={`date-selector-button ${selectedDate ? 'active' : ''}`}
          onClick={() => setIsDatePickerOpen(true)}
          title="Select specific date to view bookings"
        >
          <Calendar size={16} />
          {selectedDate ? new Date(selectedDate).toLocaleDateString('en-IN') : 'Select Date'}
        </button>

        <div className="filter-dropdown">
          <Filter size={20} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Incomplete">Incomplete</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Manual">Manual</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div className="results-info">
          Showing {displayedBookings.length} of {sortedBookings.length} bookings
          {hasMore && <span style={{ marginLeft: '0.5rem', color: '#10b981' }}>(Scroll for more)</span>}
        </div>
      </div>

      <div className="bookings-table-container">
        <table className="bookings-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Booking / Ticket</th>
              <th>Customer</th>
              <th>Contact</th>
              <th>Theater</th>
              <th>Date & Time</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedBookings.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>
                  {bookings.length === 0
                    ? 'No bookings found in database'
                    : `No bookings match your search criteria`}
                </td>
              </tr>
            ) : (
              displayedBookings.map((booking: any, index: number) => {
                // Calculate current date CONFIRMED booking number
                const statusKeyLower = (booking.statusKey || booking.status || '').toLowerCase();
                const normalizedBookingId = String(booking.originalBookingId || booking.bookingId || booking.id);
                const isManualBooking =
                  booking.bookingType === 'manual' || statusKeyLower === 'manual';
                const isActiveManualBooking = isManualBooking && statusKeyLower !== 'cancelled';

                const currentDateConfirmedBookings = displayedBookings.filter((b: any, i: number) =>
                  i <= index &&
                  isCurrentDateBooking(b.date) &&
                  (b.statusKey || '').toLowerCase() === 'confirmed'
                );
                const currentDateConfirmedBookingNumber = currentDateConfirmedBookings.length;
                const normalizedPaymentStatus = (booking.paymentStatus || 'unpaid').toLowerCase();
                const isPaid = normalizedPaymentStatus === 'paid';
                const paymentBadge = formatPaymentBadge(booking);
                const canTogglePayment =
                  statusKeyLower === 'confirmed' || isActiveManualBooking;
                const isPaymentUpdating = paymentUpdatingId === normalizedBookingId;

                return (
                  <tr key={`${booking.id}-${index}`}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="booking-id-cell">
                        <div className="booking-number">#{booking.originalBookingId || booking.id}</div>
                        {booking.ticketNumber ? (
                          <div className="ticket-number">Ticket: {booking.ticketNumber}</div>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <div className="customer-info">
                        <div className="customer-name">
                          {booking.customerName}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="contact-info">
                        <div>{booking.email}</div>
                        <div>{booking.phone}</div>
                      </div>
                    </td>
                    <td>{booking.theater}</td>
                    <td>
                      <div className="datetime-info">
                        <div>{booking.date}</div>
                        <div>{booking.time}</div>
                      </div>
                    </td>
                    <td>₹{booking.amount.toLocaleString()}</td>
                    <td>
                      <span
                        className={`payment-badge ${paymentBadge.className} ${
                          paymentBadge.animate ? 'has-roller' : ''
                        }`}
                        title={paymentBadge.title}
                      >
                        {paymentBadge.animate ? (
                          <span className="badge-roller">
                            <span className="badge-track">
                              <span className="badge-line">{paymentBadge.primaryText}</span>
                              <span className="badge-line">{paymentBadge.secondaryText}</span>
                            </span>
                          </span>
                        ) : (
                          <span className="badge-line">
                            {paymentBadge.secondaryText || paymentBadge.primaryText}
                          </span>
                        )}
                      </span>
                    </td>
                    <td>{booking.cancelReason || '-'}</td>
                    <td>
                      <span className={`status-badge ${(booking.statusKey || booking.status || '').toLowerCase()}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {String(booking.statusKey || booking.status || '').toLowerCase() !== 'completed' && canTogglePayment && (
                          isPaid ? (
                            <button
                              className="action-btn complete-btn"
                              title={isViewOnlyStaff ? 'View-only access: completion disabled' : 'Move to Completed'}
                              onClick={() => handleMarkAsCompleted(booking)}
                              disabled={
                                isViewOnlyStaff ||
                                completingBookingId === String(booking.originalBookingId || booking.bookingId || booking.id)
                              }
                            >
                              <CheckCircle size={16} />
                            </button>
                          ) : (
                            <button
                              className="action-btn pay-btn"
                              title={isViewOnlyStaff ? 'View-only access: payment updates disabled' : 'Mark as Paid'}
                              onClick={() => handleTogglePaymentStatus(booking)}
                              disabled={isViewOnlyStaff || isPaymentUpdating}
                            >
                              <CheckCircle size={16} />
                            </button>
                          )
                        )}
                        <button
                          className="action-btn view-btn"
                          title="View Details"
                          onClick={() => handleViewBooking(booking)}
                        >
                          <Eye size={16} />
                        </button>
                        {String(booking.statusKey || booking.status || '').toLowerCase() !== 'completed' && (
                          <>
                            <button
                              className="action-btn edit-btn"
                              title={isViewOnlyStaff ? 'View-only access: editing disabled' : 'Edit Booking'}
                              onClick={() => handleEditBooking(booking)}
                              disabled={isViewOnlyStaff}
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              className="action-btn delete-btn"
                              title={
                                (booking.status || '').toLowerCase() === 'cancelled'
                                  ? 'Already cancelled'
                                  : isViewOnlyStaff
                                    ? 'View-only access: cancellation disabled'
                                    : 'Cancel Booking'
                              }
                              onClick={() => handleDeleteBooking(booking)}
                              disabled={(booking.status || '').toLowerCase() === 'cancelled' || isViewOnlyStaff}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Loading indicator for infinite scroll */}
      {isLoadingMore && (
        <div style={{ 
          textAlign: 'center', 
          padding: '2rem', 
          color: '#10b981',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          Loading more bookings...
        </div>
      )}

      {/* Sentinel for IntersectionObserver */}
      {hasMore && (
        <div
          ref={loadMoreSentinelRef}
          style={{ height: '1px', width: '100%' }}
        />
      )}
      
      {/* End of results indicator */}
      {!hasMore && displayedBookings.length > 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '2rem', 
          color: '#666',
          fontSize: '0.85rem'
        }}>
          All bookings loaded ({sortedBookings.length} total)
        </div>
      )}

      <style jsx>{`
        .bookings-page {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 2rem;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-text h1 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.6rem;
          font-weight: 600;
          color: #333;
          margin: 0 0 0.5rem 0;
        }

        .header-text p {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.85rem;
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
          font-size: 0.75rem;
          color: #28a745;
          font-weight: 600;
        }

        .last-updated {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.65rem;
          color: #666;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }


        .manual-booking-btn {
          background: #28a745;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.6rem 1.2rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          white-space: nowrap;
        }

        .manual-booking-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .manual-booking-btn:hover {
          background: #218838;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
        }

        .manual-booking-btn:hover:disabled {
          background: #28a745;
          transform: none;
          box-shadow: none;
        }

        .action-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          filter: grayscale(0.3);
          transform: none;
          box-shadow: none;
          pointer-events: none;
        }

        .filters-section {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          align-items: flex-end;
          flex-wrap: nowrap;
        }

        .search-box {
          position: relative;
          flex: 1;
          max-width: 400px;
        }

        .search-box input {
          width: 100%;
          padding: 0.6rem 0.8rem 0.6rem 2.5rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.8rem;
          background: white;
          color: #000000;
        }

        .search-box input::placeholder {
          color: #666666;
        }

        .search-box svg {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #666;
        }

        .today-button {
          padding: 0.6rem 1.2rem;
          background: rgb(255, 66, 66);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .today-button:hover {
          background:rgb(255, 66, 66);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .today-button:active {
          transform: translateY(0);
        }

        .today-button.active {
          background: #28a745;
          box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
        }

        .today-button.active:hover {
          background: #218838;
        }


        .date-selector-button {
          padding: 0.6rem 1.2rem;
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
          margin-left: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 140px;
          justify-content: center;
        }

        .date-selector-button:hover {
          background: linear-gradient(135deg, #ff5252 0%, #d63031 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
        }

        .date-selector-button:active {
          transform: translateY(0);
        }

        .date-selector-button.active {
          background: #28a745;
          box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
        }

        .date-selector-button.active:hover {
          background: #218838;
        }

        .filter-dropdown {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .filter-dropdown select {
          padding: 0.75rem 1rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          background: white;
          color: #000000;
          cursor: pointer;
          min-width: 150px;
        }

        .filter-dropdown select option {
          color: #000000;
          background: white;
          padding: 0.5rem;
        }

        .bookings-table-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .bookings-table {
          width: 100%;
          border-collapse: collapse;
        }

        .bookings-table th {
          background: #f8f9fa;
          padding: 0.75rem;
          text-align: left;
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          color: #333;
          border-bottom: 1px solid #dee2e6;
        }

        .bookings-table td {
          padding: 0.75rem;
          border-bottom: 1px solid #dee2e6;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.8rem;
          color: #666;
        }

        .customer-info {
          display: flex;
          flex-direction: column;
        }

        .customer-name {
          font-weight: 600;
          color: #333;
        }

        .booking-date {
          font-size: 0.7rem;
          color: #999;
        }

        .contact-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .datetime-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .status-badge {
          padding: 0.2rem 0.6rem;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 500;
          text-transform: uppercase;
          color: rgb(255, 255, 255) !important; /* White text for all status badges */
        }

        .status-badge.pending {
          background: #fff3cd;
          color: rgb(255, 255, 255) !important;
        }

        .status-badge.confirmed {
          background:rgba(16, 185, 129, 0.58);
          color: rgb(255, 255, 255) !important;
        }

        .status-badge.manual {
          background:rgba(236, 72, 154, 0.64);
          color: rgb(255, 255, 255) !important;
        }

        .status-badge.cancelled {
          background:rgba(239, 68, 68, 0.66);
          color: rgb(255, 255, 255) !important;
        }

            .status-badge.completed {
              background: #8B5CF6;
              color: rgb(255, 255, 255) !important;
            }

            .status-badge.incomplete {
              background: #FFA500;
              color: rgb(255, 255, 255) !important;
            }

        .payment-badge {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.2rem 0.9rem;
          border-radius: 9999px;
          font-size: 0.65rem;
          font-weight: 600;
          border: 1px solid transparent;
          min-width: 130px;
          height: 28px;
          overflow: hidden;
          text-transform: none;
          white-space: nowrap;
        }

        .payment-badge .badge-line {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          white-space: nowrap;
        }

        .payment-badge .badge-roller {
          position: relative;
          height: 1.3rem;
          overflow: hidden;
        }

        .payment-badge .badge-track {
          display: flex;
          flex-direction: column;
          animation: badgeSlide 3s ease-in-out infinite;
        }

        .payment-badge.has-roller .badge-line {
          width: 100%;
          justify-content: center;
        }

        .payment-badge.paid {
          background: #d1fae5;
          border-color: #10b981;
          color: #047857;
        }

        .payment-badge.unpaid {
          background: #fee2e2;
          border-color: #f87171;
          color: #b91c1c;
        }

        .payment-badge.partial {
          background: #fef3c7;
          border-color: #f59e0b;
          color: #92400e;
        }

        .delete-btn:disabled {
          background: #f3f4f6;
          color: #9ca3af;
          border: 1px solid #e5e7eb;
          cursor: not-allowed;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .action-btn {
          padding: 0.4rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .action-btn.pay-btn {
          background: #f59e0b;
          color: white;
        }

        .action-btn.pay-btn.paid {
          background: #10b981;
        }

        .action-btn.complete-btn {
          background: #10b981;
          color: white;
        }

        .action-btn.complete-btn:hover {
          background: #059669;
        }

        .action-btn.pay-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .view-btn {
          background: #3B82F6;
          color: white;
        }

        .view-btn:hover {
          background: #2563EB;
        }

        .edit-btn {
          background: #8B5CF6;
          color: white;
        }

        .edit-btn:hover {
          background: #7C3AED;
        }

        .confirm-btn {
          background: #17a2b8;
          color: white;
        }

        .confirm-btn:hover {
          background: #138496;
        }

        .delete-btn {
          background: #dc3545;
          color: white;
        }

        .delete-btn:hover {
          background: #c82333;
        }

        .results-info {
          font-size: 0.9rem;
          color: #6B7280;
          padding: 0.5rem 1rem;
          background: #F9FAFB;
          border-radius: 0.5rem;
          border: 1px solid #E5E7EB;
        }

        @media (max-width: 768px) {
          .bookings-page {
            padding: 1rem;
          }

          .header-content {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .manual-booking-btn {
            align-self: flex-start;
          }

          .filters-section {
            flex-direction: row;
            align-items: flex-end;
            gap: 0.75rem;
          }

          .search-box {
            max-width: none;
            flex: 1;
          }

          .filter-dropdown select {
            min-width: 120px;
            font-size: 0.8rem;
            padding: 0.6rem 0.8rem;
          }

          .bookings-table-container {
            overflow-x: auto;
          }

          .bookings-table {
            min-width: 800px;
          }
        }
      `}</style>

      {/* Booking Details Popup */}
      {isViewModalOpen && !isEditMode && selectedBooking && (
        <BookingDetailsPopup
          isOpen={true}
          onClose={handleCloseModal}
          booking={selectedBooking}
          occasions={occasionOptions}
          hidePaymentSummary={false}
          onEdit={(booking) => {
            // Handle edit functionality
            sessionStorage.setItem('editingBooking', JSON.stringify({
              bookingId: booking.id || booking.bookingId || booking._id,
              isEditing: true,
              isAdminEdit: true,
              ...booking
            }));
            handleCloseModal();
          }}
          showEditButton={true}
        />
      )}

      {/* Edit Modal - Keep the existing edit functionality */}
      {selectedBooking && isViewModalOpen && isEditMode && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Booking</h2>
              <button className="close-btn" onClick={handleCloseModal}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              {isEditMode && (
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Booking ID:</label>
                    <span>#{selectedBooking.originalBookingId || selectedBooking.id}</span>
                  </div>
                  <div className="detail-item">
                    <label>Customer Name:</label>
                    {isEditMode ? (
                      <input type="text" defaultValue={selectedBooking.customerName} />
                    ) : (
                      <span>{selectedBooking.customerName}</span>
                    )}
                  </div>
                  <div className="detail-item">
                    <label>Email:</label>
                    {isEditMode ? (
                      <input type="email" defaultValue={selectedBooking.email} />
                    ) : (
                      <span>{selectedBooking.email}</span>
                    )}
                  </div>
                  <div className="detail-item">
                    <label>Phone:</label>
                    {isEditMode ? (
                      <input type="tel" defaultValue={selectedBooking.phone} />
                    ) : (
                      <span>{selectedBooking.phone}</span>
                    )}
                  </div>
                  <div className="detail-item">
                    <label>Theater:</label>
                    {isEditMode ? (
                      <input type="text" defaultValue={selectedBooking.theater} />
                    ) : (
                      <span>{selectedBooking.theater}</span>
                    )}
                  </div>
                  <div className="detail-item">
                    <label>Date:</label>
                    {isEditMode ? (
                      <input type="text" defaultValue={selectedBooking.date} />
                    ) : (
                      <span>{selectedBooking.date}</span>
                    )}
                  </div>
                  <div className="detail-item">
                    <label>Time:</label>
                    {isEditMode ? (
                      <input type="text" defaultValue={selectedBooking.time} />
                    ) : (
                      <span>{selectedBooking.time}</span>
                    )}
                  </div>
                  <div className="detail-item">
                    <label>Occasion:</label>
                    {isEditMode ? (
                      <input type="text" defaultValue={selectedBooking.occasion} />
                    ) : (
                      <span>{selectedBooking.occasion}</span>
                    )}
                  </div>
                  <div className="detail-item">
                    <label>Amount:</label>
                    <span>₹{selectedBooking.amount.toLocaleString()}</span>
                  </div>
                  <div className="detail-item">
                    <label>Status:</label>
                    <span className={`status-badge ${selectedBooking.status.toLowerCase()}`}>
                      {selectedBooking.status}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Booking Type:</label>
                    <span>{selectedBooking.bookingType === 'manual' ? 'Manual' : 'Online'}</span>
                  </div>
                  <div className="detail-item full-width">
                    <label>Booked On:</label>
                    <span>{selectedBooking.bookingDate}</span>
                  </div>
                  <div className="detail-item">
                    <label>Created At (IST):</label>
                    <span>{selectedBooking.createdAtIST || 'N/A'}</span>
                  </div>

                  {/* Dynamic Occasion-specific fields */}
                  {renderOccasionFields(selectedBooking)}

                  {/* Debug: Show all booking data */}
                  <div className="detail-item full-width" style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
                    <label style={{ fontWeight: 'bold', color: '#333' }}>Debug - All Booking Data:</label>
                    <pre style={{ fontSize: '12px', color: '#666', maxHeight: '200px', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(selectedBooking, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #E5E7EB;
        }

        .modal-header h2 {
          margin: 0;
          color: #8B5CF6;
          font-size: 1.5rem;
        }

        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #6B7280;
          padding: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: background 0.2s;
        }

        .close-btn:hover {
          background: #F3F4F6;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .detail-item.full-width {
          grid-column: span 2;
        }

        .detail-item label {
          font-weight: 600;
          color: #374151;
          font-size: 0.9rem;
        }

        .detail-item span {
          color: #6B7280;
          font-size: 1rem;
        }

        .detail-item input,
        .detail-item select {
          padding: 0.75rem;
          border: 1px solid #D1D5DB;
          border-radius: 6px;
          font-size: 1rem;
          background: white;
          color: #000000;
        }

        .detail-item input:focus,
        .detail-item select:focus {
          outline: none;
          border-color: #8B5CF6;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
          justify-content: flex-end;
        }

        .payment-method-modal {
          background: #ffffff;
          width: min(420px, 90vw);
          padding: 2rem;
          border-radius: 18px;
          box-shadow: 0 25px 60px rgba(15, 23, 42, 0.2);
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .payment-method-modal .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .modal-subtitle {
          color: #6B7280;
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .payment-method-options {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .payment-method-option {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1.1rem 1.25rem;
          border-radius: 14px;
          border: 1.5px solid #E5E7EB;
          background: #F9FAFB;
          text-align: left;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .payment-method-option .method-icon {
          font-size: 1.6rem;
        }

        .payment-method-option .method-title {
          display: block;
          font-weight: 600;
          color: #111827;
        }

        .payment-method-option .method-subtitle {
          display: block;
          color: #6B7280;
          font-size: 0.85rem;
          margin-top: 0.2rem;
        }

        .payment-method-option.selected {
          border-color: #8B5CF6;
          background: rgba(139, 92, 246, 0.08);
          box-shadow: 0 10px 20px rgba(139, 92, 246, 0.18);
        }

        .payment-method-option:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .send-invoice-actions {
          margin-top: 1.5rem;
          display: flex;
          justify-content: flex-end;
        }

        .send-invoice-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          padding: 0.8rem 1.75rem;
          border-radius: 999px;
          border: none;
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 0.92rem;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #ffffff;
          background: linear-gradient(135deg, #E50914 0%, #B20710 55%, #FF6B1A 100%);
          box-shadow: 0 12px 32px rgba(229, 9, 20, 0.33);
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .send-invoice-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 16px 42px rgba(229, 9, 20, 0.45);
        }

        .send-invoice-btn:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 10px 28px rgba(229, 9, 20, 0.32);
        }

        .send-invoice-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          background: linear-gradient(135deg, rgba(229, 9, 20, 0.45), rgba(178, 7, 16, 0.45));
          box-shadow: none;
        }

        .save-btn,
        .cancel-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .save-btn {
          background: #8B5CF6;
          color: white;
        }

        .save-btn:hover {
          background: #7C3AED;
        }

        .cancel-btn {
          background: #E5E7EB;
          color: #374151;
        }

        .cancel-btn:hover {
          background: #D1D5DB;
        }

        @media (max-width: 768px) {
          .modal-content {
            width: 95%;
            max-height: 95vh;
          }

          .detail-grid {
            grid-template-columns: 1fr;
          }

          .detail-item.full-width {
            grid-column: span 1;
          }
        }

        /* Pagination Styles */
        .pagination-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 2rem;
          padding: 1rem 0;
          border-top: 1px solid #E5E7EB;
        }

        .pagination-info {
          color: #6B7280;
          font-size: 0.875rem;
        }

        .pagination-controls {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .pagination-btn {
          padding: 0.5rem 0.75rem;
          border: 1px solid #D1D5DB;
          background: white;
          color: #374151;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .pagination-btn:hover:not(:disabled) {
          background: #F9FAFB;
          border-color: #9CA3AF;
        }

        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination-btn.active {
          background: #8B5CF6;
          color: white;
          border-color: #8B5CF6;
        }

        .pagination-btn.active:hover {
          background: #7C3AED;
          border-color: #7C3AED;
        }

        @media (max-width: 768px) {
          .pagination-container {
            flex-direction: column;
            gap: 1rem;
          }

          .pagination-controls {
            flex-wrap: wrap;
            justify-content: center;
          }
        }
      `}</style>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        title="Cancel Booking"
        message={`Are you sure you want to cancel booking ${bookingToDelete?.id}?`}
        confirmText="Yes, Cancel"
        cancelText="No, Keep"
        onConfirm={confirmDeleteBooking}
        onCancel={() => {
          setShowConfirmModal(false);
          setBookingToDelete(null);
        }}
        type="warning"
      />

      {isPaymentMethodModalOpen && bookingPendingPayment && (
        <div className="modal-overlay" onClick={handleClosePaymentMethodModal}>
          <div className="payment-method-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>How was the payment received?</h2>
              <button className="close-btn" onClick={handleClosePaymentMethodModal} disabled={paymentUpdatingId === bookingPendingPayment.id}>
                <X size={20} />
              </button>
            </div>

            <p className="modal-subtitle">
              Select the payment method used for booking #{bookingPendingPayment.originalBookingId || bookingPendingPayment.id}.
            </p>

            <div className="send-invoice-actions">
              <button
                type="button"
                className="send-invoice-btn"
                onClick={() => handleSendInvoiceOnly(bookingPendingPayment)}
                disabled={paymentUpdatingId === bookingPendingPayment.id || sendingInvoiceId === String(bookingPendingPayment.originalBookingId || bookingPendingPayment.bookingId || bookingPendingPayment.id)}
              >
                {sendingInvoiceId === String(bookingPendingPayment.originalBookingId || bookingPendingPayment.bookingId || bookingPendingPayment.id)
                  ? 'Sending…'
                  : 'Send Invoice'}
              </button>
            </div>

            <div className="payment-method-options">
              <button
                type="button"
                className={`payment-method-option ${selectedPaymentMethod === 'online' ? 'selected' : ''}`}
                onClick={() => setSelectedPaymentMethod('online')}
                disabled={paymentUpdatingId === bookingPendingPayment.id}
              >
                <span className="method-icon">💳</span>
                <span className="method-title">Paid Online</span>
                <span className="method-subtitle">Card, netbanking, or any online mode</span>
              </button>

              <button
                type="button"
                className={`payment-method-option ${selectedPaymentMethod === 'upi' ? 'selected' : ''}`}
                onClick={() => setSelectedPaymentMethod('upi')}
                disabled={paymentUpdatingId === bookingPendingPayment.id}
              >
                <span className="method-icon">📲</span>
                <span className="method-title">Paid via UPI</span>
                <span className="method-subtitle">UPI payment received</span>
              </button>

              <button
                type="button"
                className={`payment-method-option ${selectedPaymentMethod === 'cash' ? 'selected' : ''}`}
                onClick={() => setSelectedPaymentMethod('cash')}
                disabled={paymentUpdatingId === bookingPendingPayment.id}
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
                disabled={paymentUpdatingId === bookingPendingPayment.id}
              >
                Cancel
              </button>
              <button
                className="save-btn"
                onClick={handleConfirmPaymentMethod}
                disabled={paymentUpdatingId === bookingPendingPayment.id}
              >
                Mark as Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Date Picker */}
      {isDatePickerOpen && (
        <GlobalDatePicker
          isOpen={isDatePickerOpen}
          onClose={() => setIsDatePickerOpen(false)}
          onDateSelect={(date) => {
            setSelectedDate(date);
            setShowTodayOnly(false);
            setShowTomorrowOnly(false);
            setSearchTerm('');
            setIsDatePickerOpen(false);
          }}
          selectedDate={selectedDate}
          allowPastDates={true}
        />
      )}

    </div>
  );
}

