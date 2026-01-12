  import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Plus, Minus, X, Check, Star, Calendar, Clock, Users, MapPin, Gift, Cake, Sparkles, Play, Phone, MessageCircle } from 'lucide-react';
import { useBooking } from '@/contexts/BookingContext';
import { useDatePicker } from '@/contexts/DatePickerContext';

import GlobalDatePicker from './GlobalDatePicker';
import MoviesModal from './MoviesModal';
import { useToast } from '@/hooks/useToast';
import Toast from './Toast';

declare global {
  interface Window {
    Razorpay: any;
  }
}


interface OccasionOption {
  _id: string;
  occasionId: string;
  name: string;
  icon: string;
  popular: boolean;
  requiredFields: string[];
  fieldLabels: { [key: string]: string };
  isActive: boolean;
  includeInDecoration?: boolean;
}

interface BookingForm {
  bookingName: string;
  whatsappNumber: string;
  emailAddress: string;
  occasion: string;
  // Movies kept hardcoded as it's static
  selectedMovies: Array<{ id?: string; name: string; price: number; quantity?: number }>;
  // Dynamic service items (no hardcoded fields)
  [key: string]: any; // This allows dynamic selectedXXX fields
  // Overview section options
  wantCakes: 'Yes' | 'No';
  wantDecorItems: 'Yes' | 'No';
  wantGifts: 'Yes' | 'No';
  wantMovies: 'Yes' | 'No';
  promoCode: string;
  agreeToTerms: boolean;
  numberOfPeople: number;
  occasionData: { [key: string]: string };
}

interface BookingPopupProps {
  isOpen: boolean;
  onClose: () => void;
  isManualMode?: boolean; // Manual booking mode for admin
  onSuccess?: () => void; // Callback after successful booking
  userInfo?: {
    type: 'admin' | 'staff' | null;
    staffId?: string;
    staffName?: string;
    adminName?: string;
    profilePhoto?: string;
  };
}


