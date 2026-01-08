// Utility functions for consistent time slot handling across the app

export interface TimeSlot {
  id?: string;
  startTime: string;
  endTime: string;
  timeRange: string;
  duration: number;
  isActive: boolean;
  isBooked?: boolean;
  bookingStatus?: 'available' | 'booked' | 'going';
}

// Fetch time slots from theater configuration
export const fetchTimeSlots = async (): Promise<TimeSlot[]> => {
  // No longer return hardcoded time slots - fetch from database only
  
  return [];
};

// Fetch time slots with booking status
export const fetchTimeSlotsWithBookings = async (date?: string, theater?: string): Promise<TimeSlot[]> => {
  try {
    
    
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (theater) params.append('theater', theater);
    
    const response = await fetch(`/api/time-slots-with-bookings?${params.toString()}`);
    const data = await response.json();
    
    
    
    if (data.success) {
      return data.timeSlots || [];
    }
    
    
    return [];
  } catch (error) {
    
    return [];
  };
};

// Default time slots (same as booking popup)
export const getDefaultTimeSlots = (): TimeSlot[] => {
  return [
    { startTime: '09:00', endTime: '12:00', timeRange: '9:00 am - 12:00 pm', duration: 180, isActive: true },
    { startTime: '12:30', endTime: '15:30', timeRange: '12:30 PM - 03:30 PM', duration: 180, isActive: true },
    { startTime: '16:00', endTime: '19:00', timeRange: '04:00 PM - 07:00 PM', duration: 180, isActive: true },
    { startTime: '19:30', endTime: '22:30', timeRange: '07:30 PM - 10:30 PM', duration: 180, isActive: true }
  ];
};

// Convert 24-hour time to 12-hour format
export const formatTime12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

// Create time range string
export const createTimeRange = (startTime: string, endTime: string): string => {
  return `${formatTime12Hour(startTime)} - ${formatTime12Hour(endTime)}`;
};

// Check if time slot is booked
export const isTimeSlotBooked = (timeSlot: TimeSlot): boolean => {
  return timeSlot.isBooked === true || timeSlot.bookingStatus === 'booked';
};

// Get booking status display text
export const getBookingStatusText = (timeSlot: TimeSlot): string => {
  if (timeSlot.bookingStatus === 'booked' || timeSlot.isBooked) {
    return 'Slot is Booked';
  }
  if (timeSlot.bookingStatus === 'going' || (timeSlot as any).isGoing) {
    return 'Time is Going';
  }
  return 'Available';
};

// Get booking status CSS class
export const getBookingStatusClass = (timeSlot: TimeSlot): string => {
  if (timeSlot.bookingStatus === 'booked' || timeSlot.isBooked) {
    return 'slot-booked';
  }
  if (timeSlot.bookingStatus === 'going' || (timeSlot as any).isGoing) {
    return 'slot-going';
  }
  return 'slot-available';
};

