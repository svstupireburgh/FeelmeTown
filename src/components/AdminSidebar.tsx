'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Mail,
  HelpCircle,
  Users,
  Settings,
  Theater,
  List,
  FileText,
  Image,
  MessageSquare,
  Tag,
  Clock,
  Wrench,
  User,
  DollarSign,
  FileSpreadsheet,
  Edit,
  X,
  ShieldCheck,
} from 'lucide-react';

interface AdminSidebarProps {
  isOpen: boolean;
}

export default function AdminSidebar({ isOpen }: AdminSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState('Dashboard');
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [currentDateBookingsCount, setCurrentDateBookingsCount] = useState(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

  // Helper function to get current date in IST
  const getCurrentDateIST = () => {
    const now = new Date();
    return now.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // Fetch pending requests count and current date bookings count
  useEffect(() => {
    const fetchPendingRequestsCount = async () => {
      try {
        const response = await fetch('/api/admin/requests');
        const data = await response.json();

        if (data.success && data.requests) {
          const pendingCount = data.requests.filter((req: any) => req.status === 'pending').length;
          setPendingRequestsCount(pendingCount);
        }
      } catch (error) {
        // swallow
      }
    };

    const isCurrentDateBooking = (bookingDate: any) => {
      if (!bookingDate) return false;
      try {
        const parsedDate = new Date(bookingDate);
        if (Number.isNaN(parsedDate.getTime())) {
          return false;
        }
        const today = new Date();
        const toISTDateString = (date: Date) =>
          date.toLocaleDateString('en-IN', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });
        return toISTDateString(parsedDate) === toISTDateString(today);
      } catch {
        return false;
      }
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

        if (regularData.success && Array.isArray(regularData.bookings)) {
          currentDateCount += regularData.bookings.filter(
            (booking: any) =>
              isCurrentDateBooking(booking.date) &&
              String(booking.status || '').toLowerCase() === 'confirmed'
          ).length;
        }

        if (manualData.success && (manualData.manualBookings || manualData.bookings)) {
          const manualList = manualData.manualBookings || manualData.bookings || [];
          currentDateCount += manualList.filter(
            (booking: any) =>
              isCurrentDateBooking(booking.date) &&
              String(booking.status || '').toLowerCase() === 'manual'
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

    const refreshAll = () => {
      fetchPendingRequestsCount();
      fetchCurrentDateBookingsCount();
      fetchPendingOrdersCount();
    };

    refreshAll();

    const interval = setInterval(refreshAll, 15000);

    return () => clearInterval(interval);
  }, []);

  // Function to refresh requests count (can be called from outside)
  const refreshRequestsCount = async () => {
    try {
      const response = await fetch('/api/admin/requests');
      const data = await response.json();
      
      if (data.success && data.requests) {
        const pendingCount = data.requests.filter((req: any) => req.status === 'pending').length;
        setPendingRequestsCount(pendingCount);
      }
    } catch (error) {
      
    }
  };

  // Make refresh function globally available
  useEffect(() => {
    (window as any).refreshSidebarRequestsCount = refreshRequestsCount;
    return () => {
      delete (window as any).refreshSidebarRequestsCount;
    };
  }, []);

  const ordersLabel = `Orders (${pendingOrdersCount})`;

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/Administrator',
      badge: null
    },
    {
      id: 'booking-applications',
      label: 'Booking Applications',
      icon: Calendar,
      path: '/Administrator/bookings',
      badge: currentDateBookingsCount > 0 ? currentDateBookingsCount : null
    },
    {
      id: 'edit-booking-requests',
      label: 'Edit Booking Requests',
      icon: Edit,
      path: '/Administrator/edit-booking-requests',
      badge: null
    },
    {
      id: 'orders',
      label: ordersLabel,
      icon: List,
      path: '/Administrator/orders',
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : null,
    },
    {
      id: 'support-mail',
      label: 'Support Mail',
      icon: Mail,
      path: '/Administrator/support',
      badge: null
    },
    {
      id: 'inquiries',
      label: 'Inquiries',
      icon: HelpCircle,
      path: '/Administrator/inquiries',
      badge: 0
    },
    {
      id: 'requests',
      label: 'Requests',
      icon: Users,
      path: '/Administrator/requests',
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : null
    },
    {
      id: 'trusted-customers',
      label: 'Trusted Customers',
      icon: ShieldCheck,
      path: '/Administrator/trusted-customers',
      badge: null
    },
    {
      id: 'staff-bookings',
      label: 'Staff Bookings',
      icon: User,
      path: '/Administrator/staff-bookings',
      badge: null
    },
    {
      id: 'excel-manager',
      label: 'Excel Manager',
      icon: FileSpreadsheet,
      path: '/Administrator/excel-manager',
      badge: null
    }
    ,
    {
      id: 'history',
      label: 'History',
      icon: FileText,
      path: '/Administrator/history',
      badge: null
    },
    
    {
      id: 'invoices',
      label: 'Invoices',
      icon: FileText,
      path: '/Administrator/invoices',
      badge: null
    }
  ];

  const maintenanceItems = [
    {
      id: 'theatre-list',
      label: 'Theatre List',
      icon: Theater,
      path: '/Administrator/theatres',
      badge: null
    },
    {
      id: 'why-choose',
      label: 'Why Choose',
      icon: List,
      path: '/Administrator/why-choose',
      badge: null
    },
    {
      id: 'services-list',
      label: 'Services List',
      icon: List,
      path: '/Administrator/services',
      badge: null
    },
    {
      id: 'pages',
      label: 'Pages',
      icon: FileText,
      path: '/Administrator/pages',
      badge: null
    },
    {
      id: 'gallery',
      label: 'Gallery',
      icon: Image,
      path: '/Administrator/gallery',
      badge: null
    },
        {
          id: 'faqs',
          label: 'FAQs',
          icon: HelpCircle,
          path: '/Administrator/faqs',
          badge: null
        },
        {
          id: 'pricing',
          label: 'Pricing',
          icon: DollarSign,
          path: '/Administrator/pricing',
          badge: null
        },
    {
      id: 'testimonials',
      label: 'Testimonials',
      icon: MessageSquare,
      path: '/Administrator/testimonials',
      badge: null
    },
    {
      id: 'coupons',
      label: 'Coupons',
      icon: Tag,
      path: '/Administrator/coupons',
      badge: null
    },
    {
      id: 'occasions',
      label: 'Occasions',
      icon: Clock,
      path: '/Administrator/occasions',
      badge: null
    },
    {
      id: 'cancel-reasons',
      label: 'Cancel Reasons',
      icon: X,
      path: '/Administrator/cancel-reasons',
      badge: null
    },
    {
      id: 'system-setting',
      label: 'System Setting',
      icon: Settings,
      path: '/Administrator/settings',
      badge: null
    },
    {
      id: 'staff-list',
      label: 'Staff List',
      icon: User,
      path: '/Administrator/staff-list',
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
    <div className={`admin-sidebar ${isOpen ? 'open' : 'closed'}`}>
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

          <div className="nav-section">
            <div className="section-header">
              <span className="section-title">Maintenance</span>
            </div>
            {maintenanceItems.map((item) => {
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
        .admin-sidebar {
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

        .admin-sidebar.open {
          width: 280px;
        }

        .admin-sidebar.closed {
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
          width: 42px;
          height: 42px;
        }

        .logo-text {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
        }

        .admin-sidebar.closed .logo-text {
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

        .admin-sidebar.closed .section-title {
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

        .admin-sidebar.closed .nav-label {
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

        .admin-sidebar.closed .nav-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          margin-left: 0;
        }

        /* Scrollbar styling */
        .admin-sidebar::-webkit-scrollbar {
          width: 4px;
        }

        .admin-sidebar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
        }

        .admin-sidebar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
        }

        .admin-sidebar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }

        @media (max-width: 768px) {
          .admin-sidebar {
            transform: translateX(-100%);
            width: 280px !important;
          }

          .admin-sidebar.open {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