export default function BookingPopup({ isOpen, onClose, isManualMode = false, onSuccess, userInfo }: BookingPopupProps) {
  const { selectedTheater, selectedDate, selectedTimeSlot, setSelectedTimeSlot, setSelectedTheater, setSelectedDate, openBookingPopup, closeBookingPopup, refreshBookedSlots } = useBooking();
  const { isDatePickerOpen, openDatePicker, closeDatePicker } = useDatePicker();

  // Track date changes
  useEffect(() => {
    // Date change tracking
  }, [selectedDate]);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('Overview');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isBookingSuccessful, setIsBookingSuccessful] = useState(false);
  const [bookingResult, setBookingResult] = useState<{ success: boolean; message: string; bookingId?: string; wasEditing?: boolean } | null>(null);
  const [isEditingBooking, setIsEditingBooking] = useState(false);
  const [originalFormData, setOriginalFormData] = useState<BookingForm | null>(null);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [validationErrorName, setValidationErrorName] = useState('');
  const [isTimeSelectionOpen, setIsTimeSelectionOpen] = useState(false);
  const [bookedTimeSlots, setBookedTimeSlots] = useState<string[]>([]);
  const autoCloseTimerRef = useRef<number | null>(null);
  const lastClickedItemRef = useRef<string | null>(null);
  const clickTimeoutRef = useRef<number | null>(null);
  const toastShownRef = useRef<boolean>(false);
  const [hasSentEditRequest, setHasSentEditRequest] = useState(false);
  const [isMoviesModalOpen, setIsMoviesModalOpen] = useState(false);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [showManualPaymentChoice, setShowManualPaymentChoice] = useState(false);
  const [manualPaymentMethod, setManualPaymentMethod] = useState<'cash' | 'upi'>('cash');
  const [showPartialPaymentChoice, setShowPartialPaymentChoice] = useState(false);
  const [partialPaymentMethod, setPartialPaymentMethod] = useState<'cash' | 'upi'>('upi');
  const [partialPaymentAmount, setPartialPaymentAmount] = useState<string>('');
  const [partialSlotBookingFee, setPartialSlotBookingFee] = useState<string>('');
  const [isPartialSlotFeeManualOverride, setIsPartialSlotFeeManualOverride] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [realTheaterData, setRealTheaterData] = useState<any[]>([]);
  const [showEditRequestPopup, setShowEditRequestPopup] = useState(false);
  const { showSuccess, showError, toasts, removeToast } = useToast();
  const [isSendingEditRequest, setIsSendingEditRequest] = useState(false);

  const buildCreatorMetadata = () => {
    if (!isManualMode || !userInfo || !userInfo.type) return undefined;
    if (userInfo.type === 'staff') {
      return {
        type: 'staff' as const,
        staffName: userInfo.staffName || 'Staff Member',
        staffId: userInfo.staffId,
        profilePhoto: userInfo.profilePhoto
      };
    }
    return {
      type: 'admin' as const,
      adminName: userInfo.adminName || 'Administrator',
      profilePhoto: userInfo.profilePhoto
    };
  };

  const [formData, setFormData] = useState<BookingForm>({
    bookingName: '',
    numberOfPeople: 1, // Will be auto-adjusted by useEffect when theater data loads
    whatsappNumber: '',
    emailAddress: '',
    occasion: '',
    selectedMovies: [], // Keep movies hardcoded as it's static
    wantCakes: 'No',
    wantDecorItems: 'No',
    wantGifts: 'No',
    wantMovies: 'No',
    promoCode: '',
    agreeToTerms: false,
    occasionData: {} // Initialize dynamic occasion data
  });
  const [pricingData, setPricingData] = useState({
    slotBookingFee: 1000,
    extraGuestFee: 400,
    convenienceFee: 50,
    decorationFees: 0
  });
  const [pricingLoaded, setPricingLoaded] = useState(false);

  // Fetch pricing data from JSON file
  useEffect(() => {
    const fetchPricingData = async () => {
      try {
        console.log('💰 BookingPopup: Fetching pricing from /api/pricing...');
        const response = await fetch('/api/pricing', { cache: 'no-store' });
        console.log('💰 BookingPopup: Response status:', response.status);

        const data = await response.json();
        console.log('💰 BookingPopup: API response:', data);

        if (data.success && data.pricing) {
          console.log('✅ BookingPopup: Setting pricing data:', data.pricing);
          setPricingData(data.pricing);
          setPricingLoaded(true);
        } else {
          console.error('❌ BookingPopup: Failed to fetch pricing data:', data.error);
          console.error('❌ BookingPopup: Full response:', data);
          setPricingLoaded(false);
        }
      } catch (error) {
        console.error('❌ BookingPopup: Error fetching pricing data:', error);
      }
    };

    if (isOpen) {
      console.log('💰 BookingPopup: Popup opened, triggering pricing fetch');
      fetchPricingData();
    }
  }, [isOpen]);

  // Helper function to process all fetched data
  const processAllData = (theatersData: any, servicesData: any, occasionsData: any) => {
    try {
      // Set loading states
      setIsLoadingServices(true);
      setIsLoadingOccasions(true);
      setServicesError(null);

      // Process theater data
      if (theatersData.success && theatersData.theaters) {
        setRealTheaterData(theatersData.theaters);
        console.log('✅ [Theater] Successfully loaded', theatersData.theaters.length, 'theaters');
      }

      // Process services data
      if (servicesData?.success && Array.isArray(servicesData.services)) {
        const services = servicesData.services;
        const cleanUrl = (u: any) => {
          if (typeof u !== 'string') return '';
          return u.trim().replace(/^`+|`+$/g, '').replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '');
        };

        const activeServices = services
          .filter((s: any) => s.isActive === true && (s.showInBookingPopup ?? true))
          .map((s: any) => ({
            ...s,
            items: (s.items || []).map((item: any) => ({
              ...item,
              image: cleanUrl(item.image),
              name: item.name || item.title || 'Unnamed Item',
              price: Number(item.price) || Number(item.cost) || 0,
              id: item.id || item.itemId || item.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown'
            })),
            includeInDecoration: s.includeInDecoration || false
          }));

        setAllServices(activeServices);

        // Initialize selectedServices state
        const initialSelectedServices: { [key: string]: 'Yes' | 'No' } = {};
        const initialSelectedServiceItems: { [key: string]: string[] } = {};

        activeServices.forEach((s: any) => {
          if (s.compulsory) {
            initialSelectedServices[s.name] = 'Yes';
          } else {
            initialSelectedServices[s.name] = 'No';
          }
          initialSelectedServiceItems[s.name] = [];
        });

        // Check if we're editing a booking and override with existing service selections
        const editingBooking = sessionStorage.getItem('editingBooking');
        if (editingBooking) {
          try {
            const bookingData = JSON.parse(editingBooking);

            // Process all services and check if they have items in booking
            let hasDecorationServices = false;

            activeServices.forEach((service: any) => {
              const serviceKey = `selected${service.name}`;
              const serviceItems = bookingData[serviceKey];

              if (Array.isArray(serviceItems) && serviceItems.length > 0) {
                // Service has items in booking - set to Yes
                initialSelectedServices[service.name] = 'Yes';

                // Extract item names from booking data
                const itemNames = serviceItems.map((item: any) => {
                  if (typeof item === 'string') return item;
                  return item.name || item.title || item.id || 'Unknown Item';
                });

                initialSelectedServiceItems[service.name] = itemNames;

                // Check if this service is included in decoration
                if (service.includeInDecoration) {
                  hasDecorationServices = true;
                }
              } else {
                // Service has no items - keep default (No for non-compulsory, Yes for compulsory)
                initialSelectedServiceItems[service.name] = [];
              }
            });

            // If any decoration-included service has items, set decoration to Yes
            // and ensure all decoration-included services are also set to Yes
            if (hasDecorationServices) {
              initialSelectedServices['__decoration__'] = 'Yes';

              // Also enable all decoration-included services
              activeServices.forEach((service: any) => {
                if (service.includeInDecoration) {
                  initialSelectedServices[service.name] = 'Yes';
                }
              });
            }
          } catch (e) {
            // Silent error handling for editing booking services
          }
        }

        setSelectedServices(initialSelectedServices);
        setSelectedServiceItems(initialSelectedServiceItems);
      }

      // Process occasions data
      if (occasionsData.success && occasionsData.occasions) {
        setOccasionOptions(occasionsData.occasions);

        // If editing, set selectedOccasionData after occasions are loaded
        const editingBooking = sessionStorage.getItem('editingBooking');
        if (editingBooking) {
          try {
            const bookingData = JSON.parse(editingBooking);
            if (bookingData.occasion) {
              const selectedOccasion = occasionsData.occasions.find((occ: any) => occ.name === bookingData.occasion);
              if (selectedOccasion) {
                setSelectedOccasionData(selectedOccasion);
              }
            }
          } catch (e) {
            console.error('Error setting occasion data for editing:', e);
          }
        }
      }

    } catch (error) {
      console.error('❌ [Data] Error processing data:', error);
      setServicesError('Failed to process data');
    } finally {
      setIsLoadingServices(false);
      setIsLoadingOccasions(false);
    }
  };

  const handleManualPaymentSelection = async (mode: 'cash' | 'upi') => {
    if (!isManualMode) return;
    if (isProcessingPayment || isSubmittingBooking) return;

    setManualPaymentMethod(mode);
    setShowManualPaymentChoice(false);

    await handleConfirmWithoutPayment({ manualMethod: mode });
  };

  const handleOpenPartialPayment = () => {
    if (!isManualMode) return;
    if (isProcessingPayment || isSubmittingBooking) return;
    setShowManualPaymentChoice(false);
    setPartialPaymentMethod(manualPaymentMethod || 'upi');
    setPartialPaymentAmount('');
    setPartialSlotBookingFee(String(getPayableAmount() || pricingData.slotBookingFee || ''));
    setIsPartialSlotFeeManualOverride(false);
    setShowPartialPaymentChoice(true);
  };

  const handleConfirmPartialPayment = async () => {
    if (isProcessingPayment || isSubmittingBooking) return;
    const parsed = Number(String(partialPaymentAmount || '').replace(/[^0-9.]/g, ''));
    const slotFeeParsed = Number(String(partialSlotBookingFee || '').replace(/[^0-9.]/g, ''));
    const slotFeeDefault = Number(getPayableAmount() || 0);
    const slotFee = Number.isFinite(slotFeeParsed) && slotFeeParsed > 0 ? slotFeeParsed : slotFeeDefault;
    const total = Number(getFinalTotal() || 0);

    if (!Number.isFinite(slotFee) || slotFee <= 0) {
      setValidationErrorName('Invalid Slot Booking Fee');
      setValidationMessage('Please enter a valid Slot Booking Fee.');
      setShowValidationPopup(true);
      return;
    }
    if (total > 0 && slotFee > total) {
      setValidationErrorName('Invalid Slot Booking Fee');
      setValidationMessage(`Slot Booking Fee cannot be more than Total Amount (₹${total}).`);
      setShowValidationPopup(true);
      return;
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setValidationErrorName('Invalid Partial Payment');
      setValidationMessage('Please enter a valid amount received.');
      setShowValidationPopup(true);
      return;
    }
    if (slotFee > 0 && parsed > slotFee) {
      setValidationErrorName('Invalid Partial Payment');
      setValidationMessage(`Partial payment cannot be more than Slot Booking Fee (₹${slotFee}).`);
      setShowValidationPopup(true);
      return;
    }
    setShowPartialPaymentChoice(false);
    await handleConfirmWithoutPayment({
      manualMethod: partialPaymentMethod,
      partialPaymentAmount: parsed,
      paymentStatus: 'partial',
      slotBookingFeeOverride: slotFee
    });
  };

  // Combined data fetching - use preloaded data if available, otherwise fetch
  useEffect(() => {
    const fetchAllData = async () => {
      if (!isOpen) return;

      // Check for preloaded data from theater page
      const preloadedData = (window as any).preloadedBookingData;
      const isPreloadedDataFresh = preloadedData && (Date.now() - preloadedData.timestamp < 300000); // 5 minutes

      if (isPreloadedDataFresh) {
        console.log('⚡ [Data] Using preloaded data from theater page');

        // Use preloaded data directly
        const { services: servicesData, theaters: theatersData, occasions: occasionsData } = preloadedData;

        // Process data same as fetch
        processAllData(theatersData, servicesData, occasionsData);
        return;
      }

      console.log('🚀 [Data] Fetching all data in parallel...');
      const startTime = performance.now();

      try {
        // Set loading states
        setIsLoadingServices(true);
        setIsLoadingOccasions(true);
        setServicesError(null);

        // Fetch all data in parallel
        const [theatersResponse, servicesResponse, occasionsResponse] = await Promise.all([
          fetch('/api/admin/theaters'),
          fetch('/api/admin/services'),
          fetch('/api/occasions')
        ]);

        const [theatersData, servicesData, occasionsData] = await Promise.all([
          theatersResponse.json(),
          servicesResponse.json(),
          occasionsResponse.json()
        ]);

        const endTime = performance.now();
        console.log(`⚡ [Data] All data fetched in ${(endTime - startTime).toFixed(0)}ms`);

        // Process fetched data using the same function
        processAllData(theatersData, servicesData, occasionsData);

      } catch (error) {
        console.error('❌ [Data] Error fetching data:', error);
        setServicesError('Failed to fetch data');
        setIsLoadingServices(false);
        setIsLoadingOccasions(false);
      }
    };

    fetchAllData();
  }, [isOpen]);

  // Track movie selection changes
  useEffect(() => {
    // Movie selection tracking
  }, [formData.selectedMovies]);

  // No longer need Razorpay script loading


  // Validation function to check form completeness
  const validateForm = () => {
    // Check basic required fields
    if (!formData.bookingName.trim()) {
      setValidationErrorName('Missing Name');
      setValidationMessage('Please enter your name to continue.');
      setShowValidationPopup(true);
      return false;
    }

    if (!formData.whatsappNumber.trim()) {
      setValidationErrorName('Missing WhatsApp Number');
      setValidationMessage('Please enter your WhatsApp number to continue.');
      setShowValidationPopup(true);
      return false;
    }
    // Format check: WhatsApp/mobile must be exactly 10 digits
    if (formData.whatsappNumber.replace(/\D/g, '').length !== 10) {
      setValidationErrorName('Invalid WhatsApp Number');
      setValidationMessage('Please enter a valid 10-digit mobile number.');
      setShowValidationPopup(true);
      return false;
    }

    if (!formData.emailAddress.trim()) {
      setValidationErrorName('Missing Email Address');
      setValidationMessage('Please enter your email address to continue.');
      setShowValidationPopup(true);
      return false;
    }
    // Format check: email should be valid
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(formData.emailAddress)) {
      setValidationErrorName('Invalid Email Address');
      setValidationMessage('Please enter a valid email address (e.g., name@example.com).');
      setShowValidationPopup(true);
      return false;
    }

    if (!selectedTimeSlot) {
      setValidationErrorName('Missing Time Slot');
      setValidationMessage('Please select a time slot by clicking on the time area in the header to continue.');
      setShowValidationPopup(true);
      return false;
    }

    // If decoration is enabled, occasion becomes mandatory
    const decorationModeForValidation = selectedServices['__decoration__'];
    if (decorationModeForValidation === 'Yes' && !formData.occasion) {
      setValidationErrorName('Missing Occasion');
      setValidationMessage('Please select an occasion to continue.');
      setShowValidationPopup(true);
      return false;
    }

    // Validate decoration selection
    if (!selectedServices['__decoration__']) {
      setValidationErrorName('Decoration Selection Required');
      setValidationMessage(
        'Please choose whether you want decoration (Yes or No) to continue. If you choose "Yes", you can select occasion-wise decoration, gifts and decor items. If you choose "No", you will continue only with food and basic booking.'
      );
      setShowValidationPopup(true);
      return false;
    }

    // Ensure selected occasion matches decoration mode
    const decorationMode = selectedServices['__decoration__'];
    const selectedOccasion = occasionOptions.find(occ => occ.name === formData.occasion);

    if (decorationMode === 'Yes') {
      // In decoration mode, only decoration-specific occasions are allowed
      if (!selectedOccasion || selectedOccasion.includeInDecoration !== true) {
        setValidationErrorName('Invalid Occasion for Decoration');
        setValidationMessage('You chose decoration = Yes, so please select an occasion that is marked for decoration.');
        setShowValidationPopup(true);
        return false;
      }
    } else if (decorationMode === 'No') {
      // In normal mode, only non-decoration occasions are allowed
      if (selectedOccasion && selectedOccasion.includeInDecoration === true) {
        setValidationErrorName('Invalid Occasion for Normal Booking');
        setValidationMessage('You chose decoration = No, so please select a normal occasion (not marked for decoration).');
        setShowValidationPopup(true);
        return false;
      }
    }

    // Validate movies selection: if Movies = Yes, at least one movie must be selected
    if (formData.wantMovies === 'Yes' && (!formData.selectedMovies || formData.selectedMovies.length === 0)) {
      setValidationErrorName('Movie Selection Required');
      setValidationMessage('You selected "Yes" for movies, but did not choose any movie. Please select at least one movie or select "No" for movies in the Overview tab.');
      setShowValidationPopup(true);
      return false;
    }

    // Validate dynamic occasion required fields
    if (selectedOccasionData && selectedOccasionData.requiredFields) {
      for (const fieldKey of selectedOccasionData.requiredFields) {
        const fieldValue = formData.occasionData?.[fieldKey];
        const fieldLabel = selectedOccasionData.fieldLabels[fieldKey] || fieldKey;

        if (!fieldValue || fieldValue.trim() === '') {
          setValidationErrorName(`Missing ${fieldLabel}`);
          setValidationMessage(`Please enter ${fieldLabel.toLowerCase()} to continue.`);
          setShowValidationPopup(true);
          return false;
        }
      }
    }

    // Dynamic service validation - check if "Yes" but no items selected (except explicitly skipped services)
    for (const service of allServices) {
      if (decorationMode === 'Yes' && service.includeInDecoration) {
        continue;
      }
      // If user explicitly skipped this service in this flow, don't force them to select items
      if (skippedServices.has(service.name)) {
        continue;
      }

      if (selectedServices[service.name] === 'Yes') {
        const serviceItems = selectedServiceItems[service.name] || [];
        if (serviceItems.length === 0) {
          setValidationErrorName(`${service.name} Selection Required`);
          setValidationMessage(`You selected "Yes" for ${service.name} but didn't choose any items. Please select at least one item or click "Skip" to skip this service.`);
          setShowValidationPopup(true);
          return false;
        }
      }
    }

    // Check terms agreement
    if (!formData.agreeToTerms) {
      setValidationErrorName('Terms & Conditions Required');
      setValidationMessage('Please agree to the terms & conditions to continue.');
      setShowValidationPopup(true);
      return false;
    }

    return true;
  };

  // Handle Pay Now with Razorpay
  // Handle Confirm Booking without online payment
  const handleConfirmWithoutPayment = async (options?: { manualMethod?: 'cash' | 'upi'; partialPaymentAmount?: number; paymentStatus?: 'partial'; slotBookingFeeOverride?: number }) => {
    // Prevent multiple submissions
    if (isSubmittingBooking) {
      console.log('⚠️ Booking already in progress, ignoring duplicate click');
      return;
    }

    // Ensure terms are agreed
    if (!formData.agreeToTerms) {
      setValidationErrorName('Terms & Conditions Required');
      setValidationMessage('Please agree to the terms & conditions to continue.');
      setShowValidationPopup(true);
      return;
    }

    // Run final validation similar to last step guard
    if (!validateForm()) {
      return;
    }

    // Quick conflict check (no await to speed up)
    // Skip this check if editing (we're allowed to keep our own time slot)
    if (!isEditingBooking && bookedTimeSlots.includes(selectedTimeSlot || '')) {
      setValidationErrorName('Time Slot Already Booked');
      setValidationMessage('This time slot was just booked by another user. Please select a different time slot.');
      setShowValidationPopup(true);
      return;
    }

    // Set submitting state to disable button
    setIsSubmittingBooking(true);

    try {
      // Calculate pricing (same as payment flow)
      const discountedTotal = getFinalTotal();
      const defaultSlotFee = getPayableAmount();
      const effectiveSlotFee =
        typeof options?.slotBookingFeeOverride === 'number' && Number.isFinite(options.slotBookingFeeOverride)
          ? options.slotBookingFeeOverride
          : defaultSlotFee;
      const advancePayment =
        typeof options?.partialPaymentAmount === 'number' && Number.isFinite(options.partialPaymentAmount)
          ? options.partialPaymentAmount
          : effectiveSlotFee;
      const venuePayment = discountedTotal - effectiveSlotFee;

      // Get theater base price
      const theaterBasePrice = selectedTheater && selectedTheater.price
        ? parseFloat(String(selectedTheater.price).replace(/[₹,\s]/g, ''))
        : 1399.00;

      const effectiveManualMethod: 'cash' | 'upi' | 'online' = isManualMode
        ? options?.manualMethod || manualPaymentMethod || 'cash'
        : 'online';

        // Determine if user selected any decoration
      const hasDecorationSelection = (
        selectedServices['__decoration__'] === 'Yes' ||
        (Array.isArray((formData as any).selectedDecorItems) && (formData as any).selectedDecorItems.length > 0) ||
        (Array.isArray((formData as any).selectedExtraAddOns) && (formData as any).selectedExtraAddOns.length > 0) ||
        String(formData.wantDecorItems || '').toLowerCase() === 'yes'
      );

      const bookingData: any = {
        name: formData.bookingName,
        email: formData.emailAddress,
        phone: formData.whatsappNumber,
        theaterName: selectedTheater?.name || 'FeelME Town Theater',
        date: selectedDate || new Date().toISOString().split('T')[0],
        time: selectedTimeSlot || '6:00 PM',
        occasion: formData.occasion,
        occasionData: formData.occasionData || {},
        // Persist Decoration choice from Overview
        wantDecorItems: formData.wantDecorItems,
        numberOfPeople: formData.numberOfPeople,

        // Dynamic service items (completely dynamic - no hardcoded fields!)
        ...getDynamicServiceItemsFromFormData(formData),

        totalAmount: discountedTotal,
        totalAmountBeforeDiscount: calculateTotal(),
        totalAmountAfterDiscount: discountedTotal,
        discountAmount: appliedDiscount,
        discountSummary: appliedDiscount > 0 ? {
          code: appliedCouponCode,
          type: appliedDiscountType,
          value: appliedDiscountValue,
          amount: appliedDiscount
        } : undefined,
        discount: isManualMode ? discountValue : undefined,
        Discount: isManualMode ? discountValue : undefined,
        DiscountByCoupon: appliedDiscount || 0,
        advancePayment,
        venuePayment,
        slotBookingFee: Number(effectiveSlotFee),
        paymentStatus: options?.paymentStatus,
        appliedCouponCode: appliedCouponCode || undefined,
        couponDiscount: appliedDiscount || 0,
        couponDiscountType: appliedDiscountType || undefined,
        couponDiscountValue: appliedDiscountValue || undefined,
        status: isManualMode ? 'manual' : 'confirmed',
        bookingType: isManualMode ? 'manual' : 'online',
        isManualBooking: !!isManualMode,
        paymentMode: isManualMode ? effectiveManualMethod : 'online',
        venuePaymentMethod: isManualMode ? effectiveManualMethod : 'online',
        advancePaymentMethod: isManualMode ? effectiveManualMethod : 'online',
        // Store pricing data used at time of booking
        pricingData: {
          slotBookingFee: Number(effectiveSlotFee),
          extraGuestFee: pricingData.extraGuestFee,
          convenienceFee: pricingData.convenienceFee,
          decorationFees: pricingData.decorationFees,
          theaterBasePrice: theaterBasePrice,
          discountByCoupon: appliedDiscount || 0,
          discount: isManualMode ? discountValue : 0,
        },
        // Always persist dropdown-shown Decoration fee value for reference
        decorationDropdownFee: pricingData.decorationFees || 0,
        // Persist top-level decoration fee for database when decoration is enabled/compulsory
        decorationFee: hasDecorationSelection ? (pricingData.decorationFees || 0) : 0,
        decorationAppliedFee: hasDecorationSelection ? (pricingData.decorationFees || 0) : 0,
        // Store calculated guest charges for easy reference
        extraGuestCharges: (() => {
          const capacity = getTheaterCapacity();
          const extraGuests = Math.max(0, formData.numberOfPeople - capacity.min);
          return extraGuests * pricingData.extraGuestFee;
        })(),
        // Store extra guests count for easy reference
        extraGuestsCount: (() => {
          const capacity = getTheaterCapacity();
          return Math.max(0, formData.numberOfPeople - capacity.min);
        })()
      };

      // Attach creator info for manual mode
      if (isManualMode) {
        bookingData.createdBy = buildCreatorMetadata();
        // Also persist raw creator details for compatibility with older flows
        if (userInfo?.staffId) bookingData.staffId = userInfo.staffId;
        if (userInfo?.staffName) bookingData.staffName = userInfo.staffName;
        if (userInfo?.adminName) bookingData.adminName = userInfo.adminName;

        if (options?.paymentStatus === 'partial') {
          const actorLabel = userInfo?.type === 'staff'
            ? (userInfo.staffName || 'Staff')
            : (userInfo?.adminName || 'Admin');
          const methodLabel = effectiveManualMethod === 'upi' ? 'UPI' : 'Cash';
          bookingData.paymentReceived = `Partial ₹${Math.round(Number(advancePayment || 0))} (${methodLabel}) - ${actorLabel}`;
          bookingData.paidBy = actorLabel;
          bookingData.paidAt = new Date().toISOString();
        }
      }

      // Save as confirmed booking with pay at venue option or update existing booking
      const isEdit = isEditingBooking && !!editingBookingId;
      const url = isEdit ? '/api/admin/edit-booking' : '/api/new-booking';
      const payload = isEdit
        ? { bookingId: editingBookingId, data: bookingData }
        : bookingData;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      if (json.success) {
        setBookingResult({
          success: true,
          message: isEditingBooking
            ? 'Booking updated successfully! Changes have been saved to our system.'
            : 'Booking confirmed successfully! Our team will contact you to collect payment at the venue.',
          bookingId: json.bookingId,
          wasEditing: isEditingBooking
        });
        setIsBookingSuccessful(true);
        // Keep button disabled on success - booking is complete
        // Remove slow API calls - booking popup will close anyway
      } else {
        setValidationErrorName(isEditingBooking ? 'Booking Update Failed' : 'Booking Save Failed');
        setValidationMessage(json.error || 'Unable to save booking. Please try again.');
        setShowValidationPopup(true);
        setIsSubmittingBooking(false); // Re-enable button on failure
      }
    } catch (error) {
      setValidationErrorName(isEditingBooking ? 'Booking Update Error' : 'Booking Save Error');
      setValidationMessage(`Something went wrong while ${isEditingBooking ? 'updating' : 'saving'} your booking. Please try again.`);
      setShowValidationPopup(true);
      setIsSubmittingBooking(false); // Re-enable button on error
    }
  };
  const handlePaymentDone = async (options?: { manualMethod?: 'cash' | 'upi' | 'online' }) => {
    setIsProcessingPayment(true);

    // Quick conflict check (no await to speed up)
    // Skip this check if editing (we're allowed to keep our own time slot)
    if (!isEditingBooking && bookedTimeSlots.includes(selectedTimeSlot || '')) {
      setValidationErrorName('Time Slot Already Booked');
      setValidationMessage('This time slot was just booked by another user. Please select a different time slot.');
      setShowValidationPopup(true);
      setShowPaymentConfirmation(false);
      setIsProcessingPayment(false);
      return;
    }

    try {
      // Calculate pricing
      const discountedTotal = getFinalTotal();
      const advancePayment = getPayableAmount(); // Use slot booking fee from pricing data
      const venuePayment = discountedTotal - advancePayment;

      // Get theater base price
      const theaterBasePrice = selectedTheater
        ? parseFloat(String(selectedTheater.price).replace(/[₹,\s]/g, ''))
        : 1399.0;

      const hasDecorationSelection = (
        (Array.isArray((formData as any).selectedDecorItems) && (formData as any).selectedDecorItems.length > 0) ||
        (Array.isArray((formData as any).selectedExtraAddOns) && (formData as any).selectedExtraAddOns.length > 0) ||
        String(formData.wantDecorItems || '').toLowerCase() === 'yes'
      );

      const effectiveManualMethod: 'cash' | 'upi' | 'online' = isManualMode
        ? options?.manualMethod || manualPaymentMethod || 'upi'
        : 'online';

      // Prepare base booking data (will be sent AFTER successful Razorpay payment)
      const baseBookingData: any = {
        name: formData.bookingName,
        email: formData.emailAddress,
        phone: formData.whatsappNumber,
        theaterName: selectedTheater?.name || '',
        date: selectedDate || new Date().toISOString().split('T')[0],
        time: selectedTimeSlot || '',
        occasion: formData.occasion,
        occasionData: formData.occasionData || {},
        // Persist whether user enabled Decoration in Overview
        wantDecorItems: formData.wantDecorItems,
        numberOfPeople: formData.numberOfPeople,
        // Dynamic service items (completely dynamic - no hardcoded fields!)
        ...getDynamicServiceItemsFromFormData(formData),
        totalAmount: discountedTotal,
        DiscountByCoupon: appliedDiscount || 0,
        discount: isManualMode ? discountValue : undefined,
        Discount: isManualMode ? discountValue : undefined,
        advancePayment,
        venuePayment,
        appliedCouponCode: appliedCouponCode || undefined,
        couponDiscount: appliedDiscount || 0,
        advancePaymentMethod: isManualMode ? effectiveManualMethod : 'online',
        status: isManualMode ? 'manual' : undefined,
        bookingType: isManualMode ? 'manual' : undefined,
        isManualBooking: !!isManualMode,
        paymentMode: isManualMode ? effectiveManualMethod : 'online_payment',
        venuePaymentMethod: isManualMode ? effectiveManualMethod : 'online',
        pricingData: {
          slotBookingFee: pricingData.slotBookingFee,
          extraGuestFee: pricingData.extraGuestFee,
          convenienceFee: pricingData.convenienceFee,
          decorationFees: pricingData.decorationFees,
          theaterBasePrice: theaterBasePrice,
          discountByCoupon: appliedDiscount || 0,
          discount: isManualMode ? discountValue : 0,
        },
        // Store decoration fee explicitly when decor is selected
        decorationFee: hasDecorationSelection ? (pricingData.decorationFees || 0) : 0,
        // Helper for invoice logic
        decorationAppliedFee: hasDecorationSelection ? (pricingData.decorationFees || 0) : 0,
        extraGuestCharges: (() => {
          const capacity = getTheaterCapacity();
          const extraGuests = Math.max(0, formData.numberOfPeople - capacity.min);
          return extraGuests * pricingData.extraGuestFee;
        })(),
        extraGuestsCount: (() => {
          const capacity = getTheaterCapacity();
          return Math.max(0, formData.numberOfPeople - capacity.min);
        })(),
      };

      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      if (!razorpayKey || typeof window === 'undefined' || !window.Razorpay) {
        setValidationErrorName('Payment Initialization Error');
        setValidationMessage('Unable to initialize payment gateway. Please refresh the page or try again later.');
        setShowValidationPopup(true);
        setShowPaymentConfirmation(false);
        return;
      }

      // Amount in paise for Razorpay (advancePayment is in INR)
      const amountPaise = Math.round(advancePayment * 100);

      const razorpayOptions: any = {
        key: razorpayKey,
        amount: amountPaise,
        currency: 'INR',
        name: 'FeelME Town',
        description: 'Slot Booking Fee',
        notes: {
          theater: baseBookingData.theaterName,
          date: baseBookingData.date,
          time: baseBookingData.time,
          occasion: baseBookingData.occasion,
        },
        prefill: {
          name: baseBookingData.name,
          email: baseBookingData.email,
          contact: baseBookingData.phone,
        },
        theme: {
          color: '#ff0005',
        },
        modal: {
          ondismiss: () => {
            console.log('💳 Razorpay modal dismissed by user');
            setShowPaymentConfirmation(false);
            setIsProcessingPayment(false);
          },
          escape: true,
          backdropclose: true,
        },
        handler: async (response: any) => {
          try {
            // Merge Razorpay payment details into booking data
            const bookingData = {
              ...baseBookingData,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            };

            const res = await fetch('/api/new-booking', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(bookingData),
            });

            const json = await res.json();

            if (json.success) {
              setBookingResult({
                success: true,
                message: isEditingBooking
                  ? 'Booking updated successfully! Changes have been saved to our system.'
                  : 'Payment completed and booking confirmed successfully!',
                bookingId: json.bookingId,
                wasEditing: isEditingBooking,
              });
              setIsBookingSuccessful(true);
              setShowPaymentConfirmation(false);
            } else {
              setValidationErrorName('Booking Confirmation Failed');
              setValidationMessage(
                json.error ||
                'Payment was successful, but we could not confirm your booking. Please contact support with your payment details.',
              );
              setShowValidationPopup(true);
              setShowPaymentConfirmation(false);
            }
          } catch (error) {
            setValidationErrorName('Booking Confirmation Error');
            setValidationMessage(
              'Payment was successful, but something went wrong while confirming your booking. Please contact support.',
            );
            setShowValidationPopup(true);
            setShowPaymentConfirmation(false);
          } finally {
            setIsProcessingPayment(false);
          }
        },
      };

      // Attach creator info for manual mode
      if (isManualMode) {
        baseBookingData.createdBy = buildCreatorMetadata();
        if (userInfo?.staffId) baseBookingData.staffId = userInfo.staffId;
        if (userInfo?.staffName) baseBookingData.staffName = userInfo.staffName;
        if (userInfo?.adminName) baseBookingData.adminName = userInfo.adminName;
      }

      const rzp = new window.Razorpay(razorpayOptions);

      rzp.on('payment.failed', (response: any) => {
        setValidationErrorName('Payment Failed');
        setValidationMessage(response.error?.description || 'Payment failed or was cancelled. Please try again.');
        setShowValidationPopup(true);
        setShowPaymentConfirmation(false);
        setIsProcessingPayment(false);
      });

      rzp.open();
    } catch (error) {
      setValidationErrorName('Payment Initialization Error');
      setValidationMessage('Something went wrong while starting the payment. Please try again.');
      setShowValidationPopup(true);
      setShowPaymentConfirmation(false);
      setIsProcessingPayment(false);
    }
  };

  // Check if form data has changed during editing
  const hasFormDataChanged = () => {
    if (!isEditingBooking || !originalFormData) return false;

    // Compare current form data with original
    return JSON.stringify(formData) !== JSON.stringify(originalFormData);
  };


  // Helper function to get dynamic numberOfPeople for reset
  const getDynamicNumberOfPeople = () => {
    if (selectedTheater && realTheaterData.length > 0) {
      const capacity = getTheaterCapacity();
      console.log('🎭 [Reset People] Using theater minimum capacity:', capacity.min);
      return capacity.min;
    }
    console.log('⚠️ [Reset People] No theater selected, using fallback: 1');
    return 1; // Fallback when no theater is selected
  };

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      bookingName: '',
      numberOfPeople: getDynamicNumberOfPeople(), // Completely dynamic
      whatsappNumber: '',
      emailAddress: '',
      occasion: '',
      selectedMovies: [], // Keep movies hardcoded as it's static
      wantCakes: 'No',
      wantDecorItems: 'No',
      wantGifts: 'No',
      wantMovies: 'No',
      promoCode: '',
      agreeToTerms: false,
      occasionData: {}
    });
    setActiveTab('Overview');
    setIsLoaded(false);
    setIsEditingBooking(false); // Reset editing state
    setOriginalFormData(null); // Reset original form data
    setEditingBookingId(null); // Reset editing booking ID
    setHasSentEditRequest(false); // Reset edit request sent flag
    setSelectedServiceItems({}); // 🔥 Reset selected service items
    setSelectedServices({}); // 🔥 Reset selected services

    // 🔥 Clear sessionStorage items
    sessionStorage.removeItem('editingBooking');
    sessionStorage.removeItem('bookingFromPopup');
    sessionStorage.removeItem('bookingFormData');
    sessionStorage.removeItem('selectedMovie');
    sessionStorage.removeItem('selectedMovies');
    sessionStorage.removeItem('selectedTimeSlot');
  };

  useEffect(() => {
    if (isOpen) {
      // Reset submitting state when popup opens (for new bookings)
      setIsSubmittingBooking(false);
      setIsProcessingPayment(false);

      // Check if editing an existing booking
      const editingBooking = sessionStorage.getItem('editingBooking');
      if (editingBooking) {
        try {
          const bookingData = JSON.parse(editingBooking);

          // Set as editing mode
          setIsEditingBooking(true);
          setEditingBookingId(bookingData.bookingId || bookingData.id);

          // Build occasionData from booking data (include all possible occasion fields)
          const occasionDataFromBooking: { [key: string]: string } = {};

          // Also check if there's an occasionData object in booking
          if (bookingData.occasionData && typeof bookingData.occasionData === 'object') {
            Object.assign(occasionDataFromBooking, bookingData.occasionData);
          }

          // IMPORTANT: Also check for fields stored with full label names (e.g., "Nickname of Bride to be")
          // These need to be converted to camelCase keys for the form
          Object.keys(bookingData).forEach(key => {
            // Skip system fields
            if (['_id', 'bookingId', 'compressedData', 'createdAt', 'status', 'name', 'email',
              'theaterName', 'date', 'time', 'occasion', 'totalAmount', 'selectedMovies',
              'selectedCakes', 'selectedDecorItems', 'selectedGifts', 'isManualBooking',
              'bookingType', 'createdBy', 'staffId', 'staffName', 'notes', 'expiredAt',
              'occasionPersonName'].includes(key)) {
              return;
            }

            // Check if this is a _label field (e.g., "Nickname of Bride to be_label")
            if (key.endsWith('_label')) {
              // Get the base field name by removing _label
              const baseFieldName = key.replace('_label', '');

              // Get the actual value from the base field or _value field
              const fieldValue = bookingData[baseFieldName] || bookingData[`${baseFieldName}_value`];

              if (fieldValue) {
                // Convert base field name to camelCase
                const camelCaseKey = baseFieldName
                  .split(' ')
                  .map((word, index) =>
                    index === 0
                      ? word.toLowerCase()
                      : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                  )
                  .join('');

                occasionDataFromBooking[camelCaseKey] = fieldValue;
                console.log(`📝 Mapped occasion field from _label: "${baseFieldName}" → "${camelCaseKey}" = "${fieldValue}"`);
              }
              return;
            }

            // Skip _value fields (already handled above)
            if (key.endsWith('_value')) {
              return;
            }

            // Check if field name has spaces (old format with full labels)
            if (key.includes(' ')) {
              // This is likely an occasion field with full label - convert to camelCase
              const camelCaseKey = key
                .split(' ')
                .map((word, index) =>
                  index === 0
                    ? word.toLowerCase()
                    : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                )
                .join('');

              occasionDataFromBooking[camelCaseKey] = bookingData[key];
              console.log(`📝 Mapped occasion field: "${key}" → "${camelCaseKey}" = "${bookingData[key]}"`);
            }
          });

          console.log('📝 Populated occasion data for editing:', occasionDataFromBooking);

          // Pre-fill form with existing booking data
          const dynamicFormData: any = {
            bookingName: bookingData.customerName || bookingData.bookingName || '',
            numberOfPeople: bookingData.numberOfPeople || 2,
            whatsappNumber: bookingData.phone || bookingData.whatsappNumber || '',
            emailAddress: bookingData.email || bookingData.emailAddress || '',
            occasion: bookingData.occasion || '',
            wantCakes: 'No',
            wantDecorItems: 'No',
            wantGifts: 'No',
            wantMovies: 'No',
            promoCode: bookingData.promoCode || '',
            agreeToTerms: true, // Auto-agree for editing
            occasionData: occasionDataFromBooking,
          };

          // Add dynamic service items from booking data
          Object.keys(bookingData).forEach(key => {
            if (key.startsWith('selected') && Array.isArray(bookingData[key])) {
              dynamicFormData[key] = bookingData[key];
              // Set want flags based on whether items exist
              if (bookingData[key].length > 0) {
                const serviceName = key.replace('selected', '');
                if (serviceName === 'Cakes') dynamicFormData.wantCakes = 'Yes';
                if (serviceName === 'DecorItems') dynamicFormData.wantDecorItems = 'Yes';
                if (serviceName === 'Gifts') dynamicFormData.wantGifts = 'Yes';
                if (serviceName === 'Movies') dynamicFormData.wantMovies = 'Yes';
              }
            }
          });

          setFormData(dynamicFormData);

          // Set context data
          if (bookingData.date) setSelectedDate(bookingData.date);
          if (bookingData.time) setSelectedTimeSlot(bookingData.time);

          // Set selected occasion data for showing required fields
          if (bookingData.occasion && occasionOptions.length > 0) {
            const selectedOccasion = occasionOptions.find(occ => occ.name === bookingData.occasion);
            if (selectedOccasion) {
              setSelectedOccasionData(selectedOccasion);
            }
          }

          // Fetch full theater object from database if we only have theater name
          if (bookingData.theater && typeof bookingData.theater === 'string') {
            const fetchTheaterObject = async () => {
              try {
                const response = await fetch('/api/admin/theaters');
                const data = await response.json();

                if (data.success && data.theaters) {
                  const theaterObj = data.theaters.find((t: any) =>
                    t.name === bookingData.theater ||
                    `${t.name} (${t.type}) (${t.hallNumber})` === bookingData.theater
                  );
                  if (theaterObj) {
                    setSelectedTheater(theaterObj);
                  } else {
                    // Fallback: use theater name
                    setSelectedTheater(bookingData.theater);
                  }
                }
              } catch (error) {
                console.error('Error fetching theater object:', error);
                setSelectedTheater(bookingData.theater);
              }
            };
            fetchTheaterObject();
          } else if (bookingData.theater) {
            setSelectedTheater(bookingData.theater);
          }

          setIsLoaded(true);
          return;
        } catch (error) {
          console.error('Error loading editing booking:', error);
        }
      }

      // Check if returning from movies page and restore form data
      const bookingFromPopup = sessionStorage.getItem('bookingFromPopup');
      const storedFormData = sessionStorage.getItem('bookingFormData');

      if (bookingFromPopup === 'true' && storedFormData) {
        try {
          const parsedFormData = JSON.parse(storedFormData);

          // Check if there's a new selected movie to add
          const selectedMovie = sessionStorage.getItem('selectedMovie');
          if (selectedMovie) {

            // Replace existing movie with new selection (only one movie allowed)
            parsedFormData.selectedMovies = [{
              id: selectedMovie.toLowerCase().replace(/\s+/g, '_'),
              name: selectedMovie,
              price: 0,
              quantity: 1
            }];
            parsedFormData.wantMovies = 'Yes';
            // Clear the selected movie from sessionStorage
            sessionStorage.removeItem('selectedMovie');
          }

          // Extract theater from form data and restore it
          const { selectedTheater: storedTheater, ...formDataWithoutTheater } = parsedFormData;

          setFormData(formDataWithoutTheater);

          // Restore selected theater if it was stored in form data
          if (storedTheater) {

            setSelectedTheater(storedTheater);
          }

          // Restore selected time slot if it was stored
          const storedTimeSlot = sessionStorage.getItem('selectedTimeSlot');
          if (storedTimeSlot) {

            setSelectedTimeSlot(storedTimeSlot);
            // Clear the stored time slot
            sessionStorage.removeItem('selectedTimeSlot');
          }

          // Clear the stored data
          sessionStorage.removeItem('bookingFromPopup');
          sessionStorage.removeItem('bookingFormData');
        } catch (error) {

          // If error, reset form
          resetForm();
        }
      } else {
        // Check if there's a new selected movie from movie popup
        const selectedMovie = sessionStorage.getItem('selectedMovie');
        if (selectedMovie) {
          console.log('🎬 BookingPopup: Found selected movie:', selectedMovie);
          // Set movie selection for fresh booking as object with price
          setFormData(prev => ({
            ...prev,
            selectedMovies: [{
              id: selectedMovie.toLowerCase().replace(/\s+/g, '_'),
              name: selectedMovie,
              price: 0, // Movies are free
              quantity: 1
            }],
            wantMovies: 'Yes'
          }));
          console.log('🎬 BookingPopup: Movie auto-selected and wantMovies set to Yes');
          // Clear the selected movie from sessionStorage
          sessionStorage.removeItem('selectedMovie');
        } else {
          // Check if returning from movies page with selected movies (legacy support)
          const selectedMovies = sessionStorage.getItem('selectedMovies');
          if (selectedMovies) {
            try {
              const parsedMovies = JSON.parse(selectedMovies);
              // Convert to objects if they're strings
              const movieObjects = Array.isArray(parsedMovies)
                ? parsedMovies.map((movie: any) =>
                  typeof movie === 'string'
                    ? { id: movie.toLowerCase().replace(/\s+/g, '_'), name: movie, price: 0, quantity: 1 }
                    : movie
                )
                : [];
              setFormData(prev => ({
                ...prev,
                selectedMovies: movieObjects,
                wantMovies: 'Yes'
              }));
              sessionStorage.removeItem('selectedMovies');
            } catch (error) {
              console.error('Error parsing selected movies:', error);
            }
          }
        }
      }

      setIsLoaded(true);
      setIsBookingSuccessful(false);
      setBookingResult(null);
      setShowValidationPopup(false);
      setValidationMessage('');

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

  // Auto-close success popup after 2 seconds if user doesn't interact
  useEffect(() => {
    if (isBookingSuccessful && bookingResult) {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
      autoCloseTimerRef.current = window.setTimeout(() => {
        // Check editing state BEFORE resetting
        const wasEditingBooking = isEditingBooking;

        // Same behavior as Close: reset and navigate
        setIsBookingSuccessful(false);
        setBookingResult(null);
        resetForm();
        onClose();

        // Only redirect to theater page if not editing from admin
        if (!wasEditingBooking) {
          router.push('/theater');
        }
      }, 2000);
    }
    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
    };
  }, [isBookingSuccessful, bookingResult]);

  // State for occasions from database (dynamic)
  const [occasionOptions, setOccasionOptions] = useState<OccasionOption[]>([]);
  const [isLoadingOccasions, setIsLoadingOccasions] = useState(true);
  const [selectedOccasionData, setSelectedOccasionData] = useState<OccasionOption | null>(null);

  // State for dynamic services from database
  const [allServices, setAllServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<{ [serviceName: string]: 'Yes' | 'No' }>({});
  const [selectedServiceItems, setSelectedServiceItems] = useState<{ [serviceName: string]: string[] }>({});
  // Track services where user explicitly clicked Skip (so we don't force selection later)
  const [skippedServices, setSkippedServices] = useState<Set<string>>(new Set());
  // One-time confirmation when user keeps Decoration = No
  const [showDecorationNoConfirm, setShowDecorationNoConfirm] = useState(false);
  const [hasConfirmedDecorationNo, setHasConfirmedDecorationNo] = useState(false);

  // Dynamic tabs based on selections
  const getAvailableTabs = () => {
    const availableTabs: string[] = ['Overview'];

    // Check if all occasions are marked as decoration-only (global toggle ON in admin)
    const allDecorationOccasions =
      occasionOptions.length > 0 && occasionOptions.every(occ => occ.includeInDecoration === true);

    const decorationMode = selectedServices['__decoration__'];

    // Occasion tab visibility rules:
    // - If all occasions are decoration-only: show Occasion tab ONLY when decoration = Yes in Overview
    // - Otherwise (normal mode): always show Occasion tab
    if (!allDecorationOccasions) {
      availableTabs.push('Occasion');
    } else if (decorationMode === 'Yes') {
      availableTabs.push('Occasion');
    }

    // Add dynamic service tabs based on user selection
    allServices.forEach(service => {
      if (selectedServices[service.name] === 'Yes') {
        availableTabs.push(service.name);
      }
    });

    // Always add Terms & Conditions as the last tab
    availableTabs.push('Terms & Conditions');

    return availableTabs;
  };

  const tabs = getAvailableTabs();

  // Removed - now handled in combined fetchAllData

  // Handle occasion selection and set required fields
  const handleOccasionSelect = (occasionName: string) => {
    const selectedOccasion = occasionOptions.find(occ => occ.name === occasionName);


    setFormData(prev => ({
      ...prev,
      occasion: occasionName,
      occasionData: {} // Reset occasion data
    }));

    setSelectedOccasionData(selectedOccasion || null);
  };

  // Update occasion data when user fills required fields
  const updateOccasionData = (fieldKey: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      occasionData: {
        ...prev.occasionData,
        [fieldKey]: value
      }
    }));
  };

  // Dynamic services options – populated from Services API (no static fallback)
  const [cakeOptions, setCakeOptions] = useState<any[]>([]);
  const [decorOptions, setDecorOptions] = useState<any[]>([]);
  const [giftOptions, setGiftOptions] = useState<any[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState<boolean>(true);
  const [servicesError, setServicesError] = useState<string | null>(null);

  // Removed - now handled in combined fetchAllData

  // Helper: render image or emoji depending on value
  const renderItemImage = (img: string, alt: string) => {
    const isImg = typeof img === 'string' && (
      img.startsWith('http') || img.startsWith('/') || /\.(png|jpe?g|webp|svg)$/i.test(img)
    );
    return isImg ? (
      <img src={img} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 12 }} />
    ) : (
      <span>{img || '🎁'}</span>
    );
  };

  const resetCouponState = () => {
    setAppliedCouponCode(null);
    setAppliedDiscount(0);
    setCouponError(null);
    setAppliedDiscountType(null);
    setAppliedDiscountValue(null);
  };

  const handleInputChange = async (field: keyof BookingForm, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'wantDecorItems') {
      const normalized = String(value || '').toLowerCase() === 'yes' ? 'Yes' : 'No';
      setSelectedServices(prev => {
        const next: { [key: string]: 'Yes' | 'No' } = { ...prev, '__decoration__': normalized };
        allServices.forEach(service => {
          if (service.includeInDecoration) {
            next[service.name] = normalized;
          }
        });
        return next;
      });

      if (normalized === 'No') {
        setSelectedServiceItems(prev => {
          const updated = { ...prev };
          allServices.forEach(service => {
            if (service.includeInDecoration) {
              delete updated[service.name];
            }
          });
          return updated;
        });
      }
    }

    // If changing wantCakes, wantDecorItems, wantGifts, or wantMovies, reset to Overview if current tab is no longer available
    if (field === 'wantCakes' || field === 'wantDecorItems' || field === 'wantGifts' || field === 'wantMovies') {
      const newTabs = getAvailableTabs();
      if (!newTabs.includes(activeTab)) {
        setActiveTab('Overview');
      }
    }
  };

  // Handle service selection changes
  const handleServiceSelection = (serviceName: string, value: 'Yes' | 'No') => {
    console.log(`🔄 Service selection changed: ${serviceName} = ${value}`);

    setSelectedServices(prev => ({
      ...prev,
      [serviceName]: value
    }));

    // Reset to Overview if current tab is being disabled
    if (value === 'No' && activeTab === serviceName) {
      console.log(`🔄 Resetting to Overview (service disabled)`);
      setActiveTab('Overview');
    }
  };

  // Handle service item selection
  const handleServiceItemToggle = (serviceName: string, itemName: string) => {
    // Prevent duplicate clicks within 300ms
    const clickKey = `${serviceName}-${itemName}`;
    if (lastClickedItemRef.current === clickKey) {
      console.log(`⚠️ [Duplicate Click] Ignoring duplicate click for "${itemName}"`);
      return;
    }

    // Set the clicked item and clear after 300ms
    lastClickedItemRef.current = clickKey;
    toastShownRef.current = false; // Reset toast flag for new click
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    clickTimeoutRef.current = window.setTimeout(() => {
      lastClickedItemRef.current = null;
      toastShownRef.current = false;
    }, 300);

    // Get item details with price
    const service = allServices.find(s => s.name === serviceName);
    const item = service?.items?.find((i: any) => (i.name || i.title) === itemName);
    const itemPrice = Number(item?.price ?? item?.cost ?? 0);
    const itemId = item?.id || item?.itemId || itemName.toLowerCase().replace(/\s+/g, '-');

    setSelectedServiceItems(prev => {
      const currentItems = prev[serviceName] || [];
      const isSelected = currentItems.includes(itemName);

      // Calculate new total
      const currentTotal = getFinalTotal();
      const newTotal = isSelected ? currentTotal - itemPrice : currentTotal + itemPrice;

      // 🔥 UPDATE FORMDATA - Store items with dynamic service names
      const dynamicServiceFieldName = `selected${serviceName.replace(/\s+/g, '')}`;

      setFormData(prevFormData => {
        // Get current items for this service (dynamic field)
        const currentFormDataItems = (prevFormData as any)[dynamicServiceFieldName] || [];
        const itemObject = {
          id: itemId,
          name: itemName,
          price: itemPrice,
          quantity: 1
        };

        let newFormDataItems;
        if (isSelected) {
          // Remove item
          newFormDataItems = currentFormDataItems.filter((i: any) => i.name !== itemName);
        } else {
          // Add item only if it doesn't already exist (prevent duplicates)
          const itemExists = currentFormDataItems.some((i: any) => i.name === itemName);
          if (itemExists) {
            console.log(`⚠️ [Item Selection] "${itemName}" already exists in ${dynamicServiceFieldName}, skipping duplicate`);
            newFormDataItems = currentFormDataItems;
          } else {
            newFormDataItems = [...currentFormDataItems, itemObject];
          }
        }

        console.log(`🎯 [Item Selection] ${isSelected ? 'Removed' : 'Added'} "${itemName}" (₹${itemPrice}) ${isSelected ? 'from' : 'to'} ${dynamicServiceFieldName}:`, newFormDataItems);

        return {
          ...prevFormData,
          [dynamicServiceFieldName]: newFormDataItems
        };
      });

      // Show single toast notification with total (only once per click)
      if (!toastShownRef.current) {
        toastShownRef.current = true;
        setTimeout(() => {
          if (isSelected) {
            showSuccess(`${itemName} removed • Total: ₹${newTotal.toFixed(2)}`);
          } else {
            showSuccess(`${itemName} added • Total: ₹${newTotal.toFixed(2)}`);
          }
        }, 100);
      }

      // Scroll down to show Continue button after item selection
      setTimeout(() => {
        const popupContent = document.querySelector('.booking-popup-content');
        if (popupContent) {
          popupContent.scrollTo({
            top: popupContent.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 200);

      return {
        ...prev,
        [serviceName]: isSelected
          ? currentItems.filter(i => i !== itemName)
          : [...currentItems, itemName]
      };
    });
  };

  // Check if service item is selected
  const isServiceItemSelected = (serviceName: string, itemName: string) => {
    return (selectedServiceItems[serviceName] || []).includes(itemName);
  };

  const normalizeSelectedItemsForEmail = (key: string, arr: any[]) => {
    if (!Array.isArray(arr)) return [];
    const sanitized = String(key || '').replace(/^selected/, '');
    const service = allServices.find((s: any) => String(s?.name || '').replace(/\s+/g, '') === sanitized);
    const serviceItems: any[] = Array.isArray(service?.items) ? service.items : [];

    const findItemPrice = (name: string) => {
      const it = serviceItems.find((i: any) => (i?.name || i?.title) === name);
      const p = Number(it?.price ?? it?.cost ?? 0);
      return Number.isFinite(p) ? p : 0;
    };

    return arr
      .map((entry: any) => {
        if (!entry) return null;

        if (typeof entry === 'string') {
          const price = findItemPrice(entry);
          const id = entry.toLowerCase().replace(/\s+/g, '-');
          return { id, name: entry, price, quantity: 1 };
        }

        const name = entry?.name ?? entry?.title ?? entry?.itemName ?? entry?.serviceName;
        if (typeof name !== 'string' || !name.trim()) {
          return entry;
        }

        const qty = Number(entry?.quantity ?? entry?.qty ?? 1);
        const quantity = Number.isFinite(qty) && qty > 0 ? qty : 1;
        const currentPrice = Number(entry?.price ?? entry?.cost ?? entry?.amount);
        const lookupPrice = findItemPrice(name);
        const shouldFillPrice = !Number.isFinite(currentPrice) || currentPrice <= 0;
        const price = key === 'selectedMovies'
          ? (Number.isFinite(currentPrice) ? currentPrice : 0)
          : shouldFillPrice && lookupPrice > 0
            ? lookupPrice
            : (Number.isFinite(currentPrice) ? currentPrice : lookupPrice);

        const id = entry?.id ?? name.toLowerCase().replace(/\s+/g, '-');
        return { ...entry, id, name, price, quantity };
      })
      .filter(Boolean);
  };

  // Helper function to extract dynamic service items from formData
  const getDynamicServiceItemsFromFormData = (formData: any): Record<string, any> => {
    const dynamicServiceItems: Record<string, any> = {};

    // Look for all fields that start with "selected" and contain service items
    Object.keys(formData).forEach(key => {
      if (key.startsWith('selected') && Array.isArray(formData[key])) {
        dynamicServiceItems[key] = normalizeSelectedItemsForEmail(key, formData[key]);
        console.log(`📦 Dynamic service items from formData: ${key}:`, formData[key]);
      }
    });

    return dynamicServiceItems;
  };

  // Fetch booked slots when popup opens
  const fetchBookedSlots = async () => {
    if (!selectedTheater || !selectedDate) return;

    try {
      const response = await fetch(`/api/booked-slots?date=${encodeURIComponent(selectedDate)}&theater=${encodeURIComponent(selectedTheater.name)}`);
      const data = await response.json();

      if (data.success) {

        setBookedTimeSlots(data.bookedTimeSlots || []);
      } else {

        setBookedTimeSlots([]);
      }
    } catch (error) {

      setBookedTimeSlots([]);
    }
  };

  // Fetch booked slots when popup opens and refresh every 3 seconds for real-time updates
  useEffect(() => {
    if (isOpen && selectedTheater && selectedDate) {
      fetchBookedSlots();

      // Set up real-time refresh for booking popup (optimized)
      const refreshInterval = setInterval(() => {
        fetchBookedSlots();
      }, 5000); // Every 5 seconds when popup is open (faster performance)

      return () => clearInterval(refreshInterval);
    }
  }, [isOpen, selectedTheater, selectedDate]);

  // Auto-set decoration for theaters with decorationCompulsory flag
  useEffect(() => {
    if (selectedTheater && isOpen && realTheaterData.length > 0) {
      // Find the theater in real database data
      const realTheater = realTheaterData.find(theater =>
        (selectedTheater.name && theater.name === selectedTheater.name) ||
        (selectedTheater.id && theater.theaterId === selectedTheater.id) ||
        (selectedTheater.name && theater.name.includes(selectedTheater.name.split(' ')[0]))
      );

      // Check if decoration is compulsory for this theater (from database)
      const isDecorationCompulsory = realTheater?.decorationCompulsory === true;

      console.log('🎨 Checking decoration compulsory:', {
        theaterName: selectedTheater.name,
        realTheater: realTheater?.name,
        decorationCompulsory: realTheater?.decorationCompulsory,
        isDecorationCompulsory
      });

      if (isDecorationCompulsory && selectedServices['__decoration__'] !== 'Yes') {
        // Auto-set decoration dropdown to Yes for theaters with decorationCompulsory flag
        console.log('🎨 Auto-setting decoration to Yes for', selectedTheater.name);

        // Set decoration dropdown to Yes
        const updatedServices: { [key: string]: 'Yes' | 'No' } = { '__decoration__': 'Yes' };

        // Auto-enable all services with includeInDecoration
        allServices.forEach(service => {
          if (service.includeInDecoration) {
            updatedServices[service.name] = 'Yes';
            console.log(`  ✅ Auto-enabled service: ${service.name}`);
          } else {
            updatedServices[service.name] = selectedServices[service.name] || 'No';
          }
        });

        setSelectedServices(updatedServices);
        setFormData(prev => ({
          ...prev,
          wantDecorItems: 'Yes' as 'Yes' | 'No'
        }));
      }
    }
  }, [selectedTheater, isOpen, realTheaterData, selectedServices, allServices]);

  // Auto-adjust numberOfPeople when theater changes (reset to that theater's minimum capacity)
  useEffect(() => {
    if (selectedTheater && isOpen && realTheaterData.length > 0) {
      const capacity = getTheaterCapacity();

      console.log('🎭 [Auto-adjust People] Theater changed:', selectedTheater.name, 'Using min capacity:', capacity.min);

      // Har baar theater change hone par us theater ke min capacity pe reset karo
      setFormData(prev => ({
        ...prev,
        numberOfPeople: capacity.min,
      }));
    }
  }, [selectedTheater, isOpen, realTheaterData]);

  // Helper function to get theater capacity (min/max) ONLY from real database - NO hardcoded values
  const getTheaterCapacity = () => {
    if (!selectedTheater) {
      return { min: 1, max: 10 }; // Emergency fallback only
    }

    // Priority 1: Check real database theater data (MAIN SOURCE)
    if (realTheaterData.length > 0) {
      const realTheater = realTheaterData.find(theater =>
        (selectedTheater.name && theater.name === selectedTheater.name) ||
        (selectedTheater.id && theater.theaterId === selectedTheater.id) ||
        (selectedTheater.name && theater.name.includes(selectedTheater.name.split(' ')[0])) // Match by first word (EROS, PHILIA, etc.)
      );

      console.log('🎭 [Theater Capacity Debug]', {
        selectedTheater: selectedTheater.name,
        realTheater: realTheater ? realTheater.name : 'Not found',
        capacity: realTheater?.capacity,
        allTheaters: realTheaterData.map(t => ({ name: t.name, capacity: t.capacity }))
      });

      if (realTheater && realTheater.capacity && realTheater.capacity.min && realTheater.capacity.max) {
        console.log('✅ [Theater Capacity] Using database capacity:', realTheater.capacity);
        return {
          min: realTheater.capacity.min,
          max: realTheater.capacity.max
        };
      }
    }

    // Priority 2: Check if theater object has capacity properties (from context)
    if (typeof selectedTheater.capacity === 'object' && selectedTheater.capacity.min && selectedTheater.capacity.max) {
      console.log('✅ [Theater Capacity] Using context capacity:', selectedTheater.capacity);
      return {
        min: selectedTheater.capacity.min,
        max: selectedTheater.capacity.max
      };
    }

    // Emergency fallback - should rarely be used
    console.log('⚠️ [Theater Capacity] Using emergency fallback capacity (1-10)');
    return { min: 1, max: 10 };
  };

  const handleNumberChange = (field: 'numberOfPeople', action: 'increment' | 'decrement') => {
    setFormData(prev => {
      // Get dynamic theater capacity
      const capacity = getTheaterCapacity();
      const currentValue = prev[field];
      let newValue;

      console.log('🎭 [Number Change]', {
        action,
        currentValue,
        capacity,
        theater: selectedTheater?.name
      });

      // Special case: If min = max, don't allow any changes
      if (capacity.min === capacity.max) {
        console.log('🔒 [Fixed Capacity] Theater has fixed capacity, no changes allowed');
        return prev; // No change allowed
      }

      if (action === 'increment') {
        // Can increase up to theater maximum
        newValue = Math.min(currentValue + 1, capacity.max);
      } else {
        // Can decrease but not below theater minimum
        newValue = Math.max(currentValue - 1, capacity.min);
      }

      console.log('✅ [Number Change] Updated from', currentValue, 'to', newValue);

      return {
        ...prev,
        [field]: newValue
      };
    });
  };


  // Handle movie selection - open movies modal
  const handleSelectMovies = () => {


    setIsMoviesModalOpen(true);

  };

  // Handle movie selection from modal
  const handleMovieSelect = (movieTitle: string) => {



    setFormData(prev => {
      const newFormData = {
        ...prev,
        selectedMovies: [{
          id: movieTitle.toLowerCase().replace(/\s+/g, '_'),
          name: movieTitle,
          price: 0, // Movies are free
          quantity: 1
        }], // Only one movie allowed
        wantMovies: 'Yes' as 'Yes' | 'No'
      };

      return newFormData;
    });


    setIsMoviesModalOpen(false);
  };

  const calculateTotal = () => {
    // Extract price from selected theater or use default
    const basePrice = (selectedTheater && selectedTheater.price)
      ? parseFloat(String(selectedTheater.price).replace(/[₹,\s]/g, ''))
      : 1399.00;

    let total = basePrice;

    // Add extra guest charges (dynamic fee per guest beyond theater minimum capacity)
    const capacity = getTheaterCapacity();
    const extraGuests = Math.max(0, formData.numberOfPeople - capacity.min);
    const extraGuestFee = getExtraGuestFee();
    const extraGuestCharges = extraGuests * extraGuestFee;
    total += extraGuestCharges;

    // Add decoration fee if decoration is selected
    if (selectedServices['__decoration__'] === 'Yes') {
      total += pricingData.decorationFees || 0;
    }

    // Add dynamic service items costs
    allServices.forEach(service => {
      const serviceItems = selectedServiceItems[service.name] || [];
      serviceItems.forEach(itemName => {
        const item = service.items?.find((i: any) => (i.name || i.title) === itemName);
        if (item) {
          const itemPrice = Number(item.price ?? item.cost ?? 0);
          total += itemPrice;
        }
      });
    });

    // Movies are free - no cost added

    return total;
  };

  const hasDecorationSelection =
    selectedServices['__decoration__'] === 'Yes' ||
    String(formData.wantDecorItems || '').toLowerCase() === 'yes';
  const hasGiftSelection =
    formData.wantGifts === 'Yes' ||
    selectedServices['Gifts Items'] === 'Yes' ||
    selectedServices['Gifts'] === 'Yes';
  const isCouponEligible = hasDecorationSelection || hasGiftSelection;

  // Coupon code state and helpers
  const [couponCode, setCouponCode] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [appliedDiscountType, setAppliedDiscountType] = useState<'percentage' | 'fixed' | null>(null);
  const [appliedDiscountValue, setAppliedDiscountValue] = useState<number | null>(null);
  const [discountInput, setDiscountInput] = useState<string>('');
  const discountValue = useMemo(() => {
    if (!isManualMode) return 0;
    const parsed = Number(String(discountInput || '').replace(/[^0-9.]/g, ''));
    return Math.max(0, Number.isFinite(parsed) ? parsed : 0);
  }, [isManualMode, discountInput]);
  type CouponInfo = {
    couponCode: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    usageLimit?: number | null;
    validDate?: string | Date | null;
    expireDate?: string | Date | null;
  };
  const [availableCoupons, setAvailableCoupons] = useState<CouponInfo[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [couponsError, setCouponsError] = useState<string | null>(null);
  const [showAvailableCoupons, setShowAvailableCoupons] = useState(false);
  const availableCouponsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isCouponEligible && appliedDiscount > 0) {
      resetCouponState();
    }
  }, [isCouponEligible, appliedDiscount]);

  useEffect(() => {
    if (!isCouponEligible || appliedCouponCode) {
      setShowAvailableCoupons(false);
    }
  }, [isCouponEligible, appliedCouponCode]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!availableCouponsRef.current) return;
      if (!availableCouponsRef.current.contains(e.target as Node)) {
        setShowAvailableCoupons(false);
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  useEffect(() => {
    let abortController: AbortController | null = null;
    const shouldFetchCoupons = isCouponEligible;

    if (!shouldFetchCoupons) {
      setAvailableCoupons([]);
      return;
    }

    const fetchCoupons = async () => {
      try {
        setCouponsLoading(true);
        setCouponsError(null);
        abortController = new AbortController();
        const resp = await fetch('/api/coupons', { signal: abortController.signal });
        const data = await resp.json();
        if (data.success && Array.isArray(data.coupons)) {
          setAvailableCoupons(data.coupons);
        } else {
          setAvailableCoupons([]);
          setCouponsError(data.error || 'Unable to load coupons');
        }
      } catch (error) {
        if ((error as DOMException).name === 'AbortError') {
          return;
        }
        setCouponsError('Unable to load coupons');
        setAvailableCoupons([]);
      } finally {
        setCouponsLoading(false);
      }
    };

    void fetchCoupons();

    return () => {
      abortController?.abort();
    };
  }, [isCouponEligible]);

  const formatCouponDate = (value?: string | Date | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const describeCouponDiscount = (coupon: CouponInfo) => {
    return coupon.discountType === 'percentage'
      ? `${coupon.discountValue}% off`
      : `₹${coupon.discountValue} off`;
  };

  const getFinalTotal = () => {
    const total = calculateTotal();
    return Math.max(total - appliedDiscount - discountValue, 0);
  };

  const applyCoupon = async (codeOverride?: string) => {
    setCouponError(null);
    const code = (codeOverride ?? couponCode).trim().toUpperCase();
    if (!code) {
      setCouponError('Please enter a coupon code');
      // 1s error toast when input empty
      (window as any).showToast?.({
        type: 'error',
        message: 'Please enter a coupon code',
        duration: 1000,
      });
      return;
    }
    setCouponApplying(true);
    try {
      const resp = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, amount: calculateTotal() })
      });
      const data = await resp.json();
      if (data.success && data.discountAmount > 0) {
        setAppliedCouponCode(code);
        setAppliedDiscount(Number(data.discountAmount));
        setAppliedDiscountType(data.coupon?.discountType ?? null);
        setAppliedDiscountValue(typeof data.coupon?.discountValue === 'number' ? data.coupon.discountValue : null);
        setCouponCode('');

        // Show a small animated toast for 1 second
        (window as any).showToast?.({
          type: 'success',
          message: data.coupon?.couponCode
            ? `Coupon applied: ${data.coupon.couponCode}`
            : 'Coupon code applied',
          duration: 1000,
        });
      } else {
        setAppliedCouponCode(null);
        setAppliedDiscount(0);
        setCouponError(data.error || 'Invalid or expired coupon');
        setAppliedDiscountType(null);
        setAppliedDiscountValue(null);
        // 1s error toast on invalid/expired
        (window as any).showToast?.({
          type: 'error',
          message: data.error || 'Invalid or expired coupon',
          duration: 1000,
        });
      }
    } catch (e) {

      setCouponError('Unable to validate coupon');
      setAppliedDiscountType(null);
      setAppliedDiscountValue(null);
      // 1s error toast on network/API failure
      (window as any).showToast?.({
        type: 'error',
        message: 'Unable to validate coupon',
        duration: 1000,
      });
    } finally {
      setCouponApplying(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCouponCode(null);
    setAppliedDiscount(0);
    setCouponError(null);
    setAppliedDiscountType(null);
    setAppliedDiscountValue(null);
  };

  const getSlotBookingFee = () => {
    if (typeof pricingData.slotBookingFee === 'number') {
      return pricingData.slotBookingFee;
    }
    const theaterSlotFee = (selectedTheater as any)?.slotBookingFee;
    if (typeof theaterSlotFee === 'number') {
      return theaterSlotFee;
    }
    if (typeof formData.advancePayment === 'number') {
      return formData.advancePayment;
    }
    return 0;
  };

  const getPayableAmount = () => {
    return getSlotBookingFee();
  };

  const getAmountDueAtVenue = () => {
    return Math.max(getFinalTotal() - getSlotBookingFee(), 0);
  };

  const getDecorationFee = () => {
    const decorationSelected =
      formData.wantDecorItems === 'Yes' ||
      selectedServices['__decoration__'] === 'Yes';

    if (!decorationSelected) {
      return 0;
    }

    // Add decoration fees from pricing.json
    return pricingData.decorationFees || 0;
  };

  const getBalanceAmount = () => {
    return getAmountDueAtVenue();
  };

  // Debug function to check extra guest fee
  const getExtraGuestFee = () => {
    const fee = pricingData.extraGuestFee || 0;
    return fee;
  };

  // Render Booking Summary - Reusable component for all tabs
  const renderBookingSummary = () => {
    return (
      <div className="booking-popup-overview-summary">
        <div className="booking-popup-overview-summary-header">
          <h4 className="booking-popup-overview-summary-title">Booking Summary</h4>
          <div className="booking-popup-overview-summary-badge">Live Pricing</div>
        </div>
        <div className="booking-popup-overview-summary-content">
          {/* Theatre Booking Section */}
          <div className="booking-popup-overview-summary-section">
            <h5 className="booking-popup-overview-summary-section-title">Theatre Booking</h5>
            <div className="booking-popup-overview-summary-item">
              <span>{selectedTheater ? selectedTheater.name : 'EROS Theatre'}</span>
              <span>{selectedTheater ? selectedTheater.price : '₹1,399.00'}</span>
            </div>
            {(() => {
              const capacity = getTheaterCapacity();
              return (
                <>
                  <div className="booking-popup-overview-summary-item">
                    <span>Base Guests ({capacity.min})</span>
                    <span>Included</span>
                  </div>
                  {formData.numberOfPeople > capacity.min && (
                    <div className="booking-popup-overview-summary-item">
                      <span>Extra Guests ({formData.numberOfPeople - capacity.min} × ₹{pricingData.extraGuestFee || 0})</span>
                      <span>₹{(formData.numberOfPeople - capacity.min) * (pricingData.extraGuestFee || 0)}</span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Divider Line - Only when movies are selected */}
          {formData.wantMovies === 'Yes' && formData.selectedMovies.length > 0 && (
            <div className="booking-popup-overview-summary-divider-line"></div>
          )}

          {/* Movies Section */}
          {formData.wantMovies === 'Yes' && formData.selectedMovies.length > 0 && (
            <div className="booking-popup-overview-summary-section">
              <h5 className="booking-popup-overview-summary-section-title">Movies</h5>
              <div className="booking-popup-overview-summary-item">
                <span>{typeof formData.selectedMovies[0] === 'string' ? formData.selectedMovies[0] : formData.selectedMovies[0]?.name || 'Movie'}</span>
                <span>Free</span>
              </div>
            </div>
          )}

          {/* Decoration Fee Section */}
          {hasDecorationSelection && (
            <div className="booking-popup-overview-summary-section">
              <h5 className="booking-popup-overview-summary-section-title">Decoration</h5>
              <div className="booking-popup-overview-summary-item">
                <span>Decoration Fees</span>
                <span>₹{(pricingData.decorationFees || 0).toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Dynamic Service Items Sections */}
          {allServices.map((service) => {
            const serviceItems = selectedServiceItems[service.name] || [];
            if (selectedServices[service.name] === 'Yes' && serviceItems.length > 0) {
              return (
                <div key={service.serviceId || service.name} className="booking-popup-overview-summary-section">
                  <h5 className="booking-popup-overview-summary-section-title">{service.name}</h5>
                  {serviceItems.map((itemName) => {
                    const item = service.items?.find((i: any) => (i.name || i.title) === itemName);
                    if (item) {
                      const itemPrice = Number(item.price ?? item.cost ?? 0);
                      return (
                        <div key={itemName} className="booking-popup-overview-summary-item">
                          <span>{itemName}</span>
                          <span>₹{itemPrice}</span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              );
            }
            return null;
          })}

          {/* Totals Section */}
          <div className="booking-popup-overview-summary-totals">
            {/* Upper Section - Slot Booking Fee & At Venue Fee */}
            <div className="booking-popup-overview-summary-upper">
              <div className="booking-popup-overview-summary-item">
                <span>Slot Booking Fee</span>
                <span>₹{getSlotBookingFee().toFixed(2)}</span>
              </div>
              
              <div className="booking-popup-overview-summary-item">
                <span>Payable Amount</span>
                <span>₹{(getFinalTotal() - getPayableAmount()).toFixed(2)}</span>
              </div>
              
            </div>

            {/* Divider Line */}
            <div className="booking-popup-overview-summary-divider-line"></div>

            {/* Lower Section - Pay Now & At Venue */}
            <div className="booking-popup-overview-summary-lower">
              <div className="booking-popup-overview-summary-item">
                <span>Subtotal</span>
                <span>₹{calculateTotal().toFixed(2)}</span>
              </div>
              {appliedDiscount > 0 && (
                <div className="booking-popup-overview-summary-item">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span>
                      Coupon Discount
                      {appliedCouponCode ? ` (${appliedCouponCode}${
                        appliedDiscountType === 'percentage' && appliedDiscountValue
                          ? ` – ${appliedDiscountValue}%`
                          : appliedDiscountType === 'fixed' && appliedDiscountValue
                            ? ` – ₹${appliedDiscountValue}`
                            : ''
                      })` : ''}
                    </span>
                  </span>
                  <span>-₹{appliedDiscount.toFixed(2)}</span>
                </div>
              )}
              {isManualMode && discountValue > 0 && (
                <div className="booking-popup-overview-summary-item">
                  <span>Discount</span>
                  <span>-₹{discountValue.toFixed(2)}</span>
                </div>
              )}
              <div className="booking-popup-overview-summary-item booking-popup-overview-summary-total">
                <span>Total Amount</span>
                <span>₹{getFinalTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleSkip = () => {
    // If current tab is a dynamic service tab, mark that service as skipped
    const currentService = allServices.find((s: any) => s.name === activeTab);

    if (currentService) {
      // Clear any selected items for this service so they are not saved in booking
      setSelectedServiceItems(prev => ({
        ...prev,
        [currentService.name]: [],
      }));

      // Track that the user explicitly skipped this service for this booking flow
      setSkippedServices(prev => new Set([...prev, currentService.name]));
    }

    // Move to the next tab as before
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]);
      // Scroll to top of popup content
      setTimeout(() => {
        const popupContent = document.querySelector('.booking-popup-content');
        if (popupContent) {
          popupContent.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
    }
  };

  const handleNextStep = async () => {
    // Check if this is the last tab (Complete Booking)
    const isLastTab = activeTab === tabs[tabs.length - 1];

    // On Overview tab, gently confirm once if user keeps Decoration = No
    if (!isLastTab && activeTab === 'Overview') {
      const decorationMode = selectedServices['__decoration__'];
      if (decorationMode === 'No' && !hasConfirmedDecorationNo) {
        setShowDecorationNoConfirm(true);
        return;
      }
    }

    if (isLastTab) {
      // Check if booking time is within 1 hour
      const isBookingTimeNear = () => {
        if (!selectedDate || !selectedTimeSlot) return false;

        try {
          const now = new Date();
          const selectedDateObj = new Date(selectedDate);

          // If selected date is not today, booking is allowed
          if (selectedDateObj.toDateString() !== now.toDateString()) {
            return false;
          }

          // Parse the time slot to get start time
          const timeMatch = selectedTimeSlot.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
          if (!timeMatch) return false;

          const [, hours, minutes, period] = timeMatch;
          let hour24 = parseInt(hours);

          // Convert to 24-hour format
          if (period.toLowerCase() === 'pm' && hour24 !== 12) {
            hour24 += 12;
          } else if (period.toLowerCase() === 'am' && hour24 === 12) {
            hour24 = 0;
          }

          const slotStartTime = new Date(now);
          slotStartTime.setHours(hour24, parseInt(minutes), 0, 0);

          // Check if current time is within 1 hour of slot start time
          const oneHourBefore = new Date(slotStartTime.getTime() - (60 * 60 * 1000));
          return now.getTime() >= oneHourBefore.getTime();
        } catch (error) {

          return false;
        }
      };

      // Check if booking time is near
      if (isBookingTimeNear()) {
        setValidationMessage('Booking is not allowed within 1 hour of the selected time slot. Please select a different time.');
        setShowValidationPopup(true);
        return;
      }

      // Final step - validate entire form before saving
      if (!validateForm()) {
        return; // Validation failed, popup is already shown
      }
    } else {
      // For intermediate steps, do basic validation
      if (activeTab === 'Overview') {
        // Validate Overview section fields
        if (!formData.bookingName.trim()) {
          setValidationMessage('Please enter your name to continue.');
          setShowValidationPopup(true);
          return;
        }

        if (!formData.whatsappNumber.trim()) {
          setValidationMessage('Please enter your WhatsApp number to continue.');
          setShowValidationPopup(true);
          return;
        }
        // Format check: 10-digit mobile number
        if (formData.whatsappNumber.replace(/\D/g, '').length !== 10) {
          setValidationMessage('Please enter a valid 10-digit mobile number.');
          setShowValidationPopup(true);
          return;
        }

        if (!formData.emailAddress.trim()) {
          setValidationMessage('Please enter your email address to continue.');
          setShowValidationPopup(true);
          return;
        }
        // Format check: valid email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(formData.emailAddress)) {
          setValidationMessage('Please enter a valid email address (e.g., name@example.com).');
          setShowValidationPopup(true);
          return;
        }

        if (!selectedTimeSlot) {
          setValidationMessage('Please select a time slot by clicking on the time area in the header to continue.');
          setShowValidationPopup(true);
          return;
        }

        // Validate theater capacity
        const capacity = getTheaterCapacity();
        if (formData.numberOfPeople < capacity.min) {
          setValidationMessage(`This theater requires minimum ${capacity.min} people. Please increase the number of people to continue.`);
          setShowValidationPopup(true);
          return;
        }

        if (formData.numberOfPeople > capacity.max) {
          setValidationMessage(`This theater allows maximum ${capacity.max} people. Please reduce the number of people to continue.`);
          setShowValidationPopup(true);
          return;
        }

        // Validate decoration selection on Overview tab
        if (!selectedServices['__decoration__']) {
          setValidationErrorName('Decoration Selection Required');
          setValidationMessage('Please choose whether you want decoration (Yes or No) to continue.');
          setShowValidationPopup(true);
          return;
        }

        // Validate movies selection on Overview tab: if Movies = Yes, at least one movie must be selected
        if (formData.wantMovies === 'Yes' && (!formData.selectedMovies || formData.selectedMovies.length === 0)) {
          setValidationErrorName('Movie Selection Required');
          setValidationMessage('You selected "Yes" for movies, but did not choose any movie. Please select at least one movie or select "No" for movies in the Overview tab.');
          setShowValidationPopup(true);
          return;
        }

      }

      if (activeTab === 'Occasion') {
        const decorationModeOnOccasionTab = selectedServices['__decoration__'];
        // Occasion is only mandatory when decoration is Yes
        if (decorationModeOnOccasionTab === 'Yes' && !formData.occasion.trim()) {
          setValidationMessage('Please select an occasion to continue.');
          setShowValidationPopup(true);
          return;
        }

        // Validate decoration selection on Occasion tab
        if (!selectedServices['__decoration__']) {
          setValidationErrorName('Decoration Selection Required');
          setValidationMessage('Please choose whether you want decoration (Yes or No) to continue.');
          setShowValidationPopup(true);
          return;
        }

        // Validate dynamic occasion required fields on Occasion tab
        if (selectedOccasionData && selectedOccasionData.requiredFields) {
          for (const fieldKey of selectedOccasionData.requiredFields) {
            const fieldValue = formData.occasionData?.[fieldKey];
            const fieldLabel = selectedOccasionData.fieldLabels[fieldKey] || fieldKey;

            if (!fieldValue || fieldValue.trim() === '') {
              setValidationErrorName(`Missing ${fieldLabel}`);
              setValidationMessage(`Please enter ${fieldLabel.toLowerCase()} to continue.`);
              setShowValidationPopup(true);
              return;
            }
          }
        }
      }

      if (activeTab === 'Terms & Conditions' && !formData.agreeToTerms) {
        setValidationMessage('Please agree to terms and conditions to continue.');
        setShowValidationPopup(true);
        return;
      }
    }

    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]);
      // Scroll to top of popup content
      setTimeout(() => {
        const popupContent = document.querySelector('.booking-popup-content');
        if (popupContent) {
          popupContent.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
    } else {
      // Final step - save booking to database
      try {
        // Calculate payment amounts
        const discountedTotal = getFinalTotal();
        const advancePayment = getPayableAmount(); // Use slot booking fee from pricing data
        const venuePayment = discountedTotal - advancePayment; // Remaining amount to be paid at venue

        // Get theater base price
        const theaterBasePrice = (selectedTheater && selectedTheater.price)
          ? parseFloat(String(selectedTheater.price).replace(/[₹,\s]/g, ''))
          : 1399.00;

        // Map form data to API format
        const bookingData = {
          name: formData.bookingName,
          email: formData.emailAddress,
          phone: formData.whatsappNumber,
          theaterName: selectedTheater?.name || 'FeelME Town Theater',
          date: selectedDate || new Date().toISOString().split('T')[0],
          time: selectedTimeSlot || '6:00 PM',
          occasion: formData.occasion,
          // Dynamic occasion data stays scoped inside occasionData only
          occasionData: formData.occasionData || {},
          numberOfPeople: formData.numberOfPeople,


          selectedMovies: formData.selectedMovies,
          // Dynamic service items (completely dynamic!)
          ...getDynamicServiceItemsFromFormData(formData),

          // Payment breakdown
          totalAmount: discountedTotal,
          totalAmountBeforeDiscount: calculateTotal(),
          totalAmountAfterDiscount: discountedTotal,
          discountAmount: appliedDiscount,
          discountSummary: appliedDiscount > 0 ? {
            code: appliedCouponCode,
            type: appliedDiscountType,
            value: appliedDiscountValue,
            amount: appliedDiscount
          } : undefined,
          advancePayment: advancePayment, // Amount paid now (₹600)
          venuePayment: venuePayment, // Amount to be paid at venue
          appliedCouponCode: appliedCouponCode || undefined,
          couponDiscount: appliedDiscount || 0,
          couponDiscountType: appliedDiscountType || undefined,
          couponDiscountValue: appliedDiscountValue || undefined,
          wantDecorItems: hasDecorationSelection ? 'Yes' : 'No',
          status: isManualMode ? 'manual' : 'completed', // Booking status - manual for admin, completed for regular
          isManualBooking: isManualMode, // Flag for manual booking
          bookingType: isManualMode ? 'Manual' : 'Online', // Booking type
          // Store pricing data used at time of booking
          pricingData: {
            slotBookingFee: pricingData.slotBookingFee,
            extraGuestFee: pricingData.extraGuestFee,
            convenienceFee: pricingData.convenienceFee,
            decorationFees: pricingData.decorationFees
          },
          // Persist decoration state and calculated fee
          decorationFee: hasDecorationSelection ? (pricingData.decorationFees || 0) : 0,
          decorationAppliedFee: hasDecorationSelection ? (pricingData.decorationFees || 0) : 0,
          // Store calculated guest charges for easy reference
          extraGuestCharges: (() => {
            const capacity = getTheaterCapacity();
            const extraGuests = Math.max(0, formData.numberOfPeople - capacity.min);
            return extraGuests * pricingData.extraGuestFee;
          })()
        };



        // Debug occasion data specifically




        // Booking data prepared for API

        // Anniversary data processing

        // Decide endpoint/body for create vs edit
        const isEdit = isEditingBooking && !!editingBookingId;
        const url = isEdit ? '/api/admin/edit-booking' : '/api/booking';
        const method = isEdit ? 'POST' : 'POST';

        const payload = isEdit
          ? { bookingId: editingBookingId, data: bookingData }
          : bookingData;

        const response = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${result.error || 'Unknown error'}`);
        }

        if (result.success) {




          // Show success animation instead of closing
          setBookingResult({
            ...result,
            wasEditing: isEditingBooking // Store editing state in result
          });
          setIsBookingSuccessful(true);
          setIsEditingBooking(false); // Reset editing state

          // Call onSuccess callback if provided (for manual booking mode)
          if (onSuccess) {
            onSuccess();
          }
        } else {
          setValidationErrorName('Booking Failed');
          setValidationMessage(result.error || 'Failed to save booking. Please try again.');
          setShowValidationPopup(true);
        }
      } catch (error: any) {
        console.error('❌ Booking failed:', error);
        setValidationErrorName('Booking Failed');
        setValidationMessage(error.message || 'Failed to create booking. Please try again.');
        setShowValidationPopup(true);
      }
    }
  };

  // Handle confirmation popup actions
  const handleConfirmClose = async () => {
    setShowCloseConfirmation(false);
    setIsClosing(false);
    // Proceed with actual closing logic
    await performClose();
  };

  const handleCancelClose = () => {
    setShowCloseConfirmation(false);
    setIsClosing(false);
  };

  const goToPreviousTabOrExit = () => {
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1]);
      return true;
    }
    return false;
  };

  const handleClose = async (e?: React.MouseEvent) => {
    // Only close if clicking on the overlay itself, not on child elements
    if (e && e.target !== e.currentTarget) {
      return;
    }

    if (goToPreviousTabOrExit()) {
      return;
    }

    // Prevent multiple confirmation popups
    if (isClosing || showCloseConfirmation) {
      return;
    }

    // Set closing state and show confirmation popup
    setIsClosing(true);
    setShowCloseConfirmation(true);
  };

  const handleBackButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (goToPreviousTabOrExit()) {
      return;
    }

    void handleClose();
  };

  const handleCloseButtonClick = () => {
    // Prevent multiple confirmation popups
    if (isClosing || showCloseConfirmation) {
      return;
    }

    // Set closing state and show confirmation popup
    setIsClosing(true);
    setShowCloseConfirmation(true);
  };

  const performClose = async () => {
    // Check if we're in editing mode and if changes were made
    if (isEditingBooking) {
      if (hasFormDataChanged()) {
        // Changes were made during editing - treat as incomplete booking
        const hasData = formData.bookingName || formData.emailAddress || formData.whatsappNumber || formData.occasion;

        if (hasData && formData.emailAddress) {
          // Log the data being sent for edited booking
          console.log('📧 Sending incomplete booking data (edited):', {
            name: formData.bookingName,
            email: formData.emailAddress,
            phone: formData.whatsappNumber,
            theaterName: selectedTheater?.name || '',
            date: selectedDate || '',
            time: selectedTimeSlot || '',
            occasion: formData.occasion
          });

          // Send incomplete booking email for edited data
          try {
            const response = await fetch('/api/email/incomplete', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: formData.bookingName,
                email: formData.emailAddress,
                phone: formData.whatsappNumber,
                theaterName: selectedTheater?.name || '',
                date: selectedDate || '',
                time: selectedTimeSlot || '',
                occasion: formData.occasion,
                // Add pricing data for proper display
                pricingData: {
                  slotBookingFee: pricingData.slotBookingFee,
                  extraGuestFee: pricingData.extraGuestFee,
                  convenienceFee: pricingData.convenienceFee,
                  decorationFees: pricingData.decorationFees
                },
                advancePayment: getPayableAmount(),
                venuePayment: getFinalTotal() - getPayableAmount(),
                totalAmount: getFinalTotal(),
                // Send occasion data only inside occasionData
              })
            });

            const result = await response.json();
            if (result.success) {



            }
          } catch (error) {

          }
        }
      } else {
        // No changes made during editing - booking remains completed

      }
    } else {
      // Not in editing mode - check if user has entered data but not completed booking
      const hasData = formData.bookingName || formData.emailAddress || formData.whatsappNumber || formData.occasion;

      if (hasData && formData.emailAddress) {
        // Log the data being sent
        console.log('📧 Sending incomplete booking data:', {
          name: formData.bookingName,
          email: formData.emailAddress,
          phone: formData.whatsappNumber,
          theaterName: selectedTheater?.name || '',
          date: selectedDate || '',
          time: selectedTimeSlot || '',
          occasion: formData.occasion
        });

        // Send incomplete booking email
        try {
          const response = await fetch('/api/email/incomplete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: formData.bookingName,
              email: formData.emailAddress,
              phone: formData.whatsappNumber,
              theaterName: selectedTheater?.name || '',
              date: selectedDate || '',
              time: selectedTimeSlot || '',
              occasion: formData.occasion,
              // Add pricing data for proper display
              pricingData: {
                slotBookingFee: pricingData.slotBookingFee,
                extraGuestFee: pricingData.extraGuestFee,
                convenienceFee: pricingData.convenienceFee,
                decorationFees: pricingData.decorationFees
              },
              advancePayment: getPayableAmount(),
              venuePayment: getFinalTotal() - getPayableAmount(),
              totalAmount: getFinalTotal(),
              totalAmountBeforeDiscount: calculateTotal(),
              totalAmountAfterDiscount: getFinalTotal(),
              discountAmount: appliedDiscount,
            })
          });

          const result = await response.json();
          if (result.success) {



          }
        } catch (error) {

        }
      }
    }

    // Restore body scroll when closing popup
    document.body.style.overflow = 'unset';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.height = '';
    document.body.classList.remove('popup-open');
    // Check editing state BEFORE resetting (resetForm will set isEditingBooking to false)
    const wasEditingBooking = isEditingBooking;

    // Reset form when closing popup
    resetForm();
    onClose();

    // Navigate to theater page when popup is closed (only if not editing from admin)
    if (!wasEditingBooking) {
      router.push('/theater');
    }
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

  const popupContent = (
    <div
      className="booking-popup-overlay"
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
        className={`booking-popup ${isLoaded ? 'booking-popup-loaded' : ''}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          zIndex: 1000000,
          backgroundColor: '#000000',
          borderRadius: '1rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          width: '100%',
          maxWidth: '1200px',
          maxHeight: '90vh',
          overflow: 'hidden',
          overflowY: 'auto',
          opacity: isLoaded ? 1 : 0,
          transform: isLoaded ? 'scale(1)' : 'scale(0.9)',
          transition: 'all 0.3s ease',
          pointerEvents: 'auto'
        }}>
        {/* Header */}
        <div className="booking-popup-header">
          <div className="booking-popup-nav">
            <button type="button" className="booking-popup-back-btn" onClick={handleBackButtonClick}>
              <ArrowLeft className="w-5 h-5" />
              <span className="booking-popup-back-text">Back</span>
            </button>
            <div className="booking-popup-brand">
              <div className="booking-popup-logo">
                <Play className="w-6 h-6" />
              </div>
              <div className="booking-popup-title-section">
                <h1 className="booking-popup-title">Book Your Show</h1>

              </div>
            </div>
            <button className="booking-popup-close-btn" onClick={handleCloseButtonClick}>
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Hero Section */}
        <div className="booking-popup-hero">
          <div className="booking-popup-theater-info">
            <h2 className="booking-popup-theater-title">
              {selectedTheater ? selectedTheater.name : 'EROS (COUPLES) Theatre'}
            </h2>
            <div className="booking-popup-meta">
              <div
                className="booking-popup-meta-item booking-popup-date-selector-meta"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="booking-popup-meta-icon">
                  <path fill="currentColor" d="M22 10H2v9a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3zM7 8a1 1 0 0 1-1-1V3a1 1 0 0 1 2 0v4a1 1 0 0 1-1 1m10 0a1 1 0 0 1-1-1V3a1 1 0 0 1 2 0v4a1 1 0 0 1-1 1" opacity="0.5" />
                  <path fill="currentColor" d="M19 4h-1v3a1 1 0 0 1-2 0V4H8v3a1 1 0 0 1-2 0V4H5a3 3 0 0 0-3 3v3h20V7a3 3 0 0 0-3-3" />
                </svg>
                <span>{selectedDate || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <div
                className="booking-popup-meta-item booking-popup-time-selector-meta"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="booking-popup-meta-icon">
                  <g fill="none">
                    <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                    <path fill="currentColor" d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2m0 4a1 1 0 0 0-1 1v5a1 1 0 0 0 .293.707l3 3a1 1 0 0 0 1.414-1.414L13 11.586V7a1 1 0 0 0-1-1" />
                  </g>
                </svg>
                <span className="booking-popup-time-text">
                  {selectedTimeSlot}
                </span>
              </div>
              <div className="booking-popup-meta-item">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" className="booking-popup-meta-icon">
                  <path fill="currentColor" d="M6.153 7.008A1.5 1.5 0 0 1 7.5 8.5c0 .771-.47 1.409-1.102 1.83c-.635.424-1.485.67-2.398.67s-1.763-.246-2.398-.67C.969 9.91.5 9.271.5 8.5A1.5 1.5 0 0 1 2 7h4zM10.003 7a1.5 1.5 0 0 1 1.5 1.5c0 .695-.432.dance1.528c-.548.315-1.265.472-2.017.472q-.48-.001-.741-.056c.433-.512.739-1.166.739-1.944A2.5 2.5 0 0 0 7.997 7zM4.002 1.496A2.253 2.253 0 1 1 4 6.001a2.253 2.253 0 0 1 0-4.505m4.75 1.001a1.75 1.75 0 1 1 0 3.5a1.75 1.75 0 0 1 0-3.5" />
                </svg>
                <span>{formData.numberOfPeople} People</span>
              </div>
              {isManualMode && (
                <div className="booking-popup-meta-item">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" className="booking-popup-meta-icon">
                    <path fill="currentColor" d="M6.153 7.008A1.5 1.5 0 0 1 7.5 8.5c0 .771-.47 1.409-1.102 1.83c-.635.424-1.485.67-2.398.67s-1.763-.246-2.398-.67C.969 9.91.5 9.271.5 8.5A1.5 1.5 0 0 1 2 7h4zM10.003 7a1.5 1.5 0 0 1 1.5 1.5c0 .695-.432 1.211-.983 1.528c-.548.315-1.265.472-2.017.472q-.38-.001-.741-.056c.433-.512.739-1.166.739-1.944A2.5 2.5 0 0 0 7.997 7zM4.002 1.496A2.253 2.253 0 1 1 4 6.001a2.253 2.253 0 0 1 0-4.505m4.75 1.001a1.75 1.75 0 1 1 0 3.5a1.75 1.75 0 0 1 0-3.5" />
                  </svg>
                  <span>
                    Opened by: {userInfo?.type === 'staff'
                      ? (userInfo?.staffName || userInfo?.staffId || 'Staff')
                      : `Admin${userInfo?.adminName ? `: ${userInfo.adminName}` : ''}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="booking-popup-content">
          {/* Tab Navigation */}
          <nav className="booking-popup-tabs">
            {tabs.map((tab, index) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`booking-popup-tab ${activeTab === tab ? 'booking-popup-tab-active' : ''}`}
              >
                <span className="booking-popup-tab-number">{index + 1}</span>
                <span className="booking-popup-tab-text">{tab}</span>
              </button>
            ))}
          </nav>

          <div className="booking-popup-layout">
            {/* Main Panel */}
            <div className="booking-popup-main">
              <div className="booking-popup-tab-content">
                {activeTab === 'Overview' && (
                  <div className="booking-popup-section">
                    <h3 className="booking-popup-section-title">
                      <Users className="w-5 h-5" />
                      Booking Overview
                    </h3>
                    <div className="booking-popup-form">
                      <div className="booking-popup-field">
                        <label>Booking Name *</label>
                        <input
                          type="text"
                          value={formData.bookingName}
                          onChange={(e) => handleInputChange('bookingName', e.target.value)}
                          placeholder="Enter your name"
                        />
                      </div>
                      <div className="booking-popup-field">
                        <label>Number of People *</label>
                        <div className="booking-popup-number">
                          <button
                            onClick={() => handleNumberChange('numberOfPeople', 'decrement')}
                            disabled={(() => {
                              const capacity = getTheaterCapacity();
                              // Disable if: fixed capacity (min=max) OR already at minimum
                              return capacity.min === capacity.max || formData.numberOfPeople <= capacity.min;
                            })()}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span>{formData.numberOfPeople}</span>
                          <button
                            onClick={() => handleNumberChange('numberOfPeople', 'increment')}
                            disabled={(() => {
                              const capacity = getTheaterCapacity();
                              // Disable if: fixed capacity (min=max) OR already at maximum
                              return capacity.min === capacity.max || formData.numberOfPeople >= capacity.max;
                            })()}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        {isManualMode && (
                          <div className="booking-popup-capacity-info" style={{ marginTop: 6 }}>
                            <span>
                              Opened by:{' '}
                              {userInfo?.type === 'staff'
                                ? `${userInfo?.staffName || userInfo?.staffId || 'Staff'}`
                                : `Admin${userInfo?.adminName ? `: ${userInfo?.adminName}` : ''}`}
                            </span>
                          </div>
                        )}
                        {(() => {
                          const capacity = getTheaterCapacity();

                          // Special case: Fixed capacity theater (min = max)
                          if (capacity.min === capacity.max) {
                            return (
                              <div className="booking-popup-capacity-info">
                                <span>Fixed capacity theater: {capacity.min} people only</span>
                              </div>
                            );
                          }

                          // Variable capacity theater (min ≠ max)
                          if (formData.numberOfPeople >= capacity.max) {
                            return (
                              <div className="booking-popup-capacity-warning">
                                <span>Maximum capacity reached for this theater ({capacity.max} people)</span>
                              </div>
                            );
                          } else if (formData.numberOfPeople === capacity.min) {
                            return (
                              <div className="booking-popup-capacity-info">
                                <span>Base capacity: {capacity.min} people (can increase up to {capacity.max})</span>
                              </div>
                            );
                          } else if (formData.numberOfPeople > capacity.min) {
                            const extraGuests = formData.numberOfPeople - capacity.min;
                            return (
                              <div className="booking-popup-capacity-info">
                                <span>Extra guests: {extraGuests} × ₹{pricingData.extraGuestFee || 400} = ₹{extraGuests * (pricingData.extraGuestFee || 400)}</span>
                              </div>
                            );
                          } else if (capacity.min !== capacity.max) {
                            return (
                              <div className="booking-popup-capacity-info">
                                <span>Recommended: {capacity.min}-{capacity.max} people (minimum 1 allowed)</span>
                              </div>
                            );
                          } else {
                            return (
                              <div className="booking-popup-capacity-info">
                                <span>Recommended: {capacity.min} people (minimum 1 allowed)</span>
                              </div>
                            );
                          }
                        })()}
                      </div>
                      <div className="booking-popup-field">
                        <label>WhatsApp Number *</label>
                        <input
                          type="tel"
                          value={formData.whatsappNumber}
                          onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
                          placeholder="+91 XXXXX XXXXX"
                        />
                        {formData.whatsappNumber && formData.whatsappNumber.replace(/\D/g, '').length !== 10 && (
                          <div style={{ color: '#ff5555', fontSize: 12, marginTop: 6 }}>Please enter a 10-digit mobile number.</div>
                        )}
                      </div>
                      <div className="booking-popup-field">
                        <label>Email Address *</label>
                        <input
                          type="email"
                          value={formData.emailAddress}
                          onChange={(e) => handleInputChange('emailAddress', e.target.value)}
                          placeholder="your@email.com"
                        />
                        {formData.emailAddress && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(formData.emailAddress) && (
                          <div style={{ color: '#ff5555', fontSize: 12, marginTop: 6 }}>Please enter a valid email address.</div>
                        )}
                      </div>


                      <div className="booking-popup-field-row">
                        <div className="booking-popup-field">
                          <label>Want Movies?</label>
                          <div className="booking-popup-movie-selection">
                            <select
                              value={formData.wantMovies}
                              onChange={(e) => handleInputChange('wantMovies', e.target.value as 'Yes' | 'No')}
                              className="booking-popup-select"
                            >
                              <option value="No">No</option>
                              <option value="Yes">Yes</option>
                            </select>
                            {formData.wantMovies === 'Yes' && (
                              <div className="booking-popup-movie-selection-info">
                                <button
                                  type="button"
                                  onClick={handleSelectMovies}
                                  className="booking-popup-select-movies-btn"
                                >
                                  <Play className="w-4 h-4" />
                                  {formData.selectedMovies.length > 0 ? (
                                    <>
                                      {(() => {
                                        const movie = formData.selectedMovies[0];
                                        const movieName = typeof movie === 'string' ? movie : movie?.name || 'Movie';
                                        const words = movieName.split(' ');
                                        if (words.length > 2) {
                                          return words.slice(0, 2).join(' ') + '...';
                                        }
                                        return movieName;
                                      })()}
                                      <span className="booking-popup-movie-change-text">
                                        (Change Movie)
                                      </span>
                                    </>
                                  ) : (
                                    'Select Movie'
                                  )}
                                </button>
                                <div className="booking-popup-movie-price-info">
                                  <span className="booking-popup-movie-price-text">
                                    Free
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Decoration Dropdown - Only show if there are services with includeInDecoration */}
                        {allServices.some(service => service.includeInDecoration) && (() => {
                          // Check if decoration is compulsory for selected theater
                          const realTheater = realTheaterData.find(theater =>
                            (selectedTheater?.name && theater.name === selectedTheater.name) ||
                            (selectedTheater?.id && theater.theaterId === selectedTheater.id)
                          );
                          const isDecorationCompulsory = realTheater?.decorationCompulsory === true;

                          return (
                            <div className="booking-popup-field">
                              <label style={{ display: 'block', marginBottom: '0rem' }}>
                                Want Decoration?
                                {isDecorationCompulsory && (
                                  <span
                                    style={{
                                      color: '#10b981',
                                      marginLeft: '0.5rem',
                                      fontSize: '0.85rem',
                                      fontWeight: 600,
                                    }}
                                  >
                                    (Compulsory)
                                  </span>
                                )}
                              </label>
                              <select
                                value={selectedServices['__decoration__'] || ''}
                                onChange={(e) => {
                                  const value = e.target.value as 'Yes' | 'No' | '';
                                  if (!value) return; // Don't process empty selection
                                  handleInputChange('wantDecorItems', value);
                                }}
                                className="booking-popup-select"
                                disabled={isDecorationCompulsory}
                              >
                                <option value="" disabled>
                                  Choose
                                </option>
                                <option value="No">No</option>
                                <option value="Yes">Yes (₹{pricingData.decorationFees} Decoration)</option>
                              </select>
                            </div>
                          );
                        })()}

                        {/* Dynamic Service Selection Dropdowns - Only for services NOT included in decoration AND NOT compulsory */}
                        {allServices
                          .filter(service => !service.includeInDecoration && !service.compulsory)
                          .map((service) => (
                            <div key={service.serviceId || service.name} className="booking-popup-field">
                              <label>Want {service.name}?</label>
                              <select
                                value={selectedServices[service.name] || 'No'}
                                onChange={(e) => handleServiceSelection(service.name, e.target.value as 'Yes' | 'No')}
                                className="booking-popup-select"
                              >
                                <option value="No">No</option>
                                <option value="Yes">Yes</option>
                              </select>
                            </div>
                          ))}

                        {/* Compulsory Services - Hidden from Overview, auto-selected in background */}
                        {/* No UI display for compulsory services - they are silently included */}


                      </div>

                      {/* Booking Summary inside Overview */}
                      <div className="booking-popup-overview-summary">
                        <div className="booking-popup-overview-summary-header">
                          <h4 className="booking-popup-overview-summary-title">Booking Summary</h4>
                          <div className="booking-popup-overview-summary-badge">Live Pricing</div>
                        </div>
                        <div className="booking-popup-overview-summary-content">
                          {/* Theatre Booking Section */}
                          <div className="booking-popup-overview-summary-section">
                            <h5 className="booking-popup-overview-summary-section-title">Theatre Booking</h5>
                            <div className="booking-popup-overview-summary-item">
                              <span>{selectedTheater ? selectedTheater.name : 'EROS Theatre'}</span>
                              <span>{selectedTheater ? selectedTheater.price : '₹1,399.00'}</span>
                            </div>
                            {(() => {
                              const capacity = getTheaterCapacity();
                              return (
                                <>
                                  <div className="booking-popup-overview-summary-item">
                                    <span>Base Guests ({capacity.min})</span>
                                    <span>Included</span>
                                  </div>
                                  {formData.numberOfPeople > capacity.min && (
                                    <div className="booking-popup-overview-summary-item">
                                      <span>Extra Guests ({formData.numberOfPeople - capacity.min} × ₹{pricingData.extraGuestFee || 0})</span>
                                      <span>₹{(formData.numberOfPeople - capacity.min) * (pricingData.extraGuestFee || 0)}</span>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>

                          {/* Divider Line - Only when movies are selected */}
                          {formData.wantMovies === 'Yes' && formData.selectedMovies.length > 0 && (
                            <div className="booking-popup-overview-summary-divider-line"></div>
                          )}

                          {/* Movies Section */}
                          {formData.wantMovies === 'Yes' && formData.selectedMovies.length > 0 && (
                            <div className="booking-popup-overview-summary-section">
                              <h5 className="booking-popup-overview-summary-section-title">Movies</h5>
                              <div className="booking-popup-overview-summary-item">
                                <span>{typeof formData.selectedMovies[0] === 'string' ? formData.selectedMovies[0] : formData.selectedMovies[0]?.name || 'Movie'}</span>
                                <span>Free</span>
                              </div>
                            </div>
                          )}

                          {/* Decoration Fee Section */}
                          {selectedServices['__decoration__'] === 'Yes' && (
                            <div className="booking-popup-overview-summary-section">
                              <h5 className="booking-popup-overview-summary-section-title">Decoration</h5>
                              <div className="booking-popup-overview-summary-item">
                                <span>Decoration Fees</span>
                                <span>₹{pricingData.decorationFees || 0}</span>
                              </div>
                            </div>
                          )}

                          {/* Dynamic Service Items Sections */}
                          {allServices.map((service) => {
                            const serviceItems = selectedServiceItems[service.name] || [];
                            if (selectedServices[service.name] === 'Yes' && serviceItems.length > 0) {
                              return (
                                <div key={service.serviceId || service.name} className="booking-popup-overview-summary-section">
                                  <h5 className="booking-popup-overview-summary-section-title">{service.name}</h5>
                                  {serviceItems.map((itemName) => {
                                    const item = service.items?.find((i: any) => (i.name || i.title) === itemName);
                                    if (item) {
                                      const itemPrice = Number(item.price ?? item.cost ?? 0);
                                      return (
                                        <div key={itemName} className="booking-popup-overview-summary-item">
                                          <span>{itemName}</span>
                                          <span>₹{itemPrice}</span>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })}
                                </div>
                              );
                            }
                            return null;
                          })}

                          {/* Totals Section */}
                          <div className="booking-popup-overview-summary-totals">
                            {/* Upper Section - Slot Booking Fee & At Venue Fee */}
                            <div className="booking-popup-overview-summary-upper">
                              <div className="booking-popup-overview-summary-item">
                                <span>Slot Booking Fee</span>
                                <span>₹{getPayableAmount().toFixed(2)}</span>
                              </div>
                              <div className="booking-popup-overview-summary-item">
                                <span>At Venue Fee</span>
                                <span>₹{(getFinalTotal() - getPayableAmount()).toFixed(2)}</span>
                              </div>
                              {appliedDiscount > 0 && (
                                <div className="booking-popup-overview-summary-item">
                                  <span>Coupon Discount</span>
                                  <span>-₹{appliedDiscount.toFixed(2)}</span>
                                </div>
                              )}

                            </div>

                            {/* Divider Line */}
                            <div className="booking-popup-overview-summary-divider-line"></div>

                            {/* Lower Section - Pay Now & At Venue */}
                            <div className="booking-popup-overview-summary-lower">
                              <div className="booking-popup-overview-summary-item">
                                <span>Subtotal</span>
                                <span>₹{calculateTotal().toFixed(2)}</span>
                              </div>
                              {appliedDiscount > 0 && (
                                <div className="booking-popup-overview-summary-item">
                                  <span>Coupon Discount</span>
                                  <span>-₹{appliedDiscount.toFixed(2)}</span>
                                </div>
                              )}
                              <div className="booking-popup-overview-summary-item booking-popup-overview-summary-total">
                                <span>Total Amount</span>
                                <span>₹{getFinalTotal().toFixed(2)}</span>
                              </div>
                            </div>

                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                )}

                {activeTab === 'Occasion' && (
                  <div className="booking-popup-section">
                    <h3 className="booking-popup-section-title">
                      <Calendar className="w-5 h-5" />
                      Choose Your Occasion
                    </h3>
                    {(() => {
                      const decorationMode = selectedServices['__decoration__'];
                      const visibleOccasions = decorationMode === 'Yes'
                        // Decoration booking: only decoration-specific occasions
                        ? occasionOptions.filter((occasion) => occasion.includeInDecoration === true)
                        // Normal booking: only non-decoration occasions (includeInDecoration false/undefined)
                        : occasionOptions.filter((occasion) => occasion.includeInDecoration !== true);

                      if (!formData.occasion) {
                        return (
                          <div className="booking-popup-occasions">
                            {visibleOccasions.map((occasion) => (
                              <div
                                key={occasion.name}
                                onClick={() => handleOccasionSelect(occasion.name)}
                                className="booking-popup-occasion"
                                style={{
                                  backgroundImage: `url(${occasion.icon})`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                  backgroundRepeat: 'no-repeat'
                                }}
                              >
                                {occasion.popular && <div className="booking-popup-badge">Popular</div>}
                                <div className="booking-popup-occasion-overlay">
                                  <h4>{occasion.name}</h4>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      }

                      return (
                        <div className="booking-popup-selected-occasion">
                          <div className="booking-popup-occasion-header">
                            <div className="booking-popup-occasion-selected">
                              <h4>{formData.occasion}</h4>
                            </div>
                            <button
                              onClick={() => {
                                setFormData(prev => ({ ...prev, occasion: '', occasionData: {} }));
                                setSelectedOccasionData(null);
                              }}
                              className="booking-popup-change-occasion-btn"
                            >
                              Change
                            </button>
                          </div>

                          <div className="booking-popup-occasion-details">
                            {selectedOccasionData && selectedOccasionData.requiredFields && selectedOccasionData.requiredFields.length > 0 ? (
                              selectedOccasionData.requiredFields.map((fieldKey: string) => {
                                const fieldLabel = selectedOccasionData.fieldLabels?.[fieldKey] || fieldKey;
                                const currentValue = formData.occasionData?.[fieldKey] || '';

                                // Special handling for gender fields
                                if (fieldKey.toLowerCase().includes('gender')) {
                                  return (
                                    <div key={fieldKey} className="booking-popup-field">
                                      <label>{fieldLabel}</label>
                                      <select
                                        value={currentValue}
                                        onChange={(e) => updateOccasionData(fieldKey, e.target.value)}
                                      >
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                      </select>
                                    </div>
                                  );
                                }

                                // Special handling for celebration details (textarea)
                                if (fieldKey.toLowerCase().includes('celebration') || fieldKey.toLowerCase().includes('details')) {
                                  return (
                                    <div key={fieldKey} className="booking-popup-field">
                                      <label>{fieldLabel}</label>
                                      <textarea
                                        value={currentValue}
                                        onChange={(e) => updateOccasionData(fieldKey, e.target.value)}
                                        placeholder={`Enter ${fieldLabel.toLowerCase()}...`}
                                        rows={3}
                                      />
                                    </div>
                                  );
                                }

                                // Default text input for all other fields
                                return (
                                  <div key={fieldKey} className="booking-popup-field">
                                    <label>{fieldLabel}</label>
                                    <input
                                      type="text"
                                      value={currentValue}
                                      onChange={(e) => updateOccasionData(fieldKey, e.target.value)}
                                      placeholder={`Enter ${fieldLabel.toLowerCase()}`}
                                    />
                                  </div>
                                );
                              })
                            ) : (
                              <div className="booking-popup-no-fields">
                                <p>No additional details required for this occasion.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Booking Summary on Occasion Tab */}
                    {renderBookingSummary()}
                  </div>
                )}

                {/* Dynamic Service Tabs */}
                {allServices.map((service) => {
                  if (activeTab === service.name && selectedServices[service.name] === 'Yes') {

                    return (
                      <div key={service.serviceId || service.name} className="booking-popup-section">
                        <h3 className="booking-popup-section-title">
                          <Sparkles className="w-5 h-5" />
                          {service.name}
                        </h3>
                        <div className="booking-popup-items">
                          {Array.isArray(service.items) && service.items.length > 0 ? (
                            // Sort items so that those with showTag true appear first
                            [...service.items]
                              .sort((a: any, b: any) => {
                                const aTag = a.showTag ? 1 : 0;
                                const bTag = b.showTag ? 1 : 0;
                                return bTag - aTag;
                              })
                              .map((item: any) => {
                                const itemName = item.name || item.title || 'Item';
                                const itemPrice = Number(item.price ?? item.cost ?? 0);
                                const itemRating = Number(item.rating ?? 4.5);
                                const itemImage = item.image || item.imageUrl || item.emoji || '🎁';
                                const isSelected = isServiceItemSelected(service.name, itemName);

                                console.log(`  🎁 Item: ${itemName}, Price: ₹${itemPrice}, Image: ${itemImage}`);

                                return (
                                  <div
                                    key={item.id || item.itemId || itemName}
                                    onClick={() => handleServiceItemToggle(service.name, itemName)}
                                    className={`booking-popup-item ${isSelected ? 'selected' : ''}`}
                                  >
                                    {item.bestseller && <div className="booking-popup-badge">Bestseller</div>}
                                    {service.itemTagEnabled && service.itemTagName && item.showTag && (
                                      <div className="booking-popup-service-tag">{service.itemTagName}</div>
                                    )}
                                    <div className="booking-popup-item-image" style={{ width: '100%', height: 180, borderRadius: 12, overflow: 'hidden', background: '#0f0f10' }}>
                                      {renderItemImage(String(itemImage), itemName)}
                                    </div>
                                    <div className="booking-popup-item-content">
                                      <h4>{itemName}</h4>
                                      <div className="booking-popup-rating">
                                        <Star className="w-4 h-4" />
                                        <span>{itemRating}</span>
                                      </div>
                                      <div className="booking-popup-price">₹{itemPrice}</div>
                                    </div>
                                    {isSelected && <Check className="w-5 h-5" />}
                                  </div>
                                );
                              })
                          ) : (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                              <p>No items available for this service</p>
                            </div>
                          )}
                        </div>

                        {/* Booking Summary on Service Tab */}
                        {renderBookingSummary()}
                      </div>
                    );
                  }
                  return null;
                })}

                {activeTab === 'Terms & Conditions' && (
                  <div className="booking-popup-section">
                    <div className="booking-popup-terms-container">
                      <div className="booking-popup-terms-section" style={{ marginBottom: 24 }}>
                        <h4 className="booking-popup-terms-title">Coupon Code</h4>
                        <div className="booking-popup-terms-content">
                          {!appliedCouponCode && (
                            <>
                              <div className="booking-popup-coupon-row">
                                <input
                                  type="text"
                                  value={couponCode}
                                  onChange={(e) => setCouponCode(e.target.value)}
                                  placeholder="Enter coupon code"
                                  className="booking-popup-input"
                                  style={{ flex: 1 }}
                                  disabled={!isCouponEligible}
                                />
                              </div>

                              <div
                                ref={availableCouponsRef}
                                style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}
                              >
                                <button
                                  type="button"
                                  onClick={() => void applyCoupon()}
                                  disabled={!isCouponEligible || couponApplying || !couponCode.trim()}
                                  className="booking-popup-btn"
                                  style={{ padding: '10px 16px' }}
                                >
                                  {couponApplying ? 'Applying...' : 'Apply'}
                                </button>

                                <button
                                  type="button"
                                  className="booking-popup-btn"
                                  style={{
                                    padding: '10px 16px',
                                    opacity: isCouponEligible ? 1 : 0.6,
                                    cursor: isCouponEligible ? 'pointer' : 'not-allowed',
                                  }}
                                  disabled={!isCouponEligible}
                                  onClick={() => setShowAvailableCoupons((v) => !v)}
                                >
                                  Show Available Coupon
                                </button>

                                {showAvailableCoupons && (
                                  <div
                                    style={{
                                      marginTop: 10,
                                      width: '100%',
                                      border: '1px solid rgba(255, 255, 255, 0.12)',
                                      background: 'rgba(0, 0, 0, 0.35)',
                                      borderRadius: 12,
                                      padding: 10,
                                      maxHeight: 220,
                                      overflow: 'auto',
                                    }}
                                  >
                                    {couponsLoading && (
                                      <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>
                                        Loading coupons...
                                      </div>
                                    )}

                                    {!couponsLoading && couponsError && (
                                      <div style={{ color: '#ff6b6b', fontSize: 14 }}>{couponsError}</div>
                                    )}

                                    {!couponsLoading && !couponsError && availableCoupons.length === 0 && (
                                      <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>
                                        No active coupons available.
                                      </div>
                                    )}

                                    {!couponsLoading && !couponsError && availableCoupons.length > 0 && (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {availableCoupons.map((coupon) => (
                                          <div
                                            key={coupon.couponCode}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'space-between',
                                              gap: 10,
                                              padding: '10px 12px',
                                              borderRadius: 10,
                                              border: '1px solid rgba(255, 255, 255, 0.14)',
                                              background: 'rgba(255, 255, 255, 0.06)',
                                              color: '#fff',
                                            }}
                                          >
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                              <span style={{ fontWeight: 700, letterSpacing: '0.08em' }}>
                                                {coupon.couponCode}
                                              </span>
                                              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                                                {describeCouponDiscount(coupon)}
                                              </span>
                                            </div>

                                            <button
                                              type="button"
                                              className="booking-popup-btn"
                                              style={{ padding: '6px 10px' }}
                                              onClick={() => {
                                                const code = String(coupon.couponCode || '').trim().toUpperCase();
                                                setCouponCode(code);
                                                setShowAvailableCoupons(false);
                                                void applyCoupon(code);
                                              }}
                                            >
                                              Apply
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </>
                          )}

                          {appliedCouponCode && appliedDiscount > 0 && (
                            <div style={{ marginTop: 10 }}>
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  padding: '6px 12px',
                                  borderRadius: 999,
                                  border: '1px solid rgba(16, 185, 129, 0.35)',
                                  background: 'rgba(16, 185, 129, 0.12)',
                                  color: '#10B981',
                                  fontWeight: 600,
                                }}
                              >
                                <span>
                                  Coupon Discount -₹{appliedDiscount.toFixed(2)}{appliedCouponCode ? ` (${appliedCouponCode})` : ''}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeCoupon();
                                    setCouponCode('');
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 2,
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#10B981',
                                    cursor: 'pointer',
                                    lineHeight: 0,
                                  }}
                                  aria-label="Clear coupon"
                                  title="Clear coupon"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          )}

                          {!isCouponEligible && (
                            <div className="booking-popup-error" style={{ marginTop: 8 }}>
                              Enable decoration or gifts to unlock coupons.
                            </div>
                          )}
                          {couponError && (
                            <div className="booking-popup-error" style={{ marginTop: 8 }}>{couponError}</div>
                          )}

                          {/* Price breakdown below coupon input */}
                          <div className="booking-popup-price-breakdown" style={{ marginTop: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Original Total</span>
                              <span>₹{calculateTotal().toFixed(2)}</span>
                            </div>
                            {appliedCouponCode && appliedDiscount > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10B981' }}>
                                <span>
                                  Coupon{' '}
                                  {appliedDiscountType === 'percentage' && appliedDiscountValue !== null
                                    ? `${appliedDiscountValue}%`
                                    : appliedDiscountType === 'fixed' && appliedDiscountValue !== null
                                      ? `₹${appliedDiscountValue}`
                                      : 'Applied'}
                                </span>
                                <span>-₹{appliedDiscount.toFixed(2)}</span>
                              </div>
                            )}
                            {isManualMode && discountValue > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10B981' }}>
                                <span>Discount</span>
                                <span>-₹{discountValue.toFixed(2)}</span>
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                              <span>Final Total</span>
                              <span>₹{getFinalTotal().toFixed(2)}</span>
                            </div>
                          </div>

                          {isManualMode && (
                            <div style={{ marginTop: 14 }}>
                              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Discount</label>
                              <div className="booking-popup-coupon-row">
                                <input
                                  type="number"
                                  min={0}
                                  value={discountInput}
                                  onChange={(e) => setDiscountInput(e.target.value)}
                                  placeholder="Enter discount amount"
                                  className="booking-popup-input"
                                  style={{ flex: 1 }}
                                />
                              </div>
                            </div>
                          )}
                          {/* Removed visible coupon list per request */}
                        </div>
                      </div>
                    </div>

                    <h3 className="booking-popup-section-title">
                      <Check className="w-5 h-5" />
                      Terms & Conditions
                    </h3>

                    <div className="booking-popup-terms-container">

                      <div className="booking-popup-terms-section">
                        <h4 className="booking-popup-terms-title">Terms & Conditions</h4>
                        <div className="booking-popup-terms-content">
                          <ul className="booking-popup-terms-list">
                            <li>No movie/OTT accounts provided; setups use user&apos;s accounts/downloaded content.</li>
                            <li>Smoking/Drinking is NOT allowed.</li>
                            <li>Damage to the theater (including decorative materials like balloons, lights) must be reimbursed.</li>
                            <li>Guests must maintain cleanliness.</li>
                            <li>Party poppers, snow sprays, cold fire, and similar items are strictly prohibited.</li>
                            <li>Carrying an AADHAAR CARD is mandatory for entry scanning.</li>
                            <li>Couples under 18 years are not allowed to book.</li>
                            <li>Pets are strictly not allowed.</li>
                            <li>An advance amount of RS. {getPayableAmount()} plus a convenience fee is collected to book the slot.</li>
                          </ul>
                        </div>
                      </div>

                      <div className="booking-popup-terms-section">
                        <h4 className="booking-popup-terms-title">Refund Policy</h4>
                        <div className="booking-popup-terms-content">
                          <p>Advance amount is fully refundable if slot is cancelled at least 72 hrs before the slot time. If your slot is less than 72 hrs away from time of payment then advance is non-refundable.</p>
                        </div>
                      </div>

                      <div className="booking-popup-agreement">
                        <label className="booking-popup-checkbox-label">
                          <input
                            type="checkbox"
                            checked={formData.agreeToTerms}
                            onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
                            className="booking-popup-checkbox"
                          />
                          <span
                            className="booking-popup-checkbox-text"
                            onClick={() => {
                              // Smooth scroll to the Confirm Booking buttons section
                              setTimeout(() => {
                                const actionSection = document.querySelector('.booking-popup-action');
                                if (actionSection) {
                                  actionSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                              }, 50);
                            }}
                          >
                            Click here to Agree to the above terms & conditions.
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Booking Summary on Terms & Conditions Tab */}
                    {renderBookingSummary()}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="booking-popup-action">
                {/* Show skip button for service tabs when no items selected */}
                {(() => {
                  const isServiceTab = allServices.some(s => s.name === activeTab);
                  const hasNoItemsSelected = isServiceTab && (!selectedServiceItems[activeTab] || selectedServiceItems[activeTab].length === 0);

                  // Check if decoration is compulsory for this theater
                  const realTheater = realTheaterData.find(
                    (theater) =>
                      (selectedTheater?.name && theater.name === selectedTheater.name) ||
                      (selectedTheater?.id && theater.theaterId === selectedTheater.id)
                  );
                  const isDecorationCompulsory = realTheater?.decorationCompulsory === true;

                  // Show skip button only if: service tab, no items selected, not last tab
                  if (hasNoItemsSelected && activeTab !== tabs[tabs.length - 1]) {
                    return (
                      <div className="booking-popup-buttons">
                        <button onClick={handleSkip} className="booking-popup-btn skip">
                          <span>Skip</span>
                        </button>
                        <button onClick={handleNextStep} className="booking-popup-btn">
                          <span>Continue</span>
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <button
                      onClick={() => {
                        if (activeTab === tabs[tabs.length - 1]) {
                          // Final step: validate full form
                          if (!validateForm()) {
                            return;
                          }

                          // Edit mode: Direct update without payment
                          // New booking: Payment flow
                          if (isEditingBooking) {
                            handleConfirmWithoutPayment(); // Direct update for editing
                          } else if (isManualMode) {
                            setShowManualPaymentChoice(true);
                          } else {
                            handlePaymentDone(); // Payment flow for new booking
                          }
                        } else {
                          handleNextStep();
                        }
                      }}
                      className="booking-popup-btn"
                      disabled={activeTab === tabs[tabs.length - 1] && (isProcessingPayment || isSubmittingBooking)}
                    >
                      <span>
                        {activeTab === tabs[tabs.length - 1]
                          ? (isProcessingPayment || isSubmittingBooking)
                            ? isEditingBooking
                              ? 'Updating Booking...'
                              : 'Processing Payment...'
                            : isEditingBooking
                              ? 'Update Booking'
                              : 'Confirm Booking'
                          : 'Continue'}
                      </span>
                      {activeTab === tabs[tabs.length - 1] && (isProcessingPayment || isSubmittingBooking) ? (
                        <Clock className="w-5 h-5 animate-spin" />
                      ) : (
                        <ArrowRight className="w-5 h-5" />
                      )}
                    </button>
                  );
                })()}
              </div>
            </div>

          </div>
        </div>

        {/* Decoration = No confirmation popup (styled like validation popup) */}
        {showDecorationNoConfirm && (
          <div className="booking-popup-validation">
            <div className="booking-popup-validation-content">


              <h3 className="booking-popup-validation-title">
                Skip decoration for this show?
              </h3>

              <p className="booking-popup-validation-message">
                With <strong>Decoration = Yes</strong>, you can enjoy full occasion-wise celebration – beautiful decor,
                surprise moments, curated gifts and many special add-ons. Keeping it on <strong>No</strong> means a
                simple, cozy private theatre experience without extra decoration.
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    setHasConfirmedDecorationNo(true);
                    setShowDecorationNoConfirm(false);
                    void handleNextStep();
                  }}
                  className="booking-popup-validation-btn"
                  style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.4)' }}
                >
                  Ignore &amp; Continue
                </button>
                <button
                  onClick={() => {
                    const updatedServices: { [key: string]: 'Yes' | 'No' } = { '__decoration__': 'Yes' };
                    allServices.forEach(service => {
                      if (service.includeInDecoration) {
                        updatedServices[service.name] = 'Yes';
                      } else {
                        updatedServices[service.name] = selectedServices[service.name] || 'No';
                      }
                    });
                    setSelectedServices(updatedServices);

                    setHasConfirmedDecorationNo(true);
                    setShowDecorationNoConfirm(false);
                    setActiveTab('Overview');
                  }}
                  className="booking-popup-validation-btn"
                >
                  Change No to Yes
                </button>
              </div>
            </div>
          </div>
        )}

      {isManualMode && showPartialPaymentChoice && (
        <div
          className="booking-popup-payment-choice"
          role="dialog"
          aria-modal="true"
          onClick={() => !isProcessingPayment && setShowPartialPaymentChoice(false)}
        >
          <div
            className="booking-popup-payment-choice-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="booking-popup-payment-choice-close"
              onClick={() => setShowPartialPaymentChoice(false)}
              disabled={isProcessingPayment}
              aria-label="Close partial payment"
            >
              <X size={20} />
            </button>
            <div className="booking-popup-payment-choice-icon">
              <span role="img" aria-hidden="true">🟡</span>
            </div>
            <h3 className="booking-popup-payment-choice-title">Partial payment</h3>
            <p className="booking-popup-payment-choice-subtitle">
              Review the booking total and record the amount received now.
            </p>

            <div className="partial-breakdown">
              <div className="partial-breakdown-row">
                <span>Total Amount</span>
                <span>₹{Number(getFinalTotal() || 0).toLocaleString()}</span>
              </div>
              <div className="partial-breakdown-row">
                <span>Slot Booking Fee</span>
                <span>
                  <input
                    className="partial-payment-input"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={partialSlotBookingFee}
                    onChange={(e) => {
                      setIsPartialSlotFeeManualOverride(true);
                      setPartialSlotBookingFee(e.target.value);
                    }}
                    disabled={isProcessingPayment || isSubmittingBooking}
                    style={{ maxWidth: 160, textAlign: 'right' }}
                  />
                </span>
              </div>
              <div className="partial-breakdown-row">
                <span>Venue Payment</span>
                <span>
                  ₹{Number(
                    (getFinalTotal() || 0) -
                      (Number(String(partialSlotBookingFee || '').replace(/[^0-9.]/g, '')) || (getPayableAmount() || 0)) ||
                      0,
                  ).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="partial-payment-form">
              <div className="partial-payment-row">
                <label className="partial-payment-label">Amount Received</label>
                <input
                  className="partial-payment-input"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={partialPaymentAmount}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPartialPaymentAmount(v);
                    if (!isPartialSlotFeeManualOverride) {
                      setPartialSlotBookingFee(v);
                    }
                  }}
                  placeholder="Enter amount"
                  disabled={isProcessingPayment || isSubmittingBooking}
                />
              </div>

              <div className="partial-payment-row">
                <label className="partial-payment-label">Method</label>
                <div className="partial-payment-methods">
                  <button
                    type="button"
                    className={`partial-method-btn ${partialPaymentMethod === 'cash' ? 'active' : ''}`}
                    onClick={() => setPartialPaymentMethod('cash')}
                    disabled={isProcessingPayment || isSubmittingBooking}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    className={`partial-method-btn ${partialPaymentMethod === 'upi' ? 'active' : ''}`}
                    onClick={() => setPartialPaymentMethod('upi')}
                    disabled={isProcessingPayment || isSubmittingBooking}
                  >
                    UPI
                  </button>
                </div>
              </div>

              <div className="partial-payment-actions">
                <button
                  type="button"
                  className="partial-payment-cancel"
                  onClick={() => setShowPartialPaymentChoice(false)}
                  disabled={isProcessingPayment || isSubmittingBooking}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="partial-payment-confirm"
                  onClick={() => void handleConfirmPartialPayment()}
                  disabled={isProcessingPayment || isSubmittingBooking}
                >
                  Confirm Partial Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Success Animation */}
        {isBookingSuccessful && bookingResult && (
          <div className="booking-popup-success">
            <div className="booking-popup-success-content">
              <div className="booking-popup-success-animation">
                <div className="booking-popup-success-checkmark">
                  <div className="booking-popup-success-checkmark-circle">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="64"
                      height="64"
                      viewBox="0 0 16 16"
                      className="booking-popup-success-checkmark-svg"
                    >
                      <polyline
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        points="2.75 8.75 6.25 12.25 13.25 4.75"
                        className="booking-popup-success-checkmark-path"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <h2 className="booking-popup-success-title">
                {(bookingResult as { wasEditing?: boolean })?.wasEditing ? 'Booking Updated!' : 'Booking Successful!'}
              </h2>

              <div className="booking-popup-success-message">
                <p>{(bookingResult as { wasEditing?: boolean })?.wasEditing ? 'Your booking has been updated and saved to our system.' : 'Your booking has been confirmed and saved to our system.'}</p>
                <div className="booking-popup-success-email">
                  <p>📧 Check your email for booking confirmation and details.</p>
                </div>
              </div>

              <div className="booking-popup-success-actions">
                <button
                  onClick={() => {
                    if (autoCloseTimerRef.current) {
                      clearTimeout(autoCloseTimerRef.current);
                      autoCloseTimerRef.current = null;
                    }
                    // Reset form and states before opening new booking
                    setIsBookingSuccessful(false);
                    setBookingResult(null);
                    resetForm();
                    onClose();
                    // Open new booking popup immediately
                    openBookingPopup();
                  }}
                  className="booking-popup-success-btn primary"
                >
                  {(bookingResult as { wasEditing?: boolean })?.wasEditing ? 'Edit Another Booking' : 'New Booking'}
                </button>
                <button
                  onClick={() => {
                    if (autoCloseTimerRef.current) {
                      clearTimeout(autoCloseTimerRef.current);
                      autoCloseTimerRef.current = null;
                    }
                    // Check editing state BEFORE resetting (resetForm will set isEditingBooking to false)
                    const wasEditingBooking = isEditingBooking;

                    // Reset all booking states and close popup completely
                    setIsBookingSuccessful(false);
                    setBookingResult(null);
                    resetForm();

                    // Close booking popup completely
                    onClose();

                    // Navigate to theater page (only if not editing from admin)
                    if (!wasEditingBooking) {
                      router.push('/theater');
                    }
                  }}
                  className="booking-popup-success-btn secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Validation Popup */}
        {showValidationPopup && (
          <div className="booking-popup-validation">
            <div className="booking-popup-validation-content">
              <div className="booking-popup-validation-icon">
                <X className="w-12 h-12" />
              </div>

              <h3 className="booking-popup-validation-title">
                {validationErrorName || 'Incomplete Form'}
              </h3>

              <p className="booking-popup-validation-message">
                {validationMessage}
              </p>

              <button
                onClick={() => { setShowValidationPopup(false); setValidationMessage(''); setValidationErrorName(''); }}
                className="booking-popup-validation-btn"
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* Edit Booking Options Popup */}
        {showEditRequestPopup && (
          <div className="booking-popup-edit-request">
            <div className="booking-popup-edit-request-content">
              <div className="booking-popup-edit-request-header">
                <h3 className="booking-popup-edit-request-title">
                  Edit Booking Options
                </h3>
                <button
                  onClick={() => setShowEditRequestPopup(false)}
                  className="booking-popup-edit-request-close"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="booking-popup-edit-request-message">
                <p>Contact the customer to edit this booking:</p>
              </div>

              {/* Animated tip above Call button */}
              <div className="booking-popup-edit-request-tip">
                <button
                  className="booking-popup-edit-request-tip-btn"
                  onClick={() => {
                    const raw = (formData.whatsappNumber || '').trim();
                    const digits = raw.replace(/[^\d]/g, '');
                    let phone = digits;
                    if (phone.startsWith('0')) phone = phone.slice(1);
                    if (phone.length === 10) phone = `91${phone}`; // default to India code
                    if (!phone) return;
                    window.location.href = `tel:+${phone}`;
                  }}
                  disabled={!formData.whatsappNumber}
                >
                  Instant edit: Use Call option
                </button>
              </div>

              <div className="booking-popup-edit-request-options">
                <button
                  onClick={() => {
                    const raw = (formData.whatsappNumber || '').trim();
                    const digits = raw.replace(/[^\d]/g, '');
                    let phone = digits;
                    if (phone.startsWith('0')) phone = phone.slice(1);
                    if (phone.length === 10) phone = `91${phone}`; // default to India code
                    if (!phone) return;
                    window.location.href = `tel:+${phone}`;
                  }}
                  disabled={!formData.whatsappNumber}
                  className="booking-popup-edit-request-btn call"
                >
                  <span className="phone-icon">
                    <Phone className="w-6 h-6" />
                  </span>
                  <div className="booking-popup-edit-request-btn-content">
                    <span className="booking-popup-edit-request-btn-title">Call</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    const raw = (formData.whatsappNumber || '').trim();
                    const digits = raw.replace(/[^\d]/g, '');
                    let phone = digits;
                    if (phone.startsWith('0')) phone = phone.slice(1);
                    if (phone.length === 10) phone = `91${phone}`; // default to India code
                    if (!phone) return;
                    const details = [
                      `Booking ID: ${bookingResult?.bookingId || 'N/A'}`,
                      `Theater: ${selectedTheater?.name || 'N/A'}`,
                      `Date: ${selectedDate || 'N/A'}`,
                      `Time: ${selectedTimeSlot || 'N/A'}`
                    ].join('\n');
                    const name = formData.bookingName ? `Hi ${formData.bookingName},` : 'Hi,';
                    const message = `${name}\nWe'd like to edit your booking.\n${details}\nPlease reply to confirm.`;
                    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, '_blank');
                  }}
                  disabled={!formData.whatsappNumber}
                  className="booking-popup-edit-request-btn whatsapp"
                >
                  <span className="whatsapp-icon">
                    <MessageCircle className="w-6 h-6" />
                  </span>
                  <div className="booking-popup-edit-request-btn-content">
                    <span className="booking-popup-edit-request-btn-title">WhatsApp</span>
                    <span className="booking-popup-edit-request-btn-subtitle">Click to Send Prefilled Message</span>
                  </div>
                </button>

                {/* Send Edit Request to DB with full booking details */}
                <button
                  onClick={async () => {
                    if (hasSentEditRequest || isSendingEditRequest) return;
                    setIsSendingEditRequest(true);
                    try {
                      const payload = {
                        bookingId: bookingResult?.bookingId || null,
                        // Customer & contact
                        customerName: formData.bookingName || null,
                        customerPhone: formData.whatsappNumber || null,
                        email: formData.emailAddress || null,
                        numberOfPeople: formData.numberOfPeople || null,
                        // Venue & schedule
                        theaterName: selectedTheater?.name || null,
                        theaterId: (selectedTheater as any)?._id || (selectedTheater as any)?.id || null,
                        date: selectedDate || null,
                        time: selectedTimeSlot || null,
                        // Occasion & selections
                        occasion: formData.occasion || null,
                        selectedCakes: formData.selectedCakes || [],
                        selectedDecorItems: formData.selectedDecorItems || [],
                        selectedGifts: formData.selectedGifts || [],
                        selectedMovies: formData.selectedMovies || [],
                        wantCakes: formData.wantCakes || 'No',
                        wantDecorItems: formData.wantDecorItems || 'No',
                        wantGifts: formData.wantGifts || 'No',
                        status: 'confirmed',
                        source: 'BookingPopup'
                      };

                      const res = await fetch('/api/edit-booking-request', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                      });
                      const data = await res.json();
                      if (data.success) {
                        showSuccess && showSuccess('Edit booking request saved');
                        setHasSentEditRequest(true);
                        setShowEditRequestPopup(false);
                      } else {
                        showError && showError(data.error || 'Failed to save edit request');
                      }
                    } catch (error) {
                      showError && showError('Failed to save edit request');
                    } finally {
                      setIsSendingEditRequest(false);
                    }
                  }}
                  disabled={isSendingEditRequest || hasSentEditRequest}
                  className="booking-popup-edit-request-btn request"
                >
                  <span className="request-icon">
                    <MessageCircle className="w-6 h-6" />
                  </span>
                  <div className="booking-popup-edit-request-btn-content">
                    <span className="booking-popup-edit-request-btn-title">{hasSentEditRequest ? 'Request Sent' : 'Send Edit Request'}</span>
                    <span className="booking-popup-edit-request-btn-subtitle">{hasSentEditRequest ? 'We will contact you soon' : 'responds in 2 to 3 hrs'}</span>
                  </div>
                </button>
              </div>

              <div className="booking-popup-edit-request-info">
                <p className="text-sm text-gray-400">
                  Use these options to coordinate changes directly with the customer.
                </p>
              </div>
            </div>
          </div>
        )}



        {/* Date Selection Popup */}
        <GlobalDatePicker
          isOpen={isDatePickerOpen}
          onClose={closeDatePicker}
          onDateSelect={(date) => {
            setSelectedDate(date);
            closeDatePicker();
            // Refresh booked slots when date changes
            fetchBookedSlots();
          }}
          selectedDate={selectedDate || new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        />


        {/* Styles */}
        <style jsx global>{`
          body.popup-open {
            overflow: hidden !important;
            position: fixed !important;
            width: 100% !important;
            height: 100% !important;
          }
        
          .booking-popup-overlay {
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
            padding: 1.5rem !important;
            margin: 0 !important;
            overflow: hidden !important;
            overscroll-behavior: contain !important;
          }

          .booking-popup {
            width: 100% !important;
            max-width: 1200px !important;
            max-height: calc(100vh - 3rem) !important;
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
            margin: 0 !important;
          }

          .booking-popup-loaded {
            opacity: 1 !important;
            transform: scale(1) !important;
          }

          .booking-popup-header {
            background: rgba(255, 255, 255, 0.05);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding: 1rem 1.5rem;
            position: sticky;
            top: 0;
            z-index: 10;
          }

          .booking-popup-nav {
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .booking-popup-back-btn {
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

          .booking-popup-back-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #FF0005;
          }

          .booking-popup-brand {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .booking-popup-logo {
            width: 2.5rem;
            height: 2.5rem;
            background: linear-gradient(135deg, #FF0005, #CC0000);
            border-radius: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
          }

          .booking-popup-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: #ffffff;
            margin: 0;
          }

          /* Edit Booking tip animation */
          .booking-popup-edit-request-tip {
            display: flex;
            justify-content: center;
            margin: 0.5rem 0 1rem;
          }

          .booking-popup-edit-request-tip-btn {
            padding: 0.4rem 0.8rem;
            border-radius: 999px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            background: linear-gradient(90deg, rgba(255, 0, 5, 0.2), rgba(255, 255, 255, 0.08));
            color: #ffffff;
            font-size: 0.9rem;
            cursor: pointer;
            animation: bookingPulse 1.8s ease-in-out infinite;
          }

          .booking-popup-edit-request-tip-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          @keyframes bookingPulse {
            0% { box-shadow: 0 0 0 0 rgba(255, 0, 5, 0.6); }
            70% { box-shadow: 0 0 0 12px rgba(255, 0, 5, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 0, 5, 0); }
          }

          /* Request button subtle style (keeps consistent look) */
          .booking-popup-edit-request-btn.request {
            border-color: rgba(255, 255, 255, 0.25);
            background: rgba(255, 255, 255, 0.08);
            position: relative;
            overflow: hidden;
            animation: requestPulseBlue 1.8s ease-in-out infinite;
            will-change: box-shadow;
          }

          .booking-popup-edit-request-btn.request:hover {
            box-shadow: 0 8px 20px rgba(0, 122, 255, 0.28);
            transform: translateY(-2px);
          }

          .booking-popup-edit-request-btn.request:disabled {
            animation: none;
          }

          /* Sending shimmer overlay */
          .booking-popup-edit-request-btn.request::before {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent);
            background-size: 200% 100%;
            animation: shimmerMove 2.2s linear infinite;
            pointer-events: none;
          }

          .booking-popup-edit-request-btn.request:disabled::before {
            display: none;
          }

          /* Request icon sending motion + signal ring */
          .booking-popup-edit-request-btn.request .request-icon {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transform-origin: 50% 50%;
            animation: sendFly 1.6s ease-in-out infinite;
          }

          .booking-popup-edit-request-btn.request .request-icon::after {
            content: '';
            position: absolute;
            left: -2px;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 8px;
            height: 8px;
            border-radius: 50%;
            border: 2px solid #007aff; /* iOS blue */
            opacity: 0.7;
            animation: pulseRingBlue 1.6s ease-out infinite;
          }

          .booking-popup-edit-request-btn.request:disabled .request-icon,
          .booking-popup-edit-request-btn.request:disabled .request-icon::after {
            animation: none;
          }

          /* Keyframes for request sending effect */
          @keyframes requestPulseBlue {
            0% { box-shadow: 0 0 0 0 rgba(0, 122, 255, 0.55); }
            70% { box-shadow: 0 0 0 12px rgba(0, 122, 255, 0); }
            100% { box-shadow: 0 0 0 0 rgba(0, 122, 255, 0); }
          }

          @keyframes shimmerMove {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }

          @keyframes sendFly {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(1px); }
            50% { transform: translateX(3px); }
            75% { transform: translateX(1px); }
          }

          @keyframes pulseRingBlue {
            0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.7; }
            60% { transform: translate(-50%, -50%) scale(1.4); opacity: 0.0; }
            100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.0; }
          }

          .booking-popup-title-section {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }

          .booking-popup-time-display {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(255, 255, 255, 0.1);
            padding: 0.25rem 0.5rem;
            border-radius: 0.375rem;
            border: 1px solid rgba(255, 255, 255, 0.2);
          }

          .booking-popup-time-label {
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.7);
            font-weight: 500;
          }

          .booking-popup-time-value {
            font-size: 0.75rem;
            color: #fff;
            font-weight: 600;
          }

          .booking-popup-close-btn {
            background: transparent;
            border: none;
            color: #ffffff;
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 50%;
            transition: all 0.3s ease;
          }

          .booking-popup-close-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #FF0005;
          }

          .booking-popup-hero {
            background: linear-gradient(135deg, #FF0005, #CC0000, #000000);
            padding: 1.5rem 2rem;
            text-align: center;
          }

          .booking-popup-theater-title {
            font-size: 1.5rem;
            font-weight: 900;
            color: #ffffff;
            margin: 0 0 1rem 0;
            line-height: 1.2;
          }

          .booking-popup-meta {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            flex-wrap: wrap;
          }

          .booking-popup-meta-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: rgba(0, 0, 0, 0.4);
            border-radius: 2rem;
            color: #ffffff;
          }

          .booking-popup-meta-item svg {
            width: 1rem;
            height: 1rem;
          }

          .booking-popup-time-selector-meta {
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            pointer-events: auto;
          }

          .booking-popup-time-selector-meta:hover {
            background: rgba(255, 0, 5, 0.3);
            border: 1px solid rgba(255, 0, 5, 0.5);
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(255, 0, 5, 0.2);
          }

          .booking-popup-time-arrow-small {
            color: rgba(255, 255, 255, 0.8);
            transition: all 0.3s ease;
            margin-left: 0.5rem;
          }

          .booking-popup-time-selector-meta:hover .booking-popup-time-arrow-small {
            color: #ffffff;
            transform: translateY(1px) scale(1.1);
          }

          .booking-popup-date-selector-meta {
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            pointer-events: auto;
          }

          .booking-popup-date-selector-meta:hover {
            background: rgba(255, 0, 5, 0.3);
            border: 1px solid rgba(255, 0, 5, 0.5);
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(255, 0, 5, 0.2);
          }

          .booking-popup-date-arrow-small {
            width: 0.75rem;
            height: 0.75rem;
            color: rgba(255, 255, 255, 0.8);
            transition: all 0.3s ease;
            margin-left: 0.5rem;
          }

          .booking-popup-date-selector-meta:hover .booking-popup-date-arrow-small {
            color: #ffffff;
            transform: translateY(1px) scale(1.1);
          }

          .booking-popup-content {
            padding: 1rem 1.5rem;
            max-height: 65vh;
            overflow-y: auto;
            overscroll-behavior: contain;
            -webkit-overflow-scrolling: touch;
          }

          .booking-popup-tabs {
            display: flex;
            gap: 0.25rem;
            margin-bottom: 1.5rem;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 0.75rem;
            padding: 0.25rem;
            overflow-x: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .booking-popup-tabs::-webkit-scrollbar {
            display: none;
          }

          .booking-popup-tab {
            flex: 1;
            min-width: 100px;
            padding: 0.5rem 0.75rem;
            background: transparent;
            border: none;
            border-radius: 0.5rem;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.25rem;
            white-space: nowrap;
          }

          .booking-popup-tab-number {
            width: 1.5rem;
            height: 1.5rem;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.75rem;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.7);
          }

          .booking-popup-tab-text {
            font-size: 0.7rem;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.7);
            text-align: center;
          }

          .booking-popup-tab-active {
            background: rgba(255, 0, 5, 0.15);
          }

          .booking-popup-tab-active .booking-popup-tab-number {
            background: #FF0005;
            color: #ffffff;
          }

          .booking-popup-tab-active .booking-popup-tab-text {
            color: #FF0005;
            font-weight: 600;
          }

          .booking-popup-layout {
            display: block;
          }

          .booking-popup-main {
            background: rgba(255, 255, 255, 0.02);
            border-radius: 1rem;
            border: 1px solid rgba(255, 255, 255, 0.1);
            overflow: hidden;
          }

          .booking-popup-tab-content {
            padding: 1rem 1.5rem;
          }

          .booking-popup-section-title {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 1.25rem;
            font-weight: 700;
            color: #ffffff;
            margin: 0 0 1rem 0;
          }

          .booking-popup-section-note {
            background: rgba(255, 0, 5, 0.1);
            border: 1px solid rgba(255, 0, 5, 0.3);
            border-radius: 0.5rem;
            padding: 0.75rem;
            margin-bottom: 1rem;
          }

          .booking-popup-section-note p {
            color: #ffffff;
            font-size: 0.875rem;
            margin: 0;
            line-height: 1.4;
          }



          .booking-popup-form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .booking-popup-field {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .booking-popup-field-row {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 1rem;
            margin-bottom: 1rem;
          }

          .booking-popup-field label {
            font-size: 0.875rem;
            font-weight: 600;
            color: #ffffff;
          }

          .booking-popup-field input {
            width: 100%;
            padding: 0.75rem 1rem;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 0.5rem;
            color: #ffffff;
            font-size: 0.875rem;
            transition: all 0.3s ease;
          }

          .booking-popup-field input:focus {
            outline: none;
            border-color: #FF0005;
            box-shadow: 0 0 0 3px rgba(255, 0, 5, 0.1);
          }

          .booking-popup-field input::placeholder {
            color: rgba(255, 255, 255, 0.5);
          }

          .booking-popup-number {
            display: flex;
            align-items: center;
            gap: 1rem;
            justify-content: center;
            padding: 1rem;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 1rem;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }

          .booking-popup-number button {
            width: 2.5rem;
            height: 2.5rem;
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.3);
            background: rgba(255, 255, 255, 0.05);
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .booking-popup-number button:hover {
            border-color: #FF0005;
            background: rgba(255, 0, 5, 0.2);
          }

          .booking-popup-number button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background-color: #374151;
            color: #9CA3AF;
            border-color: #4B5563;
          }

          .booking-popup-number button:disabled:hover {
            border-color: #4B5563;
            background-color: #374151;
          }

          .booking-popup-number span {
            font-size: 1.5rem;
            font-weight: 700;
            color: #FF0005;
            min-width: 2rem;
            text-align: center;
          }

          .booking-popup-capacity-warning {
            margin-top: 0.5rem;
            padding: 0.5rem;
            background-color: #FEF3C7;
            border: 1px solid #F59E0B;
            border-radius: 0.375rem;
            font-size: 0.875rem;
            color: #92400E;
            text-align: center;
          }

          .booking-popup-capacity-warning span {
            font-weight: 500;
            font-size: 0.875rem;
          }

          .booking-popup-decoration-items {
            margin-top: 1rem;
            padding: 1rem;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 1rem;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }

          .booking-popup-decoration-title {
            font-size: 1.125rem;
            font-weight: 600;
            color: #FF0005;
            margin-bottom: 1rem;
            text-align: center;
          }

          .booking-popup-decoration-category {
            margin-bottom: 1.5rem;
          }

          .booking-popup-decoration-category:last-child {
            margin-bottom: 0;
          }

          .booking-popup-decoration-category-title {
            font-size: 1rem;
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 0.75rem;
            text-align: center;
          }

          .booking-popup-decoration-items-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
          }

          .booking-popup-decoration-item {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 0.75rem;
            padding: 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: center;
          }

          .booking-popup-decoration-item:hover {
            border-color: #FF0005;
            background: rgba(255, 0, 5, 0.1);
            transform: translateY(-2px);
          }

          .booking-popup-decoration-item.selected {
            border-color: #FF0005;
            background: rgba(255, 0, 5, 0.2);
          }

          .booking-popup-decoration-item-image {
            font-size: 2rem;
            margin-bottom: 0.5rem;
          }

          .booking-popup-decoration-item-content h4 {
            font-size: 0.875rem;
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 0.5rem;
          }

          .booking-popup-decoration-item-price {
            font-size: 0.875rem;
            font-weight: 600;
            color: #FF0005;
          }

          @media (max-width: 480px) {
            .booking-popup-decoration-items-grid {
              grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
              gap: 0.75rem;
            }

            .booking-popup-decoration-item {
              padding: 0.75rem;
            }

            .booking-popup-decoration-item-image {
              font-size: 1.5rem;
            }

            .booking-popup-decoration-item-content h4 {
              font-size: 0.75rem;
            }

            .booking-popup-decoration-item-price {
              font-size: 0.75rem;
            }
          }

          .booking-popup-toggle {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
          }

          .booking-popup-toggle button {
            padding: 1rem;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(255, 255, 255, 0.2);
            border-radius: 0.75rem;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
            text-align: center;
            color: #ffffff;
          }

          .booking-popup-toggle button:hover {
            border-color: rgba(255, 255, 255, 0.4);
            background: rgba(255, 255, 255, 0.1);
          }

          .booking-popup-toggle button.active {
            border-color: #FF0005;
            background: rgba(255, 0, 5, 0.15);
            color: #FF0005;
          }

          .booking-popup-occasions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: repeat(3, 1fr);
            gap: 0.5rem;
          }

          .booking-popup-occasion {
            position: relative;
            padding: 0.75rem;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(255, 255, 255, 0.2);
            border-radius: 0.5rem;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: center;
            overflow: hidden;
            min-height: 120px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }

          .booking-popup-selected-occasion {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 0.75rem;
            padding: 1rem;
          }

          .booking-popup-occasion-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            padding-bottom: 0.75rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }

          .booking-popup-occasion-selected {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .booking-popup-occasion-selected h4 {
            margin: 0;
            font-size: 1.1rem;
            color: #FF0005;
            font-weight: 600;
          }

          .booking-popup-change-occasion-btn {
            background: rgba(255, 0, 5, 0.1);
            border: 1px solid #FF0005;
            color: #FF0005;
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .booking-popup-change-occasion-btn:hover {
            background: #FF0005;
            color: white;
          }

          .booking-popup-occasion-details {
            margin-top: 1rem;
          }

          .booking-popup-occasion:hover {
            border-color: rgba(255, 255, 255, 0.4);
            background: rgba(255, 255, 255, 0.1);
            transform: translateY(-2px);
          }

          .booking-popup-occasion.selected {
            border-color: #FF0005;
            background: rgba(255, 0, 5, 0.15);
          }

          .booking-popup-badge {
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            background: linear-gradient(135deg, #FF0005, #CC0000);
            color: #ffffff;
            font-size: 0.5rem;
            font-weight: 600;
            padding: 0.2rem 0.4rem;
            border-radius: 1rem;
            text-transform: uppercase;
            z-index: 3;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          }

          .booking-popup-service-tag {
            position: absolute;
            top: 0.5rem;
            left: 0.5rem;
            background: linear-gradient(135deg, #ff6b6b, #ee5a24);
            color: #ffffff;
            font-size: 0.5rem;
            font-weight: 600;
            padding: 0.2rem 0.4rem;
            border-radius: 1rem;
            text-transform: uppercase;
            z-index: 3;
            box-shadow: 0 2px 4px rgba(238, 90, 36, 0.3);
            animation: serviceTagPulse 2s infinite;
          }

          @keyframes serviceTagPulse {
            0%, 100% {
              transform: scale(1);
              box-shadow: 0 2px 4px rgba(238, 90, 36, 0.3);
            }
            50% {
              transform: scale(1.05);
              box-shadow: 0 4px 8px rgba(238, 90, 36, 0.5);
            }
          }

          .booking-popup-service-tag:hover {
            animation-play-state: paused;
            transform: scale(1.1);
          }

          .booking-popup-occasion-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 2;
            padding: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .booking-popup-occasion-overlay h4 {
            color: #ffffff;
            font-size: 0.9rem;
            font-weight: 600;
            margin: 0;
            background: rgba(0, 0, 0, 0.8);
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            text-align: center;
          }

          .booking-popup-occasion h4 {
            font-size: 1rem;
            font-weight: 600;
            color: #ffffff;
            margin: 0;
          }

          .booking-popup-items {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 0.75rem;
          }

          .booking-popup-item {
            position: relative;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(255, 255, 255, 0.2);
            border-radius: 0.75rem;
            cursor: pointer;
            transition: all 0.3s ease;
            overflow: hidden;
          }

          .booking-popup-item:hover {
            border-color: rgba(255, 255, 255, 0.4);
            background: rgba(255, 255, 255, 0.1);
            transform: translateY(-2px);
          }

          .booking-popup-item.selected {
            border-color: #FF0005;
            background: rgba(255, 0, 5, 0.15);
          }

          .booking-popup-category {
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            background: linear-gradient(135deg, #FF0005, #CC0000);
            color: #ffffff;
            font-size: 0.75rem;
            font-weight: 600;
            padding: 0.25rem 0.5rem;
            border-radius: 1rem;
            text-transform: uppercase;
            z-index: 2;
          }

          .booking-popup-item-image {
            padding: 1rem;
            text-align: center;
            font-size: 2.5rem;
            background: rgba(255, 255, 255, 0.02);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }

          .booking-popup-item-content {
            padding: 0.75rem;
          }

          .booking-popup-item-content h4 {
            font-size: 1rem;
            font-weight: 600;
            color: #ffffff;
            margin: 0 0 0.5rem 0;
          }

          .booking-popup-rating {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            margin-bottom: 0.5rem;
          }

          .booking-popup-rating svg {
            color: #ffd700;
            fill: #ffd700;
          }

          .booking-popup-rating span {
            font-size: 0.875rem;
            color: rgba(255, 255, 255, 0.7);
          }

          .booking-popup-price {
            font-size: 1.125rem;
            font-weight: 700;
            color: #FF0005;
          }

          .booking-popup-duration {
            font-size: 0.875rem;
            color: rgba(255, 255, 255, 0.6);
            margin-bottom: 0.5rem;
            font-weight: 500;
          }


          .booking-popup-action {
            padding: 1rem 1.5rem;
            background: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(10px);
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            justify-content: center;
            position: sticky;
            bottom: 0;
            z-index: 100;
            box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
          }

          .booking-popup-buttons {
            display: flex;
            gap: 1rem;
            width: 100%;
            max-width: 300px;
          }

          .booking-popup-btn.skip {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }

          .booking-popup-btn.skip:hover {
            background: rgba(255, 255, 255, 0.15);
            color: rgba(255, 255, 255, 0.9);
          }

          .booking-popup-select {
            width: 100%;
            padding: 0.75rem 1rem;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 0.5rem;
            color: #ffffff;
            font-size: 0.875rem;
            outline: none;
            transition: all 0.3s ease;
            cursor: pointer;
          }

          .booking-popup-select:focus {
            border-color: #FF0005;
            box-shadow: 0 0 0 3px rgba(255, 0, 5, 0.1);
          }

          .booking-popup-select option {
            background: #1a1a1a;
            color: white;
            padding: 0.5rem;
          }

          .booking-popup-select:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            background: rgba(255, 255, 255, 0.02);
            border-color: rgba(255, 255, 255, 0.1);
          }

          .booking-popup-field-note {
            margin-top: 0.5rem;
            padding: 0.5rem;
            background: rgba(255, 0, 5, 0.1);
            border: 1px solid rgba(255, 0, 5, 0.3);
            border-radius: 0.375rem;
            font-size: 0.75rem;
            color: #FF0005;
            text-align: center;
          }

          .booking-popup-field-note span {
            font-weight: 500;
          }


          .booking-popup-movie-selection {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }

          .booking-popup-movie-selection-info {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .booking-popup-movie-price-info {
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .booking-popup-movie-price-text {
            font-size: 0.75rem;
            color: #FF0005;
            font-weight: 600;
            background: rgba(255, 0, 5, 0.1);
            padding: 0.25rem 0.5rem;
            border-radius: 0.25rem;
            border: 1px solid rgba(255, 0, 5, 0.2);
          }

          .booking-popup-movie-change-text {
            font-size: 0.7rem;
            color: rgba(255, 255, 255, 0.7);
            font-weight: 400;
            margin-left: 0.5rem;
            font-style: italic;
          }

          .booking-popup-select-movies-btn {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: linear-gradient(135deg, #FF0005 0%, #ff3366 100%);
            color: #ffffff;
            border: none;
            padding: 0.75rem 1rem;
            border-radius: 0.5rem;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            justify-content: center;
          }

          .booking-popup-select-movies-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(255, 0, 5, 0.3);
          }

          .booking-popup-movie-count {
            background: rgba(255, 255, 255, 0.2);
            padding: 0.25rem 0.5rem;
            border-radius: 1rem;
            font-size: 0.8rem;
            font-weight: 700;
          }

          .booking-popup-btn {
            background: linear-gradient(135deg, #FF0005, #CC0000);
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
            box-shadow: 0 4px 15px rgba(255, 0, 5, 0.4);
            width: 100%;
            max-width: 300px;
            justify-content: center;
          }

          .booking-popup-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(255, 0, 5, 0.6);
          }

          .booking-popup-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            background: linear-gradient(135deg, #999999, #666666);
            box-shadow: none;
            pointer-events: none;
          }

          .booking-popup-btn:disabled:hover {
            transform: none;
            box-shadow: none;
          }

          .booking-popup-cart {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 1rem;
            height: fit-content;
            max-height: 60vh;
            overflow-y: auto;
          }

          .booking-popup-cart-header {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: sticky;
            top: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            z-index: 5;
          }

          .booking-popup-cart-header h3 {
            font-size: 1.125rem;
            font-weight: 700;
            color: #ffffff;
            margin: 0;
          }

          .booking-popup-cart-badge {
            background: linear-gradient(135deg, #FF0005, #CC0000);
            color: #ffffff;
            font-size: 0.75rem;
            font-weight: 600;
            padding: 0.25rem 0.5rem;
            border-radius: 1rem;
            text-transform: uppercase;
          }

          .booking-popup-cart-content {
            padding: 1rem;
          }

          .booking-popup-cart-section {
            margin-bottom: 1.5rem;
          }

          .booking-popup-cart-section h4 {
            font-size: 0.875rem;
            font-weight: 600;
            color: #FF0005;
            margin: 0 0 0.75rem 0;
            text-transform: uppercase;
          }

          .booking-popup-cart-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            font-size: 0.875rem;
          }

          .booking-popup-cart-item:last-child {
            border-bottom: none;
          }

          .booking-popup-cart-item span:first-child {
            color: rgba(255, 255, 255, 0.8);
          }

          .booking-popup-cart-item span:last-child {
            color: #ffffff;
            font-weight: 600;
          }

          .booking-popup-cart-divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            margin: 1.5rem 0;
          }

          .booking-popup-cart-totals {
            background: rgba(255, 255, 255, 0.03);
            border-radius: 0.75rem;
            padding: 1rem;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }

          .booking-popup-cart-total {
            padding: 0.75rem 0;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            margin: 0.5rem 0;
          }

          .booking-popup-cart-total span {
            font-size: 1rem;
            font-weight: 700;
            color: #ffffff;
          }

          .booking-popup-cart-advance span:last-child {
            color: #FF0005;
            font-weight: 700;
          }

          .booking-popup-cart-balance span:last-child {
            color: #ffd700;
            font-weight: 700;
          }

          /* Booking Overview Summary Styles */
          .booking-popup-overview-summary {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 0.75rem;
            padding: 1rem;
            margin-top: 1.5rem;
          }

          .booking-popup-overview-summary-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1rem;
          }

          .booking-popup-overview-summary-title {
            font-size: 1rem;
            font-weight: 700;
            color: #ffffff;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .booking-popup-overview-summary-badge {
            background: linear-gradient(135deg, #FF0005, #CC0000);
            color: #ffffff;
            font-size: 0.75rem;
            font-weight: 600;
            padding: 0.25rem 0.5rem;
            border-radius: 0.375rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .booking-popup-overview-summary-content {
            display: flex;
            flex-direction: column;
            gap: 0;
          }

          .booking-popup-overview-summary-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0;
            border-bottom: none;
            flex-wrap: nowrap;
            min-height: auto;
            line-height: 1;
            height: 1.2rem;
            max-height: 1.2rem;
          }

          .booking-popup-overview-summary-item:last-child {
            border-bottom: none;
            padding-top: 0;
            border-top: none;
            margin-top: 0;
          }

          .booking-popup-overview-summary-item span:first-child {
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.875rem;
            flex: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-right: 0.5rem;
            line-height: 1;
            height: 1.2rem;
            max-height: 1.2rem;
            display: flex;
            align-items: center;
          }

          .booking-popup-overview-summary-item span:last-child {
            color: #ffffff;
            font-weight: 600;
            font-size: 0.875rem;
            flex-shrink: 0;
            white-space: nowrap;
            line-height: 1;
            height: 1.2rem;
            max-height: 1.2rem;
            display: flex;
            align-items: center;
          }

          .booking-popup-overview-summary-item:last-child span:last-child {
            color: #FF0005;
            font-weight: 700;
            font-size: 1rem;
          }

          /* Booking Overview Summary Section Styles */
          .booking-popup-overview-summary-section {
            margin-bottom: 0;
          }

          .booking-popup-overview-summary-section-title {
            font-size: 0.875rem;
            font-weight: 600;
            color: #FF0005;
            margin: 0 0 0.25rem 0;
            text-transform: uppercase;
          }

          .booking-popup-overview-summary-divider {
            height: 0;
            background: transparent;
            margin: 0;
          }

          .booking-popup-overview-summary-totals {
            background: rgba(255, 255, 255, 0.03);
            border-radius: 0.75rem;
            padding: 1rem;
            border: 1px solid rgba(255, 255, 255, 0.1);
            margin-top: 1rem;
            margin-bottom: 1rem;
          }

          .booking-popup-overview-summary-upper {
            margin-bottom: 0.5rem;
          }

          .booking-popup-overview-summary-lower {
            margin-top: 0.5rem;
          }

          .booking-popup-overview-summary-divider-line {
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
            margin: 0.5rem 0;
          }

        

          .booking-popup-overview-summary-total span {
            font-size: 1rem;
            font-weight: 700;
            color: #ffffff;
          }

          .booking-popup-overview-summary-advance span:last-child {
            color: #FF0005;
            font-weight: 700;
          }

          .booking-popup-overview-summary-balance span:last-child {
            color: #ffd700;
            font-weight: 700;
          }


          /* Terms & Conditions Styles */
          .booking-popup-terms-container {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 1rem;
            padding: 1.5rem;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }

          /* Coupon input row */
          .booking-popup-coupon-row {
            display: flex;
            gap: 0.5rem;
            align-items: center;
            flex-wrap: wrap;
          }

          /* Coupon text input */
          .booking-popup-input {
            width: 100%;
            padding: 0.75rem 1rem;
            border-radius: 0.75rem;
            border: 1px solid rgba(255, 255, 255, 0.15);
            background: rgba(255, 255, 255, 0.06);
            color: #ffffff;
            outline: none;
            transition: all 0.2s ease;
            font-size: 0.95rem;
          }

          .booking-popup-input::placeholder {
            color: rgba(255, 255, 255, 0.6);
          }

          .booking-popup-input:focus {
            border-color: #FF0005;
            box-shadow: 0 0 0 3px rgba(255, 0, 5, 0.2);
            background: rgba(255, 255, 255, 0.08);
          }

          /* Outline button variant for coupon remove */
          .booking-popup-btn.outline {
            background: transparent;
            color: #FF0005;
            border: 1px solid #FF0005;
            box-shadow: none;
            max-width: none;
            width: auto;
          }

          .booking-popup-btn.outline:hover {
            background: rgba(255, 0, 5, 0.1);
          }

          /* Make coupon row buttons fit content */
          .booking-popup-coupon-row .booking-popup-btn {
            width: auto;
            max-width: none;
          }

          /* Feedback messages */
          .booking-popup-error {
            color: #ff6b6b;
            background: rgba(255, 107, 107, 0.12);
            border: 1px solid rgba(255, 107, 107, 0.3);
            padding: 0.5rem 0.75rem;
            border-radius: 0.5rem;
          }

          .booking-popup-success {
            color: #4cd137;
            background: rgba(76, 209, 55, 0.12);
            border: 1px solid rgba(76, 209, 55, 0.3);
            padding: 0.5rem 0.75rem;
            border-radius: 0.5rem;
          }

          .booking-popup-terms-section {
            margin-bottom: 2rem;
          }

          .booking-popup-terms-section:last-of-type {
            margin-bottom: 1rem;
          }

          .booking-popup-terms-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: #FF0005;
            margin: 0 0 1rem 0;
            font-family: 'Paralucent-Medium', sans-serif;
          }

          .booking-popup-terms-content {
            background: rgba(255, 255, 255, 0.02);
            border-radius: 0.75rem;
            padding: 1.25rem;
            border: 1px solid rgba(255, 255, 255, 0.05);
          }

          .booking-popup-terms-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }

          .booking-popup-terms-list li {
            color: rgba(255, 255, 255, 0.9);
            font-size: 0.9rem;
            line-height: 1.6;
            margin-bottom: 0.75rem;
            padding-left: 1.5rem;
            position: relative;
            font-family: 'Paralucent-Medium', sans-serif;
          }

          .booking-popup-terms-list li:before {
            content: '•';
            color: #FF0005;
            font-weight: bold;
            position: absolute;
            left: 0;
            top: 0;
          }

          .booking-popup-terms-list li:last-child {
            margin-bottom: 0;
          }

          .booking-popup-terms-content p {
            color: rgba(255, 255, 255, 0.9);
            font-size: 0.9rem;
            line-height: 1.6;
            margin: 0;
            font-family: 'Paralucent-Medium', sans-serif;
          }

          .booking-popup-agreement {
            background: rgba(255, 0, 5, 0.1);
            border-radius: 0.75rem;
            padding: 1.25rem;
            border: 1px solid rgba(255, 0, 5, 0.2);
            margin-top: 1.5rem;
          }

          .booking-popup-checkbox-label {
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
            cursor: pointer;
            color: rgba(255, 255, 255, 0.9);
            font-size: 0.9rem;
            line-height: 1.5;
            font-family: 'Paralucent-Medium', sans-serif;
          }

          .booking-popup-checkbox {
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

          .booking-popup-checkbox:checked {
            background: #FF0005;
            border-color: #FF0005;
            position: relative;
          }

          .booking-popup-checkbox:checked:after {
            content: '✓';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 0.75rem;
            font-weight: bold;
          }

          .booking-popup-checkbox-text {
            flex: 1;
            font-weight: 500;
          }

          /* Mobile First Responsive Design */
          @media (max-width: 480px) {
            .booking-popup {
              margin: 0.25rem !important;
              max-height: 98vh !important;
              border-radius: 0.75rem !important;
            }

            .booking-popup-overlay {
              padding: 0.25rem !important;
            }

            .booking-popup-header {
              padding: 0.5rem 0.8rem;
            }

            .booking-popup-field-row {
              grid-template-columns: 1fr 1fr;
              gap: 0.75rem;
            }

            .booking-popup-title {
              font-size: 0.7rem;
            }

            .booking-popup-title-section {
              gap: 0.125rem;
            }

            .booking-popup-time-display {
              padding: 0.125rem 0.25rem;
              gap: 0.25rem;
            }

            .booking-popup-time-label,
            .booking-popup-time-value {
              font-size: 0.6rem;
            }

            .booking-popup-close-btn {
              padding: 0.3rem;
            }

            .booking-popup-close-btn svg {
              width: 1rem;
              height: 1rem;
            }

            .booking-popup-back-btn {
              padding: 0.3rem;
              font-size: 0.5rem;
            }

            .booking-popup-back-btn svg {
              width: 1rem;
              height: 1rem;
            }

            .booking-popup-back-text {
              display: none;
            }

            .booking-popup-logo {
              width: 1.5rem;
              height: 1.5rem;
            }

            .booking-popup-logo svg {
              width: 0.8rem;
              height: 0.8rem;
            }

            .booking-popup-hero {
              padding: 0.6rem 0.8rem;
            }

            .booking-popup-theater-title {
              font-size: 0.7rem;
              margin: 0 0 0.5rem 0;
            }

            .booking-popup-meta {
              flex-direction: row;
              gap: 0.2rem;
              flex-wrap: wrap;
              justify-content: center;
            }

            .booking-popup-meta-item {
              font-size: 0.55rem;
              padding: 0.2rem 0.4rem;
            }

            .booking-popup-meta-item svg {
              width: 0.6rem;
              height: 0.6rem;
            }

            .booking-popup-time-selector-meta {
              justify-content: center;
            }

            .booking-popup-date-selector-meta {
              justify-content: center;
            }

            .booking-popup-date-arrow-small {
              margin-left: 0.25rem;
            }

            .booking-popup-time-arrow-small {
              margin-left: 0.25rem;
            }

            .booking-popup-content {
              padding: 0.75rem 1rem;
              max-height: 70vh;
            }

            .booking-popup-tabs {
              gap: 0.1rem;
              padding: 0.1rem;
              margin-bottom: 1rem;
            }

            .booking-popup-tab {
              min-width: 60px;
              padding: 0.25rem 0.3rem;
              gap: 0.15rem;
            }

            .booking-popup-tab-number {
              width: 1rem;
              height: 1rem;
              font-size: 0.6rem;
            }

            .booking-popup-tab-text {
              font-size: 0.5rem;
            }

            .booking-popup-layout {
              grid-template-columns: 1fr;
              gap: 1rem;
            }

            .booking-popup-cart {
              order: -1;
              max-height: 40vh;
            }

            .booking-popup-occasions {
              grid-template-columns: 1fr 1fr;
              grid-template-rows: repeat(3, 1fr);
              gap: 0.4rem;
            }

            .booking-popup-items {
              grid-template-columns: repeat(2, 1fr);
              gap: 0.5rem;
            }

            .booking-popup-occasion,
            .booking-popup-item {
              padding: 0.5rem;
            }

            .booking-popup-occasion h4 {
              font-size: 0.7rem;
            }

            .booking-popup-occasion-overlay {
              padding: 0.3rem;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .booking-popup-occasion-overlay h4 {
              font-size: 0.7rem;
              color: #ffffff;
              background: rgba(0, 0, 0, 0.9);
              padding: 0.3rem 0.8rem;
              border-radius: 0.3rem;
              text-align: center;
            }

            .booking-popup-selected-occasion {
              padding: 0.75rem;
            }

            .booking-popup-occasion-header {
              margin-bottom: 0.75rem;
              padding-bottom: 0.5rem;
            }

            .booking-popup-occasion-selected h4 {
              font-size: 0.9rem;
            }

            .booking-popup-change-occasion-btn {
              padding: 0.4rem 0.8rem;
              font-size: 0.7rem;
            }

            .booking-popup-item-image {
              padding: 0.75rem;
              font-size: 2rem;
            }

            .booking-popup-item-content {
              padding: 0.5rem;
            }

            .booking-popup-item-content h4 {
              font-size: 0.7rem;
            }

            .booking-popup-action {
              padding: 0.75rem 1rem;
              background: rgba(0, 0, 0, 0.95);
              backdrop-filter: blur(15px);
              box-shadow: 0 -4px 25px rgba(0, 0, 0, 0.4);
            }

            .booking-popup-btn {
              padding: 0.5rem 0.8rem;
              font-size: 0.7rem;
            }

            .booking-popup-terms-container {
              padding: 0.8rem;
            }

            .booking-popup-terms-section {
              margin-bottom: 1rem;
            }

            .booking-popup-terms-title {
              font-size: 0.8rem;
            }

            .booking-popup-terms-content {
              padding: 0.6rem;
            }

            .booking-popup-terms-list li {
              font-size: 0.65rem;
              margin-bottom: 0.3rem;
            }

            .booking-popup-terms-content p {
              font-size: 0.65rem;
            }

            .booking-popup-agreement {
              padding: 0.6rem;
            }

            .booking-popup-checkbox-label {
              font-size: 0.65rem;
            }

            /* Booking Summary Mobile Styles */
            .booking-popup-overview-summary {
              padding: 0.6rem;
              margin-top: 1rem;
            }

            .booking-popup-overview-summary-content {
              gap: 0;
            }

            .booking-popup-overview-summary-section {
              margin-bottom: 0;
            }

            .booking-popup-overview-summary-section-title {
              margin: 0 0 0.15rem 0;
            }

            .booking-popup-overview-summary-divider {
              margin: 0;
            }

            .booking-popup-overview-summary-title {
              font-size: 0.7rem;
            }

            .booking-popup-overview-summary-badge {
              font-size: 0.6rem;
              padding: 0.2rem 0.4rem;
            }

            .booking-popup-overview-summary-item {
              padding: 0;
              line-height: 1;
              height: 1rem;
              max-height: 1rem;
            }

            .booking-popup-overview-summary-item span:first-child {
              font-size: 0.65rem;
              line-height: 1;
              height: 1rem;
              max-height: 1rem;
              display: flex;
              align-items: center;
            }

            .booking-popup-overview-summary-item span:last-child {
              font-size: 0.65rem;
              line-height: 1;
              height: 1rem;
              max-height: 1rem;
              display: flex;
              align-items: center;
            }

            .booking-popup-overview-summary-section-title {
              font-size: 0.65rem;
            }

            .booking-popup-overview-summary-item:last-child span:last-child {
              font-size: 0.7rem;
            }

            /* Booking Overview Form Mobile Styles */
            .booking-popup-section-title {
              font-size: 0.8rem;
            }

            .booking-popup-field label {
              font-size: 0.7rem;
            }

            .booking-popup-field input {
              font-size: 0.7rem;
              padding: 0.5rem 0.8rem;
            }

            .booking-popup-field input::placeholder {
              font-size: 0.65rem;
            }

            .booking-popup-select {
              font-size: 0.7rem;
              padding: 0.5rem 0.8rem;
            }

            .booking-popup-number span {
              font-size: 0.8rem;
            }

            .booking-popup-movie-price-text {
              font-size: 0.6rem;
            }

            .booking-popup-movie-change-text {
              font-size: 0.6rem;
            }

            .booking-popup-select-movies-btn {
              font-size: 0.7rem;
              padding: 0.5rem 0.8rem;
            }
          }

          @media (min-width: 481px) and (max-width: 768px) {
            .booking-popup {
              margin: 0.5rem !important;
              max-height: 95vh !important;
            }

            .booking-popup-layout {
              display: block;
            }

            .booking-popup-tabs {
              overflow-x: auto;
            }

            .booking-popup-field-row {
              grid-template-columns: 1fr 1fr;
              gap: 0.75rem;
            }

            .booking-popup-tab {
              min-width: 80px;
              font-size: 0.65rem;
            }

            .booking-popup-occasions {
              grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            }

            .booking-popup-items {
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            }
          }

          @media (min-width: 769px) and (max-width: 1024px) {
            .booking-popup-layout {
              grid-template-columns: 1fr 280px;
              gap: 1.5rem;
            }

            .booking-popup-occasions {
              grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            }

            .booking-popup-items {
              grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            }
          }

          @media (min-width: 1025px) {
            .booking-popup-layout {
              grid-template-columns: 1fr 300px;
              gap: 2rem;
            }

            .booking-popup-occasions {
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            }

            .booking-popup-items {
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            }
          }

          /* Success Animation Styles */
          .booking-popup-success {
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
            animation: fadeIn 0.2s ease-in-out;
          }

          .booking-popup-success-content {
            text-align: center;
            padding: 2rem;
            max-width: 400px;
            width: 100%;
          }

          .booking-popup-success-animation {
            position: relative;
            margin-bottom: 2rem;
          }

          .booking-popup-success-checkmark {
            position: relative;
            width: 80px;
            height: 80px;
            margin: 0 auto;
          }

          .booking-popup-success-checkmark-circle {
            position: relative;
            width: 80px;
            height: 80px;
            border: 4px solid #00ff00;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: scaleIn 0.2s ease-out;
            background: rgba(0, 255, 0, 0.1);
          }

          .booking-popup-success-checkmark-svg {
            color: #00ff00;
            width: 40px;
            height: 40px;
          }

          .booking-popup-success-checkmark-path {
            stroke-dasharray: 20;
            stroke-dashoffset: 20;
            animation: drawCheckmark 0.3s ease-out 0.1s forwards;
          }

          .booking-popup-success-title {
            color: #ffffff;
            font-size: 1.5rem;
            font-weight: bold;
            margin-bottom: 1rem;
            animation: slideUp 0.2s ease-out 0.2s both;
          }

          .booking-popup-success-message {
            color: #cccccc;
            margin-bottom: 2rem;
            animation: slideUp 0.2s ease-out 0.3s both;
          }

          .booking-popup-success-message p {
            margin-bottom: 0.5rem;
          }

          .booking-popup-success-email {
            background: rgba(0, 255, 0, 0.1);
            border: 1px solid rgba(0, 255, 0, 0.3);
            border-radius: 0.5rem;
            padding: 1rem;
            margin-top: 1rem;
          }

          .booking-popup-success-email p {
            color: #00ff00;
            font-weight: 500;
          }

          .booking-popup-success-actions {
            display: flex;
            gap: 0.75rem;
            justify-content: center;
            animation: slideUp 0.2s ease-out 0.4s both;
            flex-wrap: wrap;
          }

          .booking-popup-success-btn {
            padding: 0.75rem 1.25rem;
            border: none;
            border-radius: 0.5rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            min-width: 100px;
            font-size: 0.9rem;
          }

          .booking-popup-success-btn.primary {
            background: #FF0005;
            color: #ffffff;
          }

          .booking-popup-success-btn.primary:hover {
            background: #e60004;
            transform: translateY(-2px);
          }

          .booking-popup-success-btn.secondary {
            background: transparent;
            color: #ffffff;
            border: 1px solid rgba(255, 255, 255, 0.3);
          }

          .booking-popup-success-btn.secondary:hover {
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
            .booking-popup-success-content {
              padding: 1.5rem;
            }

            .booking-popup-success-title {
              font-size: 1.25rem;
            }

            .booking-popup-success-actions {
              flex-direction: column;
              gap: 0.75rem;
            }

            .booking-popup-success-btn {
              width: 100%;
            }
          }

          /* Validation Popup Styles */
          .booking-popup-validation {
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
            animation: fadeIn 0.3s ease-in-out;
          }

          .booking-popup-validation-content {
            text-align: center;
            padding: 2rem;
            max-width: 350px;
            width: 100%;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 1rem;
            border: 1px solid rgba(255, 255, 255, 0.2);
          }

          .booking-popup-validation-icon {
            color: #ff4444;
            margin-bottom: 1rem;
            animation: bounceIn 0.4s ease-out;
          }

          .booking-popup-validation-title {
            color: #ffffff;
            font-size: 1.25rem;
            font-weight: bold;
            margin-bottom: 1rem;
            animation: slideUp 0.4s ease-out 0.2s both;
          }

          .booking-popup-validation-message {
            color: #cccccc;
            margin-bottom: 1.5rem;
            line-height: 1.5;
            animation: slideUp 0.4s ease-out 0.3s both;
          }

          .booking-popup-validation-btn {
            background: #FF0005;
            color: #ffffff;
            border: none;
            border-radius: 0.5rem;
            padding: 0.75rem 2rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            animation: slideUp 0.4s ease-out 0.4s both;
          }

          .booking-popup-validation-btn:hover {
            background: #e60004;
            transform: translateY(-2px);
          }

          /* Mobile Responsive for Validation */
          @media (max-width: 768px) {
            .booking-popup-validation-content {
              padding: 1.5rem;
              margin: 1rem;
            }

            .booking-popup-validation-title {
              font-size: 1.1rem;
            }

            .booking-popup-validation-message {
              font-size: 0.9rem;
            }
          }

          /* Edit Request Popup Styles */
          .booking-popup-edit-request {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            animation: fadeIn 0.3s ease-in-out;
          }

          .booking-popup-edit-request-content {
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            border-radius: 20px;
            padding: 2rem;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
            animation: slideUp 0.4s ease-out;
          }

          .booking-popup-edit-request-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
          }

          .booking-popup-edit-request-title {
            color: #ffffff;
            font-size: 1.5rem;
            font-weight: bold;
            margin: 0;
          }

          .booking-popup-edit-request-close {
            background: none;
            border: none;
            color: #888;
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 50%;
            transition: all 0.3s ease;
          }

          .booking-popup-edit-request-close:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
          }

          .booking-popup-edit-request-message {
            margin-bottom: 2rem;
          }

          .booking-popup-edit-request-message p {
            color: #cccccc;
            margin: 0;
            text-align: center;
            font-size: 1rem;
          }

          .booking-popup-edit-request-options {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            margin-bottom: 1.5rem;
          }

          .booking-popup-edit-request-btn {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem 1.5rem;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: left;
            width: 100%;
          }

          .booking-popup-edit-request-btn.call {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            animation: callPulseGreen 1.8s ease-in-out infinite;
            will-change: box-shadow;
          }

          .booking-popup-edit-request-btn.call:hover {
            background: linear-gradient(135deg, #45a049 0%, #3d8b40 100%);
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(76, 175, 80, 0.3);
          }

          .booking-popup-edit-request-btn.call:disabled {
            animation: none;
          }

          /* Green pulse animation for Call button */
          @keyframes callPulseGreen {
            0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.6); }
            70% { box-shadow: 0 0 0 12px rgba(76, 175, 80, 0); }
            100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
          }

          /* Call button ringing animation */
          .booking-popup-edit-request-btn.call .phone-icon {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            animation: phoneSwing 1.2s ease-in-out infinite;
            transform-origin: 50% 50%;
          }

          .booking-popup-edit-request-btn.call .phone-icon::after {
            content: '';
            position: absolute;
            width: 36px;
            height: 36px;
            border: 2px solid rgba(255, 255, 255, 0.4);
            border-radius: 50%;
            animation: pulseRing 1.2s ease-out infinite;
          }

          @keyframes phoneSwing {
            0%, 100% { transform: rotate(0deg); }
            20% { transform: rotate(-12deg); }
            40% { transform: rotate(12deg); }
            60% { transform: rotate(-8deg); }
            80% { transform: rotate(8deg); }
          }

          @keyframes pulseRing {
            0% { transform: scale(0.8); opacity: 0.0; }
            30% { transform: scale(1.0); opacity: 0.6; }
            60% { transform: scale(1.2); opacity: 0.3; }
            100% { transform: scale(1.4); opacity: 0.0; }
          }

          .booking-popup-edit-request-btn.call:disabled .phone-icon {
            animation: none;
          }

          .booking-popup-edit-request-btn.call:disabled .phone-icon::after {
            display: none;
          }

          .booking-popup-edit-request-btn.whatsapp {
            background: linear-gradient(135deg, #25D366 0%, #20b358 100%);
            color: white;
            animation: whatsappPulse 1.8s ease-in-out infinite;
            will-change: box-shadow;
          }

          .booking-popup-edit-request-btn.whatsapp:hover {
            background: linear-gradient(135deg, #20b358 0%, #1ca049 100%);
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(37, 211, 102, 0.3);
          }

          .booking-popup-edit-request-btn.whatsapp:disabled {
            animation: none;
          }

          /* WhatsApp notification-style animation */
          .booking-popup-edit-request-btn.whatsapp .whatsapp-icon {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            animation: whatsappBounce 1.6s ease-in-out infinite;
            transform-origin: 50% 50%;
          }

          .booking-popup-edit-request-btn.whatsapp .whatsapp-icon::after {
            content: '';
            position: absolute;
            top: -4px;
            right: -4px;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #ff3b30; /* iOS badge red */
            box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.6);
            animation: badgePop 1.6s ease-in-out infinite;
          }

          @keyframes whatsappPulse {
            0% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.55); }
            70% { box-shadow: 0 0 0 12px rgba(37, 211, 102, 0); }
            100% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0); }
          }

          @keyframes whatsappBounce {
            0%, 100% { transform: translateY(0); }
            25% { transform: translateY(-2px); }
            50% { transform: translateY(2px); }
            75% { transform: translateY(-1px); }
          }

          @keyframes badgePop {
            0% { transform: scale(0.7); opacity: 0.0; }
            30% { transform: scale(1.1); opacity: 1.0; }
            60% { transform: scale(1.0); opacity: 0.8; }
            100% { transform: scale(0.9); opacity: 0.0; }
          }

          .booking-popup-edit-request-btn.whatsapp:disabled .whatsapp-icon {
            animation: none;
          }

          .booking-popup-edit-request-btn.whatsapp:disabled .whatsapp-icon::after {
            display: none;
          }

          .booking-popup-edit-request-btn-content {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }

          .booking-popup-edit-request-btn-title {
            font-weight: bold;
            font-size: 1rem;
          }

          .booking-popup-edit-request-btn-subtitle {
            font-size: 0.875rem;
            opacity: 0.9;
          }

          .booking-popup-edit-request-info {
            text-align: center;
            padding-top: 1rem;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
          }

          .booking-popup-edit-request-info p {
            margin: 0;
            color: #888;
            font-size: 0.875rem;
          }

          /* Mobile Responsive for Edit Request */
          @media (max-width: 768px) {
            .booking-popup-edit-request-content {
              padding: 1.5rem;
              margin: 1rem;
            }

            .booking-popup-edit-request-title {
              font-size: 1.25rem;
            }

            .booking-popup-edit-request-btn {
              padding: 0.875rem 1.25rem;
            }

            .booking-popup-edit-request-btn-title {
              font-size: 0.9rem;
            }

            .booking-popup-edit-request-btn-subtitle {
              font-size: 0.8rem;
            }
          }

          /* Close Confirmation Popup Styles */
          .booking-popup-close-confirmation {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999999;
            backdrop-filter: blur(5px);
            animation: fadeIn 0.3s ease;
          }

          .booking-popup-close-confirmation-content {
            background: white;
            border-radius: 16px;
            padding: 2.5rem;
            text-align: center;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
            animation: slideUp 0.4s ease;
            position: relative;
            z-index: 10000000;
          }

          .booking-popup-close-confirmation-content::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #f59e0b, #ef4444);
            border-radius: 16px 16px 0 0;
          }

          .booking-popup-close-confirmation-icon {
            color: #f59e0b;
            margin-bottom: 1.5rem;
            display: flex;
            justify-content: center;
            animation: bounce 0.6s ease;
          }

          .booking-popup-close-confirmation-icon svg {
            filter: drop-shadow(0 2px 4px rgba(245, 158, 11, 0.3));
          }

          .booking-popup-close-confirmation-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 1rem;
          }

          .booking-popup-close-confirmation-message {
            color: #6b7280;
            margin-bottom: 2rem;
            line-height: 1.6;
            font-size: 1rem;
          }

          .booking-popup-close-confirmation-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
          }

          .booking-popup-close-confirmation-btn {
            border: none;
            border-radius: 8px;
            padding: 0.75rem 1.5rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            min-width: 100px;
            font-size: 0.9rem;
          }

          .booking-popup-close-confirmation-btn.cancel {
            background: #f3f4f6;
            color: #374151;
            border: 1px solid #d1d5db;
          }

          .booking-popup-close-confirmation-btn.cancel:hover {
            background: #e5e7eb;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          }

          .booking-popup-close-confirmation-btn.confirm {
            background: #ef4444;
            color: white;
            border: 1px solid #dc2626;
          }

          .booking-popup-close-confirmation-btn.confirm:hover {
            background: #dc2626;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3);
          }

          @media (max-width: 640px) {
            .booking-popup-close-confirmation-content {
              padding: 1.5rem;
              margin: 1rem;
            }

            .booking-popup-close-confirmation-title {
              font-size: 1.125rem;
            }

            .booking-popup-close-confirmation-message {
              font-size: 0.875rem;
            }

            .booking-popup-close-confirmation-btn {
              padding: 0.625rem 1.25rem;
              font-size: 0.875rem;
            }

            .booking-popup-close-confirmation-actions {
              flex-direction: column;
              gap: 0.5rem;
            }

            .booking-popup-close-confirmation-btn {
              width: 100%;
            }
          }

          /* Manual Payment Choice Modal */
          .booking-popup-payment-choice {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(6px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000000;
            animation: fadeIn 0.25s ease;
          }

          .booking-popup-payment-choice-content {
            position: relative;
            width: min(520px, 92vw);
            border-radius: 28px;
            padding: 2.25rem;
            border: 1px solid rgba(255, 255, 255, 0.08);
            background: radial-gradient(circle at top, rgba(255,255,255,0.12), rgba(18,18,18,0.9));
            box-shadow: 0 30px 120px rgba(0, 0, 0, 0.55);
          }

          .booking-popup-payment-choice-close {
            position: absolute;
            top: 18px;
            right: 18px;
            background: rgba(255,255,255,0.08);
            border: none;
            border-radius: 999px;
            color: #ffffff;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background 0.2s ease;
          }

          .booking-popup-payment-choice-close:hover:not(:disabled) {
            background: rgba(255,255,255,0.18);
          }

          .booking-popup-payment-choice-close:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .booking-popup-payment-choice-icon {
            font-size: 2.75rem;
            margin-bottom: 1rem;
          }

          .booking-popup-payment-choice-title {
            font-size: 1.65rem;
            font-weight: 700;
            margin-bottom: 0.35rem;
          }

          .booking-popup-payment-choice-subtitle {
            color: rgba(255,255,255,0.75);
            margin-bottom: 1.75rem;
            line-height: 1.5;
            font-size: 0.95rem;
          }

          .booking-popup-payment-choice-options {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .payment-choice-card {
            display: flex;
            align-items: center;
            gap: 1rem;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 18px;
            padding: 1rem 1.25rem;
            cursor: pointer;
            transition: border 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
            text-align: left;
          }

          .payment-choice-card .choice-emoji {
            font-size: 1.9rem;
          }

          .payment-choice-card .choice-texts {
            flex: 1;
          }

          .choice-title {
            font-size: 1.05rem;
            font-weight: 600;
            color: #ffffff;
          }

          .choice-caption {
            font-size: 0.9rem;
            color: rgba(255,255,255,0.7);
          }

          .choice-arrow {
            color: rgba(255,255,255,0.6);
            transition: transform 0.2s ease;
          }

          .payment-choice-card:hover:not(:disabled) {
            border-color: rgba(255,255,255,0.35);
            transform: translateY(-2px);
            box-shadow: 0 15px 45px rgba(0,0,0,0.45);
          }

          .payment-choice-card:hover:not(:disabled) .choice-arrow {
            transform: translateX(4px);
          }

          .payment-choice-card:disabled {
            opacity: 0.55;
            cursor: not-allowed;
          }

          .payment-choice-card.cash {
            background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(15,118,110,0.18));
          }

          .payment-choice-card.online {
            background: linear-gradient(135deg, rgba(59,130,246,0.15), rgba(37,99,235,0.18));
          }

          .payment-choice-card.partial {
            background: linear-gradient(135deg, rgba(245,158,11,0.18), rgba(217,119,6,0.2));
          }

          .partial-breakdown {
            margin-top: 0.75rem;
            margin-bottom: 1.25rem;
            border: 1px solid rgba(255,255,255,0.12);
            background: rgba(255,255,255,0.04);
            border-radius: 16px;
            padding: 1rem 1.1rem;
          }

          .partial-breakdown-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            padding: 0.35rem 0;
            color: rgba(255,255,255,0.9);
            font-weight: 700;
          }

          .partial-breakdown-row span:first-child {
            color: rgba(255,255,255,0.78);
            font-weight: 700;
          }

          .partial-payment-form {
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
            margin-top: 0.75rem;
          }

          .partial-payment-row {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .partial-payment-label {
            font-size: 0.9rem;
            font-weight: 700;
            color: rgba(255,255,255,0.85);
          }

          .partial-payment-input {
            width: 100%;
            padding: 0.85rem 1rem;
            border-radius: 14px;
            border: 1px solid rgba(255,255,255,0.14);
            background: rgba(255,255,255,0.06);
            color: #ffffff;
            font-size: 1rem;
            outline: none;
          }

          .partial-payment-input:focus {
            border-color: rgba(245,158,11,0.6);
            box-shadow: 0 0 0 3px rgba(245,158,11,0.18);
          }

          .partial-payment-methods {
            display: flex;
            gap: 0.75rem;
            flex-wrap: wrap;
          }

          .partial-method-btn {
            border: 1px solid rgba(255,255,255,0.18);
            background: rgba(255,255,255,0.05);
            color: rgba(255,255,255,0.9);
            padding: 0.6rem 1.1rem;
            border-radius: 999px;
            font-weight: 800;
            cursor: pointer;
            transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
          }

          .partial-method-btn.active {
            background: rgba(245,158,11,0.22);
            border-color: rgba(245,158,11,0.65);
          }

          .partial-method-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .partial-payment-actions {
            display: flex;
            gap: 0.75rem;
            justify-content: flex-end;
            flex-wrap: wrap;
            margin-top: 0.25rem;
          }

          .partial-payment-cancel {
            border: 1px solid rgba(255,255,255,0.2);
            background: rgba(255,255,255,0.06);
            color: rgba(255,255,255,0.9);
            padding: 0.7rem 1.2rem;
            border-radius: 999px;
            font-weight: 800;
            cursor: pointer;
          }

          .partial-payment-confirm {
            border: 1px solid rgba(245,158,11,0.55);
            background: rgba(245,158,11,0.2);
            color: #ffffff;
            padding: 0.7rem 1.2rem;
            border-radius: 999px;
            font-weight: 900;
            cursor: pointer;
          }

          @media (max-width: 640px) {
            .booking-popup-payment-choice-content {
              padding: 1.75rem;
            }

            .booking-popup-payment-choice-title {
              font-size: 1.35rem;
            }

            .payment-choice-card {
              flex-direction: column;
              align-items: flex-start;
            }

            .payment-choice-card .choice-arrow {
              align-self: flex-end;
            }
          }

          /* Payment Confirmation Popup Styles */
          .booking-popup-payment-confirmation {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.75);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000000;
            backdrop-filter: blur(4px);
            animation: fadeIn 0.3s ease;
          }

          .booking-popup-payment-confirmation-content {
            background: white;
            border-radius: 16px;
            padding: 2.5rem;
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            text-align: center;
            position: relative;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            z-index: 10000000;
          }

          .booking-popup-payment-confirmation-content::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #10b981, #059669);
            border-radius: 16px 16px 0 0;
          }

          .booking-popup-payment-confirmation-icon {
            margin-bottom: 1.5rem;
            display: flex;
            justify-content: center;
            animation: bounce 0.6s ease;
          }

          .booking-popup-payment-confirmation-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 1rem;
          }

          .booking-popup-payment-details {
            text-align: left;
            margin-bottom: 2rem;
          }

          .booking-popup-payment-confirmation-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
          }

          .booking-popup-payment-confirmation-btn {
            border: none;
            border-radius: 8px;
            padding: 0.75rem 1.5rem;
            cursor: pointer;
            transition: all 0.2s ease;
            font-weight: 600;
            font-size: 0.9rem;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .booking-popup-payment-confirmation-btn.cancel {
            background: #f3f4f6;
            color: #374151;
            border: 1px solid #d1d5db;
          }

          .booking-popup-payment-confirmation-btn.cancel:hover:not(:disabled) {
            background: #e5e7eb;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          }

          .booking-popup-payment-confirmation-btn.confirm {
            background: #10b981;
            color: white;
            border: 1px solid #059669;
          }

          .booking-popup-payment-confirmation-btn.confirm:hover:not(:disabled) {
            background: #059669;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
          }

          .booking-popup-payment-confirmation-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
          }

          @media (max-width: 640px) {
            .booking-popup-payment-confirmation-content {
              padding: 1.5rem;
              margin: 1rem;
            }

            .booking-popup-payment-confirmation-title {
              font-size: 1.125rem;
            }

            .booking-popup-payment-confirmation-btn {
              padding: 0.625rem 1.25rem;
              font-size: 0.875rem;
            }

            .booking-popup-payment-confirmation-actions {
              flex-direction: column;
              gap: 0.5rem;
            }

            .booking-popup-payment-confirmation-btn {
              width: 100%;
            }
          }

          @keyframes bounceIn {
            0% { transform: scale(0); opacity: 0; }
            50% { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }

          @keyframes fadeIn {
            0% { opacity: 0; }
            100% { opacity: 1; }
          }

          @keyframes slideUp {
            0% { 
              transform: translateY(20px); 
              opacity: 0; 
            }
            100% { 
              transform: translateY(0); 
              opacity: 1; 
            }
          }

          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { 
              transform: translateY(0); 
            }
            40% { 
              transform: translateY(-10px); 
            }
            60% { 
              transform: translateY(-5px); 
            }
          }

          /* Toast Notifications Container */
          .booking-popup-toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999999;
            display: flex;
            flex-direction: column;
            gap: 12px;
            pointer-events: none;
          }

          .booking-popup-toast-container > * {
            pointer-events: auto;
          }

          @media (max-width: 480px) {
            .booking-popup-toast-container {
              top: 10px;
              right: 10px;
              left: 10px;
            }
          }

        `}</style>
      </div>

      {/* Close Confirmation Popup */}
      {showCloseConfirmation && (
        <div className="booking-popup-close-confirmation">
          <div className="booking-popup-close-confirmation-content">
            <div className="booking-popup-close-confirmation-icon">
              <X className="w-12 h-12" />
            </div>

            <h3 className="booking-popup-close-confirmation-title">
              Close Booking?
            </h3>

            <p className="booking-popup-close-confirmation-message">
              Are you sure you want to close? Your booking progress will be lost.
            </p>

            <div className="booking-popup-close-confirmation-actions">
              <button
                onClick={handleCancelClose}
                className="booking-popup-close-confirmation-btn cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClose}
                className="booking-popup-close-confirmation-btn confirm"
              >
                Close Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Payment Choice Popup (Manual booking flow only) */}
        {isManualMode && showManualPaymentChoice && (
          <div
            className="booking-popup-payment-choice"
            role="dialog"
            aria-modal="true"
            onClick={() => !isProcessingPayment && setShowManualPaymentChoice(false)}
          >
            <div
              className="booking-popup-payment-choice-content"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="booking-popup-payment-choice-close"
                onClick={() => setShowManualPaymentChoice(false)}
                disabled={isProcessingPayment}
                aria-label="Close payment method selection"
              >
                <X size={20} />
              </button>
              <div className="booking-popup-payment-choice-icon">
                <span role="img" aria-hidden="true">🧾</span>
              </div>
              <h3 className="booking-popup-payment-choice-title">Select payment method</h3>
              <p className="booking-popup-payment-choice-subtitle">
                Keep manual bookings in sync with reality—choose how you collected the advance for this slot.
              </p>
              <div className="booking-popup-payment-choice-options">
                <button
                  type="button"
                  className="payment-choice-card cash"
                  onClick={() => void handleManualPaymentSelection('cash')}
                  disabled={isProcessingPayment || isSubmittingBooking}
                >
                  <div className="choice-emoji">💵</div>
                  <div className="choice-texts">
                    <span className="choice-title">Cash / Pay at Venue</span>
                    <span className="choice-caption">Mark advance as collected in cash</span>
                  </div>
                  <ArrowRight className="choice-arrow" />
                </button>
                <button
                  type="button"
                  className="payment-choice-card online"
                  onClick={() => void handleManualPaymentSelection('upi')}
                  disabled={isProcessingPayment || isSubmittingBooking}
                >
                  <div className="choice-emoji">💳</div>
                  <div className="choice-texts">
                    <span className="choice-title">UPI / Online Transfer</span>
                    <span className="choice-caption">Log advance received via UPI or bank</span>
                  </div>
                  <ArrowRight className="choice-arrow" />
                </button>
                <button
                  type="button"
                  className="payment-choice-card partial"
                  onClick={handleOpenPartialPayment}
                  disabled={isProcessingPayment || isSubmittingBooking}
                >
                  <div className="choice-emoji">🧾</div>
                  <div className="choice-texts">
                    <span className="choice-title">Partial Payment</span>
                    <span className="choice-caption">Record partial advance received</span>
                  </div>
                  <ArrowRight className="choice-arrow" />
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Payment Confirmation Popup */}
      {showPaymentConfirmation && (
        <div className="booking-popup-payment-confirmation">
          <div className="booking-popup-payment-confirmation-content">
            <div className="booking-popup-payment-confirmation-icon">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-3xl">💳</span>
              </div>
            </div>

            <h3 className="booking-popup-payment-confirmation-title">
              Complete Payment
            </h3>

            <div className="booking-popup-payment-details">
              <p className="text-gray-600 mb-4">
                Please complete your payment to confirm the booking.
              </p>

              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Theater:</span>
                  <span>{selectedTheater?.name || 'FeelME Town Theater'}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Date:</span>
                  <span>{selectedDate}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Time:</span>
                  <span>{selectedTimeSlot}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Occasion:</span>
                  <span>{formData.occasion}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total Amount:</span>
                  <span>₹{getFinalTotal()}</span>
                </div>
                <div className="flex justify-between items-center text-green-600">
                  <span>Slot Booking Fee:</span>
                  <span>₹{pricingData.slotBookingFee || 10}</span>
                </div>
                {getDecorationFee() > 0 && (
                  <>
                    {pricingData.decorationFees > 0 && (
                      <div className="flex justify-between items-center text-green-600">
                        <span>Decoration Fees:</span>
                        <span>₹{pricingData.decorationFees}</span>
                      </div>
                    )}

                  </>
                )}
                <div className="flex justify-between items-center text-green-600 font-bold">
                  <span>Total Advance Payment:</span>
                  <span>₹{getPayableAmount()}</span>
                </div>
                <div className="flex justify-between items-center text-blue-600">
                  <span>At Venue:</span>
                  <span>₹{getBalanceAmount().toFixed(2)}</span>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                💡 Complete your payment through any method (UPI, Card, Cash, etc.) and click "Payment Done" to confirm your booking.
              </p>
            </div>

            <div className="booking-popup-payment-confirmation-actions">
              <button
                onClick={() => setShowPaymentConfirmation(false)}
                className="booking-popup-payment-confirmation-btn cancel"
                disabled={isProcessingPayment}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  void handlePaymentDone();
                }}
                className="booking-popup-payment-confirmation-btn confirm"
                disabled={isProcessingPayment}
              >
                {isProcessingPayment ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  '✅ Payment Done'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Movies Modal */}
      <MoviesModal
        isOpen={isMoviesModalOpen}
        onClose={() => {

          setIsMoviesModalOpen(false);
        }}
        onMovieSelect={handleMovieSelect}
        selectedMovies={(formData.selectedMovies || []).map((m: any) => typeof m === 'string' ? m : m.name)}
      />

      {/* Toast Notifications */}
      <div className="booking-popup-toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            type={toast.type}
            message={toast.message}
            duration={toast.duration || 4000}
            onClose={removeToast}
          />
        ))}
      </div>
    </div>
  );

  // Use portal to render popup at the root level
  if (typeof window !== 'undefined') {
    return createPortal(popupContent, document.body);
  }

  return popupContent;
}