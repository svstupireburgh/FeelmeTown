'use client';

import { useState, useEffect } from 'react';
import AdminDashboard from '@/components/AdminDashboard';

export default function AdministratorPage() {
  const [stats, setStats] = useState({
    onlineBookings: {
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      thisYear: 0,
      total: 0
    },
    manualBookings: {
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      thisYear: 0,
      total: 0
    },
    allBookings: {
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      thisYear: 0,
      total: 0
    },
    activeHalls: {
      total: 4
    },
    cancelledBookings: {
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      thisYear: 0,
      total: 0
    },
    completedBookings: {
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      thisYear: 0,
      total: 0
    },
    incompleteBookings: {
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      thisYear: 0,
      total: 0
    },
    confirmedToday: {
      confirmed: 0,
      completed: 0
    },
    unreadInquiries: {
      total: 0,
      today: 0
    }
  });

  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [updateCounter, setUpdateCounter] = useState(0);

  const fetchDashboardStats = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      const response = await fetch('/api/admin/dashboard-stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
        setLastUpdated(new Date());
        setUpdateCounter(prev => prev + 1); // Trigger re-render for updated time
      } else {
        
      }
    } catch (error) {
      
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  const fetchRecentBookings = async () => {
    try {
      const [bookingsResponse, manualBookingsResponse] = await Promise.all([
        fetch('/api/admin/bookings'),
        fetch('/api/admin/manual-bookings')
      ]);
      
      const [bookingsData, manualBookingsData] = await Promise.all([
        bookingsResponse.json(),
        manualBookingsResponse.json()
      ]);
      
      const bookingsList = bookingsData.bookings || [];
      const manualList = manualBookingsData.manualBookings || manualBookingsData.bookings || [];

      // Merge bookings by bookingId to avoid duplicates (manual copy + main copy)
      const bookingMap = new Map<string, any>();

      const upsertBooking = (booking: any, source: 'manual' | 'regular') => {
        if (!booking) return;
        const key = booking.bookingId || booking.id || booking._id?.toString();
        if (!key) return;
        const existing = bookingMap.get(key);

        if (!existing) {
          bookingMap.set(key, { ...booking, __source: source });
          return;
        }

        // Prefer manual-specific metadata but keep existing fields
        if (source === 'manual') {
          bookingMap.set(key, { ...existing, ...booking, __source: source });
        } else {
          bookingMap.set(key, { ...booking, ...existing, __source: existing.__source || source });
        }
      };

      bookingsList.forEach((booking: any) => upsertBooking(booking, 'regular'));
      manualList.forEach((booking: any) => upsertBooking(booking, 'manual'));

      const allBookings = Array.from(bookingMap.values());

      // Sort by creation date and take first 5
      const recent = allBookings
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(booking => ({
          ...booking,
          id: booking.bookingId || booking.id || booking._id,
          customerName: booking.name || booking.customerName,
          theater: booking.theaterName || booking.theater,
          amount: booking.totalAmount ?? booking.amount ?? 0,
          advancePayment: booking.advancePayment || 0,
          venuePayment: booking.venuePayment || 0,
          selectedMovies: booking.selectedMovies || [],
          selectedCakes: booking.selectedCakes || [],
          selectedDecorItems: booking.selectedDecorItems || [],
          selectedGifts: booking.selectedGifts || []
        }));
      
      setRecentBookings(recent);
    } catch (error) {
      
    }
  };

  useEffect(() => {
    // Initial load with loading state
    fetchDashboardStats(true);
    fetchRecentBookings();
    
    // Set up silent real-time updates every 2 seconds (without loading state)
    const interval = setInterval(async () => {
      await Promise.all([
        fetchDashboardStats(false), // Silent update
        fetchRecentBookings()
      ]);
    }, 2000); // 2 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Real-time clock update every second
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // 1 second

    return () => clearInterval(clockInterval);
  }, []);

  if (loading) {
    return (
      <div className="administrator-page">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '50vh',
          fontSize: '1.2rem',
          color: '#666'
        }}>
          Loading dashboard...
        </div>
      </div>
    );
  }

  const refreshData = async () => {
    await Promise.all([
      fetchDashboardStats(false), // Silent refresh without loading state
      fetchRecentBookings()
    ]);
  };

  return (
    <div className="administrator-page">
      <AdminDashboard 
        stats={stats} 
        recentBookings={recentBookings} 
        onRefresh={refreshData}
        refreshing={refreshing}
        lastUpdated={lastUpdated}
        currentTime={currentTime}
        updateCounter={updateCounter}
      />
    </div>
  );
}

