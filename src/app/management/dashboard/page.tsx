'use client';

import { useState, useEffect } from 'react';
import ManagementDashboard from '@/components/ManagementDashboard';

export default function ManagementDashboardPage() {
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
        console.error('Failed to fetch dashboard stats:', data.error);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
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
      
      const allBookings = [
        ...(bookingsData.bookings || []),
        ...(manualBookingsData.bookings || [])
      ];
      
      const getStartTime = (timeStr: string) => {
        if (!timeStr) return '';
        const startTime = timeStr.split(' - ')[0] || timeStr;
        return startTime.trim();
      };

      const parseTimeToMinutes = (timeStr: string) => {
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

        return hour24 * 60 + mins;
      };

      const getBookingStartTs = (booking: any) => {
        const date = new Date(booking?.date);
        if (Number.isNaN(date.getTime())) {
          return 0;
        }
        const timeMinutes = parseTimeToMinutes(getStartTime(String(booking?.time || '')));
        const hours = Math.floor(timeMinutes / 60);
        const mins = timeMinutes % 60;
        date.setHours(hours, mins, 0, 0);
        return date.getTime();
      };

      const getCreatedAtTs = (booking: any) => {
        const created = new Date(booking?.createdAt);
        const ts = created.getTime();
        return Number.isFinite(ts) ? ts : 0;
      };

      // Confirmed first; within confirmed nearest upcoming booking first; fallback to createdAt desc
      const recent = allBookings
        .sort((a, b) => {
          const statusA = String(a?.status || '').toLowerCase();
          const statusB = String(b?.status || '').toLowerCase();
          const isConfirmedA = statusA === 'confirmed';
          const isConfirmedB = statusB === 'confirmed';

          if (isConfirmedA && !isConfirmedB) return -1;
          if (isConfirmedB && !isConfirmedA) return 1;

          if (isConfirmedA && isConfirmedB) {
            const nowTs = Date.now();
            const startA = getBookingStartTs(a);
            const startB = getBookingStartTs(b);
            const deltaA = startA - nowTs;
            const deltaB = startB - nowTs;
            const sortKeyA = deltaA >= 0 ? deltaA : 1000000000000000 + Math.abs(deltaA);
            const sortKeyB = deltaB >= 0 ? deltaB : 1000000000000000 + Math.abs(deltaB);
            if (sortKeyA !== sortKeyB) return sortKeyA - sortKeyB;
            if (startA !== startB) return startA - startB;
          }

          return getCreatedAtTs(b) - getCreatedAtTs(a);
        })
        .slice(0, 5)
        .map(booking => {
          // Preserve full booking payload to keep selected items and occasion dynamic fields
          const normalized = {
            ...booking,
            id: booking.bookingId || booking.id,
            customerName: booking.name || booking.customerName,
            theater: booking.theaterName || booking.theater,
            amount: typeof booking.totalAmount !== 'undefined' ? booking.totalAmount : booking.amount,
          };

          // Ensure arrays exist for selected items if provided by APIs
          if (Array.isArray(booking.selectedMovies)) normalized.selectedMovies = booking.selectedMovies;
          if (Array.isArray(booking.selectedCakes)) normalized.selectedCakes = booking.selectedCakes;
          if (Array.isArray(booking.selectedDecorItems)) normalized.selectedDecorItems = booking.selectedDecorItems;
          if (Array.isArray(booking.selectedGifts)) normalized.selectedGifts = booking.selectedGifts;

          // Pass through occasionData map if present for dynamic labels/values
          if (booking.occasionData) normalized.occasionData = booking.occasionData;

          return normalized;
        });
      
      setRecentBookings(recent);
    } catch (error) {
      console.error('Error fetching recent bookings:', error);
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
      <div className="management-page">
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
    <div className="management-page">
      <ManagementDashboard 
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
