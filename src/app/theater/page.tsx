'use client';

import Image from 'next/image';
import { Suspense, useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDatePicker } from '@/contexts/DatePickerContext';
import { useBooking } from '@/contexts/BookingContext';
// Removed getDefaultTimeSlots import - no hardcoded time slots

export default function Theater() {
    return (
        <Suspense fallback={<div style={{ minHeight: 240 }} />}>
            <TheaterInner />
        </Suspense>
    );
}

function TheaterInner() {
    const { openBookingPopup, setIncompleteBookingData, openCancelBookingPopup, resetPopupState } = useBooking();
    const [isBookingButtonClicked, setIsBookingButtonClicked] = useState(false);

    // Pre-fetch booking data for faster popup opening
    const [preloadedData, setPreloadedData] = useState({
        services: null,
        theaters: null,
        occasions: null,
        isLoaded: false
    });
    const searchParams = useSearchParams();
    const [selectedTheater, setSelectedTheater] = useState(0);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [memberCount, setMemberCount] = useState(1);
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
    const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
    const theaterDetailsRef = useRef<HTMLDivElement>(null);
    const [isIOSDevice, setIsIOSDevice] = useState(false);
    const [isSmallScreen, setIsSmallScreen] = useState(false);
    const [isSafariBrowser, setIsSafariBrowser] = useState(false);
    const [isFetchingIncompleteBooking, setIsFetchingIncompleteBooking] = useState(false);
    const [fetchedBookingIds, setFetchedBookingIds] = useState<Set<string>>(new Set());
    const [fetchedCancelBookingIds, setFetchedCancelBookingIds] = useState<Set<string>>(new Set());
    const [bookedTimeSlots, setBookedTimeSlots] = useState<string[]>([]);
    const [bookedSlotsMap, setBookedSlotsMap] = useState<Record<string, string[]>>({});
    const [isLoadingBookedSlots, setIsLoadingBookedSlots] = useState(false);
    const [isBookingInProgress, setIsBookingInProgress] = useState(false);
    const bookingClickRef = useRef(false);

    // Slideshow states
    const [theaters, setTheaters] = useState<any[]>([]);
    const [isLoadingTheaters, setIsLoadingTheaters] = useState(true);
    // Selected theater image index for gallery
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    // Auto slideshow state - Always enabled by default
    const [isAutoSlideshow, setIsAutoSlideshow] = useState(true);
    // Theater card image indices for mini slideshows
    const [theaterCardImageIndices, setTheaterCardImageIndices] = useState<{ [key: number]: number }>({});

    // Slideshow timing to match About page feel
    const THEATER_SLIDE_DURATION_MS = 4000;

    useEffect(() => {
        const update = () => {
            setIsSmallScreen(window.innerWidth <= 768);
            const ua = navigator.userAgent || '';
            const iOSUA = /iPad|iPhone|iPod/i.test(ua);
            const iPadOS = navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1;
            setIsIOSDevice(iOSUA || iPadOS);

            // Detect Safari (exclude other iOS browsers that use WebKit but have different UAs)
            const isSafari = /Safari/i.test(ua) && !/(Chrome|CriOS|FxiOS|Edg|EdgiOS|OPiOS|OPR|SamsungBrowser)/i.test(ua);
            setIsSafariBrowser(isSafari);
        };

        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    // Use global date picker
    const { selectedDate, openDatePicker, setSelectedDate } = useDatePicker();

    const pricingDataRef = useRef<{
        decorationFees: number | null;
        extraGuestFee: number | null;
    }>({
        decorationFees: null,
        extraGuestFee: null
    });

    const parseAmountValue = useCallback((value: unknown): number => {
        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : 0;
        }
        if (typeof value === 'string') {
            const stripped = value.replace(/[^0-9.-]/g, '').trim();
            if (!stripped) return 0;
            const parsed = Number.parseFloat(stripped);
            return Number.isFinite(parsed) ? parsed : 0;
        }
        return 0;
    }, []);

    const resolveAmount = useCallback((candidates: unknown[]): number | null => {
        let fallback: number | null = null;

        for (const candidate of candidates) {
            if (candidate === undefined || candidate === null || candidate === '') continue;
            const parsed = parseAmountValue(candidate);
            if (parsed > 0) {
                return parsed;
            }
            if (parsed === 0 && fallback === null) {
                fallback = 0;
            }
        }

        return fallback;
    }, [parseAmountValue]);

    const applyBookedSlotsToMap = useCallback((theaterName: string | undefined, slots: any) => {
        if (!theaterName) return;
        setBookedSlotsMap((prev) => ({
            ...prev,
            [theaterName]: Array.isArray(slots) ? slots : [],
        }));
    }, []);

    const formatCurrency = useCallback((amount: number | null | undefined): string => {
        const numeric = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
            minimumFractionDigits: 0
        }).format(numeric);
    }, []);

    // Fetch global pricing data for fallback fees
    useEffect(() => {
        const fetchPricingData = async () => {
            try {
                const response = await fetch('/api/pricing', { cache: 'no-store' });
                if (!response.ok) {
                    console.error('Failed to fetch pricing data:', response.statusText);
                    return;
                }

                const data = await response.json();
                if (data?.success && data?.pricing) {
                    pricingDataRef.current = {
                        decorationFees: parseAmountValue(data.pricing.decorationFees),
                        extraGuestFee: parseAmountValue(data.pricing.extraGuestFee)
                    };
                }
            } catch (error) {
                console.error('Error fetching pricing data:', error);
            }
        };

        fetchPricingData();
    }, [parseAmountValue]);

    // Fetch theaters from database (optimized for speed)
    const fetchTheaters = async (showLoading = true) => {
        try {
            if (showLoading) {
                setIsLoadingTheaters(true);
            }

            const response = await fetch('/api/admin/theaters', {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });




            const data = await response.json();


            if (data.success && data.theaters) {


                // Deep database inspection for each theater with decompression
                data.theaters.forEach((theater: any, index: number) => {






                    // General images field analysis for all theaters






                    if (theater.images) {
                        if (typeof theater.images === 'string') {



                            // Try to parse if it looks like JSON
                            if (theater.images.startsWith('[') || theater.images.startsWith('{')) {
                                try {
                                    const parsed = JSON.parse(theater.images);



                                } catch (e) {

                                }
                            }
                        } else if (Array.isArray(theater.images)) {


                        }
                    }

                    // Check single image field





                });
                // Transform database theaters to match frontend structure
                const transformedTheaters = data.theaters.map((theater: any, index: number) => {
                    const decorationFee = resolveAmount([
                        theater.decorationFee,
                        theater.decorationFees,
                        theater.pricingData?.decorationFee,
                        theater.pricingData?.decorationFees,
                        theater.pricingData?.appliedDecorationFee,
                        pricingDataRef.current.decorationFees
                    ]);

                    const extraGuestFee = resolveAmount([
                        theater.extraGuestFee,
                        theater.extraGuestsFee,
                        theater.pricingData?.extraGuestFee,
                        theater.pricingData?.extraGuestFees,
                        pricingDataRef.current.extraGuestFee
                    ]);

                    return {
                        id: index + 1,
                        name: theater.name,
                        image: theater.image || theater.images?.[0] || '/images/default-theater.jpg',
                        capacity: (() => {
                            const min = theater.capacity.min;
                            const max = theater.capacity.max;

                            if (min === max) {
                                // Same min and max
                                const result = `For ${max} or Less People`;

                                return result;
                            } else {
                                // Different min and max
                                const result = `For ${min} or Less People, Expandable upto ${max} People`;

                                return result;
                            }
                        })(),
                        capacityNumber: theater.capacity.max,
                        type: theater.type || '', // No hardcoded type fallback
                        price: `₹ ${Number(theater.price || 0).toLocaleString('en-IN')}`,
                        decorationFeeDisplay: decorationFee !== null ? formatCurrency(decorationFee) : null,
                        extraGuestFeeDisplay: extraGuestFee !== null ? formatCurrency(extraGuestFee) : null,
                        features: theater.whatsIncluded || [], // Only database features, no hardcoded fallback
                        timeSlots: theater.timeSlots || [],
                        rawTimeSlots: theater.timeSlots || [], // Keep original for processing
                        youtubeLink: theater.youtubeLink || null, // YouTube video link
                        images: (() => {
                            // Handle compressed/string images from database
                            let imageArray = [];

                            if (theater.images) {
                                if (Array.isArray(theater.images)) {
                                    imageArray = theater.images.filter(Boolean);
                                } else if (typeof theater.images === 'string') {
                                    try {
                                        // Try to parse JSON string
                                        const parsed = JSON.parse(theater.images);
                                        imageArray = Array.isArray(parsed) ? parsed.filter(Boolean) : [theater.images];
                                    } catch {
                                        // Not JSON, treat as single URL
                                        imageArray = [theater.images];
                                    }
                                }
                            }

                            // Fallback to single image field
                            if (imageArray.length === 0 && theater.image) {
                                imageArray = [theater.image];
                            }

                            // Ensure we have at least one image (default fallback)
                            if (imageArray.length === 0) {
                                imageArray = ['/images/default-theater.jpg'];
                            }

                            return imageArray;
                        })()
                    };
                });

                // Smart change detection for real-time updates
                const theatersChanged = JSON.stringify(transformedTheaters) !== JSON.stringify(theaters);
                if (theatersChanged || theaters.length === 0) {


                    setTheaters(transformedTheaters);

                    // Log what changed
                    if (theaters.length > 0) {

                    }
                } else {

                }
            } else {


                // No fallback - only database theaters
            }
        } catch (error) {


            // No fallback - only database theaters
        } finally {
            if (showLoading) {
                setIsLoadingTheaters(false);
            }
        }
    };

    // No hardcoded theaters - 100% database driven

    // Monitor popup state for debugging
    useEffect(() => {

    }, [isBookingInProgress]);

    // Reset booking button state when popup is closed
    useEffect(() => {
        const handleBookingPopupClose = () => {
            setIsBookingInProgress(false);
            bookingClickRef.current = false;
        };

        // Listen for popup close events
        window.addEventListener('bookingPopupClosed', handleBookingPopupClose);

        return () => {
            window.removeEventListener('bookingPopupClosed', handleBookingPopupClose);
        };
    }, []);

    // Fetch theaters on component mount
    useEffect(() => {
        fetchTheaters();
    }, []);


    // Real-time theater updates every 5 seconds
    useEffect(() => {
        const refreshMs = (isIOSDevice || isSmallScreen) ? 30000 : 5000;
        const interval = setInterval(() => {
            if (typeof document !== 'undefined' && document.hidden) return;
            fetchTheaters(false);
        }, refreshMs);

        return () => clearInterval(interval);
    }, [isSafariBrowser, isIOSDevice, isSmallScreen]);

    useEffect(() => {
        setIsMounted(true);
        const timerMs = isSmallScreen ? 15000 : 2000;
        const timer = setInterval(() => {
            if (typeof document !== 'undefined' && document.hidden) return;
            setCurrentTime(new Date());
        }, timerMs); // Update current time every 2 seconds (slower on mobile)

        return () => clearInterval(timer);
    }, [isSmallScreen]);


    const fetchIncompleteBooking = useCallback(async (bookingId: string, email: string) => {
        // Prevent multiple simultaneous fetches for the same booking
        if (isFetchingIncompleteBooking || fetchedBookingIds.has(bookingId)) {

            return;
        }

        setIsFetchingIncompleteBooking(true);
        setFetchedBookingIds(prev => new Set(prev).add(bookingId));

        const maxRetries = 3;
        let lastError: Error | null = null;

        try {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {


                    // Get all incomplete bookings with retry mechanism
                    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
                    const controller = new AbortController();
                    const timeoutId = window.setTimeout(() => controller.abort(), 10000);
                    const response = await fetch(`${baseUrl}/api/incomplete-booking`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        cache: 'no-cache',
                        signal: controller.signal
                    }).finally(() => {
                        window.clearTimeout(timeoutId);
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const result = await response.json();



                    if (result.success) {


                        // Find the specific incomplete booking
                        const incompleteBooking = result.incompleteBookings.find((booking: { bookingId: string; email: string }) =>
                            booking.bookingId === bookingId && booking.email === email
                        );

                        if (incompleteBooking) {


                            // Set incomplete booking data in context
                            setIncompleteBookingData(incompleteBooking);

                            // Pre-fill the form data
                            preFillBookingData(incompleteBooking);

                            // Open booking popup automatically with incomplete data
                            setTimeout(() => {

                                openBookingPopup(undefined, undefined, undefined, incompleteBooking);
                            }, 1000);

                            return; // Success, exit retry loop
                        } else {



                            return; // Not found, but no need to retry
                        }
                    } else {

                        return; // API error, no need to retry
                    }

                } catch (error) {
                    lastError = error instanceof Error ? error : new Error('Unknown error');


                    if (attempt < maxRetries) {

                        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
                    }
                }
            }

            // All retries failed

            if (lastError) {
                if (lastError.message.includes('Failed to fetch')) {

                } else if (lastError.message.includes('HTTP error')) {

                } else {

                }
            }
        } finally {
            // Always cleanup loading state
            setIsFetchingIncompleteBooking(false);
        }
    }, [setIncompleteBookingData, openBookingPopup, isFetchingIncompleteBooking, fetchedBookingIds]);

    // Handle incomplete booking from email link and movie selection
    useEffect(() => {
        const bookingId = searchParams.get('bookingId');
        const email = searchParams.get('email');
        const newBooking = searchParams.get('newBooking');
        const cancelBookingId = searchParams.get('cancelBookingId');
        const reopenBooking = searchParams.get('reopenBooking');
        const movieTitle = searchParams.get('movie');

        // Handle movie selection from movies page
        if (movieTitle && !bookingId && !cancelBookingId) {
            // Movie selected from movies page - just store it, don't auto-open popup
            // User will manually select theater and click "Book Theater" button
            console.log('🎬 Theater Page: Movie parameter detected:', movieTitle);
        }

        if (reopenBooking === 'true') {

            // Get selected movie from sessionStorage (don't clear it yet)
            const selectedMovie = sessionStorage.getItem('selectedMovie');
            if (selectedMovie) {

                // Don't clear sessionStorage here - let the booking popup handle it
            }

            // Reset popup state and open booking popup with the selected theater, date, and time
            setTimeout(() => {
                resetPopupState();
                openBookingPopup(filteredTheaters[selectedTheater], selectedDate, selectedTimeSlot);
            }, 500);
        } else if (bookingId && email && !isFetchingIncompleteBooking && !fetchedBookingIds.has(bookingId)) {

            // Add small delay to ensure page is fully loaded
            setTimeout(() => {
                fetchIncompleteBooking(bookingId, email);
            }, 100);
        } else if (newBooking === 'true') {

            // Reset popup state and open fresh booking popup without any pre-filled data
            setTimeout(() => {
                resetPopupState();
                openBookingPopup();
            }, 500);
        } else if (cancelBookingId && email && !fetchedCancelBookingIds.has(cancelBookingId)) {

            // Mark as fetched to prevent duplicate requests
            setFetchedCancelBookingIds(prev => new Set(prev).add(cancelBookingId));
            // Fetch booking data and open cancel popup
            setTimeout(async () => {
                try {


                    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
                    const response = await fetch(`${baseUrl}/api/booking/${cancelBookingId}?email=${encodeURIComponent(email)}`);
                    const result = await response.json();

                    if (result.success && result.booking) {

                        // Open cancel booking popup with the fetched data
                        openCancelBookingPopup(result.booking);
                    } else {

                        // Open cancel booking popup with null data to show "booking not found" message
                        openCancelBookingPopup(null);
                    }
                } catch (error) {

                    // Open cancel booking popup with null data to show "booking not found" message
                    openCancelBookingPopup(null);
                }
            }, 100);
        } else if (cancelBookingId && email) {

        } else if (bookingId && email) {

        } else {

        }
    }, [searchParams, fetchIncompleteBooking, openBookingPopup, openCancelBookingPopup, isFetchingIncompleteBooking, fetchedBookingIds, fetchedCancelBookingIds, selectedTheater, selectedDate, selectedTimeSlot]);

    // Pre-fetch booking data on page load for instant popup opening
    useEffect(() => {
        const preloadBookingData = async () => {
            if (preloadedData.isLoaded) return; // Already loaded

            console.log('🚀 [Theater Page] Pre-loading booking data...');
            const startTime = performance.now();

            try {
                // Fetch all booking data in parallel
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
                console.log(`⚡ [Theater Page] Pre-loaded booking data in ${(endTime - startTime).toFixed(0)}ms`);

                // Store preloaded data
                setPreloadedData({
                    services: servicesData,
                    theaters: theatersData,
                    occasions: occasionsData,
                    isLoaded: true
                });

                // Store in window for BookingPopup to access
                (window as any).preloadedBookingData = {
                    services: servicesData,
                    theaters: theatersData,
                    occasions: occasionsData,
                    timestamp: Date.now()
                };

                console.log('✅ [Theater Page] Booking data cached for instant popup opening');

            } catch (error) {
                console.error('❌ [Theater Page] Error pre-loading booking data:', error);
            }
        };

        // Start preloading after a short delay to not block initial page render
        setTimeout(preloadBookingData, 500);
    }, [preloadedData.isLoaded]);

    const handleTheaterSelection = (index: number) => {
        setSelectedTheater(index);
        setSelectedTimeSlot('');
        // Reset gallery to first image when switching theater
        setCurrentImageIndex(0);

        // Scroll to theater details section
        setTimeout(() => {
            theaterDetailsRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }, 100); // Small delay to ensure state update

        // Fetch booked slots for the new theater
        const theaterName = filteredTheaters[index]?.name;
        if (selectedDate && theaterName) {
            const fetchBookedSlots = async () => {
                setIsLoadingBookedSlots(true);
                try {
                    const response = await fetch(`/api/booked-slots?date=${encodeURIComponent(selectedDate)}&theater=${encodeURIComponent(theaterName)}`);
                    const data = await response.json();

                    if (data.success) {
                        const slots = Array.isArray(data.bookedTimeSlots) ? data.bookedTimeSlots : [];
                        setBookedTimeSlots(slots);
                        applyBookedSlotsToMap(theaterName, slots);
                    } else {
                        setBookedTimeSlots([]);
                        applyBookedSlotsToMap(theaterName, []);
                    }
                } catch (error) {
                    setBookedTimeSlots([]);
                    applyBookedSlotsToMap(theaterName, []);
                } finally {
                    setIsLoadingBookedSlots(false);
                }
            };

            fetchBookedSlots();
        }
    };

    // Filter theaters based on search term, type, and member count (memoized)
    const filteredTheaters = useMemo(() => {
        return theaters.filter(theater => {
            const matchesSearch = theater.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = filterType === 'all' || theater.type === filterType;
            const matchesMemberCount = theater.capacityNumber >= memberCount;
            return matchesSearch && matchesType && matchesMemberCount;
        });
    }, [theaters, searchTerm, filterType, memberCount]);

    // Auto slideshow for main theater images - Matches About page timing
    useEffect(() => {
        if (!isAutoSlideshow) return;
        if (isSafariBrowser && isIOSDevice) return;
        if (!filteredTheaters.length) return;

        const currentTheater = filteredTheaters[selectedTheater] || filteredTheaters[0];
        const imagesCount = currentTheater?.images?.length || 0;

        if (imagesCount <= 1) return; // No need for slideshow with single image

        const interval = setInterval(() => {
            setCurrentImageIndex(prev => {
                const nextIndex = (prev + 1) % imagesCount;
                return nextIndex;
            });
        }, isSmallScreen ? 8000 : THEATER_SLIDE_DURATION_MS); // Slower on mobile

        return () => clearInterval(interval);
    }, [selectedTheater, filteredTheaters, isSafariBrowser, isIOSDevice, isSmallScreen, isAutoSlideshow]);

    // Auto slideshow for theater cards - Always running, every 2 seconds
    useEffect(() => {
        if (isIOSDevice || isSmallScreen) return;
        const intervals: Array<ReturnType<typeof setInterval>> = [];

        filteredTheaters.forEach((theater, index) => {
            const imagesCount = theater?.images?.length || 0;
            if (imagesCount > 1) {
                const interval = setInterval(() => {
                    setTheaterCardImageIndices(prev => ({
                        ...prev,
                        [index]: ((prev[index] || 0) + 1) % imagesCount
                    }));
                }, 2000 + (index * 200)); // Stagger slightly, but faster - every 2 seconds

                intervals.push(interval);
            }
        });

        return () => {
            intervals.forEach(interval => clearInterval(interval));
        };
    }, [filteredTheaters, isSafariBrowser, isIOSDevice, isSmallScreen]);

    const filteredTheaterNamesSignature = useMemo(() => {
        return filteredTheaters
            .map((t) => (t?.name ? String(t.name) : ''))
            .filter(Boolean)
            .join('|');
    }, [filteredTheaters]);

    // Fetch booked time slots only when date changes
    useEffect(() => {
        const fetchBookedSlots = async () => {
            if (!selectedDate || !filteredTheaters[selectedTheater]?.name) return;

            setIsLoadingBookedSlots(true);
            try {
                const response = await fetch(`/api/booked-slots?date=${encodeURIComponent(selectedDate)}&theater=${encodeURIComponent(filteredTheaters[selectedTheater].name)}`);
                const data = await response.json();

                if (data.success) {
                    setBookedTimeSlots(data.bookedTimeSlots);
                    setBookedSlotsMap((prev) => ({
                        ...prev,
                        [filteredTheaters[selectedTheater].name]: Array.isArray(data.bookedTimeSlots) ? data.bookedTimeSlots : [],
                    }));
                } else {

                    setBookedTimeSlots([]);
                    setBookedSlotsMap((prev) => ({
                        ...prev,
                        [filteredTheaters[selectedTheater].name]: [],
                    }));
                }
            } catch (error) {

                setBookedTimeSlots([]);
                setBookedSlotsMap((prev) => ({
                    ...prev,
                    [filteredTheaters[selectedTheater].name]: [],
                }));
            } finally {
                setIsLoadingBookedSlots(false);
            }
        };

        fetchBookedSlots();
    }, [selectedDate]);

    // Listen for real-time slot refresh events
    useEffect(() => {
        const handleRefreshBookedSlots = (event?: any) => {
            console.log('🔄 Theater page received refreshBookedSlots event:', event?.detail);
            if (selectedDate && filteredTheaters[selectedTheater]?.name) {
                const fetchBookedSlots = async () => {
                    console.log('🔄 Theater page fetching booked slots after refresh event...');
                    setIsLoadingBookedSlots(true);
                    try {
                        const response = await fetch(`/api/booked-slots?date=${encodeURIComponent(selectedDate)}&theater=${encodeURIComponent(filteredTheaters[selectedTheater].name)}`);
                        const data = await response.json();

                        if (data.success) {
                            console.log('🔄 Theater page updated booked slots:', data.bookedTimeSlots);
                            setBookedTimeSlots(data.bookedTimeSlots);
                            setBookedSlotsMap((prev) => ({
                                ...prev,
                                [filteredTheaters[selectedTheater].name]: Array.isArray(data.bookedTimeSlots) ? data.bookedTimeSlots : [],
                            }));
                        } else {
                            console.error('🔄 Theater page failed to fetch booked slots:', data.error);
                            setBookedTimeSlots([]);
                            setBookedSlotsMap((prev) => ({
                                ...prev,
                                [filteredTheaters[selectedTheater].name]: [],
                            }));
                        }
                    } catch (error) {
                        console.error('🔄 Theater page error fetching booked slots:', error);
                        setBookedTimeSlots([]);
                        setBookedSlotsMap((prev) => ({
                            ...prev,
                            [filteredTheaters[selectedTheater].name]: [],
                        }));
                    } finally {
                        setIsLoadingBookedSlots(false);
                    }
                };

                fetchBookedSlots();

                // Also refresh theater data to ensure time slots are up to date
                console.log('🔄 Theater page also refreshing theater data after booking change...');
                fetchTheaters(false); // Silent refresh without loading indicator
            } else {
                console.log('🔄 Theater page refresh event ignored - missing date or theater:', {
                    selectedDate,
                    theaterName: filteredTheaters[selectedTheater]?.name
                });
            }
        };

        window.addEventListener('refreshBookedSlots', handleRefreshBookedSlots);

        // Also listen for the more specific force refresh event
        const handleForceRefreshTheaterSlots = (event: any) => {
            console.log('🔄 Theater page received forceRefreshTheaterSlots event:', event.detail);
            const { date, theater, originalDate, originalTheater } = event.detail;

            // Check if this affects the current theater/date
            const affectsCurrentTheater = theater === filteredTheaters[selectedTheater]?.name ||
                originalTheater === filteredTheaters[selectedTheater]?.name;
            const affectsCurrentDate = date === selectedDate || originalDate === selectedDate;

            if (affectsCurrentTheater && affectsCurrentDate) {
                console.log('🔄 Force refreshing theater slots due to booking change...');
                handleRefreshBookedSlots(event);

                // Also refresh theater data to ensure time slots are up to date
                console.log('🔄 Force refresh also updating theater data...');
                fetchTheaters(false); // Silent refresh without loading indicator

                // Also add a second refresh after a short delay to ensure data is updated
                setTimeout(() => {
                    console.log('🔄 Second refresh to ensure data is updated...');
                    handleRefreshBookedSlots(event);
                    // Second theater data refresh
                    fetchTheaters(false);
                }, 1000);
            } else {
                console.log('🔄 Force refresh event ignored - does not affect current theater/date');
            }
        };

        window.addEventListener('forceRefreshTheaterSlots', handleForceRefreshTheaterSlots);

        // Also listen for direct theater data refresh events
        const handleDirectRefreshTheaterData = (event: any) => {
            console.log('🔄 Theater page received directRefreshTheaterData event:', event.detail);
            const { reason, date, theater, originalDate, originalTheater } = event.detail;

            if (reason === 'booking_updated') {
                console.log('🔄 Direct refresh triggered by booking update...');

                // Force refresh both theater data and booked slots
                fetchTheaters(false); // Silent refresh

                // Also refresh booked slots if we have the required data
                if (selectedDate && filteredTheaters[selectedTheater]?.name) {
                    const fetchBookedSlots = async () => {
                        try {
                            const response = await fetch(`/api/booked-slots?date=${encodeURIComponent(selectedDate)}&theater=${encodeURIComponent(filteredTheaters[selectedTheater].name)}`);
                            const data = await response.json();

                            if (data.success) {
                                console.log('🔄 Direct refresh updated booked slots:', data.bookedTimeSlots);
                                setBookedTimeSlots(data.bookedTimeSlots);
                                setBookedSlotsMap((prev) => ({
                                    ...prev,
                                    [filteredTheaters[selectedTheater].name]: Array.isArray(data.bookedTimeSlots) ? data.bookedTimeSlots : [],
                                }));
                            }
                        } catch (error) {
                            console.error('🔄 Direct refresh error fetching booked slots:', error);
                        }
                    };

                    fetchBookedSlots();
                }
            }
        };

        window.addEventListener('directRefreshTheaterData', handleDirectRefreshTheaterData);

        return () => {
            window.removeEventListener('refreshBookedSlots', handleRefreshBookedSlots);
            window.removeEventListener('forceRefreshTheaterSlots', handleForceRefreshTheaterSlots);
            window.removeEventListener('directRefreshTheaterData', handleDirectRefreshTheaterData);
        };
    }, [selectedDate, selectedTheater, filteredTheaters]);

    useEffect(() => {
        if (!selectedDate || filteredTheaters.length === 0) {
            setBookedSlotsMap({});
            return;
        }

        let isCancelled = false;
        const controller = new AbortController();

        const loadBookedSlotsForVisibleTheaters = async () => {
            const entries = await Promise.all(
                filteredTheaters.map(async (theater) => {
                    const theaterName = theater?.name;
                    if (!theaterName) {
                        return [theaterName, []] as const;
                    }
                    try {
                        const res = await fetch(
                            `/api/booked-slots?date=${encodeURIComponent(selectedDate)}&theater=${encodeURIComponent(theaterName)}`,
                            { signal: controller.signal }
                        );
                        const data = await res.json();
                        if (data.success && Array.isArray(data.bookedTimeSlots)) {
                            return [theaterName, data.bookedTimeSlots] as const;
                        }
                        return [theaterName, []] as const;
                    } catch (error) {
                        if (controller.signal.aborted) {
                            return [theaterName, bookedSlotsMap[theaterName] || []] as const;
                        }
                        return [theaterName, []] as const;
                    }
                })
            );

            if (!isCancelled) {
                setBookedSlotsMap((prev) => {
                    const updated = { ...prev };
                    entries.forEach(([name, slots]) => {
                        if (name) {
                            updated[name] = slots;
                        }
                    });
                    return updated;
                });
            }
        };

        loadBookedSlotsForVisibleTheaters();

        return () => {
            isCancelled = true;
            controller.abort();
        };
    }, [selectedDate, filteredTheaterNamesSignature]);

    const preFillBookingData = useCallback((bookingData: { date?: string; numberOfPeople?: number; time?: string; theaterName?: string }) => {
        if (bookingData.date) {
            setSelectedDate(bookingData.date);
        }

        if (bookingData.numberOfPeople) {
            setMemberCount(bookingData.numberOfPeople);
        }

        if (bookingData.time) {
            setSelectedTimeSlot(bookingData.time);
        }

        if (bookingData.theaterName) {
            const theaterIndex = theaters.findIndex(theater =>
                theater.name === bookingData.theaterName
            );
            if (theaterIndex !== -1) {
                setSelectedTheater(theaterIndex);
            }
        }
    }, [setSelectedDate, setMemberCount, setSelectedTimeSlot, setSelectedTheater, theaters]);

    return (
        <div className="theater-page">
            {/* Hero Section */}
            <section className="theater-hero">
                <div className="container">
                    <div className="hero-content">
                        <h1 className="hero-title">
                            Our <span className="highlight">Premium Theaters</span>
                        </h1>
                        <p className="hero-subtitle">
                            Experience luxury and comfort in our state-of-the-art private theaters
                        </p>
                        <div className="divider"></div>
                    </div>
                </div>
            </section>

            {/* Date and Day Section */}
            <section className="date-section">
                <div className="container">
                    <div className="date-card">
                        <div className="date-info">
                            <div className="current-date">
                                <span className="date-label">Today&apos;s Date:</span>
                                <span className="date-value">
                                  {isMounted
                                    ? currentTime.toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                      })
                                    : '--'}
                                </span>
                            </div>
                            <div className="current-time">
                                <span className="time-label">Current Time:</span>
                                <span className="time-value animated-time">
                                  {isMounted
                                    ? currentTime.toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                        hour12: true
                                      })
                                    : '--:--:--'}
                                </span>
                                <span style={{
                                    marginLeft: '70px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    fontSize: '0.8em',
                                    color: '#ff0000',
                                    backgroundColor: '#ffffff',
                                    padding: '4px 8px',
                                    borderRadius: '20px',
                                    border: '1px solid #ff0000'
                                }}>
                                    <span className="live-indicator-dot"></span>
                                    LIVE
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Filter Section */}
            <section className="filter-section">
                <div className="container">
                    <div className="filter-container">
                        <div className="search-box">
                            <div className="search-input-wrapper">
                                <svg
                                    className="search-icon"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <path
                                        d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search theaters..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="search-input"
                                />
                            </div>
                        </div>

                        <div className="filter-dropdowns">
                            <div className="dropdown-group">
                                <label className="dropdown-label">Theater Type:</label>
                                <select
                                    value={filterType}
                                    onChange={(e) => {
                                        setFilterType(e.target.value);
                                        setIsTypeDropdownOpen(false);
                                    }}
                                    onMouseDown={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                                    className={`filter-dropdown ${isTypeDropdownOpen ? 'open' : ''}`}
                                >
                                    <option value="all">All Theaters</option>
                                    {/* Dynamic theater types from database */}
                                    {Array.from(new Set(theaters.map(t => t.type).filter(type => type && type.trim() !== ''))).map(type => (
                                        <option key={type} value={type}>
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="dropdown-group">
                                <label className="dropdown-label">Members:</label>
                                <select
                                    value={memberCount}
                                    onChange={(e) => {
                                        setMemberCount(parseInt(e.target.value));
                                        setIsMemberDropdownOpen(false);
                                    }}
                                    onMouseDown={() => setIsMemberDropdownOpen(!isMemberDropdownOpen)}
                                    className={`filter-dropdown ${isMemberDropdownOpen ? 'open' : ''}`}
                                >
                                    {/* Dynamic member count based on max theater capacity */}
                                    {Array.from({ length: Math.max(...theaters.map(t => t.capacityNumber || 1), 1) }, (_, i) => i + 1).map(count => (
                                        <option key={count} value={count}>
                                            {count} {count === 1 ? 'Member' : 'Members'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Theater Selection Section */}
            <section className="theater-selection-section">
                <div className="container">
                    {/* Section Header */}
                    <div className="selection-header">
                        <h2 className="selection-title">Select Your Theater</h2>
                        <p className="selection-subtitle">Choose from our premium private theaters</p>
                        <div className="selection-divider"></div>
                    </div>

                    {/* Theater Cards Grid */}
                    <div className="theater-cards-grid">
                        {isLoadingTheaters ? (
                            <div className="loading-theaters">
                                <div className="loading-spinner"></div>
                                <p>Loading theaters...</p>
                            </div>
                        ) : filteredTheaters.length === 0 ? (
                            <div className="no-theaters">
                                <p>No theaters found matching your criteria.</p>
                            </div>
                        ) : (
                            filteredTheaters.map((theater, index) => {
                                const totalSlotCount = (() => {
                                    if (!Array.isArray(theater.timeSlots)) return 0;
                                    return theater.timeSlots.filter((slot: any) => {
                                        if (!slot) return false;
                                        if (typeof slot === 'object') {
                                            if (slot.hasOwnProperty('isActive') && slot.isActive === false) {
                                                return false;
                                            }
                                            const status = String(slot.bookingStatus || '').toLowerCase();
                                            if (slot.isBooked === true) return false;
                                            if (status === 'booked' || status === 'going' || status === 'reserved') {
                                                return false;
                                            }
                                            return true;
                                        }
                                        // Treat legacy string slots as available by default
                                        return true;
                                    }).length;
                                })();

                                const bookedCountForCard = selectedDate
                                    ? (bookedSlotsMap[theater.name]?.length || 0)
                                    : 0;
                                const availableSlotCount = Math.max(totalSlotCount - bookedCountForCard, 0);

                                return (
                                    <div
                                        key={`${theater.name}-${theater.id}`}
                                        className={`theater-selection-card ${selectedTheater === index ? 'selected' : ''}`}
                                        onClick={() => handleTheaterSelection(index)}
                                    >


                                    {/* Theater Image */}
                                    <div className="card-image-container">
                                        <div className="card-image-glow"></div>
                                        {(() => {
                                            // Get current image for this theater card
                                            const currentCardImageIndex = theaterCardImageIndices[index] || 0;
                                            const theaterImages = theater.images || [];
                                            const displayImage = theaterImages.length > 0
                                                ? theaterImages[currentCardImageIndex] || theater.image
                                                : theater.image;

                                            return (
                                                <>
                                                    {theater.youtubeLink && (
                                                        <button
                                                            type="button"
                                                            className="watch-button"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                window.open(theater.youtubeLink, '_blank', 'noopener,noreferrer');
                                                            }}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="16" viewBox="0 0 256 180"><path fill="#f00" d="M250.346 28.075A32.18 32.18 0 0 0 227.69 5.418C207.824 0 127.87 0 127.87 0S47.912.164 28.046 5.582A32.18 32.18 0 0 0 5.39 28.24c-6.009 35.298-8.34 89.084.165 122.97a32.18 32.18 0 0 0 22.656 22.657c19.866 5.418 99.822 5.418 99.822 5.418s79.955 0 99.82-5.418a32.18 32.18 0 0 0 22.657-22.657c6.338-35.348 8.291-89.1-.164-123.134"/><path fill="#fff" d="m102.421 128.06l66.328-38.418l-66.328-38.418z"/></svg>
                                                            <span className="watch-button-text">Watch video</span>
                                                        </button>
                                                    )}
                                                    <Image
                                                        key={`${theater.name}-card-${currentCardImageIndex}`}
                                                        src={displayImage}
                                                        alt={theater.name}
                                                        width={400}
                                                        height={280}
                                                        className="card-theater-image"
                                                        sizes="(max-width: 768px) 92vw, (max-width: 1200px) 420px, 400px"
                                                        quality={isSmallScreen ? 55 : 75}
                                                        loading="lazy"
                                                    />
                                                    {/* Image indicators for multiple images */}
                                                    {theaterImages.length > 1 && (
                                                        <div className="card-image-indicators">
                                                            {theaterImages.map((_: string, imgIndex: number) => (
                                                                <div
                                                                    key={imgIndex}
                                                                    className={`indicator-dot ${imgIndex === currentCardImageIndex ? 'active' : ''}`}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                    {/* Image count badge */}
                                                    {theaterImages.length > 1 && (
                                                        <div className="card-image-count">
                                                            {currentCardImageIndex + 1}/{theaterImages.length}
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>

                                    {/* Theater Information */}
                                    <div className="card-content">
                                        <h3 className="card-theater-name">{theater.name}</h3>
                                        <div className='card-tags'>
                                            <span className="card-tag-card-location">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                                                    <path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 4.63 5.44 11.18 6.28 12.16a1 1 0 0 0 1.44 0C13.56 20.18 19 13.63 19 9a7 7 0 0 0-7-7m0 9.5A2.5 2.5 0 1 1 14.5 9A2.5 2.5 0 0 1 12 11.5" />
                                                </svg>
                                                Dwarka
                                            </span>
                                            <span className="card-tag-card-availability">
                                                {selectedDate ? (
                                                    (() => {
                                                        if (totalSlotCount === 0) {
                                                            return 'Slots Not Configured';
                                                        }
                                                        return (
                                                            <>
                                                                <strong>{availableSlotCount}</strong> {availableSlotCount === 1 ? 'Slot' : 'Slots'} Available
                                                            </>
                                                        );
                                                    })()
                                                ) : (
                                                    'Select Date to View Availability'
                                                )}
                                            </span>
                                            <span className="card-tag">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 512 512">
                                                    <path fill="currentColor" d="M368 128h.09m111.46-32h-91.06l8.92-35.66l38.32-13.05c8.15-2.77 13-11.43 10.65-19.71a16 16 0 0 0-20.54-10.73l-47 16a16 16 0 0 0-10.36 11.27L355.51 96H224.45c-8.61 0-16 6.62-16.43 15.23A16 16 0 0 0 224 128h2.75l1 8.66A8.3 8.3 0 0 0 236 144c39 0 73.66 10.9 100.12 31.52A121.9 121.9 0 0 1 371 218.07a123.4 123.4 0 0 1 10.12 29.51a7.83 7.83 0 0 0 3.29 4.88a72 72 0 0 1 26.38 86.43a7.92 7.92 0 0 0-.15 5.53A96 96 0 0 1 416 376c0 22.34-7.6 43.63-21.4 59.95a80.1 80.1 0 0 1-28.78 21.67a8 8 0 0 0-4.21 4.37a108.2 108.2 0 0 1-17.37 29.86a2.5 2.5 0 0 0 1.9 4.11h49.21a48.22 48.22 0 0 0 47.85-44.14L477.4 128h2.6a16 16 0 0 0 16-16.77c-.42-8.61-7.84-15.23-16.45-15.23" />
                                                    <path fill="currentColor" d="M108.69 320a23.87 23.87 0 0 1 17 7l15.51 15.51a4 4 0 0 0 5.66 0L162.34 327a23.87 23.87 0 0 1 17-7h196.58a8 8 0 0 0 8.08-7.92V312a40.07 40.07 0 0 0-32-39.2c-.82-29.69-13-54.54-35.51-72C295.67 184.56 267.85 176 236 176h-72c-68.22 0-114.43 38.77-116 96.8A40.07 40.07 0 0 0 16 312a8 8 0 0 0 8 8Zm77.25 32a8 8 0 0 0-5.66 2.34l-22.14 22.15a20 20 0 0 1-28.28 0l-22.14-22.15a8 8 0 0 0-5.66-2.34h-69.4a15.93 15.93 0 0 0-15.76 13.17A65 65 0 0 0 16 376c0 30.59 21.13 55.51 47.26 56c2.43 15.12 8.31 28.78 17.16 39.47C93.51 487.28 112.54 496 134 496h132c21.46 0 40.49-8.72 53.58-24.55c8.85-10.69 14.73-24.35 17.16-39.47c26.13-.47 47.26-25.39 47.26-56a65 65 0 0 1-.9-10.83A15.93 15.93 0 0 0 367.34 352Z" />
                                                    <path fill="currentColor" d="M108.69 320a23.87 23.87 0 0 1 17 7l15.51 15.51a4 4 0 0 0 5.66 0L162.34 327a23.87 23.87 0 0 1 17-7h196.58a8 8 0 0 0 8.08-7.92V312a40.07 40.07 0 0 0-32-39.2c-.82-29.69-13-54.54-35.51-72C295.67 184.56 267.85 176 236 176h-72c-68.22 0-114.43 38.77-116 96.8A40.07 40.07 0 0 0 16 312a8 8 0 0 0 8 8Zm77.25 32a8 8 0 0 0-5.66 2.34l-22.14 22.15a20 20 0 0 1-28.28 0l-22.14-22.15a8 8 0 0 0-5.66-2.34h-69.4a15.93 15.93 0 0 0-15.76 13.17A65 65 0 0 0 16 376c0 30.59 21.13 55.51 47.26 56c2.43 15.12 8.31 28.78 17.16 39.47C93.51 487.28 112.54 496 134 496h132c21.46 0 40.49-8.72 53.58-24.55c8.85-10.69 14.73-24.35 17.16-39.47c26.13-.47 47.26-25.39 47.26-56a65 65 0 0 0-.9-10.83A15.93 15.93 0 0 0 367.34 352Z" />
                                                </svg>
                                                Food &amp; Drink
                                            </span>
                                            <span className="card-tag">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                                                    <path fill="currentColor" d="M2.25 4.025A1.75 1.75 0 0 1 4.025 2.25l7.488.095a2.75 2.75 0 0 1 1.913.807l7.299 7.298c.423.423.798 1.034.952 1.687c.156.664.096 1.476-.529 2.1l-6.91 6.911c-.625.625-1.437.685-2.101.529a3.66 3.66 0 0 1-1.687-.952l-7.298-7.299a2.76 2.76 0 0 1-.807-1.913z" />
                                                </svg>
                                                Free Cancellation*
                                            </span>
                                            <span className="card-tag">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                                                    <g fill="none">
                                                        <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                                                        <path fill="currentColor" d="M17.707 15.707a.414.414 0 0 1 .586 0a2.415 2.415 0 0 0 2.707.491V20a1 1 0 1 1 0 2H3a1 1 0 1 1 0-2v-3.802c.89.405 1.975.241 2.707-.49a.414.414 0 0 1 .586 0a2.414 2.414 0 0 0 3.414 0a.414.414 0 0 1 .586 0a2.414 2.414 0 0 0 3.414 0a.414.414 0 0 1 .586 0a2.414 2.414 0 0 0 3.414 0ZM16 6a1 1 0 0 1 1 1v2h1a3 3 0 0 1 3 3v1.586l-.707.707a.414.414 0 0 1-.586 0a2.414 2.414 0 0 0-3.414 0a.414.414 0 0 1-.586 0a2.414 2.414 0 0 0-3.414 0a.414.414 0 0 1-.586 0a2.414 2.414 0 0 0-3.414 0a.414.414 0 0 1-.586 0a2.414 2.414 0 0 0-3.414 0a.414.414 0 0 1-.586 0L3 13.586V12a3 3 0 0 1 3-3h1V7a1 1 0 0 1 2 0v2h2V7a1 1 0 1 1 2 0v2h2V7a1 1 0 0 1 1-1m-3.5-4c-.319.638-.028 1.05.225 1.41c.144.203.275.39.275.59a1 1 0 1 1-2 0c0-.552.5-1.5 1.5-2m-4 0c-.319.638-.028 1.05.225 1.41c.144.203.275.39.275.59a1 1 0 0 1-2 0c0-.552.5-1.5 1.5-2m8 0c-.319.638-.028 1.05.225 1.41c.144.203.275.39.275.59a1 1 0 1 1-2 0c0-.552.5-1.5 1.5-2" />
                                                    </g>
                                                </svg>
                                                Add Cake, Fog entry etc
                                            </span>


                                        </div>
                                        <div className="card-capacity">
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="capacity-icon">
                                                <path d="M8 8a3 3 0 100-6 3 3 0 000 6zM8 10c-2.67 0-8 1.34-8 4v1a1 1 0 001 1h14a1 1 0 001-1v-1c0-2.66-5.33-4-8-4z" fill="currentColor" />
                                            </svg>
                                            <span className="capacity-text">{theater.capacity}</span>
                                        </div>
                                        <div className="card-price">
                                            <div className="price-info">
                                                <span className="price-label">Starting from</span>
                                                <span className="price-value">{theater.price}</span>
                                            </div>
                                            <div className='card-prices'>
                                                {theater.decorationFeeDisplay && (
                                                    <span className="card-tag">
                                                       
                                                        Decoration fee - {theater.decorationFeeDisplay}
                                                    </span>
                                                )}
                                                {theater.extraGuestFeeDisplay && (
                                                    <span className="card-tag">
                                                       
                                                        Per guest fee - {theater.extraGuestFeeDisplay}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>


                                </div>
                            );
                        })
                    )}
                    </div>

                    {/* Scroll Instruction */}
                    <div className="scroll-instruction">
                        <p>Scroll down to see theater details and book your slot</p>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="scroll-arrow">
                            <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </div>
            </section>

            {/* Selected Theater Details */}
            <section className="theater-details-section" ref={theaterDetailsRef}>
                <div className="container">
                    <div className="theater-details">
                        {/* Left Panel - Theater Information */}
                        <div className="theater-info-panel">
                            <div className="theater-info-content">
                                {!isLoadingTheaters && filteredTheaters.length > 0 ? (
                                    <>
                                        <h2 className="detail-title">{filteredTheaters[selectedTheater]?.name || filteredTheaters[0]?.name}</h2>
                                        <div className="detail-price">
                                            <span className="price-amount">{filteredTheaters[selectedTheater]?.price || filteredTheaters[0]?.price}</span>
                                        </div>
                                        <div className="detail-specs">
                                            <span className="spec-label">Capacity:</span>
                                            <span className="spec-value">{filteredTheaters[selectedTheater]?.capacity || filteredTheaters[0]?.capacity}</span>
                                        </div>

                                        <div className="booking-features">
                                            <h3 className="features-title">What&apos;s Included</h3>
                                            <div className="features-list">
                                                {(() => {
                                                    const features = filteredTheaters[selectedTheater]?.features || filteredTheaters[0]?.features || [];

                                                    if (!Array.isArray(features) || features.length === 0) {
                                                        return (
                                                            <div className="feature-item">
                                                                <div className="feature-checkmark">ℹ️</div>
                                                                <span className="feature-text">No features configured for this theater</span>
                                                            </div>
                                                        );
                                                    }

                                                    return features.map((feature, index) => (
                                                        <div key={index} className="feature-item">
                                                            <div className="feature-checkmark">✓</div>
                                                            <span className="feature-text">{feature}</span>
                                                        </div>
                                                    ));
                                                })()}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="loading-details">
                                        <p>Loading theater details...</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Panel - Theater Image Slideshow and Booking Controls */}
                        <div className="theater-booking-panel">
                            <div className="theater-detail-image">
                                <div className="detail-glow"></div>
                                {!isLoadingTheaters && filteredTheaters.length > 0 && (() => {
                                    const currentTheater = filteredTheaters[selectedTheater] || filteredTheaters[0];

                                    // Build images array strictly for selected theater
                                    let imagesArray: string[] = [];
                                    if (currentTheater?.images) {
                                        if (Array.isArray(currentTheater.images)) {
                                            imagesArray = currentTheater.images;
                                        } else if (typeof currentTheater.images === 'string') {
                                            try {
                                                const parsed = JSON.parse(currentTheater.images);
                                                imagesArray = Array.isArray(parsed) ? parsed : [currentTheater.images];
                                            } catch {
                                                imagesArray = [currentTheater.images];
                                            }
                                        }
                                    } else if (currentTheater?.image) {
                                        imagesArray = [currentTheater.image];
                                    }

                                    // Normalize URLs (Cloudinary http->https) and ensure at least one valid image
                                    imagesArray = (imagesArray || [])
                                        .filter(Boolean)
                                        .map((url) => {
                                            const u = typeof url === 'string' ? url.trim() : '';
                                            if (u.startsWith('http://res.cloudinary.com')) return u.replace('http://', 'https://');
                                            return u;
                                        })
                                        .filter(Boolean);





                                    const currentImage = imagesArray[currentImageIndex] || imagesArray[0];

                                    return (
                                        <div className="slideshow-container">
                                            <div className="slideshow-wrapper">
                                                
                                                <div className="slideshow-image-container">
                                                    {imagesArray.map((img: string, i: number) => (
                                                        <div
                                                            key={`theater-slide-${i}`}
                                                            className={`slideshow-image ${i === currentImageIndex ? 'active' : ''}`}
                                                        >
                                                            <Image
                                                                src={img}
                                                                alt={currentTheater?.name || 'Theater'}
                                                                width={600}
                                                                height={400}
                                                                className="image-content"
                                                                sizes="(max-width: 768px) 92vw, (max-width: 1200px) 560px, 600px"
                                                                quality={isSmallScreen ? 60 : 80}
                                                                priority={i === 0}
                                                                loading={i === 0 ? 'eager' : 'lazy'}
                                                            />
                                                        </div>
                                                    ))}
                                                    <div className="slideshow-overlay"></div>
                                                    {imagesArray.length > 1 && (
                                                        <div className="slideshow-progress">
                                                            <div
                                                                key={currentImageIndex}
                                                                className="slideshow-progress-fill"
                                                                style={{ animationDuration: `${THEATER_SLIDE_DURATION_MS}ms` }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* YouTube Button - Top Left Corner (Shows for all theaters, uses theater's specific link) */}
                                                {currentTheater?.youtubeLink ? (
                                                    <a
                                                        href={currentTheater.youtubeLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="youtube-overlay-button"
                                                        title="Watch Theater Video"
                                                    >
                                                        <span className="youtube-text">Watch Video</span>
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 24 24"
                                                            fill="currentColor"
                                                            className="youtube-icon"
                                                        >
                                                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                                        </svg>
                                                    </a>
                                                ) : (
                                                    <div
                                                        className="youtube-overlay-button youtube-disabled"
                                                        title="No video available for this theater"
                                                    >
                                                        <span className="youtube-text">Watch Video</span>
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 24 24"
                                                            fill="currentColor"
                                                            className="youtube-icon"
                                                        >
                                                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                                        </svg>
                                                    </div>
                                                )}

                                                {/* Navigation Dots (fixed 4 for About-style parity) */}
                                                {imagesArray.length > 1 && (
                                                    <div className="slideshow-dots">
                                                        {Array.from({ length: 4 }).map((_, i) => (
                                                            <button
                                                                key={`theater-dot-${i}`}
                                                                className={`dot ${i === (currentImageIndex % 4) ? 'active' : ''}`}
                                                                onClick={() => setCurrentImageIndex(i)}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Movie Selection Indicator */}
                            {searchParams.get('movie') && (
                                <div className="movie-selection-indicator">
                                    <div className="movie-indicator-header">
                                        <span className="movie-icon">🎬</span>
                                        <span className="movie-label">Selected Movie</span>
                                    </div>
                                    <div className="movie-title">
                                        {decodeURIComponent(searchParams.get('movie') || '')}
                                    </div>
                                </div>
                            )}

                            <div className="booking-controls">
                                <div className="date-selection">
                                    <label className="booking-label">Select Date</label>
                                    <button
                                        className="date-button"
                                        onClick={openDatePicker}
                                    >
                                        <span className="calendar-icon">📅</span>
                                        {selectedDate}
                                    </button>
                                </div>

                                <div className="time-slots">
                                    <label className="booking-label">
                                        Available Time Slots
                                        {isLoadingBookedSlots && <span className="loading-indicator">Checking availability...</span>}
                                    </label>
                                    <div className="time-slots-grid">
                                        {isLoadingBookedSlots ? (
                                            <div className="loading-time-slots">
                                                <div className="loading-spinner-small"></div>
                                                <p>Loading available slots...</p>
                                            </div>
                                        ) : (() => {
                                            // Get time slots from selected theater's database data only
                                            const selectedTheaterData = filteredTheaters[selectedTheater];
                                            const dbTimeSlots = selectedTheaterData?.rawTimeSlots || selectedTheaterData?.timeSlots || [];



                                            // Enhanced time slots processing with better logging





                                            // Enhanced helper function to convert 24-hour to 12-hour format
                                            const formatTo12Hour = (time24: string) => {
                                                try {
                                                    const [hours, minutes] = time24.split(':');
                                                    const hour = parseInt(hours);
                                                    const min = minutes || '00';

                                                    // Convert to 12-hour format
                                                    const ampm = hour >= 12 ? 'PM' : 'AM';
                                                    const hour12 = hour % 12 || 12;

                                                    const formatted = `${hour12}:${min} ${ampm}`;

                                                    return formatted;
                                                } catch (error) {

                                                    return time24; // Return original if conversion fails
                                                }
                                            };

                                            // Debug each slot before filtering
                                            dbTimeSlots.forEach((slot: any, index: number) => {

                                                if (slot && typeof slot === 'object') {



                                                }
                                            });

                                            // Process database time slots only - no fallback to hardcoded slots
                                            const allTimeSlots = dbTimeSlots.length > 0
                                                ? dbTimeSlots
                                                    .filter((slot: any) => {
                                                        // Only filter out slots that are explicitly marked as inactive
                                                        if (slot && typeof slot === 'object' && slot.hasOwnProperty('isActive')) {
                                                            return slot.isActive !== false; // Include true, null, undefined, etc.
                                                        }
                                                        return true; // Include all other slots (strings, objects without isActive)
                                                    })
                                                    .map((slot: any) => {


                                                        if (typeof slot === 'string') {
                                                            // Check if string is already in 12-hour format or needs conversion
                                                            if (slot.includes('AM') || slot.includes('PM') || slot.includes('am') || slot.includes('pm')) {
                                                                return slot;
                                                            } else {
                                                                // Try to convert 24-hour format string to 12-hour
                                                                const timeRangeMatch = slot.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
                                                                if (timeRangeMatch) {
                                                                    const [, startHour, startMin, endHour, endMin] = timeRangeMatch;
                                                                    const startTime12 = formatTo12Hour(`${startHour}:${startMin}`);
                                                                    const endTime12 = formatTo12Hour(`${endHour}:${endMin}`);
                                                                    return `${startTime12} - ${endTime12}`;
                                                                }
                                                                return slot;
                                                            }
                                                        } else if (slot && slot.timeRange) {
                                                            // Use pre-formatted timeRange if available
                                                            return slot.timeRange;
                                                        } else if (slot && slot.startTime && slot.endTime) {
                                                            // Convert database time slot object to display format
                                                            try {
                                                                const startTime12 = formatTo12Hour(slot.startTime);
                                                                const endTime12 = formatTo12Hour(slot.endTime);
                                                                const displayFormat = `${startTime12} - ${endTime12}`;

                                                                return displayFormat;
                                                            } catch (error) {

                                                                return `${slot.startTime} - ${slot.endTime}`;
                                                            }
                                                        }

                                                        return String(slot);
                                                    })
                                                : []; // Empty array if no database slots





                                            // Show all time slots - no time-based filtering


                                            // Robust time normalization so edited bookings with slightly different
                                            // formatting (like leading zeros) still match configured time slots
                                            const normalizeTimeString = (value: string | null | undefined) => {
                                                if (!value) return '';
                                                const trimmed = String(value).trim();
                                                if (!trimmed) return '';
                                                const parts = trimmed.split('-').map(part => part.trim());
                                                const normalizedParts = parts.map((part) => {
                                                    const match = part.match(/(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)/i);
                                                    if (!match) {
                                                        return part.replace(/\s+/g, ' ').toUpperCase();
                                                    }
                                                    const hour = parseInt(match[1], 10);
                                                    const minutes = match[2];
                                                    const period = match[3].toUpperCase();
                                                    const normalizedHour = String(hour);
                                                    return `${normalizedHour}:${minutes} ${period}`;
                                                });
                                                return normalizedParts.join(' - ');
                                            };

                                            // If no time slots available from database, show message
                                            if (allTimeSlots.length === 0) {
                                                return (
                                                    <div className="no-slots-message">
                                                        <span className="no-slots-icon">🕐</span>
                                                        <p>No time slots configured for this theater</p>
                                                        <p className="text-sm">Please contact admin to add time slots</p>
                                                    </div>
                                                );
                                            }




                                            return allTimeSlots.map((timeSlot: string) => {
                                                const normalizedSlot = normalizeTimeString(timeSlot);
                                                const isBooked = !!normalizedSlot && bookedTimeSlots.some((slot: string) => normalizeTimeString(slot) === normalizedSlot);
                                                const isSelected = selectedTimeSlot === timeSlot;

                                                // Debug logging for each slot


                                                if (isBooked) {

                                                }

                                                // Check if slot time is gone (1 hour before start time)
                                                const isTimeGone = (() => {
                                                    if (!selectedDate || !timeSlot) return false;

                                                    try {
                                                        const now = new Date();
                                                        const selectedDateObj = new Date(selectedDate);

                                                        // Only check for today's date
                                                        if (selectedDateObj.toDateString() !== now.toDateString()) {
                                                            return false;
                                                        }

                                                        // Parse time slot to get start time
                                                        const timeMatch = timeSlot.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
                                                        if (!timeMatch) return false;

                                                        const [, hours, minutes, period] = timeMatch;
                                                        let hour24 = parseInt(hours);

                                                        // Convert to 24-hour format
                                                        if (period.toUpperCase() === 'PM' && hour24 !== 12) {
                                                            hour24 += 12;
                                                        } else if (period.toUpperCase() === 'AM' && hour24 === 12) {
                                                            hour24 = 0;
                                                        }

                                                        // Create slot start time
                                                        const slotStartTime = new Date(now);
                                                        slotStartTime.setHours(hour24, parseInt(minutes), 0, 0);

                                                        // Check if current time is 1 hour or more before slot start time
                                                        const oneHourBefore = new Date(slotStartTime.getTime() - (60 * 60 * 1000));
                                                        const isGone = now.getTime() >= oneHourBefore.getTime();

                                                        if (isGone) {

                                                        }

                                                        return isGone;
                                                    } catch (error) {

                                                        return false;
                                                    }
                                                })();

                                                return (
                                                    <button
                                                        key={timeSlot}
                                                        className={`time-slot ${isSelected ? 'selected' : ''} ${isBooked ? 'booked' : ''} ${isTimeGone ? 'time-gone' : ''}`}
                                                        onClick={() => !isBooked && !isTimeGone && setSelectedTimeSlot(timeSlot)}
                                                        disabled={isBooked || isTimeGone}
                                                    >
                                                        {isTimeGone ? 'Oops Slot Time Gone' : isBooked ? 'Slot Booked' : timeSlot}
                                                    </button>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>

                                <button
                                    className={`book-button ${!selectedTimeSlot ? 'disabled' : ''}`}
                                    disabled={!selectedTimeSlot}
                                    onClick={() => {
                                        if (!selectedTimeSlot || isBookingButtonClicked) return; // Guard click when disabled or already clicked

                                        // Debounce button clicks
                                        setIsBookingButtonClicked(true);
                                        setTimeout(() => setIsBookingButtonClicked(false), 1000); // Reset after 1 second

                                        // Simple direct approach - no time restrictions
                                        // Auto-reset is now handled in openBookingPopup function
                                        console.log('🎯 [Theater] Book button clicked, opening popup...');
                                        openBookingPopup(filteredTheaters[selectedTheater], selectedDate, selectedTimeSlot);
                                    }}
                                >
                                    Book This Theater
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="theater-features-section">
                <div className="container">
                    <div className="features-header">
                        <h2 className="features-title">Why Choose Our Theaters?</h2>
                        <p className="features-subtitle">Premium amenities and services for the ultimate entertainment experience</p>
                    </div>
                    <div className="features-grid-main">
                        <div className="feature-card">
                            <div className="feature-icon-large">
                                <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24"><path fill="currentColor" d="M6 15h1.5v-2h2v2H11V9H9.5v2.5h-2V9H6zm7 0h4q.425 0 .713-.288T18 14v-4q0-.425-.288-.712T17 9h-4zm1.5-1.5v-3h2v3zM4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h16q.825 0 1.413.588T22 6v12q0 .825-.587 1.413T20 20z" /></svg>
                            </div>
                            <h3 className="feature-title">Full HD Projection</h3>
                            <p className="feature-description">Crystal clear Full HD resolution for the ultimate viewing experience</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon-large">
                                <svg xmlns="http://www.w3.org/2000/svg" width="55" height="36" viewBox="0 0 550 360" fill="none" className="sound-bars-svg">
                                    <path d="M529.04 156.13H549.922V203.87H529.04V156.13Z" fill="white" className="sound-bar" style={{ animationDelay: '0s' }} />
                                    <path d="M487.89 217.848H508.772V142.152H487.89V217.848Z" fill="white" className="sound-bar" style={{ animationDelay: '0.1s' }} />
                                    <path d="M447.431 257.002H468.313V102.998H447.431V257.002Z" fill="white" className="sound-bar" style={{ animationDelay: '0.2s' }} />
                                    <path d="M408.969 287.215H429.852V74.1946H408.969V287.163V287.215Z" fill="white" className="sound-bar" style={{ animationDelay: '0.3s' }} />
                                    <path d="M367.793 235.194H388.675V124.807H367.793V235.194Z" fill="white" className="sound-bar" style={{ animationDelay: '0.4s' }} />
                                    <path d="M325.965 318.721H346.847V36.5554H325.899V318.721H325.965Z" fill="white" className="sound-bar" style={{ animationDelay: '0.5s' }} />
                                    <path d="M284.802 359.177H305.684V0.822754H284.802V359.177Z" fill="white" className="sound-bar" style={{ animationDelay: '0.6s' }} />
                                    <path d="M244.343 303.854H265.225V56.1454H244.343V303.855V303.854Z" fill="white" className="sound-bar" style={{ animationDelay: '0.7s' }} />
                                    <path d="M202.488 233.509H223.37V129.099H202.488V233.509Z" fill="white" className="sound-bar" style={{ animationDelay: '0.8s' }} />
                                    <path d="M162.03 208.619H182.912V151.289H162.03V208.714V208.619Z" fill="white" className="sound-bar" style={{ animationDelay: '0.9s' }} />
                                    <path d="M121.571 239.291H142.453V120.668H121.571V239.329V239.291Z" fill="white" className="sound-bar" style={{ animationDelay: '1.0s' }} />
                                    <path d="M81.7646 296.714H102.647V56.498H81.7658V296.756L81.7646 296.714Z" fill="white" className="sound-bar" style={{ animationDelay: '1.1s' }} />
                                    <path d="M41.3068 260.016H62.1889V97.9216H41.3068V260.056V260.016Z" fill="white" className="sound-bar" style={{ animationDelay: '1.2s' }} />
                                    <path d="M0.078125 217.848H20.9602V142.152H0.078125V217.848Z" fill="white" className="sound-bar" style={{ animationDelay: '1.3s' }} />
                                </svg>
                            </div>
                            <h3 className="feature-title">Premium Audio</h3>
                            <p className="feature-description">Surround sound system with professional-grade speakers</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon-large">
                                <svg xmlns="http://www.w3.org/2000/svg" width="33" height="37" viewBox="0 0 325 368" fill="none">
                                    <path d="M6.57998 270.992C15.655 253.428 34.8133 241.658 57.9866 244.573C82.4899 247.565 106.794 252.009 130.77 257.883C167.62 267.087 199.905 284.778 223.775 300.93L231.842 306.54L239.175 311.948L245.738 317.008L251.495 321.665L256.39 325.808L260.423 329.328C275.878 343.097 265.373 365.592 247.865 367.242L245.812 367.333H88.255C57.4183 367.333 31.7883 351.842 13.015 328.357C-1.17501 310.628 -2.38501 288.335 6.59832 270.992H6.57998ZM291.333 0.666748C307.705 0.666748 314.763 16.0667 318.228 30.1834L319.328 35.0967L319.768 37.4434C322.408 52.0551 323.82 71.2134 324.388 90.9034C325.488 129.862 323.252 175.273 318.393 197.145C309.923 235.315 297.493 261.843 282.607 277.83C267.463 294.147 247.003 301.498 228.138 292.057C213.673 284.833 205.038 267.655 200.308 253.007C193.4 231.657 193.509 208.656 200.62 187.373C204.47 175.787 211.4 166.437 219.027 157.545L225.682 150.01C233.785 140.935 241.907 131.86 247.443 120.805C255.51 104.672 257.71 87.0167 258.388 69.2884L258.645 58.6551L258.81 48.3884L258.92 45.8584L259.287 40.7251C261.028 20.9617 267.793 0.666748 291.333 0.666748Z" fill="white" />
                                </svg>
                            </div>
                            <h3 className="feature-title">Luxury Seating</h3>
                            <p className="feature-description">Comfortable reclining seats with premium materials</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon-large">
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="30" viewBox="0 0 224 300" fill="none">
                                    <path d="M93.2355 15.6749C86.6271 18.0318 81.2048 22.8833 78.1305 29.1899L77.0075 29.1601C71.8471 29.1547 66.7883 30.5948 62.4044 33.3172C58.0205 36.0395 54.4867 39.9354 52.2035 44.5632C46.1122 46.6706 40.9534 50.8487 37.6265 56.3693C34.2996 61.8899 33.0155 68.403 33.998 74.7732C32.1165 76.774 30.5596 79.0199 29.3274 81.5109C24.2861 83.2397 19.8551 86.3948 16.5722 90.5932C13.2894 94.7916 11.2959 99.8527 10.8337 105.162C7.04578 108.504 4.15934 112.744 2.44011 117.494C0.720891 122.244 0.224139 127.349 0.995585 132.341L1.00552 132.371L24.1599 278.959C25.0734 284.622 27.973 289.775 32.3394 293.495C36.7058 297.215 42.2538 299.259 47.99 299.261H176.184C188.009 299.261 198.146 290.665 200.014 278.959L223.168 132.421V132.391C223.803 128.512 223.665 124.545 222.761 120.72C221.857 116.895 220.205 113.286 217.901 110.101C217.981 109.253 218.021 108.408 218.021 107.567C218.029 101.83 216.241 96.2352 212.908 91.5659C209.576 86.8967 204.865 83.3876 199.438 81.5307C198.224 79.0596 196.65 76.7822 194.767 74.7732C194.966 73.4085 195.068 72.0172 195.075 70.5995C195.082 64.8617 193.293 59.2656 189.959 54.5962C186.624 49.9268 181.911 46.4184 176.482 44.5632C174.565 40.6555 171.749 37.258 168.265 34.6495C164.781 32.0411 160.727 30.296 156.438 29.5576C154.92 26.3598 152.785 23.4939 150.155 21.1249C147.525 18.7559 144.453 16.9307 141.114 15.7544C138.897 11.3068 135.486 7.56422 131.262 4.94555C127.038 2.32688 122.169 0.935535 117.199 0.927283C112.23 0.919031 107.356 2.2942 103.124 4.89883C98.8913 7.50346 95.4675 11.2347 93.2355 15.6749ZM193.574 107.567C188.427 107.567 183.726 109.495 180.159 112.685C177.722 108.135 174.097 104.332 169.669 101.681C165.242 99.0297 160.178 97.6295 155.017 97.6295C149.688 97.6274 144.466 99.1237 139.946 101.947C135.427 104.771 131.792 108.809 129.458 113.599C127.182 111.221 124.447 109.328 121.419 108.037C118.391 106.745 115.132 106.082 111.84 106.085C108.548 106.089 105.291 106.76 102.266 108.059C99.2403 109.357 96.5098 111.255 94.2391 113.639C91.5299 108.071 87.0826 103.537 81.5688 100.72L84.1526 99.6269C84.464 99.4944 84.7787 99.3785 85.0967 99.2791C88.535 98.186 91.1188 95.5029 92.3013 92.293L92.3411 92.1937L92.3709 92.0943C94.0205 86.9268 98.721 83.3195 104.336 83.3195C107.06 83.3082 109.716 84.179 111.905 85.8018C114.093 87.4247 115.698 89.7123 116.479 92.3229L118.447 97.6394L123.455 94.996C124.444 94.4747 125.496 94.0839 126.586 93.8334C128.057 93.5034 129.425 92.8144 130.566 91.8278C131.707 90.8412 132.586 89.5877 133.125 88.1789L133.154 88.1094L133.174 88.0299C134.049 85.5732 135.663 83.4478 137.795 81.9459C139.927 80.444 142.472 79.6394 145.079 79.6426C149.75 79.6426 153.854 82.1667 156.031 85.943L159.896 92.6607L164.388 86.3405C165.557 84.6969 167.102 83.3574 168.895 82.4341C170.688 81.5108 172.676 81.0307 174.693 81.0339C180.199 81.0339 184.899 84.5319 186.598 89.4211L186.608 89.4609C187.12 90.9057 187.995 92.1946 189.149 93.2039C190.303 94.2132 191.697 94.909 193.197 95.2246C196.399 95.9256 199.203 97.8453 201.016 100.577C202.828 103.309 203.506 106.639 202.906 109.863C200.03 108.346 196.826 107.557 193.574 107.567ZM173.501 126.051L160.582 289.324H130.074L136.533 125.355C136.77 120.594 138.832 116.107 142.292 112.827C145.751 109.546 150.341 107.725 155.108 107.742C159.876 107.759 164.453 109.612 167.889 112.916C171.326 116.22 173.357 120.721 173.56 125.484L173.501 126.051ZM80.267 100.104C73.7563 97.1867 66.386 96.8276 59.6225 99.098C52.859 101.368 47.1983 106.102 43.7666 112.357C41.3054 110.255 38.3727 108.78 35.2183 108.057C32.0639 107.334 28.7814 107.384 25.6505 108.203L25.6306 107.567C25.6306 101.505 29.9236 96.437 35.5185 95.2345C36.9985 94.9095 38.3746 94.2217 39.523 93.233C40.6713 92.2442 41.5559 90.9856 42.0971 89.5702L42.1269 89.5006L42.1468 89.4211C43.0215 86.9644 44.6357 84.839 46.7676 83.3371C48.8994 81.8353 51.4441 81.0306 54.0519 81.0339C59.6467 81.0339 64.2478 84.512 65.957 89.4211L65.967 89.4609C66.4792 90.9057 67.3541 92.1946 68.5079 93.2039C69.6616 94.2132 71.0554 94.909 72.5555 95.2246C74.888 95.7537 77.0278 96.9199 78.7366 98.5934L80.267 100.104ZM50.3551 123.626C50.9346 119.182 53.1121 115.102 56.4807 112.146C59.8494 109.191 64.1788 107.563 68.66 107.567C78.5975 107.567 86.7463 115.418 87.1438 125.355L93.7025 289.324H63.5919L50.6731 126.051C50.6203 125.237 50.5075 124.427 50.3551 123.626ZM99.6054 29.329C101.063 29.0278 102.416 28.3513 103.531 27.3666C104.647 26.3818 105.486 25.1229 105.965 23.7144C106.797 21.4128 108.318 19.423 110.319 18.015C112.321 16.607 114.708 15.849 117.155 15.8438C122.342 15.8438 126.745 19.1232 128.355 23.8137L128.404 23.9727L128.464 24.1119C129.617 26.8645 132.051 28.7825 134.824 29.4284H134.844C136.593 29.8302 138.228 30.6215 139.629 31.7433C141.03 32.8652 142.159 34.2886 142.933 35.9077C142.295 36.1731 141.671 36.4716 141.065 36.802C138.401 34.6211 135.26 33.0999 131.898 32.3623C128.536 31.6248 125.046 31.6916 121.715 32.5575C118.383 33.4234 115.303 35.0638 112.725 37.3451C110.147 39.6265 108.144 42.4844 106.88 45.6862C104.257 46.3507 101.78 47.4964 99.5756 49.0649C99.0906 48.9137 98.6 48.7811 98.1048 48.6674C96.5932 44.6715 93.9732 41.1897 90.5523 38.6305C91.4666 33.9997 95.0143 30.3526 99.5557 29.339L99.6054 29.329ZM109.414 55.2957C110.915 55.0295 112.317 54.3666 113.475 53.3759C114.634 52.3851 115.506 51.1026 116.002 49.6612C116.723 47.6663 117.963 45.8999 119.594 44.544C121.225 43.1881 123.189 42.2918 125.282 41.9476C127.375 41.6033 129.522 41.8235 131.501 42.5855C133.481 43.3475 135.221 44.6236 136.543 46.2824L139.703 50.2773L143.629 46.9979C145.906 45.0968 148.781 44.0589 151.747 44.0664C157.253 44.0664 161.953 47.5643 163.653 52.4536L163.663 52.4934C164.175 53.9382 165.05 55.2271 166.203 56.2364C167.357 57.2457 168.751 57.9415 170.251 58.2571C173.259 58.9155 175.922 60.6509 177.74 63.1364C179.557 65.622 180.404 68.6862 180.119 71.7522C176.776 70.9303 173.291 70.8808 169.926 71.6075C166.561 72.3341 163.407 73.8178 160.701 75.9459C156.498 71.934 150.91 69.6984 145.099 69.7051C135.49 69.7051 127.212 75.6974 123.992 84.2337L123.704 84.3132C121.696 80.9746 118.857 78.213 115.465 76.2973C112.072 74.3816 108.242 73.3773 104.346 73.382C94.3087 73.382 85.9215 79.8414 82.9601 88.9242L82.8607 89.123C80.5335 87.488 77.9216 86.3017 75.1592 85.625C73.542 81.34 70.6535 77.6519 66.8808 75.0551C63.1082 72.4583 58.6318 71.077 54.0519 71.0964C52.1903 71.0964 50.385 71.315 48.636 71.7522C48.3478 68.6987 49.1814 65.6447 50.981 63.1611C52.7806 60.6775 55.4231 58.9342 58.4145 58.2571C59.9373 57.9544 61.3521 57.2518 62.5135 56.2214C63.6749 55.191 64.541 53.8699 65.0229 52.394C65.9244 49.9437 67.5581 47.8303 69.7021 46.3405C71.8462 44.8507 74.3967 44.0567 77.0075 44.0664C82.5129 44.0664 87.2133 47.5643 88.9126 52.4536L88.9226 52.4934C89.4348 53.9382 90.3098 55.2271 91.4635 56.2364C92.6173 57.2457 94.0111 57.9415 95.5111 58.2571C96.5049 58.4824 97.439 58.8103 98.3135 59.2409L101.454 60.7613L103.958 58.3267C105.469 56.8559 107.347 55.7926 109.404 55.2957" fill="white" />
                                </svg>
                            </div>
                            <h3 className="feature-title">Concierge Service</h3>
                            <p className="feature-description">Personalized service with food and beverage options</p>
                        </div>
                    </div>
                </div>
            </section>


            <style jsx>{`
                .theater-page {
                    min-height: 100vh;
                    background-color: #000000;
                    color: #ffffff;
                    position: relative;
                }

                .theater-page::after {
                    content: '';
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-image: url('/bg7.png');
                    background-size: cover;
                    background-position: center;
                    background-repeat: no-repeat;
                    filter: blur(10px);
                    z-index: 0;
                }

                .theater-page::before {
                    content: '';
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.7);
                    z-index: 1;
                }

                .theater-page > * {
                    position: relative;
                    z-index: 2;
                }

                .container {
                    max-width: 80rem;
                    margin: 0 auto;
                    padding: 0 1rem;
                }

                @media (min-width: 768px) {
                    .container {
                        padding: 0 2rem;
                    }
                }

                @media (min-width: 1024px) {
                    .container {
                        padding: 0 4rem;
                    }
                }

                /* Hero Section */
                .theater-hero {
                    padding: 8rem 0 2rem 0;
                }

                .hero-content {
                    text-align: center;
                    margin-bottom: 4rem;
                }

                .hero-title {
                    font-size: 3rem;
                    font-weight: bold;
                    margin-bottom: 1.5rem;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                }

                @media (min-width: 768px) {
                    .hero-title {
                        font-size: 4.5rem;
                    }
                }

                .highlight {
                    color: #FF0005;
                }

                .hero-subtitle {
                    font-size: 1.25rem;
                    color: #d1d5db;
                    margin-bottom: 2rem;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                }

                .divider {
                    width: 6rem;
                    height: 0.25rem;
                    background-color: #FF0005;
                    margin: 0 auto;
                }

                /* Date Section */
                .date-section {
                    padding: 0rem 0 2rem 0;
                    margin-top: -2rem;
                }

                .date-card {
                    background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(239, 68, 68, 0.1));
                    border: 1px solid rgba(251, 191, 36, 0.3);
                    border-radius: 1rem;
                    padding: 2rem;
                    text-align: center;
                    max-width: 50rem;
                    margin:  0 auto;
                    backdrop-filter: blur(10px);
                    position: relative;
                    overflow: hidden;
                }

                .date-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                    transition: left 0.6s ease;
                }

                .date-card:hover::before {
                    left: 100%;
                }

                .date-info {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 2rem;
                    position: relative;
                    z-index: 2;
                }

                @media (max-width: 768px) {
                    .date-info {
                        flex-direction: column;
                        gap: 1rem;
                    }
                }

                .current-date,
                .current-time {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .date-label,
                .time-label {
                    font-size: 0.875rem;
                    color: #FF0005;
                    font-weight: bold;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .date-value,
                .time-value {
                    font-size: 1.25rem;
                    color: #ffffff;
                    font-weight: 600;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                }

                .animated-time {
                    animation: timeGlow 2s ease-in-out infinite alternate;
                }

                @keyframes timeGlow {
                    0% {
                        text-shadow: 0 0 5px rgba(251, 191, 36, 0.5);
                        color: #ffffff;
                    }
                    100% {
                        text-shadow: 0 0 15px rgba(251, 191, 36, 0.8), 0 0 25px rgba(251, 191, 36, 0.4);
                        color: #FF0005;
                    }
                }

                .live-indicator-dot {
                    width: 8px;
                    height: 8px;
                    background-color: #ff0000;
                    border-radius: 50%;
                    margin-right: 5px;
                    animation: livePulse 2s infinite;
                }

                @keyframes livePulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.3; }
                    100% { opacity: 1; }
                }

                @keyframes refreshBlink {
                    0% { opacity: 0.5; }
                    50% { opacity: 1; }
                    100% { opacity: 0.5; }
                }

                @media (min-width: 768px) {
                    .date-value,
                    .time-value {
                        font-size: 1.5rem;
                    }
                }

                /* Filter Section */
                .filter-section {
                    padding: 2rem 0;
                }

                .filter-container {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    align-items: center;
                }

                @media (min-width: 768px) {
                    .filter-container {
                        flex-direction: row;
                        justify-content: space-between;
                        align-items: center;
                    }
                }

                .search-box {
                    width: 100%;
                    max-width: 400px;
                }

                .search-input-wrapper {
                    position: relative;
                    width: 100%;
                    display: flex;
                    align-items: center;
                }

                .search-input {
                    width: 100%;
                    padding: 1rem 1rem 1rem 3rem;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(251, 191, 36, 0.3);
                    border-radius: 0.5rem;
                    color: #ffffff;
                    font-size: 1rem;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                    backdrop-filter: blur(10px);
                    transition: all 0.3s ease;
                }

                .search-input::placeholder {
                    color: rgba(255, 255, 255, 0.6);
                }

                .search-input:focus {
                    outline: none;
                    border-color: #FF0005;
                    box-shadow: 0 0 20px rgba(251, 191, 36, 0.3);
                    background: rgba(255, 255, 255, 0.15);
                }

                .search-icon {
                    position: absolute;
                    left: 1rem;
                    color: #888;
                    z-index: 2;
                    transition: color 0.3s ease;
                }

                .search-input-wrapper:focus-within .search-icon {
                    color: #FF0005;
                }

                .filter-dropdowns {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 1rem;
                    justify-content: center;
                }

                @media (min-width: 768px) {
                    .filter-dropdowns {
                        justify-content: flex-end;
                    }
                }

                .dropdown-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    min-width: 150px;
                }

                .dropdown-label {
                    font-size: 0.875rem;
                    color: #FF0005;
                    font-weight: 600;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .filter-dropdown {
                    padding: 1.25rem 1.5rem;
                    background: linear-gradient(135deg, 
                        rgba(255, 255, 255, 0.15) 0%, 
                        rgba(255, 255, 255, 0.05) 50%, 
                        rgba(251, 191, 36, 0.05) 100%);
                    border: 2px solid transparent;
                    border-radius: 1.5rem;
                    color: #ffffff;
                    font-size: 0.95rem;
                    font-weight: 600;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                    cursor: pointer;
                    backdrop-filter: blur(25px) saturate(180%);
                    appearance: none;
                    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23fbbf24' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
                    background-repeat: no-repeat;
                    background-position: right 1.25rem center;
                    background-size: 1.4rem;
                    padding-right: 3.5rem;
                    transition: background-image 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 
                        0 8px 32px rgba(0, 0, 0, 0.12),
                        0 2px 8px rgba(251, 191, 36, 0.1),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    position: relative;
                    overflow: hidden;
                }



                .filter-dropdown.open {
                    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23fbbf24' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='18,15 12,9 6,15'%3e%3c/polyline%3e%3c/svg%3e");
                }



                .filter-dropdown:focus {
                    outline: none;
                    border-color: #FF0005;
                    box-shadow: 
                        0 0 0 4px rgba(251, 191, 36, 0.3),
                        0 8px 32px rgba(251, 191, 36, 0.2),
                        0 2px 8px rgba(0, 0, 0, 0.1),
                        inset 0 1px 0 rgba(255, 255, 255, 0.2);
                }

                .filter-dropdown option {
                    background: #1a1a1a !important;
                    color: #ffffff !important;
                    padding: 0.75rem 1rem;
                    font-size: 0.9rem;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                    border: none;
                    outline: none;
                    margin: 0;
                    transition: all 0.3s ease;
                }

                .filter-dropdown option:hover {
                    background: rgba(251, 191, 36, 0.2) !important;
                    color: #FF0005 !important;
                }

                .filter-dropdown option:checked {
                    background: rgba(251, 191, 36, 0.3) !important;
                    color: #FF0005 !important;
                    font-weight: 600;
                }

                /* Theater Selection Section */
                .theater-selection-section {
                    padding: 3rem 0;
                    background: transparent;
                }

                @media (min-width: 768px) {
                    .theater-selection-section {
                        padding: 4rem 0;
                    }
                }

                @media (min-width: 1024px) {
                    .theater-selection-section {
                        padding: 5rem 0;
                    }
                }

                /* Section Header */
                .selection-header {
                    text-align: center;
                    margin-bottom: 3rem;
                }

                .selection-title {
                    font-size: 2.5rem;
                    font-weight: bold;
                    color: #ffffff;
                    margin-bottom: 1rem;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                }

                @media (min-width: 768px) {
                    .selection-title {
                        font-size: 3rem;
                    }
                }

                .selection-subtitle {
                    font-size: 1.125rem;
                    color: #d1d5db;
                    margin-bottom: 2rem;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                }

                .selection-divider {
                    width: 80px;
                    height: 4px;
                    background: linear-gradient(90deg, #FF0005, #ff4444);
                    margin: 0 auto;
                    border-radius: 2px;
                }

                /* Theater Cards Grid */
                .theater-cards-grid {
                    display: grid;
                    gap: 1.5rem;
                    grid-template-columns: 1fr;
                    max-width: 1200px;
                    margin: 0 auto;
                }

                @media (min-width: 768px) {
                    .theater-cards-grid {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 2.5rem;
                    }
                }

                @media (min-width: 1024px) {
                    .theater-cards-grid {
                        grid-template-columns: repeat(3, 1fr);
                        gap: 3rem;
                    }
                }

                /* Theater Selection Card */
                .theater-selection-card {
                    background: rgba(20, 20, 20, 0.8);
                    border-radius: 1.5rem;
                    overflow: hidden;
                    cursor: pointer;
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    border: 2px solid rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    position: relative;
                    min-height: 420px;
                    display: flex;
                    flex-direction: column;
                }

                .theater-selection-card:hover {
                    transform: translateY(-8px) scale(1.02);
                    border-color: rgba(255, 0, 5, 0.5);
                    box-shadow: 0 20px 60px rgba(255, 0, 5, 0.2);
                }

                .theater-selection-card.selected {
                    transform: translateY(-8px) scale(1.02);
                    border-color:rgba(255, 0, 4, 0.13);
                    box-shadow: 0 20px 60px rgba(255, 0, 5, 0.3);
                    background: rgba(30, 30, 30, 0.9);
                }

                /* Selection Badge */
                .selection-badge {
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    background: rgba(255, 0, 5, 0.95);
                    color: white;
                    padding: 0.5rem 1rem;
                    border-radius: 2rem;
                    font-size: 0.875rem;
                    font-weight: bold;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    z-index: 10;
                    box-shadow: 0 4px 20px rgba(255, 0, 5, 0.4);
                    animation: badgePulse 2s ease-in-out infinite;
                }

                @keyframes badgePulse {
                    0%, 100% {
                        transform: scale(1);
                        box-shadow: 0 4px 20px rgba(255, 0, 5, 0.4);
                    }
                    50% {
                        transform: scale(1.05);
                        box-shadow: 0 6px 25px rgba(255, 0, 5, 0.6);
                    }
                }

                /* Card Image Container */
                .card-image-container {
                    position: relative;
                    height: 180px;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0, 0, 0, 0.4);
                }

                .card-image-container::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 80px;
                    background: linear-gradient(to top, 
                        rgba(20, 20, 20, 0.98) 0%, 
                        rgba(20, 20, 20, 0.85) 30%, 
                        rgba(20, 20, 20, 0.5) 60%, 
                        rgba(20, 20, 20, 0.2) 80%, 
                        transparent 100%);
                    z-index: 2;
                    pointer-events: none;
                }

                @media (min-width: 480px) {
                    .card-image-container {
                        height: 220px;
                    }
                    
                    .card-image-container::after {
                        height: 100px;
                    }
                }

                @media (min-width: 768px) {
                    .card-image-container {
                        height: 280px;
                    }
                    
                    .card-image-container::after {
                        height: 120px;
                    }
                }

                

                .card-theater-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.4s ease;
                    mask: linear-gradient(to bottom, 
                        rgba(0, 0, 0, 1) 0%, 
                        rgba(0, 0, 0, 1) 50%, 
                        rgba(0, 0, 0, 0.8) 70%, 
                        rgba(0, 0, 0, 0.4) 85%, 
                        rgba(0, 0, 0, 0.1) 95%, 
                        rgba(0, 0, 0, 0) 100%);
                    -webkit-mask: linear-gradient(to bottom, 
                        rgba(0, 0, 0, 1) 0%, 
                        rgba(0, 0, 0, 1) 50%, 
                        rgba(0, 0, 0, 0.8) 70%, 
                        rgba(0, 0, 0, 0.4) 85%, 
                        rgba(0, 0, 0, 0.1) 95%, 
                        rgba(0, 0, 0, 0) 100%);
                }


                .theater-selection-card:hover .card-theater-image {
                    transform: none;
                }

                /* Image Indicators */
                .card-image-indicators {
                    position: absolute;
                    bottom: 1rem;
                    left: 50%;
                    transform: translateX(-50%);
                    display: flex;
                    gap: 0.5rem;
                    z-index: 5;
                }

                .indicator-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.5);
                    transition: all 0.3s ease;
                }

                .indicator-dot.active {
                    background: #FF0005;
                    transform: scale(1.2);
                }

                .card-image-count {
                    position: absolute;
                    top: 1rem;
                    left: 1rem;
                    background: rgba(0, 0, 0, 0.7);
                    color: white;
                    padding: 0.25rem 0.75rem;
                    border-radius: 1rem;
                    font-size: 0.75rem;
                    font-weight: bold;
                    z-index: 5;
                }

                /* Card Content */
                .card-content {
                    padding: 1rem;
                    background: linear-gradient(135deg, rgba(30, 30, 30, 0.95), rgba(20, 20, 20, 0.9));
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }

                @media (min-width: 480px) {
                    .card-content {
                        padding: 1.25rem;
                    }
                }

                @media (min-width: 768px) {
                    .card-content {
                        padding: 1.5rem;
                    }
                }

                .card-theater-name {
                    font-size: 1.125rem;
                    font-weight: bold;
                    color: #ffffff;
                    margin-bottom: 0.75rem;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                    line-height: 1.2;
                }

                .card-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    margin-bottom: 0.75rem;
                }
                .card-tags .card-tag-card-availability {
                   display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    padding: 0.25rem 0.5rem;
                    background: #ff0202ff;
                    color: #ffffffff;  
                    border-radius: 0px 9999px 9999px 9999px;
                    font-size: 0.75rem;
                    font-family: 'Paralucent-Demibold', Arial, Helvetica, sans-serif;
                    font-weight: 500;
                }
                .card-tags .card-tag-card-location {
                   display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    padding: 0.25rem 0.5rem;
                    background: #ff0202ff;
                    color: #ffffffff;  
                    border-radius: 9999px 0px 9999px 9999px;
                    font-size: 0.75rem;
                    font-family: 'Paralucent-Demibold', Arial, Helvetica, sans-serif;
                    font-weight: 500;
                }

                .card-tag {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    padding: 0.25rem 0.5rem;
                    background: #ffffff;
                    color: #FF0005;
                    
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    font-family: 'Paralucent-Demibold', Arial, Helvetica, sans-serif;
                    font-weight: 500;
                }

                @media (min-width: 480px) {
                    .card-theater-name {
                        font-size: 1.25rem;
                        margin-bottom: 0.875rem;
                    }
                }

                @media (min-width: 768px) {
                    .card-theater-name {
                        font-size: 1.5rem;
                        margin-bottom: 1rem;
                    }
                }

                .card-capacity {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                    color: #d1d5db;
                }

                .capacity-icon {
                    color: #FF0005;
                }

                .capacity-text {
                    font-size: 0.875rem;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                }

                .card-price {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    gap: 0.75rem;
                    background: rgba(255, 255, 255, 0.95);
                    padding: 0.75rem 1rem;
                    border-radius: 1rem;
                    backdrop-filter: blur(5px);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    flex-wrap: wrap;
                }

                .price-info {
                    display: flex;
                    flex-direction: column;
                    gap: 0.15rem;
                    flex: 1;
                }

                .card-prices{
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    flex: 1;
                    justify-content: flex-end;
                    margin-left: auto;
                }
                    
                .card-prices .card-tag{
                    background-color: #ff0000ff;
                    color: #fff;
                    font-size: 0.6rem;
                }

                .price-label {
                    font-size: 0.75rem;
                    color: #6b7280;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .price-value {
                    font-size: 1.25rem;
                    font-weight: bold;
                    color: #FF0005;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                }

                /* Hover Overlay */
                .card-hover-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.3);
                    backdrop-filter: blur(10px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: all 0.3s ease;
                    z-index: 20;
                }

                .theater-selection-card:hover .card-hover-overlay {
                    opacity: 1;
                }

                .theater-selection-card.selected .card-hover-overlay {
                    opacity: 0;
                }

                @media (hover: none), (pointer: coarse) {
                    .theater-selection-card:hover {
                        transform: none;
                        border-color: rgba(255, 255, 255, 0.1);
                        box-shadow: none;
                    }

                    .theater-selection-card:hover .card-theater-image {
                        transform: none;
                    }

                    .theater-selection-card:hover .card-hover-overlay {
                        opacity: 0;
                    }
                }

                .hover-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.75rem;
                    color: #ffffff;
                    text-align: center;
                }

                .select-icon {
                    width: 3rem;
                    height: 3rem;
                    color: #ffffff;
                    animation: selectIconPulse 2s ease-in-out infinite;
                }

                @keyframes selectIconPulse {
                    0%, 100% {
                        transform: scale(1);
                    }
                    50% {
                        transform: scale(1.1);
                    }
                }

                .hover-content span {
                    font-size: 1.125rem;
                    font-weight: bold;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                /* Scroll Instruction */
                .scroll-instruction {
                    text-align: center;
                    margin-top: 3rem;
                    color: #d1d5db;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.75rem;
                }

                .scroll-instruction p {
                    font-size: 1rem;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                }

                .scroll-arrow {
                    color: #FF0005;
                    animation: scrollBounce 2s ease-in-out infinite;
                }

                @keyframes scrollBounce {
                    0%, 100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(8px);
                    }
                }


                .theater-card {
                    cursor: pointer;
                    transition: all 0.3s ease;
                    border-radius: 1rem;
                    overflow: hidden;
                }

                .theater-card:hover {
                    transform: translateY(-10px);
                }

                @media (hover: none), (pointer: coarse) {
                    .theater-card:hover {
                        transform: none;
                    }
                }

                .theater-card.active {
                    transform: translateY(-10px);
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                    border: 3px solid #FF0005;
                    position: relative;
                }

                .selected-tag {
                    position: absolute;
                    top: 0.5rem;
                    left: 0.5rem;
                    background: linear-gradient(135deg, #FF0005, #FF0005);
                    color: #000000;
                    padding: 0.375rem 0.75rem;
                    border-radius: 0.5rem;
                    font-size: 0.625rem;
                    font-weight: bold;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    z-index: 10;
                    box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
                    animation: tagPulse 2s ease-in-out infinite;
                }

                @media (min-width: 481px) {
                    .selected-tag {
                        top: 0.625rem;
                        left: 0.625rem;
                        padding: 0.4375rem 0.875rem;
                        font-size: 0.6875rem;
                    }
                }

                @media (min-width: 769px) {
                    .selected-tag {
                        top: 0.75rem;
                        left: 0.75rem;
                        padding: 0.5rem 1rem;
                        font-size: 0.75rem;
                    }
                }

                @keyframes tagPulse {
                    0%, 100% {
                        transform: scale(1);
                        box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
                    }
                    50% {
                        transform: scale(1.05);
                        box-shadow: 0 6px 16px rgba(251, 191, 36, 0.6);
                    }
                }

                .theater-image-container {
                    position: relative;
                    height: 200px;
                    overflow: hidden;
                    border-radius: 1rem;
                }

                @media (min-width: 481px) {
                    .theater-image-container {
                        height: 220px;
                    }
                }

                @media (min-width: 769px) {
                    .theater-image-container {
                        height: 250px;
                    }
                }

                @media (min-width: 1025px) {
                    .theater-image-container {
                        height: 280px;
                    }
                }

                .theater-glow {
                    position: absolute;
                    inset: 0;
                   
                    filter: blur(20px);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                    z-index: 1;
                }

                .theater-card:hover .theater-glow,
                .theater-card.active .theater-glow {
                    opacity: 1;
                }

                .theater-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.3s ease;
                }

                .theater-card:hover .theater-image,
                .theater-card.active .theater-image {
                    transform: scale(1.05);
                }

                .theater-overlay {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(
                        to bottom,
                        transparent,
                        rgba(0, 0, 0, 0.8)
                    );
                    display: flex;
                    align-items: flex-end;
                    padding: 1rem;
                    z-index: 2;
                }

                @media (min-width: 481px) {
                    .theater-overlay {
                        padding: 1.25rem;
                    }
                }

                @media (min-width: 769px) {
                    .theater-overlay {
                        padding: 1.5rem;
                    }
                }

                .theater-info {
                    color: white;
                }

                .theater-name {
                    font-size: 1.125rem;
                    font-weight: bold;
                    margin-bottom: 0.5rem;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                    line-height: 1.3;
                }

                @media (min-width: 481px) {
                    .theater-name {
                        font-size: 1.25rem;
                    }
                }

                @media (min-width: 769px) {
                    .theater-name {
                        font-size: 1.5rem;
                    }
                }

                .theater-capacity {
                    font-size: 0.875rem;
                    color: #FF0005;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                    line-height: 1.4;
                }

                @media (min-width: 481px) {
                    .theater-capacity {
                        font-size: 0.9375rem;
                    }
                }

                @media (min-width: 769px) {
                    .theater-capacity {
                        font-size: 1rem;
                    }
                }

                .theater-instructions {
                    position: absolute;
                    top: 0.75rem;
                    right: 0.75rem;
                    text-align: right;
                    z-index: 3;
                }

                @media (min-width: 481px) {
                    .theater-instructions {
                        top: 1rem;
                        right: 1rem;
                    }
                }

                .select-text {
                    font-size: 0.75rem;
                    color: #ffffff;
                    font-weight: bold;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin-bottom: 0.25rem;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
                    animation: selectPulse 3s ease-in-out infinite;
                }

                @media (min-width: 481px) {
                    .select-text {
                        font-size: 0.8125rem;
                    }
                }

                @media (min-width: 769px) {
                    .select-text {
                        font-size: 0.875rem;
                    }
                }

                .scroll-text {
                    font-size: 0.625rem;
                    color: #FF0005;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
                    animation: scrollGlow 2s ease-in-out infinite alternate;
                }

                @media (min-width: 481px) {
                    .scroll-text {
                        font-size: 0.6875rem;
                    }
                }

                @media (min-width: 769px) {
                    .scroll-text {
                        font-size: 0.75rem;
                    }
                }

                @keyframes selectPulse {
                    0%, 100% {
                        opacity: 0.8;
                        transform: scale(1);
                    }
                    50% {
                        opacity: 1;
                        transform: scale(1.05);
                    }
                }

                @keyframes scrollGlow {
                    0% {
                        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8), 0 0 8px rgba(251, 191, 36, 0.3);
                    }
                    100% {
                        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8), 0 0 16px rgba(251, 191, 36, 0.6);
                    }
                }

                /* Theater Details */
                .theater-details-section {
                    padding: 2rem 0;
                }

                @media (min-width: 481px) {
                    .theater-details-section {
                        padding: 3rem 0;
                    }
                }

                @media (min-width: 769px) {
                    .theater-details-section {
                        padding: 4rem 0;
                    }
                }

                .theater-details {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 2rem;
                    align-items: stretch;
                    min-height: auto;
                }

                @media (min-width: 769px) {
                    .theater-details {
                        grid-template-columns: 1fr 1fr;
                        gap: 3rem;
                        min-height: 500px;
                    }
                }

                @media (min-width: 1025px) {
                    .theater-details {
                        gap: 4rem;
                        min-height: 600px;
                    }
                }

                .theater-info-panel {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    padding: 1rem 0;
                }

                @media (min-width: 481px) {
                    .theater-info-panel {
                        padding: 1.5rem 0;
                    }
                }

                @media (min-width: 769px) {
                    .theater-info-panel {
                        padding: 2rem 0;
                    }
                }

                .theater-info-content {
                    max-width: 100%;
                }

                .theater-booking-panel {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    width: 100%;
                    max-width: 100%;
                    overflow-x: hidden;
                }

                @media (min-width: 481px) {
                    .theater-booking-panel {
                        gap: 1.75rem;
                    }
                }

                @media (min-width: 769px) {
                    .theater-booking-panel {
                        gap: 2rem;
                    }
                }

                .movie-selection-indicator {
                    background: linear-gradient(135deg, rgba(255, 0, 5, 0.1), rgba(255, 68, 68, 0.1));
                    border: 2px solid rgba(255, 0, 5, 0.3);
                    border-radius: 12px;
                    padding: 1rem;
                    margin-bottom: 1.5rem;
                    backdrop-filter: blur(10px);
                }

                .movie-indicator-header {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 0.5rem;
                }

                .movie-icon {
                    font-size: 1.2rem;
                }

                .movie-label {
                    font-size: 0.875rem;
                    color: #FF0005;
                    font-weight: 600;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .movie-title {
                    font-size: 1rem;
                    color: #ffffff;
                    font-weight: 500;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                    line-height: 1.4;
                }

                @media (min-width: 481px) {
                    .movie-label {
                        font-size: 0.9375rem;
                    }
                    
                    .movie-title {
                        font-size: 1.125rem;
                    }
                }

                @media (min-width: 769px) {
                    .movie-label {
                        font-size: 1rem;
                    }
                    
                    .movie-title {
                        font-size: 1.25rem;
                    }
                }

                .booking-controls {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    width: 100%;
                    max-width: 100%;
                }

                @media (min-width: 481px) {
                    .booking-controls {
                        gap: 1.25rem;
                    }
                }

                @media (min-width: 769px) {
                    .booking-controls {
                        gap: 1.5rem;
                    }
                }

                .theater-detail-image {
                    position: relative;
                    border-radius: 0.75rem;
                    overflow: hidden;
                    width: 100%;
                    max-width: 100%;
                  
                    
                }

                .theater-detail-image::before {
                    content: '';
                    position: absolute;
                    inset: -30px;
                   
                    );
                    border-radius: inherit;
                    filter: blur(25px);
                    opacity: 0.7;
                    animation: detailGlowRotate 6s linear infinite;
                    z-index: -1;
                }

                @keyframes detailGlowRotate {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                @media (min-width: 481px) {
                    .theater-detail-image {
                        border-radius: 0.875rem;
                    }
                }

                @media (min-width: 769px) {
                    .theater-detail-image {
                        border-radius: 1rem;
                    }
                }

                .detail-glow {
                    position: absolute;
                    inset: 0;
                   
                    filter: blur(30px);
                    z-index: 1;
                }

                .card-theater-image {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    transition: transform 0.4s ease;
                    position: relative;
                    z-index: 1;
                }

                @media (min-width: 481px) {
                    .card-theater-image {
                        height: 250px;
                        border-radius: 0.875rem;
                    }
                }

                @media (min-width: 769px) {
                    .detail-image {
                        height: 300px;
                        border-radius: 1rem;
                    }
                }

                @media (min-width: 1025px) {
                    .detail-image {
                        height: 350px;
                    }
                }

                @keyframes detailSlideshow {
                    0% {
                        transform: scale(1) rotate(0deg);
                        filter: brightness(1) contrast(1) saturate(1) blur(0px);
                        opacity: 1;
                    }
                    20% {
                        transform: scale(1.02) rotate(-0.3deg);
                        filter: brightness(1.05) contrast(1.1) saturate(1.1) blur(0px);
                        opacity: 1;
                    }
                    40% {
                        transform: scale(1.04) rotate(0.2deg);
                        filter: brightness(1.1) contrast(1.2) saturate(1.15) blur(0px);
                        opacity: 1;
                    }
                    60% {
                        transform: scale(1.06) rotate(-0.1deg);
                        filter: brightness(1.15) contrast(1.5) saturate(1.2) blur(2px);
                        opacity: 0.95;
                    }
                    75% {
                        transform: scale(1.1) rotate(0.3deg);
                        filter: brightness(0.9) contrast(2.0) saturate(0.9) blur(5px);
                        opacity: 0.8;
                    }
                    85% {
                        transform: scale(1.15) rotate(-0.2deg);
                        filter: brightness(0.5) contrast(2.5) saturate(0.5) blur(10px);
                        opacity: 0.5;
                    }
                    95% {
                        transform: scale(1.2) rotate(0.1deg);
                        filter: brightness(0.2) contrast(3.0) saturate(0.2) blur(15px);
                        opacity: 0.2;
                    }
                    100% {
                        transform: scale(1.25) rotate(0deg);
                        filter: brightness(0.1) contrast(3.5) saturate(0.1) blur(20px);
                        opacity: 0.1;
                    }
                }

                /* Simple Theater Image Container */
                .theater-image-container {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    border-radius: 0.75rem;
                    background: linear-gradient(135deg, #000 0%, #1a1a1a 100%);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                }


                .booking-features {
                    margin-top: 1.5rem;
                }

                @media (min-width: 481px) {
                    .booking-features {
                        margin-top: 1.75rem;
                    }
                }

                @media (min-width: 769px) {
                    .booking-features {
                        margin-top: 2rem;
                    }
                }

                .features-title {
                    font-size: 1.25rem;
                    font-weight: bold;
                    color: #FF0005;
                    margin-bottom: 1rem;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                }

                @media (min-width: 481px) {
                    .features-title {
                        font-size: 1.375rem;
                        margin-bottom: 1.25rem;
                    }
                }

                @media (min-width: 769px) {
                    .features-title {
                        font-size: 1.5rem;
                        margin-bottom: 1.5rem;
                    }
                }

                .booking-label {
                    display: block;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #ffffff;
                    margin-bottom: 0.5rem;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                }

                @media (min-width: 481px) {
                    .booking-label {
                        font-size: 0.9375rem;
                        margin-bottom: 0.625rem;
                    }
                }

                @media (min-width: 769px) {
                    .booking-label {
                        font-size: 1rem;
                        margin-bottom: 0.75rem;
                    }
                }

                .calendar-icon {
                    margin-right: 0.375rem;
                    font-size: 0.875rem;
                }

                @media (min-width: 481px) {
                    .calendar-icon {
                        margin-right: 0.4375rem;
                        font-size: 0.9375rem;
                    }
                }

                @media (min-width: 769px) {
                    .calendar-icon {
                        margin-right: 0.5rem;
                        font-size: 1rem;
                    }
                }

                .date-selection {
                    position: relative;
                }

                .date-picker-modal-overlay {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    background: rgba(0, 0, 0, 0.8) !important;
                    backdrop-filter: blur(10px) !important;
                    z-index: 999999 !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    padding: 1rem !important;
                    animation: modalFadeIn 0.3s ease-out !important;
                }

                .date-picker-modal {
                    background: linear-gradient(135deg, 
                        rgba(0, 0, 0, 0.95) 0%, 
                        rgba(0, 0, 0, 0.9) 100%) !important;
                    border: 2px solid rgba(251, 191, 36, 0.3) !important;
                    border-radius: 1rem !important;
                    padding: 1.5rem !important;
                    max-width: 400px !important;
                    width: 100% !important;
                    max-height: 90vh !important;
                    overflow-y: auto !important;
                    position: relative !important;
                    z-index: 1000000 !important;
                    box-shadow: 
                        0 20px 40px rgba(0, 0, 0, 0.5),
                        0 4px 16px rgba(251, 191, 36, 0.2) !important;
                    animation: modalSlideIn 0.3s ease-out !important;
                }

                @media (min-width: 481px) {
                    .date-picker-modal {
                        padding: 2rem;
                        max-width: 450px;
                    }
                }

                @media (min-width: 769px) {
                    .date-picker-modal {
                        padding: 2.5rem;
                        max-width: 500px;
                    }
                }

                .date-picker-close-btn {
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: #ffffff;
                    width: 2rem;
                    height: 2rem;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 1rem;
                    font-weight: bold;
                    transition: all 0.3s ease;
                    z-index: 10;
                }

                .date-picker-close-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                    border-color: rgba(255, 255, 255, 0.4);
                    transform: scale(1.1);
                }

                @keyframes modalFadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                @keyframes modalSlideIn {
                    from {
                        opacity: 0;
                        transform: scale(0.9) translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }

                .date-picker-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 1rem;
                    padding-right: 3rem;
                }

                .month-nav-btn {
                    background: rgba(251, 191, 36, 0.2);
                    border: 1px solid rgba(251, 191, 36, 0.3);
                    color: #FF0005;
                    width: 2.5rem;
                    height: 2.5rem;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 1.25rem;
                    font-weight: bold;
                    transition: all 0.3s ease;
                }

                .month-nav-btn:hover {
                    background: rgba(251, 191, 36, 0.3);
                    border-color: rgba(251, 191, 36, 0.5);
                    transform: scale(1.1);
                }

                .month-year {
                    font-size: 1rem;
                    font-weight: bold;
                    color: #FF0005;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                    margin: 0;
                }

                @media (min-width: 481px) {
                    .month-year {
                        font-size: 1.125rem;
                    }
                }

                @media (min-width: 769px) {
                    .month-year {
                        font-size: 1.25rem;
                    }
                }

                .date-picker-calendar {
                    width: 100%;
                }

                .calendar-weekdays {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 0.25rem;
                    margin-bottom: 0.5rem;
                }

                .weekday {
                    text-align: center;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #FF0005;
                    padding: 0.5rem 0;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                }

                @media (min-width: 481px) {
                    .weekday {
                        font-size: 0.8125rem;
                    }
                }

                @media (min-width: 769px) {
                    .weekday {
                        font-size: 0.875rem;
                    }
                }

                .calendar-days {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 0.25rem;
                }

                .calendar-day {
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: #ffffff;
                    padding: 0.5rem;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    font-size: 0.75rem;
                    font-weight: 600;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                    transition: all 0.3s ease;
                    min-height: 2.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                @media (min-width: 481px) {
                    .calendar-day {
                        padding: 0.625rem;
                        font-size: 0.8125rem;
                        min-height: 2.75rem;
                    }
                }

                @media (min-width: 769px) {
                    .calendar-day {
                        padding: 0.75rem;
                        font-size: 0.875rem;
                        min-height: 3rem;
                    }
                }

                .calendar-day:hover {
                    background: rgba(251, 191, 36, 0.2);
                    border-color: rgba(251, 191, 36, 0.4);
                    color: #FF0005;
                    transform: scale(1.05);
                }

                .calendar-day.empty {
                    background: transparent;
                    border: none;
                    cursor: default;
                }

                .calendar-day.empty:hover {
                    background: transparent;
                    border: none;
                    transform: none;
                }

                .detail-title {
                    font-size: 1.5rem;
                    font-weight: bold;
                    color: #FF0005;
                    margin-bottom: 0.75rem;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                    line-height: 1.2;
                }

                @media (min-width: 481px) {
                    .detail-title {
                        font-size: 1.75rem;
                        margin-bottom: 0.875rem;
                    }
                }

                @media (min-width: 769px) {
                    .detail-title {
                        font-size: 2rem;
                        margin-bottom: 1rem;
                    }
                }

                @media (min-width: 1025px) {
                    .detail-title {
                        font-size: 2.5rem;
                    }
                }

                .detail-specs {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 0;
                }

                .spec-label {
                    font-weight: bold;
                    color: #FF0005;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                }

                .spec-value {
                    color: #ffffff;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                }

                .detail-price {
                    margin-bottom: 1rem;
                }

                @media (min-width: 481px) {
                    .detail-price {
                        margin-bottom: 1.25rem;
                    }
                }

                @media (min-width: 769px) {
                    .detail-price {
                        margin-bottom: 1.5rem;
                    }
                }

                .price-amount {
                    font-size: 1.25rem;
                    font-weight: bold;
                    color: #FF0005;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                }

                @media (min-width: 481px) {
                    .price-amount {
                        font-size: 1.5rem;
                    }
                }

                @media (min-width: 769px) {
                    .price-amount {
                        font-size: 1.75rem;
                    }
                }

                @media (min-width: 1025px) {
                    .price-amount {
                        font-size: 2rem;
                    }
                }

                .features-list {
                    margin-bottom: 1.5rem;
                }

                @media (min-width: 481px) {
                    .features-list {
                        margin-bottom: 1.75rem;
                    }
                }

                @media (min-width: 769px) {
                    .features-list {
                        margin-bottom: 2rem;
                    }
                }

                .feature-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 0;
                    color: #ffffff;
                }

                @media (min-width: 481px) {
                    .feature-item {
                        gap: 0.625rem;
                        padding: 0.625rem 0;
                    }
                }

                @media (min-width: 769px) {
                    .feature-item {
                        gap: 0.75rem;
                        padding: 0.75rem 0;
                    }
                }

                .feature-checkmark {
                    width: 1.25rem;
                    height: 1.25rem;
                    background: #10b981;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #ffffff;
                    font-weight: bold;
                    font-size: 0.75rem;
                    flex-shrink: 0;
                }

                @media (min-width: 481px) {
                    .feature-checkmark {
                        width: 1.375rem;
                        height: 1.375rem;
                        font-size: 0.8125rem;
                    }
                }

                @media (min-width: 769px) {
                    .feature-checkmark {
                        width: 1.5rem;
                        height: 1.5rem;
                        font-size: 0.875rem;
                    }
                }

                .feature-text {
                    font-size: 2rem; /* This is currently quite large */
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                    line-height: 1.5;
                }

                @media (min-width: 481px) {
                    .feature-text {
                        font-size: 2.25rem;
                    }
                }

                @media (min-width: 769px) {
                    .feature-text {
                        font-size: 2.5rem;
                    }
                }

                .booking-section {
                    margin-top: 1.5rem;
                }

                @media (min-width: 481px) {
                    .booking-section {
                        margin-top: 1.75rem;
                    }
                }

                @media (min-width: 769px) {
                    .booking-section {
                        margin-top: 2rem;
                    }
                }

                .date-selection {
                    margin-bottom: 1rem;
                }

                @media (min-width: 481px) {
                    .date-selection {
                        margin-bottom: 1.25rem;
                    }
                }

                @media (min-width: 769px) {
                    .date-selection {
                        margin-bottom: 1.5rem;
                    }
                }

                .date-button {
                    background: #10b981;
                    color: #ffffff;
                    border: none;
                    padding: 0.75rem 1rem;
                    border-radius: 0.5rem;
                    font-size: 0.875rem;
                    font-weight: 600;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    width: 100%;
                }

                @media (min-width: 481px) {
                    .date-button {
                        padding: 0.875rem 1.25rem;
                        border-radius: 0.625rem;
                        font-size: 0.9375rem;
                    }
                }

                @media (min-width: 769px) {
                    .date-button {
                        padding: 1rem 1.5rem;
                        border-radius: 0.75rem;
                        font-size: 1rem;
                        width: auto;
                    }
                }

                .date-button:hover {
                    background: #059669;
                    transform: translateY(-2px);
                }

                .time-slots {
                    margin-bottom: 1.5rem;
                }

                @media (min-width: 481px) {
                    .time-slots {
                        margin-bottom: 1.75rem;
                    }
                }

                @media (min-width: 769px) {
                    .time-slots {
                        margin-bottom: 2rem;
                    }
                }

                .time-slots-title {
                    font-size: 1rem;
                    font-weight: bold;
                    color: #ffffff;
                    margin-bottom: 0.75rem;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                }

                @media (min-width: 481px) {
                    .time-slots-title {
                        font-size: 1.125rem;
                        margin-bottom: 0.875rem;
                    }
                }

                @media (min-width: 769px) {
                    .time-slots-title {
                        font-size: 1.25rem;
                        margin-bottom: 1rem;
                    }
                }

                .time-slots-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 0.5rem;
                }

                @media (min-width: 481px) {
                    .time-slots-grid {
                        gap: 0.625rem;
                    }
                }

                @media (min-width: 769px) {
                    .time-slots-grid {
                        gap: 0.75rem;
                    }
                }

                .time-slot {
                    background: rgba(255, 255, 255, 0.1);
                    color: #ffffff;
                    border: 2px solid transparent;
                    padding: 0.625rem 0.5rem;
                    border-radius: 0.5rem;
                    font-size: 0.6875rem;
                    font-weight: 600;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    text-align: center;
                    min-height: 2.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                }

                @media (min-width: 481px) {
                    .time-slot {
                        padding: 0.75rem 0.625rem;
                        border-radius: 0.625rem;
                        font-size: 0.75rem;
                        min-height: 2.75rem;
                    }
                }

                @media (min-width: 769px) {
                    .time-slot {
                        padding: 0.875rem 0.75rem;
                        border-radius: 0.75rem;
                        font-size: 0.8125rem;
                        min-height: 3rem;
                    }
                }

                .time-slot:hover {
                    background: rgba(251, 191, 36, 0.2);
                    border-color: rgba(251, 191, 36, 0.5);
                }

                .time-slot.selected {
                    background: #10b981;
                    border-color: #10b981;
                    color: #ffffff;
                }

                .time-slot.booked {
                    background: rgba(239, 68, 68, 0.2);
                    border-color: #ef4444;
                    color: #ef4444;
                    cursor: not-allowed;
                    opacity: 0.7;
                }

                .time-slot.booked:hover {
                    background: rgba(239, 68, 68, 0.2);
                    border-color: #ef4444;
                }

                .time-slot.going {
                    background: rgba(245, 158, 11, 0.2);
                    border-color: #f59e0b;
                    color: #f59e0b;
                    cursor: not-allowed;
                    opacity: 0.8;
                }

                .time-slot.going:hover {
                    background: rgba(245, 158, 11, 0.2);
                    border-color: #f59e0b;
                }

                .time-slot.passed {
                    background: rgba(107, 114, 128, 0.2);
                    border-color: #6b7280;
                    color: #6b7280;
                    cursor: not-allowed;
                    opacity: 0.5;
                }

                .time-slot.passed:hover {
                    background: rgba(107, 114, 128, 0.2);
                    border-color: #6b7280;
                    transform: none;
                }

                .time-slot.time-gone {
                    background: rgba(245, 158, 11, 0.2);
                    border-color: #f59e0b;
                    color: #f59e0b;
                    cursor: not-allowed;
                    opacity: 0.7;
                }

                .time-slot.time-gone:hover {
                    background: rgba(245, 158, 11, 0.2);
                    border-color: #f59e0b;
                    transform: none;
                }

                .booked-badge {
                    position: absolute;
                    top: 0.25rem;
                    right: 0.25rem;
                    background: #ef4444;
                    color: #ffffff;
                }
                
                .no-slots-message {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem 1rem;
                    text-align: center;
                    color: #9ca3af;
                    grid-column: 1 / -1;
                }
                
                .no-slots-icon {
                    font-size: 2rem;
                    margin-bottom: 0.5rem;
                }
                
                .no-slots-message p {
                    margin: 0.25rem 0;
                    font-size: 0.9rem;
                }
                
                .no-slots-message .text-sm {
                    font-size: 0.8rem;
                    color: #6b7280;
                    font-size: 0.5rem;
                    font-weight: 700;
                    padding: 0.125rem 0.25rem;
                    border-radius: 0.25rem;
                    text-transform: uppercase;
                }

                .loading-indicator {
                    font-size: 0.75rem;
                    color: #fbbf24;
                    margin-left: 0.5rem;
                    font-style: italic;
                }

                .feature-icon {
                    font-size: 1.25rem;
                }

                .sound-bars-svg {
                    overflow: visible;
                }

                .sound-bar {
                    animation: soundBarPulse 1.5s ease-in-out infinite;
                    transform-origin: bottom;
                }

                @keyframes soundBarPulse {
                    0%, 100% {
                        transform: scaleY(1);
                        opacity: 1;
                    }
                    25% {
                        transform: scaleY(0.3);
                        opacity: 0.7;
                    }
                    50% {
                        transform: scaleY(1.2);
                        opacity: 1;
                    }
                    75% {
                        transform: scaleY(0.6);
                        opacity: 0.8;
                    }
                }

                .sound-bar:nth-child(1) { animation-duration: 1.2s; }
                .sound-bar:nth-child(2) { animation-duration: 1.4s; }
                .sound-bar:nth-child(3) { animation-duration: 1.1s; }
                .sound-bar:nth-child(4) { animation-duration: 1.6s; }
                .sound-bar:nth-child(5) { animation-duration: 1.3s; }
                .sound-bar:nth-child(6) { animation-duration: 1.5s; }
                .sound-bar:nth-child(7) { animation-duration: 1.2s; }
                .sound-bar:nth-child(8) { animation-duration: 1.4s; }
                .sound-bar:nth-child(9) { animation-duration: 1.1s; }
                .sound-bar:nth-child(10) { animation-duration: 1.6s; }
                .sound-bar:nth-child(11) { animation-duration: 1.3s; }
                .sound-bar:nth-child(12) { animation-duration: 1.5s; }
                .sound-bar:nth-child(13) { animation-duration: 1.2s; }
                .sound-bar:nth-child(14) { animation-duration: 1.4s; }

                .feature-text {
                    font-size: 0.875rem;
                    color: #d1d5db;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                }

                .book-button {
                    background: linear-gradient(45deg, #FF0005, #FF0005);
                    color:rgb(255, 255, 255);
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 0.5rem;
                    font-size: 0.875rem;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                    width: 100%;
                }

                @media (min-width: 481px) {
                    .book-button {
                        padding: 0.875rem 1.75rem;
                        font-size: 1rem;
                    }
                }

                @media (min-width: 769px) {
                    .book-button {
                        padding: 1rem 2rem;
                        font-size: 1.125rem;
                        width: auto;
                    }
                }

                .book-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px rgba(251, 191, 36, 0.3);
                }

                .book-button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    background: linear-gradient(45deg, #6B7280, #6B7280);
                    transform: none;
                    box-shadow: none;
                    pointer-events: none;
                }

                .book-button:disabled:hover {
                    transform: none;
                    box-shadow: none;
                }
                
                .book-button.disabled {
                    background: linear-gradient(45deg, #6B7280, #6B7280);
                    opacity: 0.7;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                    pointer-events: none;
                }
                
                .book-button.disabled:hover {
                    transform: none;
                    box-shadow: none;
                }

                /* Features Section */
                .theater-features-section {
                    padding: 4rem 0;
                    background: linear-gradient(to right, rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0));
                    backdrop-filter: blur(10px);
                }

                .features-header {
                    text-align: center;
                    margin-bottom: 3rem;
                }

                .features-title {
                    font-size: 2.5rem;
                    font-weight: bold;
                    color: #FF0005;
                    margin-bottom: 1rem;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                }

                .features-subtitle {
                    font-size: 1.125rem;
                    color: #d1d5db;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                }

                .features-grid-main {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 2rem;
                }

                .feature-card {
                    text-align: center;
                    padding: 2rem;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 1rem;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    transition: all 0.3s ease;
                }

                .feature-card:hover {
                    transform: translateY(-5px);
                    background: rgba(255, 255, 255, 0.1);
                }

                .feature-icon-large {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                }

                .feature-title {
                    font-size: 1.25rem;
                    font-weight: bold;
                    color: #FF0005;
                    margin-bottom: 1rem;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                }

                .feature-description {
                    font-size: 1rem;
                    color: #d1d5db;
                    line-height: 1.6;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                }

                /* Test Popup Styles */
                .test-popup-overlay {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    background: rgba(0, 0, 0, 0.9) !important;
                    backdrop-filter: blur(15px) !important;
                    z-index: 9999999 !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    padding: 1rem !important;
                    animation: testPopupFadeIn 0.4s ease-out !important;
                }

                .test-popup-modal {
                    background: linear-gradient(135deg, 
                        rgba(0, 0, 0, 0.98) 0%, 
                        rgba(0, 0, 0, 0.95) 100%) !important;
                    border: 3px solid rgba(251, 191, 36, 0.5) !important;
                    border-radius: 1.5rem !important;
                    padding: 2rem !important;
                    max-width: 500px !important;
                    width: 100% !important;
                    max-height: 80vh !important;
                    overflow-y: auto !important;
                    position: relative !important;
                    z-index: 10000000 !important;
                    box-shadow: 
                        0 25px 50px rgba(0, 0, 0, 0.8),
                        0 8px 20px rgba(251, 191, 36, 0.3) !important;
                    animation: testPopupSlideIn 0.4s ease-out !important;
                }

                .test-popup-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 2px solid rgba(251, 191, 36, 0.3);
                }

                .test-popup-header h2 {
                    color: #FF0005;
                    font-size: 1.75rem;
                    font-weight: bold;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                    margin: 0;
                }

                .test-popup-close-btn {
                    background: rgba(255, 255, 255, 0.1);
                    border: 2px solid rgba(255, 255, 255, 0.2);
                    color: #ffffff;
                    width: 2.5rem;
                    height: 2.5rem;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 1.25rem;
                    font-weight: bold;
                    transition: all 0.3s ease;
                }

                .test-popup-close-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                    border-color: rgba(255, 255, 255, 0.4);
                    transform: scale(1.1);
                }

                .test-popup-content {
                    margin-bottom: 2rem;
                }

                .test-popup-content p {
                    color: #ffffff;
                    font-size: 1.125rem;
                    line-height: 1.6;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                    margin-bottom: 1rem;
                }

                .test-popup-footer {
                    display: flex;
                    justify-content: center;
                }

                .test-popup-btn {
                    background: linear-gradient(45deg, #FF0005, #FF0005);
                    color: #000000;
                    border: none;
                    padding: 1rem 2rem;
                    border-radius: 0.75rem;
                    font-size: 1.125rem;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                }

                .test-popup-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px rgba(251, 191, 36, 0.4);
                }

                /* Loading States */
                .loading-theaters {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 3rem;
                    color: #666;
                }

                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #FF0005;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 1rem;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .no-theaters {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 3rem;
                    color: #666;
                    font-size: 1.125rem;
                }

                .loading-details {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    color: #666;
                }

                .loading-time-slots {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    color: #666;
                    grid-column: 1 / -1;
                }

                .loading-spinner-small {
                    width: 24px;
                    height: 24px;
                    border: 3px solid #f3f3f3;
                    border-top: 3px solid #FF0005;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 0.5rem;
                }

                .loading-indicator {
                    font-size: 0.875rem;
                    color: #666;
                    margin-left: 0.5rem;
                    font-style: italic;
                }

                @keyframes testPopupFadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                @keyframes testPopupSlideIn {
                    from {
                        opacity: 0;
                        transform: scale(0.8) translateY(-30px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }

                /* ===== Removed old Theater-specific slideshow styles to avoid conflicts ===== */

                .dot.active {
                    background: var(--accent-color, #ff0000);
                    border-color: var(--accent-color, #ff0000);
                }

                /* Beautiful Slideshow Animation with DOF and Wiggle */
                @keyframes beautifulSlideshow {
                    0% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1) rotate(0deg);
                        filter: blur(0px) brightness(1) contrast(1) saturate(1);
                    }
                    10% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1.01) rotate(0.3deg);
                        filter: blur(0px) brightness(1.05) contrast(1.1) saturate(1.1);
                    }
                    20% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1.02) rotate(-0.2deg);
                        filter: blur(0px) brightness(1.1) contrast(1.15) saturate(1.15);
                    }
                    30% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1.015) rotate(0.25deg);
                        filter: blur(0px) brightness(1.08) contrast(1.12) saturate(1.12);
                    }
                    40% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1.025) rotate(-0.1deg);
                        filter: blur(0px) brightness(1.12) contrast(1.18) saturate(1.18);
                    }
                    50% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1.03) rotate(0.2deg);
                        filter: blur(0px) brightness(1.15) contrast(1.2) saturate(1.2);
                    }
                    60% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1.035) rotate(-0.15deg);
                        filter: blur(0px) brightness(1.18) contrast(1.25) saturate(1.25);
                    }
                    70% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1.04) rotate(0.1deg);
                        filter: blur(0px) brightness(1.2) contrast(1.3) saturate(1.3);
                    }
                    80% {
                        opacity: 0.8;
                        transform: translate(-50%, -50%) scale(1.06) rotate(-0.3deg);
                        filter: blur(2px) brightness(0.9) contrast(1.4) saturate(0.8);
                    }
                    85% {
                        opacity: 0.5;
                        transform: translate(-50%, -50%) scale(1.09) rotate(0.4deg);
                        filter: blur(5px) brightness(0.7) contrast(1.6) saturate(0.6);
                    }
                    90% {
                        opacity: 0.2;
                        transform: translate(-50%, -50%) scale(1.13) rotate(-0.5deg);
                        filter: blur(8px) brightness(0.5) contrast(1.9) saturate(0.4);
                    }
                    95% {
                        opacity: 0.05;
                        transform: translate(-50%, -50%) scale(1.17) rotate(0.6deg);
                        filter: blur(12px) brightness(0.3) contrast(2.2) saturate(0.2);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(1.2) rotate(-0.7deg);
                        filter: blur(15px) brightness(0.1) contrast(2.5) saturate(0.1);
                    }
                }

                /* Enhanced Image Container for Better Effects (legacy; kept for potential reuse) */
                .main-image-wrapper {
                    position: relative;
                    width: 100%;
                    height: 400px;
                    overflow: hidden;
                    border-radius: 12px;
                    background: linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #000000 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 
                        0 20px 40px rgba(0, 0, 0, 0.8),
                        inset 0 0 20px rgba(255, 255, 255, 0.05);
                }

                /* Subtle Background Animation */
                .main-image-wrapper::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: radial-gradient(circle, 
                        rgba(255, 0, 5, 0.1) 0%, 
                        transparent 30%, 
                        rgba(255, 0, 5, 0.05) 70%, 
                        transparent 100%);
                    animation: backgroundGlow 4s ease-in-out infinite;
                    z-index: 0;
                    pointer-events: none;
                }

                @keyframes backgroundGlow {
                    0%, 100% {
                        transform: rotate(0deg) scale(1);
                        opacity: 0.3;
                    }
                    50% {
                        transform: rotate(180deg) scale(1.1);
                        opacity: 0.6;
                    }
                }
                
                /* ===== About-style slideshow (ported) ===== */
                .slideshow-container {
                    position: relative;
                    width: 100%;
                    height: 100%;
                }
                
                .slideshow-wrapper {
                    position: relative;
                    border-radius: 1rem;
                    overflow: hidden;
                }

                


                .slideshow-image-container {
                    position: relative;
                    overflow: hidden;
                    border-radius: 2rem;
                    z-index: 2;
                    height: 180px;
                    width: 100%;
                    max-width: 100%;
                }

                @media (min-width: 480px) {
                    .slideshow-image-container {
                        height: 220px;
                        border-radius: 2rem;
                    }
                }

                @media (min-width: 768px) {
                    .slideshow-image-container {
                        height: 280px;
                    }
                }

                .slideshow-image {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0;
                    transform: scale(1.1);
                    transition: all 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                    z-index: 1;
                }

                .slideshow-image.active {
                    opacity: 1;
                    transform: scale(1);
                    z-index: 2;
                }

                .image-content {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 1rem;
                }

                .theater-detail-image .slideshow-image-container {
                    background: #000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    height: 400px; /* Fixed height for consistency */
                    overflow: hidden;
                    position: relative;
                }

                .theater-detail-image .slideshow-image {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0;
                    transition: opacity 0.5s ease-in-out;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .theater-detail-image .slideshow-image.active {
                    opacity: 1;
                    z-index: 2;
                }

                .theater-detail-image .image-content {
                    object-fit: contain;
                    object-position: center;
                    background: #000;
                    width: 100%;
                    height: 100%;
                    max-width: 100%;
                    max-height: 100%;
                    position: relative;
                }

                .slideshow-overlay {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(
                        to bottom,
                        rgba(0, 0, 0, 0),
                        rgba(0, 0, 0, 0.22)
                    );
                    border-radius: 1rem;
                    z-index: 3;
                }

                .slideshow-dots {
                    position: absolute;
                    bottom: 1rem;
                    left: 50%;
                    transform: translateX(-50%);
                    display: flex;
                    gap: 0.5rem;
                    z-index: 4;
                }

                .dot {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    border: 2px solid rgba(255, 255, 255, 0.4);
                    background: transparent;
                    cursor: pointer;
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                }

                .dot:hover {
                    border-color: rgba(255, 255, 255, 0.8);
                    transform: scale(1.3);
                    background: rgba(255, 255, 255, 0.1);
                }

                .dot.active {
                    background: #FF0005;
                    border-color: #FF0005;
                    box-shadow: 0 0 15px rgba(251, 191, 36, 0.6);
                    transform: scale(1.2);
                }

                .dot.active::before {
                    content: '';
                    position: absolute;
                    top: -4px;
                    left: -4px;
                    right: -4px;
                    bottom: -4px;
                    border-radius: 50%;
                    border: 1px solid rgba(251, 191, 36, 0.3);
                    animation: pulse 2s ease-in-out infinite;
                }

                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.2); opacity: 0.5; }
                    100% { transform: scale(1); opacity: 1; }
                }

                /* Progress bar for slideshow */
                .slideshow-progress {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 999px;
                    z-index: 4;
                    overflow: hidden;
                }

                .slideshow-progress-fill {
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 0%;
                    background: #FF0005;
                    border-radius: 999px;
                    animation-name: slideshowProgressFill;
                    animation-timing-function: linear;
                    animation-fill-mode: forwards;
                }

                @keyframes slideshowProgressFill {
                    from { width: 0%; }
                    to { width: 100%; }
                }
                
                /* ===== Card-specific overrides to retain Theater list border radius ===== */
                .theater-image-container .slideshow-image,
                .theater-image-container .image-content,
                .theater-image-container .slideshow-overlay,
                .theater-image-container .slideshow-glow {
                    border-radius: 1rem;
                }

                .theater-image-container .slideshow-dots {
                    bottom: 0.75rem;
                }

                .theater-image-container .dot {
                    width: 8px;
                    height: 8px;
                }

                .theater-image-container .slideshow-progress {
                    height: 3px;
                }

                /* Watch Video Button - Top Right Corner */
                .watch-button {
                    position: absolute;
                    top: 0.55rem;
                    right: 0.55rem;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.3rem;
                    padding: 0.22rem 0.5rem;
                    border-radius: 999px;
                    border: none;
                    background: rgba(255, 255, 255);
                    color: #ff0004ff;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                    font-size: 0.55rem;
                    font-weight: 600;
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                    cursor: pointer;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    z-index: 6;
                }

                .watch-button:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 14px rgba(255, 0, 5, 0.2);
                }

                .watch-button-text {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.25rem;
                }

                .watch-button-icon {
                    width: 10px;
                    height: 10px;
                    color: currentColor;
                    flex-shrink: 0;
                }

                @media (max-width: 768px) {
                    .watch-button {
                        top: 0.65rem;
                        right: 0.65rem;
                        padding: 0.2rem 0.45rem;
                        font-size: 0.55rem;
                        gap: 0.25rem;
                    }
                }

                /* Theater Detail YouTube Overlay Button */
                .youtube-overlay-button {
                    position: absolute;
                    top: 1.5rem;
                    left: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1.25rem;
                    background: #ffffff;
                    border-radius: 50px;
                    text-decoration: none;
                    color: #000000;
                    z-index: 10;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                }

                .youtube-overlay-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
                }

                .youtube-disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    pointer-events: none;
                }

                .youtube-disabled:hover {
                    transform: none;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }

                .youtube-text {
                    font-size: 0.95rem;
                    font-family: 'Paralucent', sans-serif;
                    font-weight: 600;
                    color: #000000;
                    letter-spacing: 0.3px;
                }

                .youtube-icon {
                    width: 24px;
                    height: 24px;
                    color: #FF0000;
                    flex-shrink: 0;
                }

                @media (max-width: 768px) {
                    .youtube-overlay-button {
                        top: 1rem;
                        left: 1rem;
                        padding: 0.6rem 1rem;
                        gap: 0.4rem;
                    }

                    .youtube-text {
                        font-size: 0.85rem;
                    }

                    .youtube-icon {
                        width: 20px;
                        height: 20px;
                    }
                }

                @media (max-width: 768px) {
                    .theater-page * {
                        animation: none !important;
                        backdrop-filter: none !important;
                    }

                    .theater-page::before {
                        filter: none;
                    }

                    .detail-glow,
                    .card-image-glow {
                        display: none;
                    }
                }
            `}</style>

        </div>
    );
};
