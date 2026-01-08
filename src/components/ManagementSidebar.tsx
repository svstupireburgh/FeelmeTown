'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Calendar, 
  Mail, 
  HelpCircle, 
  Tag,
  List
} from 'lucide-react';

interface ManagementSidebarProps {
  isOpen: boolean;
}

export default function ManagementSidebar({ isOpen }: ManagementSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState('Dashboard');
  const [currentDateBookingsCount, setCurrentDateBookingsCount] = useState(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

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

  const parseBookingDate = (rawDate: any) => {
    if (!rawDate) return null;
    if (rawDate instanceof Date) {
      return new Date(rawDate.getTime());
    }
    if (typeof rawDate === 'number') {
      const fromNumber = new Date(rawDate);
      return isNaN(fromNumber.getTime()) ? null : fromNumber;
    }
    if (typeof rawDate === 'string') {
      const trimmed = rawDate.trim();
      if (!trimmed) return null;

      const tryParse = (value: string) => {
        const parsed = new Date(value);
        return isNaN(parsed.getTime()) ? null : parsed;
      };

      let parsed = tryParse(trimmed);
      if (parsed) return parsed;

      const withoutWeekday = trimmed.replace(/^[A-Za-z]+\s*,\s*/, '');
      parsed = tryParse(withoutWeekday);
      if (parsed) return parsed;

      const sanitized = withoutWeekday.replace(/(\d+)(st|nd|rd|th)/gi, '$1');
      parsed = tryParse(sanitized);
      if (parsed) return parsed;
    }
    return null;
  };

  // Helper function to check if booking is from current date
  const isCurrentDateBooking = (bookingDate: any) => {
    const parsedDate = parseBookingDate(bookingDate);
    if (!parsedDate) return false;
    const currentDate = getCurrentDateIST();
    const bookingDateIST = parsedDate.toLocaleDateString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return bookingDateIST === currentDate;
  };

  const fetchCurrentDateBookingsCount = async () => {
    try {
      const [regularResponse, manualResponse] = await Promise.all([
        fetch('/api/admin/bookings'),
        fetch('/api/admin/manual-bookings')
      ]);
      const [regularData, manualData] = await Promise.all([
        regularResponse.json(),
        manualResponse.json()
      ]);

      let currentDateCount = 0;

      if (regularData.success && regularData.bookings) {
        currentDateCount += regularData.bookings.filter(
          (booking: any) =>
            isCurrentDateBooking(booking.date) && booking.status.toLowerCase() === 'confirmed',
        ).length;
      }

      if (manualData.success && (manualData.manualBookings || manualData.bookings)) {
        const manualList = manualData.manualBookings || manualData.bookings || [];
        currentDateCount += manualList.filter(
          (booking: any) =>
            isCurrentDateBooking(booking.date) && (booking.status || '').toLowerCase() === 'manual',
        ).length;
      }

      setCurrentDateBookingsCount(currentDateCount);
    } catch (error) {
      console.error('Error fetching current date bookings count:', error);
    }
  };

  const fetchPendingOrdersCount = async () => {
    try {
      const response = await fetch('/api/admin/orders?mode=count');
      const data = await response.json();

      if (data.success) {
        const total = Number(data.total) || 0;
        const readyCount = Number(data.byStatus?.ready) || 0;
        const actionable = Math.max(total - readyCount, 0);
        setPendingOrdersCount(actionable);
      }
    } catch (error) {
      console.error('Error fetching pending orders count:', error);
    }
  };

  useEffect(() => {
    const refreshAll = () => {
      fetchCurrentDateBookingsCount();
      fetchPendingOrdersCount();
    };

    refreshAll();

    const interval = setInterval(refreshAll, 15000);

    return () => clearInterval(interval);
  }, []);

  const ordersLabel = `Orders (${pendingOrdersCount})`;

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/management/dashboard',
      badge: null
    },
    {
      id: 'booking-applications',
      label: 'Booking Applications',
      icon: Calendar,
      path: '/management/bookings',
      badge: currentDateBookingsCount > 0 ? currentDateBookingsCount : null
    },
    {
      id: 'orders',
      label: ordersLabel,
      icon: List,
      path: '/management/orders',
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : null,
    },
    {
      id: 'history',
      label: 'History',
      icon: Calendar,
      path: '/management/history',
      badge: null
    },
    {
      id: 'support-mail',
      label: 'Support Mail',
      icon: Mail,
      path: '/management/support',
      badge: null
    },
    {
      id: 'inquiries',
      label: 'Inquiries',
      icon: HelpCircle,
      path: '/management/inquiries',
      badge: 0
    },
    {
      id: 'invoices',
      label: 'Invoices',
      icon: Calendar,
      path: '/management/invoices',
      badge: null
    },
    {
      id: 'coupons',
      label: 'Coupons',
      icon: Tag,
      path: '/management/coupons',
      badge: null
    }
  ];


  const handleItemClick = (item: { id: string; path: string }) => {
    setActiveItem(item.id);
    router.push(item.path);
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <div className={`management-sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-content">
        <div className="sidebar-header">
          <div className="logo-container">
            <img src="/logo.gif" alt="FeelMe Town" className="logo" />
            <span className="logo-text">FeelMe Town</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => handleItemClick(item)}
                >
                  <div className="nav-item-content">
                    <Icon size={20} className="nav-icon" />
                    <span className="nav-label">{item.label}</span>
                    {item.badge !== null && item.badge > 0 && (
                      <span className="nav-badge">{item.badge}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      <style jsx>{`
        .management-sidebar {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          background: #2c2c2c;
          border-right: 1px solid rgba(255, 255, 255, 0.1);
          transition: width 0.3s ease;
          z-index: 1000;
          overflow-y: auto;
        }

        .management-sidebar.open {
          width: 280px;
        }

        .management-sidebar.closed {
          width: 80px;
        }

        .sidebar-content {
          padding: 1.5rem 0;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .sidebar-header {
          padding: 0 1.5rem 2rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 1rem;
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .logo {
          width: 32px;
          height: 32px;
        }

        .logo-text {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
        }

        .management-sidebar.closed .logo-text {
          display: none;
        }

        .sidebar-nav {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .nav-section {
          display: flex;
          flex-direction: column;
        }

        .section-header {
          padding: 0 1.5rem 0.5rem;
        }

        .section-title {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.75rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .management-sidebar.closed .section-title {
          display: none;
        }

        .nav-item {
          width: 100%;
          background: none;
          border: none;
          padding: 0.75rem 1.5rem;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          text-align: left;
        }

        .nav-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .nav-item.active {
          background: rgba(255, 0, 0, 0.1);
          border-right: 3px solid var(--accent-color);
        }

        .nav-item.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: var(--accent-color);
        }

        .nav-item-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          position: relative;
        }

        .nav-icon {
          flex-shrink: 0;
          color: rgba(255, 255, 255, 0.8);
        }

        .nav-item.active .nav-icon {
          color: var(--accent-color);
        }

        .nav-label {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          white-space: nowrap;
        }

        .management-sidebar.closed .nav-label {
          display: none;
        }

        .nav-badge {
          background: #ff4444;
          color: white;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.2rem 0.5rem;
          border-radius: 10px;
          min-width: 20px;
          text-align: center;
          margin-left: auto;
        }

        .management-sidebar.closed .nav-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          margin-left: 0;
        }

        /* Scrollbar styling */
        .management-sidebar::-webkit-scrollbar {
          width: 4px;
        }

        .management-sidebar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
        }

        .management-sidebar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
        }

        .management-sidebar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }

        @media (max-width: 768px) {
          .management-sidebar {
            transform: translateX(-100%);
          }

          .management-sidebar.open {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
