'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Eye, Edit, Trash2, CheckCircle, XCircle, Calendar } from 'lucide-react';


export default function BookingsPage() {
  const [bookings] = useState([
    {
      id: 1,
      customerName: 'John Doe',
      email: 'john@example.com',
      phone: '+91 98765 43210',
      theater: 'Theater 1',
      date: '2024-01-15',
      time: '19:00',
      status: 'Pending',
      amount: 2500,
      bookingDate: '2024-01-10'
    },
    {
      id: 2,
      customerName: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+91 98765 43211',
      theater: 'Theater 2',
      date: '2024-01-15',
      time: '21:00',
      status: 'Confirmed',
      amount: 3000,
      bookingDate: '2024-01-09'
    },
    {
      id: 3,
      customerName: 'Mike Johnson',
      email: 'mike@example.com',
      phone: '+91 98765 43212',
      theater: 'Theater 3',
      date: '2024-01-16',
      time: '18:00',
      status: 'Confirmed',
      amount: 2000,
      bookingDate: '2024-01-08'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isManualBookingOpen, setIsManualBookingOpen] = useState(false);

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

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.theater.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (id: number, newStatus: string) => {
    // In a real app, this would update the database
    
  };

  const handleManualBooking = () => {
    // Redirect to ManualBooking page instead of opening popup
    window.open('/ManualBooking', '_blank');
  };

  return (
    <div className="bookings-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Booking Applications</h1>
            <p>Manage all booking requests and applications</p>
          </div>
              <button className="manual-booking-btn" onClick={handleManualBooking}>
                <Calendar size={16} />
                Manual Booking
              </button>
        </div>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search bookings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-dropdown">
          <Filter size={20} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="bookings-table-container">
        <table className="bookings-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Contact</th>
              <th>Theater</th>
              <th>Date & Time</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map((booking) => (
              <tr key={booking.id}>
                <td>#{booking.id}</td>
                <td>
                  <div className="customer-info">
                    <div className="customer-name">{booking.customerName}</div>
                    <div className="booking-date">Booked: {booking.bookingDate}</div>
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
                  <span className={`status-badge ${booking.status.toLowerCase()}`}>
                    {booking.status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="action-btn view-btn"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      className="action-btn edit-btn"
                      title="Edit Booking"
                    >
                      <Edit size={16} />
                    </button>
                    {booking.status === 'Pending' && (
                      <button 
                        className="action-btn confirm-btn"
                        title="Confirm Booking"
                        onClick={() => handleStatusChange(booking.id, 'Confirmed')}
                      >
                        <CheckCircle size={16} />
                      </button>
                    )}
                    <button 
                      className="action-btn delete-btn"
                      title="Delete Booking"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

        .header-text h1 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 2rem;
          font-weight: 600;
          color: #333;
          margin: 0 0 0.5rem 0;
        }

        .header-text p {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 1rem;
          color: #666;
          margin: 0;
        }

        .manual-booking-btn {
          background: #28a745;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          white-space: nowrap;
        }

        .manual-booking-btn:hover {
          background: #218838;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
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
          padding: 0.75rem 1rem 0.75rem 3rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
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
          padding: 1rem;
          text-align: left;
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          color: #333;
          border-bottom: 1px solid #dee2e6;
        }

        .bookings-table td {
          padding: 1rem;
          border-bottom: 1px solid #dee2e6;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
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
          font-size: 0.8rem;
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
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
          text-transform: uppercase;
        }

        .status-badge.pending {
          background: #fff3cd;
          color: #856404;
        }

        .status-badge.confirmed {
          background: #d4edda;
          color: #155724;
        }

        .status-badge.cancelled {
          background: #f8d7da;
          color: #721c24;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .action-btn {
          padding: 0.5rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .view-btn {
          background: #007bff;
          color: white;
        }

        .view-btn:hover {
          background: #0056b3;
        }

        .edit-btn {
          background: #28a745;
          color: white;
        }

        .edit-btn:hover {
          background: #1e7e34;
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
      
      
    </div>
  );
}

