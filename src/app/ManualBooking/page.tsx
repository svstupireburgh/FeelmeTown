'use client';

import Image from 'next/image';
import { Suspense, useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useSearchParams } from 'next/navigation';
import { DatePickerProvider } from '@/contexts/DatePickerContext';
import { BookingProvider, useBooking } from '@/contexts/BookingContext';
import { useDatePicker } from '@/contexts/DatePickerContext';
import BookingPopup from '@/components/BookingPopup';
import CancelBookingPopup from '@/components/CancelBookingPopup';
import GlobalDatePicker from '@/components/GlobalDatePicker';
// Removed getDefaultTimeSlots import - no hardcoded time slots

function ManualBookingContent() {
    const { openBookingPopup, setIncompleteBookingData, openCancelBookingPopup, resetPopupState, isBookingPopupOpen, closeBookingPopup, isCancelBookingPopupOpen, closeCancelBookingPopup, cancelBookingData } = useBooking();
    
    // Pre-fetch booking data for faster popup opening
    const [preloadedData, setPreloadedData] = useState({
        services: null,
        theaters: null,
        occasions: null,
        isLoaded: false
    });

    const resolveAmount = (candidates: any[]) => {
        for (const candidate of candidates) {
            if (candidate === undefined || candidate === null || candidate === '') continue;
            const parsed = Number(candidate);
            if (!Number.isNaN(parsed) && parsed > 0) return parsed;
        }
        return null;
    };

    const formatCurrency = (amount: number) => {
        return `₹ ${Number(amount).toLocaleString('en-IN')}`;
    };

    const searchParams = useSearchParams();
    const trustedCustomerPrefill = useMemo(() => {
        const customerId = searchParams.get('trustedCustomerId') || undefined;
        const name = searchParams.get('trustedCustomerName') || undefined;
        const phone = searchParams.get('trustedCustomerPhone') || undefined;
        const email = searchParams.get('trustedCustomerEmail') || undefined;
        const billing = searchParams.get('trustedBilling') || undefined;

        if (customerId || name || phone || email || billing) {
            return {
                customerId,
                name,
                phone,
                email,
                billingPreference: (billing === 'free' ? 'free' : billing === 'paid' ? 'paid' : undefined) as 'paid' | 'free' | undefined
            };
        }

        return null;
    }, [searchParams]);
    const [selectedTheater, setSelectedTheater] = useState(0);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [memberCount, setMemberCount] = useState(1);
    
    // User identification states
    const [userInfo, setUserInfo] = useState<{
        type: 'admin' | 'staff' | null;
        staffId?: string;
        staffName?: string;
        adminName?: string;
        profilePhoto?: string;
    }>({ type: null });

    // Fetch admin profile data from database
    const fetchAdminProfileData = async () => {
        try {
            console.log('🔍 Fetching admin profile data from database');
            const response = await fetch('/api/admin/profile');
            const data = await response.json();
            
            if (data.success && data.admin) {
                console.log('✅ Admin profile data found:', {
                    adminId: data.admin.id || 'ADM0001',
                    fullName: data.admin.name || 'Admin',
                    email: data.admin.email,
                    username: data.admin.username,
                    phone: data.admin.phone
                });
                
                // Check if admin has profile photo (might be in different field)
                const profilePhoto = data.admin.profilePhoto || data.admin.avatar || data.admin.photo || '';
                
                if (profilePhoto) {
                    console.log('✅ Admin profile photo found:', profilePhoto);
                } else {
                    console.log('⚠️ No profile photo found for admin - using default icon');
                }
                
                return {
                    profilePhoto: profilePhoto,
                    fullName: data.admin.name || 'Sonu Attry',
                    adminId: data.admin.id || 'ADM0001'
                };
            } else {
                console.log('⚠️ No admin data received from API');
                return {
                    profilePhoto: '',
                    fullName: 'Admin',
                    adminId: 'ADM0001'
                };
            }
        } catch (error) {
            console.error('❌ Error fetching admin profile data:', error);
            return {
                profilePhoto: '',
                fullName: 'Admin',
                adminId: 'ADM0001'
            };
        }
    };

    // Fetch complete staff information from database
    const fetchStaffInfo = async (staffId: string) => {
        try {
            console.log('🔍 Fetching staff information for ID:', staffId);
            const response = await fetch('/api/admin/staff');
            const data = await response.json();
            
            if (data.success && data.staff && Array.isArray(data.staff)) {
                // Find staff member by userId or staffId
                const staffMember = data.staff.find((staff: any) => 
                    staff.userId === staffId || 
                    staff.staffId === staffId ||
                    staff._id === staffId ||
                    staff.id === staffId
                );
                
                if (staffMember) {
                    console.log('✅ Staff information found:', {
                        name: staffMember.name,
                        userId: staffMember.userId,
                        staffId: staffMember.staffId,
                        profilePhoto: staffMember.profilePhoto
                    });
                    return {
                        name: staffMember.name || 'Staff Member',
                        profilePhoto: staffMember.profilePhoto || '',
                        staffId: staffMember.staffId || staffMember.userId || staffId
                    };
                } else {
                    console.log('⚠️ No staff member found for ID:', staffId);
                    console.log('📋 Available staff:', data.staff.map((s: any) => ({
                        name: s.name,
                        userId: s.userId,
                        staffId: s.staffId
                    })));
                    return {
                        name: 'Staff Member',
                        profilePhoto: '',
                        staffId: staffId
                    };
                }
            } else {
                console.log('⚠️ No staff data received from API');
                return {
                    name: 'Staff Member',
                    profilePhoto: '',
                    staffId: staffId
                };
            }
        } catch (error) {
            console.error('❌ Error fetching staff information:', error);
            return {
                name: 'Staff Member',
                profilePhoto: '',
                staffId: staffId
            };
        }
    };
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
    const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
    const theaterDetailsRef = useRef<HTMLDivElement>(null);
    const [isFetchingIncompleteBooking, setIsFetchingIncompleteBooking] = useState(false);
    const [fetchedBookingIds, setFetchedBookingIds] = useState<Set<string>>(new Set());
    const [fetchedCancelBookingIds, setFetchedCancelBookingIds] = useState<Set<string>>(new Set());
    const [bookedTimeSlots, setBookedTimeSlots] = useState<string[]>([]);
    const [bookedSlotsMap, setBookedSlotsMap] = useState<Record<string, string[]>>({});
    const [isLoadingBookedSlots, setIsLoadingBookedSlots] = useState(false);
    const [isBookingInProgress, setIsBookingInProgress] = useState(false);
    const bookingClickRef = useRef(false);

    const applyBookedSlotsToMap = useCallback((theaterName: string | undefined, slots: any) => {
        if (!theaterName) return;
        setBookedSlotsMap((prev) => ({
            ...prev,
            [theaterName]: Array.isArray(slots) ? slots : [],
        }));
    }, []);
    
    // Slideshow states
    const [theaters, setTheaters] = useState<any[]>([]);
    const [isLoadingTheaters, setIsLoadingTheaters] = useState(true);
    // Selected theater image index for gallery
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    // Auto slideshow state - Always enabled by default
    const [isAutoSlideshow, setIsAutoSlideshow] = useState(true);
    // Theater card image indices for mini slideshows
    const [theaterCardImageIndices, setTheaterCardImageIndices] = useState<{[key: number]: number}>({});
    // Animation trigger state to force re-render
    const [animationTrigger, setAnimationTrigger] = useState(0);

    // Slideshow timing to match About page feel
    const THEATER_SLIDE_DURATION_MS = 4000;

    // Use global date picker
    const { selectedDate, openDatePicker, setSelectedDate, isDatePickerOpen, closeDatePicker } = useDatePicker();

    // Detect user type and fetch user info
    useEffect(() => {
        const detectUserType = () => {
            // Check if user came from admin routes
            const referrer = document.referrer;
            const currentPath = window.location.pathname;
            
            // Check localStorage for user session info
            const adminSession = localStorage.getItem('adminToken') === 'authenticated';
            const staffSession = localStorage.getItem('staffToken') === 'authenticated';
            
            console.log('🔍 Session check:', { adminSession, staffSession, referrer });
            console.log('🔍 Available localStorage keys:', Object.keys(localStorage));
            
            if (adminSession || referrer.includes('/Administrator')) {
                // Set initial admin info without profile photo
                setUserInfo({ 
                    type: 'admin',
                    adminName: 'Admin',
                    profilePhoto: ''
                });
                
                // Fetch admin profile data from database
                fetchAdminProfileData().then(adminData => {
                    setUserInfo(prev => ({
                        ...prev,
                        adminName: adminData.fullName,
                        profilePhoto: adminData.profilePhoto
                    }));
                });
                
                console.log('🔐 Admin user detected on Manual Booking page');
            } else if (staffSession || referrer.includes('/management')) {
                // Try to get staff info from localStorage or session
                const staffInfo = localStorage.getItem('staffUser');
                console.log('🔍 Checking for staff user in localStorage:', staffInfo);
                if (staffInfo) {
                    try {
                        const parsedStaffInfo = JSON.parse(staffInfo);
                        console.log('📋 Parsed staff info:', parsedStaffInfo);
                        const staffId = parsedStaffInfo.userId || parsedStaffInfo.staffId || parsedStaffInfo.id || 'FMT0001';
                        const staffName = parsedStaffInfo.name || parsedStaffInfo.staffName || 'Staff Member';
                        console.log('🆔 Extracted staff ID:', staffId, 'Name:', staffName);
                        
                        // Set initial user info without profile photo
                        setUserInfo({
                            type: 'staff',
                            staffId: staffId,
                            staffName: staffName,
                            profilePhoto: ''
                        });
                        
                        // Fetch complete staff information from database
                        fetchStaffInfo(staffId).then(staffInfo => {
                            console.log('🔄 Updating staff info with database data:', staffInfo);
                            setUserInfo(prev => ({
                                ...prev,
                                staffName: staffInfo.name,
                                staffId: staffInfo.staffId,
                                profilePhoto: staffInfo.profilePhoto
                            }));
                        });
                        
                        console.log('🔐 Staff user detected:', parsedStaffInfo);
                    } catch (error) {
                        console.log('❌ Error parsing staff info:', error);
                        // Fallback staff info
                        setUserInfo({
                            type: 'staff',
                            staffId: 'STAFF-001',
                            staffName: 'Staff Member',
                            profilePhoto: ''
                        });
                        
                        // Try to fetch staff info with fallback ID
                        fetchStaffInfo('STAFF-001').then(staffInfo => {
                            console.log('🔄 Updating fallback staff info with database data:', staffInfo);
                            setUserInfo(prev => ({
                                ...prev,
                                staffName: staffInfo.name,
                                staffId: staffInfo.staffId,
                                profilePhoto: staffInfo.profilePhoto
                            }));
                        });
                    }
                } else {
                    console.log('⚠️ No staff user found in localStorage, using default');
                    // Default staff info if no session data - use FMT0001 (Nishant Mogahaa)
                    const defaultStaffId = 'FMT0001';
                    setUserInfo({
                        type: 'staff',
                        staffId: defaultStaffId,
                        staffName: 'Nishant Mogahaa',
                        profilePhoto: ''
                    });
                    
                    // Fetch complete staff information from database
                    fetchStaffInfo(defaultStaffId).then(staffInfo => {
                        console.log('🔄 Updating default staff info with database data:', staffInfo);
                        setUserInfo(prev => ({
                            ...prev,
                            staffName: staffInfo.name,
                            staffId: staffInfo.staffId,
                            profilePhoto: staffInfo.profilePhoto
                        }));
                    });
                }
                console.log('🔐 Staff user detected on Manual Booking page');
            } else {
                // Default to admin if uncertain
                setUserInfo({ 
                    type: 'admin',
                    adminName: 'Admin',
                    profilePhoto: ''
                });
                
                // Fetch admin profile data from database
                fetchAdminProfileData().then(adminData => {
                    setUserInfo(prev => ({
                        ...prev,
                        adminName: adminData.fullName,
                        profilePhoto: adminData.profilePhoto
                    }));
                });
                
                console.log('🔐 Default admin user on Manual Booking page');
            }
        };

        detectUserType();
    }, []);

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
                        theater.pricingData?.appliedDecorationFee
                    ]);

                    const extraGuestFee = resolveAmount([
                        theater.extraGuestFee,
                        theater.extraGuestsFee,
                        theater.pricingData?.extraGuestFee,
                        theater.pricingData?.extraGuestFees
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
                        youtubeLink: theater.youtubeLink || null,
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

    // Pre-fetch booking data on page load for instant popup opening
    useEffect(() => {
        const preloadBookingData = async () => {
            if (preloadedData.isLoaded) return; // Already loaded
            
            console.log('🚀 [ManualBooking Page] Pre-loading booking data...');
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
                console.log(`⚡ [ManualBooking Page] Pre-loaded booking data in ${(endTime - startTime).toFixed(0)}ms`);
                
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
                
                console.log('✅ [ManualBooking Page] Booking data cached for instant popup opening');
                
            } catch (error) {
                console.error('❌ [ManualBooking Page] Error pre-loading booking data:', error);
            }
        };
        
        // Start preloading after a short delay to not block initial page render
        setTimeout(preloadBookingData, 500);
    }, [preloadedData.isLoaded]);

    // Real-time theater updates every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            
            fetchTheaters(false); // Silent refresh without loading indicator
        }, 5000); // 5 seconds for real-time updates

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setIsMounted(true);
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 2000); // Update current time every 2 seconds

        return () => clearInterval(timer);
    }, []);


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
                    const response = await fetch(`${baseUrl}/api/incomplete-booking`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        cache: 'no-cache',
                        signal: AbortSignal.timeout(10000) // 10 second timeout
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
                if (!trustedCustomerPrefill) {
                    openBookingPopup();
                }
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
    }, [searchParams, fetchIncompleteBooking, openBookingPopup, openCancelBookingPopup, isFetchingIncompleteBooking, fetchedBookingIds, fetchedCancelBookingIds, selectedTheater, selectedDate, selectedTimeSlot, resetPopupState, trustedCustomerPrefill]);

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
        if (!filteredTheaters.length) return;

        const currentTheater = filteredTheaters[selectedTheater] || filteredTheaters[0];
        const imagesCount = currentTheater?.images?.length || 0;
        
        if (imagesCount <= 1) return; // No need for slideshow with single image

        const interval = setInterval(() => {
            setCurrentImageIndex(prev => {
                const nextIndex = (prev + 1) % imagesCount;
                // Force animation trigger for smooth transitions
                setAnimationTrigger(trigger => trigger + 1);
                return nextIndex;
            });
        }, THEATER_SLIDE_DURATION_MS); // Change image based on About page cycle

        return () => clearInterval(interval);
    }, [selectedTheater, filteredTheaters]);

    // Auto slideshow for theater cards - Always running, every 2 seconds
    useEffect(() => {
        const intervals: NodeJS.Timeout[] = [];

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
    }, [filteredTheaters]);

    const isFetchingSlotsRef = useRef(false);
    const previousSlotsRef = useRef<string[]>([]);

    const fetchBookedSlots = useCallback(async ({ showSpinner = false }: { showSpinner?: boolean } = {}) => {
        if (!selectedDate || !filteredTheaters[selectedTheater]?.name) return;
        if (isFetchingSlotsRef.current) return;
        isFetchingSlotsRef.current = true;

        if (showSpinner) {
            setIsLoadingBookedSlots(true);
        }

        try {
            const response = await fetch(`/api/booked-slots?date=${encodeURIComponent(selectedDate)}&theater=${encodeURIComponent(filteredTheaters[selectedTheater].name)}`);
            const data = await response.json();

            if (data.success) {
                const newSlots = data.bookedTimeSlots || [];
                const prevSlots = previousSlotsRef.current;

                if (JSON.stringify(prevSlots) !== JSON.stringify(newSlots)) {
                    previousSlotsRef.current = newSlots;
                    setBookedTimeSlots(newSlots);
                    applyBookedSlotsToMap(filteredTheaters[selectedTheater].name, newSlots);

                    // Emit diff event only when changes occur
                    const newBookings = newSlots.filter((slot: string) => !prevSlots.includes(slot));
                    const cancelledBookings = prevSlots.filter((slot: string) => !newSlots.includes(slot));
                    if (newBookings.length || cancelledBookings.length) {
                        window.dispatchEvent(new CustomEvent('slotsUpdated', {
                            detail: { newBookings, cancelledBookings }
                        }));
                    }
                }
            } else {
                previousSlotsRef.current = [];
                setBookedTimeSlots([]);
                applyBookedSlotsToMap(filteredTheaters[selectedTheater].name, []);
            }
        } catch (error) {
            
            previousSlotsRef.current = [];
            setBookedTimeSlots([]);
            applyBookedSlotsToMap(filteredTheaters[selectedTheater].name, []);
        } finally {
            if (showSpinner) {
                setIsLoadingBookedSlots(false);
            }
            isFetchingSlotsRef.current = false;
        }
    }, [selectedDate, selectedTheater, filteredTheaters, applyBookedSlotsToMap]);

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
                            return [theaterName, []] as const;
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
    }, [selectedDate, filteredTheaters]);

    // Fetch booked time slots only when date changes
    useEffect(() => {
        fetchBookedSlots({ showSpinner: true });
    }, [fetchBookedSlots]);

    // Listen for real-time slot refresh events
    useEffect(() => {
        const handler = () => fetchBookedSlots();
        window.addEventListener('refreshBookedSlots', handler);
        return () => window.removeEventListener('refreshBookedSlots', handler);
    }, [fetchBookedSlots]);

    // Real-time booked slots refresh - instant updates when database changes (without spinner)
    useEffect(() => {
        fetchBookedSlots();
        const refreshTimer = setInterval(() => fetchBookedSlots(), 2000);
        return () => clearInterval(refreshTimer);
    }, [fetchBookedSlots]);



    const preFillBookingData = useCallback((bookingData: { date?: string; numberOfPeople?: number; time?: string; theaterName?: string }) => {
        // Set date if available
        if (bookingData.date) {
            setSelectedDate(bookingData.date);
        }

        // Set member count if available
        if (bookingData.numberOfPeople) {
            setMemberCount(bookingData.numberOfPeople);
        }

        // Set time slot if available
        if (bookingData.time) {
            setSelectedTimeSlot(bookingData.time);
        }

        // Set theater if available
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
            {/* User Identification - Top Left Corner with Profile Photos */}
            <div className="user-identification">
                {userInfo.type === 'admin' ? (
                    <div className="user-badge admin-badge">
                        <div className="user-avatar">
                            {userInfo.profilePhoto ? (
                                <img 
                                    src={userInfo.profilePhoto} 
                                    alt="Admin Profile" 
                                    className="profile-image"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                        if (nextElement) {
                                            nextElement.style.display = 'flex';
                                        }
                                    }}
                                />
                            ) : null}
                            <div className="user-icon" style={{display: userInfo.profilePhoto ? 'none' : 'flex'}}>👨‍💼</div>
                        </div>
                        <div className="user-details">
                            <span className="user-type">{userInfo.adminName || 'Admin'}</span>
                            <span className="user-subtitle">Administrator</span>
                        </div>
                    </div>
                ) : userInfo.type === 'staff' ? (
                    <div className="user-badge staff-badge">
                        <div className="user-avatar">
                            {userInfo.profilePhoto ? (
                                <img 
                                    src={userInfo.profilePhoto} 
                                    alt="Staff Profile" 
                                    className="profile-image"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                        if (nextElement) {
                                            nextElement.style.display = 'flex';
                                        }
                                    }}
                                />
                            ) : null}
                            <div className="user-icon" style={{display: userInfo.profilePhoto ? 'none' : 'flex'}}>👨‍💻</div>
                        </div>
                        <div className="user-details">
                            <span className="user-type">{userInfo.staffName}</span>
                            <span className="user-subtitle">ID: {userInfo.staffId}</span>
                        </div>
                    </div>
                ) : (
                    <div className="user-badge loading-badge">
                        <div className="user-avatar">
                            <div className="user-icon">⏳</div>
                        </div>
                        <div className="user-details">
                            <span className="user-type">Loading...</span>
                            <span className="user-subtitle">Identifying user</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Hero Section */}
            <section className="theater-hero">
                <div className="container">
                    <div className="hero-content">
                        <h1 className="hero-title">
                            Mannual <span className="highlight">Booking Portal</span>
                        </h1>
                        <p className="hero-subtitle">
                            Admin and Staff can do Manual Booking 
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
                                    {Array.from({length: Math.max(...theaters.map(t => t.capacityNumber || 1), 1)}, (_, i) => i + 1).map(count => (
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
                                                    />
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
                            <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
                                                <div className="slideshow-glow"></div>
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
                                                                priority={i === currentImageIndex}
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
                                                const isBooked = bookedTimeSlots.includes(timeSlot);
                                                const isSelected = selectedTimeSlot === timeSlot;

                                                
                                                // Debug logging for each slot
                                                
                                                
                                                if (isBooked) {
                                                    
                                                }
                                                
                                                // Check if slot time is gone (1 hour before start time)
                                                // Manual booking flow should always allow staff to pick any slot,
                                                // even if the time has already passed. Keep this false so slots stay selectable.
                                                const isTimeGone = false;

                                                return (
                                                    <button
                                                        key={timeSlot}
                                                        className={`time-slot ${isSelected ? 'selected' : ''} ${isBooked ? 'booked' : ''} ${isTimeGone ? 'time-gone' : ''}`}
                                                        onClick={() => !isBooked && setSelectedTimeSlot(timeSlot)}
                                                        disabled={isBooked}
                                                    >
                                                        {isBooked ? 'Slot Booked' : timeSlot}
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
                                        if (!selectedTimeSlot) return; // Guard click when disabled
                                        
                                        
                                        
                                        
                                        
                                        // Simple direct approach - no time restrictions
                                        // Auto-reset is now handled in openBookingPopup function
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

            


            <style jsx>{`
                .theater-page {
                    min-height: 100vh;
                    background-color: #000000;
                    color: #ffffff;
                    position: relative;
                }

                /* Modern User Identification Styles - Left Corner */
                .user-identification {
                    position: fixed;
                    top: 24px;
                    left: 24px;
                    z-index: 1000;
                    animation: slideInFromLeft 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                }

                @keyframes slideInFromLeft {
                    from {
                        opacity: 0;
                        transform: translateX(-150px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                .user-badge {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 16px 20px;
                    border-radius: 20px;
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    box-shadow: 
                        0 20px 40px rgba(0, 0, 0, 0.4),
                        0 8px 16px rgba(0, 0, 0, 0.2),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                    width: fit-content;
                    white-space: nowrap;
                }

                .user-badge::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                    transition: left 0.6s;
                }

                .user-badge:hover::before {
                    left: 100%;
                }

                .user-badge:hover {
                    transform: translateY(-4px) scale(1.02);
                    box-shadow: 
                        0 32px 64px rgba(0, 0, 0, 0.5),
                        0 16px 32px rgba(0, 0, 0, 0.3),
                        inset 0 1px 0 rgba(255, 255, 255, 0.2);
                }

                .admin-badge {
                    background: linear-gradient(135deg, 
                        rgba(255, 107, 107, 0.9) 0%,
                        rgba(238, 90, 82, 0.9) 50%,
                        rgba(220, 38, 127, 0.9) 100%);
                    border-color: rgba(255, 107, 107, 0.4);
                }

                .admin-badge:hover {
                    background: linear-gradient(135deg, 
                        rgba(255, 107, 107, 1) 0%,
                        rgba(238, 90, 82, 1) 50%,
                        rgba(220, 38, 127, 1) 100%);
                }

                .staff-badge {
                    background: linear-gradient(135deg, 
                        rgba(255, 255, 255, 0.16) 0%,
                        rgba(255, 255, 255, 0.15)0%,
                        rgba(255, 255, 255, 0.04) 100%);
                    border-color: rgba(78, 205, 196, 0.4);
                }

                .staff-badge:hover {
                    background: linear-gradient(135deg, 
                        rgb(255, 255, 255) 0%,
                        rgba(68, 160, 141, 1) 50%,
                        rgba(34, 193, 195, 1) 100%);
                }

                .loading-badge {
                    background: linear-gradient(135deg, 
                        rgba(149, 165, 166, 0.9) 0%,
                        rgba(127, 140, 141, 0.9) 50%,
                        rgba(108, 122, 137, 0.9) 100%);
                    border-color: rgba(149, 165, 166, 0.4);
                }

                .user-avatar {
                    position: relative;
                    width: 48px;
                    height: 48px;
                    border-radius: 16px;
                    overflow: hidden;
                }

                .profile-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 16px;
                    border: 2px solid rgba(255, 255, 255, 0.2);
                    transition: all 0.3s ease;
                }

                .profile-image:hover {
                    border-color: rgba(255, 255, 255, 0.4);
                    transform: scale(1.05);
                }

                .user-icon {
                    font-size: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 48px;
                    height: 48px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: hidden;
                }

                .user-icon::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }

                .user-badge:hover .user-icon::before {
                    opacity: 1;
                }

                .user-badge:hover .user-icon {
                    transform: scale(1.1);
                    background: rgba(255, 255, 255, 0.25);
                }

                .user-details {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    flex: 1;
                }

                .user-type {
                    font-size: 16px;
                    font-weight: 700;
                    color: #ffffff;
                    line-height: 1.2;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                    letter-spacing: 0.5px;
                }

                .user-subtitle {
                    font-size: 13px;
                    color: rgba(255, 255, 255, 0.9);
                    font-weight: 500;
                    line-height: 1.2;
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
                    letter-spacing: 0.3px;
                    opacity: 0.8;
                    transition: opacity 0.3s ease;
                }

                .user-badge:hover .user-subtitle {
                    opacity: 1;
                }

                /* Responsive adjustments */
                @media (max-width: 768px) {
                    .user-identification {
                        top: 16px;
                        left: 16px;
                    }
                    
                    .user-badge {
                        padding: 12px 16px;
                        gap: 12px;
                        width: fit-content;
                        border-radius: 16px;
                    }
                    
                    .user-avatar {
                        width: 40px;
                        height: 40px;
                        border-radius: 12px;
                    }
                    
                    .profile-image {
                        border-radius: 12px;
                    }
                    
                    .user-icon {
                        font-size: 24px;
                        width: 40px;
                        height: 40px;
                        border-radius: 12px;
                    }
                    
                    .user-type {
                        font-size: 14px;
                        font-weight: 600;
                    }
                    
                    .user-subtitle {
                        font-size: 11px;
                    }
                }

                @media (max-width: 480px) {
                    .user-identification {
                        top: 12px;
                        left: 12px;
                    }
                    
                    .user-badge {
                        padding: 10px 14px;
                        gap: 10px;
                        width: fit-content;
                        border-radius: 14px;
                    }
                    
                    .user-avatar {
                        width: 36px;
                        height: 36px;
                        border-radius: 10px;
                    }
                    
                    .profile-image {
                        border-radius: 10px;
                    }
                    
                    .user-icon {
                        font-size: 20px;
                        width: 36px;
                        height: 36px;
                        border-radius: 10px;
                    }
                    
                    .user-type {
                        font-size: 13px;
                        font-weight: 600;
                    }
                    
                    .user-subtitle {
                        font-size: 10px;
                    }
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
                    grid-template-columns: repeat(2, 1fr);
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
                    transform: scale(1.1);
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

                @media (max-width: 768px) {
                    .watch-button {
                        top: 0.65rem;
                        right: 0.65rem;
                        padding: 0.2rem 0.45rem;
                        font-size: 0.55rem;
                        gap: 0.25rem;
                    }
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


                .theater-card:hover {
                    transform: translateY(-10px);
                }

                .theater-card {
                    cursor: pointer;
                    transition: all 0.3s ease;
                    border-radius: 1rem;
                    overflow: hidden;
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

                .detail-image {
                    width: 100%;
                    height: 200px;
                    object-fit: cover;
                    border-radius: 0.75rem;
                    position: relative;
                    z-index: 2;
                    display: block;
                    transition: transform 0.4s ease;
                }

                @media (min-width: 481px) {
                    .detail-image {
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
                }

                .slideshow-wrapper {
                    position: relative;
                    border-radius: 4rem;
                    overflow: hidden;
                }

                .slideshow-glow {
                    position: absolute;
                    inset: 0;
                    border-radius: 4rem;
                    filter: blur(24px);
                    background: linear-gradient(45deg, 
                        rgba(251, 191, 36, 0.4), 
                        rgba(239, 68, 68, 0.4), 
                        rgba(147, 51, 234, 0.4), 
                        rgba(34, 197, 94, 0.4),
                        rgba(59, 130, 246, 0.4)
                    );
                    background-size: 500% 500%;
                    animation: gradientShift 6s ease-in-out infinite;
                    z-index: 1;
                    opacity: 0.8;
                }

                @keyframes gradientShift {
                    0% { 
                        background-position: 0% 50%; 
                        filter: blur(20px);
                    }
                    25% { 
                        background-position: 100% 50%; 
                        filter: blur(28px);
                    }
                    50% { 
                        background-position: 50% 100%; 
                        filter: blur(24px);
                    }
                    75% { 
                        background-position: 50% 0%; 
                        filter: blur(30px);
                    }
                    100% { 
                        background-position: 0% 50%; 
                        filter: blur(20px);
                    }
                }

                .slideshow-image-container {
                    position: relative;
                    overflow: hidden;
                    border-radius: 4rem;
                    z-index: 2;
                    height: 250px;
                    width: 100%;
                    max-width: 100%;
                }

                @media (min-width: 768px) {
                    .slideshow-image-container {
                        height: 350px;
                    }
                }

                @media (min-width: 1024px) {
                    .slideshow-image-container {
                        height: 400px;
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
                    border-radius: 4rem;
                }

                .slideshow-overlay {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(
                        to bottom,
                        rgba(0, 0, 0, 0.1),
                        rgba(0, 0, 0, 0.3)
                    );
                    border-radius: 4rem;
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
            `}</style>

            {/* Manual Booking Popups */}
            <BookingPopup isOpen={isBookingPopupOpen} onClose={closeBookingPopup} isManualMode={true} userInfo={userInfo} />
            <CancelBookingPopup isOpen={isCancelBookingPopupOpen} onClose={closeCancelBookingPopup} bookingData={cancelBookingData} />
            
            {/* Global Date Picker */}
            <GlobalDatePicker
                isOpen={isDatePickerOpen}
                onClose={closeDatePicker}
                onDateSelect={setSelectedDate}
                selectedDate={selectedDate}
            />
        </div>
    );
}

export default function ManualBooking() {
    return (
        <DatePickerProvider>
            <BookingProvider>
                <Suspense fallback={<div style={{ minHeight: 240 }} />}>
                    <ManualBookingContent />
                </Suspense>
            </BookingProvider>
        </DatePickerProvider>
    );
}
