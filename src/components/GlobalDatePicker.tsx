'use client';

import { useState, useEffect } from 'react';

interface GlobalDatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onDateSelect: (date: string) => void;
  selectedDate: string;
  allowPastDates?: boolean; // New prop to allow past dates
}

export default function GlobalDatePicker({ isOpen, onClose, onDateSelect, selectedDate, allowPastDates = false }: GlobalDatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Get current date for highlighting
  const currentDate = new Date();
  const currentDateString = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const handleDateSelect = (date: Date) => {
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    onDateSelect(formattedDate);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <style jsx>{`
        .global-date-picker-overlay {
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
          animation: globalModalFadeIn 0.3s ease-out !important;
        }

        .global-date-picker-modal {
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
          animation: globalModalSlideIn 0.3s ease-out !important;
        }

        @media (min-width: 481px) {
          .global-date-picker-modal {
            padding: 2rem !important;
            max-width: 450px !important;
          }
        }

        @media (min-width: 769px) {
          .global-date-picker-modal {
            padding: 2.5rem !important;
            max-width: 500px !important;
          }
        }

        .global-date-picker-close-btn {
          position: absolute !important;
          top: 1rem !important;
          right: 1rem !important;
          background: rgba(255, 255, 255, 0.1) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          color: #ffffff !important;
          width: 2rem !important;
          height: 2rem !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          font-size: 1rem !important;
          font-weight: bold !important;
          transition: all 0.3s ease !important;
          z-index: 10 !important;
        }

        .global-date-picker-close-btn:hover {
          background: rgba(255, 255, 255, 0.2) !important;
          border-color: rgba(255, 255, 255, 0.4) !important;
          transform: scale(1.1) !important;
        }

        .global-date-picker-header {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          margin-bottom: 1rem !important;
          padding-right: 3rem !important;
        }

        .global-date-picker-today-section {
          display: flex !important;
          justify-content: center !important;
          margin-bottom: 1rem !important;
        }

        .global-today-btn {
          background: #ff0000 !important;
          color: white !important;
          border: none !important;
          border-radius: 8px !important;
          padding: 0.5rem 1rem !important;
          font-size: 0.9rem !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: all 0.3s ease !important;
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif !important;
        }

        .global-today-btn:hover {
          background: #cc0000 !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 8px rgba(255, 0, 0, 0.3) !important;
        }

        .global-month-nav-btn {
          background: rgba(251, 191, 36, 0.2) !important;
          border: 1px solid rgba(251, 191, 36, 0.3) !important;
          color: #fbbf24 !important;
          width: 2.5rem !important;
          height: 2.5rem !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          font-size: 1.25rem !important;
          font-weight: bold !important;
          transition: all 0.3s ease !important;
        }

        .global-month-nav-btn:hover {
          background: rgba(251, 191, 36, 0.3) !important;
          border-color: rgba(251, 191, 36, 0.5) !important;
          transform: scale(1.1) !important;
        }

        .global-month-year {
          font-size: 1rem !important;
          font-weight: bold !important;
          color: #fbbf24 !important;
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif !important;
          margin: 0 !important;
        }

        @media (min-width: 481px) {
          .global-month-year {
            font-size: 1.125rem !important;
          }
        }

        @media (min-width: 769px) {
          .global-month-year {
            font-size: 1.25rem !important;
          }
        }

        .global-date-picker-calendar {
          width: 100% !important;
        }

        .global-calendar-weekdays {
          display: grid !important;
          grid-template-columns: repeat(7, 1fr) !important;
          gap: 0.25rem !important;
          margin-bottom: 0.5rem !important;
        }

        .global-weekday {
          text-align: center !important;
          font-size: 0.75rem !important;
          font-weight: 600 !important;
          color: #fbbf24 !important;
          padding: 0.5rem 0 !important;
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif !important;
        }

        @media (min-width: 481px) {
          .global-weekday {
            font-size: 0.8125rem !important;
          }
        }

        @media (min-width: 769px) {
          .global-weekday {
            font-size: 0.875rem !important;
          }
        }

        .global-calendar-days {
          display: grid !important;
          grid-template-columns: repeat(7, 1fr) !important;
          gap: 0.25rem !important;
        }

        .global-calendar-day {
          background: rgba(255, 255, 255, 0.1) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #ffffff !important;
          padding: 0.5rem !important;
          border-radius: 0.5rem !important;
          cursor: pointer !important;
          font-size: 0.75rem !important;
          font-weight: 600 !important;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif !important;
          transition: all 0.3s ease !important;
          min-height: 2.5rem !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        @media (min-width: 481px) {
          .global-calendar-day {
            padding: 0.625rem !important;
            font-size: 0.8125rem !important;
            min-height: 2.75rem !important;
          }
        }

        @media (min-width: 769px) {
          .global-calendar-day {
            padding: 0.75rem !important;
            font-size: 0.875rem !important;
            min-height: 3rem !important;
          }
        }

        .global-calendar-day:hover {
          background: rgba(251, 191, 36, 0.2) !important;
          border-color: rgba(251, 191, 36, 0.4) !important;
          color: #fbbf24 !important;
        }

        .global-calendar-day.empty {
          background: transparent !important;
          border: none !important;
          cursor: default !important;
        }

        .global-calendar-day.empty:hover {
          background: transparent !important;
          border: none !important;
          color: #ffffff !important;
        }

        .global-calendar-day.current-date {
          background: rgba(255, 0, 5, 0.3) !important;
          border-color: #FF0005 !important;
          color: #ffffff !important;
          font-weight: 700 !important;
        }

        .global-calendar-day.current-date:hover {
          background: rgba(255, 0, 5, 0.4) !important;
          border-color: #FF0005 !important;
          color: #ffffff !important;
        }

        .global-calendar-day.selected {
          background: rgba(251, 191, 36, 0.4) !important;
          border-color: #fbbf24 !important;
          color: #ffffff !important;
          font-weight: 700 !important;
        }

        .global-calendar-day.selected:hover {
          background: rgba(251, 191, 36, 0.5) !important;
          border-color: #fbbf24 !important;
          color: #ffffff !important;
        }

        @keyframes globalModalFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes globalModalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>

      <div className="global-date-picker-overlay" onClick={onClose}>
        <div className="global-date-picker-modal" onClick={(e) => e.stopPropagation()}>
          <div className="global-date-picker-header">
            <button 
              className="global-month-nav-btn"
              onClick={() => navigateMonth('prev')}
            >
              ‹
            </button>
            <h3 className="global-month-year">
              {currentMonth.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </h3>
            <button 
              className="global-month-nav-btn"
              onClick={() => navigateMonth('next')}
            >
              ›
            </button>
          </div>
          
          <div className="global-date-picker-today-section">
            <button 
              className="global-today-btn"
              onClick={() => {
                const today = new Date();
                const todayString = today.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                });
                
                onDateSelect(todayString);
              }}
            >
              Today
            </button>
          </div>
          
          <button 
            className="global-date-picker-close-btn"
            onClick={onClose}
          >
            ✕
          </button>
          
          <div className="global-date-picker-calendar">
            <div className="global-calendar-weekdays">
              <div className="global-weekday">Sun</div>
              <div className="global-weekday">Mon</div>
              <div className="global-weekday">Tue</div>
              <div className="global-weekday">Wed</div>
              <div className="global-weekday">Thu</div>
              <div className="global-weekday">Fri</div>
              <div className="global-weekday">Sat</div>
            </div>
            
            <div className="global-calendar-days">
              {getDaysInMonth(currentMonth).map((day, index) => {
                if (!day) {
                  return (
                    <button
                      key={index}
                      className="global-calendar-day empty"
                      disabled
                    >
                      {''}
                    </button>
                  );
                }

                const dayDateString = day.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                });

                const isCurrentDate = dayDateString === currentDateString;
                const isSelectedDate = dayDateString === selectedDate;
                const isPastDate = !allowPastDates && day < currentDate && !isCurrentDate;

                return (
                  <button
                    key={index}
                    className={`global-calendar-day ${isCurrentDate ? 'current-date' : ''} ${isSelectedDate ? 'selected' : ''}`}
                    onClick={() => !isPastDate && handleDateSelect(day)}
                    disabled={isPastDate}
                    style={isPastDate ? { opacity: 0.3, cursor: 'not-allowed' } : {}}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

