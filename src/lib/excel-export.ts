import * as XLSX from 'xlsx';

interface BookingData {
  bookingId?: string;
  id?: string;
  name?: string;
  customerName?: string;
  email?: string;
  phone?: string;
  theaterName?: string;
  theater?: string;
  date?: string;
  time?: string;
  occasion?: string;
  numberOfPeople?: number;
  totalAmount?: number;
  amount?: number;
  advancePayment?: number;
  venuePayment?: number;
  status?: string;
  createdAt?: string | Date;
  cancelledAt?: string | Date;
  cancelReason?: string;
  isManualBooking?: boolean;
  createdBy?: string;
  [key: string]: any;
}

export class ExcelExportService {
  private static formatDate(date: string | Date | undefined): string {
    if (!date) return 'N/A';
    try {
      const d = new Date(date);
      return d.toLocaleString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return String(date);
    }
  }

  private static formatBookingForExcel(booking: BookingData) {
    return {
      'Booking ID': booking.bookingId || booking.id || 'N/A',
      'Customer Name': booking.name || booking.customerName || 'N/A',
      'Email': booking.email || 'N/A',
      'Mobile No': booking.phone || 'N/A',
      'Theater': booking.theaterName || booking.theater || 'N/A',
      'Date': booking.date || 'N/A',
      'Time': booking.time || 'N/A',
      'Occasion': booking.occasion || 'N/A',
      'No of People': booking.numberOfPeople || 'N/A',
      'Advance Payment': booking.advancePayment || 0,
      'Payable Amount': booking.venuePayment || 0,
      'Total Payment': booking.totalAmount || booking.amount || 0,
      'Status': booking.status || 'N/A',
    };
  }

  private static formatCancelledBookingForExcel(booking: BookingData) {
    // Robust field fallbacks for cancelled bookings
    const total = (booking as any).totalAmount ?? (booking as any).amount ?? (booking as any).total ?? 0;
    let advance = (booking as any).advancePayment;
    let venue = (booking as any).venuePayment;
    if (advance == null && venue != null && typeof total === 'number') {
      advance = Math.max(0, total - Number(venue));
    }
    if (venue == null && advance != null && typeof total === 'number') {
      venue = Math.max(0, total - Number(advance));
    }
    if (advance == null) advance = 0;
    if (venue == null) venue = 0;

    return {
      'Booking ID': (booking as any).bookingId || (booking as any).id || 'N/A',
      'Customer Name': (booking as any).name || (booking as any).customerName || 'N/A',
      'Email': (booking as any).email || 'N/A',
      'Mobile No': (booking as any).phone || (booking as any).whatsappNumber || (booking as any).mobile || (booking as any).contact || 'N/A',
      'Theater': (booking as any).theaterName || (booking as any).theater || 'N/A',
      'Date': (booking as any).date || 'N/A',
      'Time': (booking as any).time || 'N/A',
      'Occasion': (booking as any).occasion || 'N/A',
      'No of People': (booking as any).numberOfPeople || (booking as any).peopleCount || (booking as any).numGuests || 'N/A',
      'Advance Payment': advance,
      'Payable Amount': venue,
      'Total Payment': total,
      'Status': (booking as any).status || 'cancelled',
      'Cancel Reason': (booking as any).cancellationReason || (booking as any).cancelReason || 'N/A',
    };
  }

  private static formatManualBookingForExcel(booking: BookingData) {
    // Format createdBy information
    let createdByInfo = 'Staff';
    if (booking.createdBy) {
      if (typeof booking.createdBy === 'object' && booking.createdBy !== null) {
        const createdBy = booking.createdBy as any;
        if (createdBy.type === 'admin' && createdBy.adminName) {
          createdByInfo = `Admin: ${createdBy.adminName}`;
        } else if (createdBy.type === 'staff' && createdBy.staffName) {
          createdByInfo = `Staff: ${createdBy.staffName}`;
        } else if (createdBy.adminName) {
          createdByInfo = `Admin: ${createdBy.adminName}`;
        } else if (createdBy.staffName) {
          createdByInfo = `Staff: ${createdBy.staffName}`;
        } else {
          createdByInfo = 'Staff';
        }
      } else if (typeof booking.createdBy === 'string') {
        createdByInfo = booking.createdBy;
      }
    }

    return {
      'Booking ID': booking.bookingId || booking.id || 'N/A',
      'Customer Name': booking.name || booking.customerName || 'N/A',
      'Email': booking.email || 'N/A',
      'Mobile No': booking.phone || 'N/A',
      'Theater': booking.theaterName || booking.theater || 'N/A',
      'Date': booking.date || 'N/A',
      'Time': booking.time || 'N/A',
      'Occasion': booking.occasion || 'N/A',
      'No of People': booking.numberOfPeople || 'N/A',
      'Slot Booking Fee': booking.slotBookingFee || (booking.pricingData?.slotBookingFee) || 0,
      'Theater Base Price': booking.theaterBasePrice || (booking.pricingData?.theaterBasePrice) || 0,
      'Extra Guests Count': booking.extraGuestsCount || 0,
      'Extra Guest Fee': booking.extraGuestFee || (booking.pricingData?.extraGuestFee) || 0,
      'Extra Guest Charges': booking.extraGuestCharges || 0,
      'Convenience Fee': booking.convenienceFee || (booking.pricingData?.convenienceFee) || 0,
      'Advance Payment': booking.advancePayment || 0,
      'Payable Amount': booking.venuePayment || 0,
      'Total Payment': booking.totalAmount || booking.amount || 0,
      'Status': booking.status || 'N/A',
      'Created By': createdByInfo,
    };
  }

  static async exportCompletedBookings(bookings: BookingData[]): Promise<Buffer> {
    const formattedData = bookings.map(booking => this.formatBookingForExcel(booking));
    
    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Completed Bookings');
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Booking ID
      { wch: 20 }, // Customer Name
      { wch: 28 }, // Email
      { wch: 15 }, // Mobile No
      { wch: 15 }, // Theater
      { wch: 25 }, // Date
      { wch: 20 }, // Time
      { wch: 15 }, // Occasion
      { wch: 15 }, // No of People
      { wch: 18 }, // Advance Payment
      { wch: 18 }, // Venue Payment
      { wch: 18 }, // Total Payment
      { wch: 12 }, // Status
    ];
    
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  static async exportCancelledBookings(bookings: BookingData[]): Promise<Buffer> {
    const formattedData = bookings.map(booking => this.formatCancelledBookingForExcel(booking));
    
    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cancelled Bookings');
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Booking ID
      { wch: 20 }, // Customer Name
      { wch: 28 }, // Email
      { wch: 15 }, // Mobile No
      { wch: 15 }, // Theater
      { wch: 25 }, // Date
      { wch: 20 }, // Time
      { wch: 15 }, // Occasion
      { wch: 15 }, // No of People
      { wch: 18 }, // Advance Payment
      { wch: 18 }, // Venue Payment
      { wch: 18 }, // Total Payment
      { wch: 12 }, // Status
      { wch: 30 }, // Cancel Reason
    ];
    
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  static async exportManualBookings(bookings: BookingData[]): Promise<Buffer> {
    const formattedData = bookings.map(booking => this.formatManualBookingForExcel(booking));
    
    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Manual Bookings');
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Booking ID
      { wch: 20 }, // Customer Name
      { wch: 28 }, // Email
      { wch: 15 }, // Mobile No
      { wch: 15 }, // Theater
      { wch: 25 }, // Date
      { wch: 20 }, // Time
      { wch: 15 }, // Occasion
      { wch: 15 }, // No of People
      { wch: 18 }, // Slot Booking Fee
      { wch: 18 }, // Theater Base Price
      { wch: 18 }, // Extra Guests Count
      { wch: 18 }, // Extra Guest Fee
      { wch: 18 }, // Extra Guest Charges
      { wch: 18 }, // Convenience Fee
      { wch: 18 }, // Advance Payment
      { wch: 18 }, // Venue Payment
      { wch: 18 }, // Total Payment
      { wch: 12 }, // Status
      { wch: 25 }, // Created By (increased width for "Admin: Name" format)
    ];
    
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  static async appendToExcel(existingBuffer: Buffer | null, newBooking: BookingData, type: 'completed' | 'cancelled' | 'manual'): Promise<Buffer> {
    let wb: XLSX.WorkBook;
    let ws: XLSX.WorkSheet;
    let sheetName: string;
    let formattedBooking: any;

    // Format booking based on type
    switch (type) {
      case 'completed':
        sheetName = 'Completed Bookings';
        formattedBooking = this.formatBookingForExcel(newBooking);
        break;
      case 'cancelled':
        sheetName = 'Cancelled Bookings';
        formattedBooking = this.formatCancelledBookingForExcel(newBooking);
        break;
      case 'manual':
        sheetName = 'Manual Bookings';
        formattedBooking = this.formatManualBookingForExcel(newBooking);
        break;
    }

    // If existing file, read it
    if (existingBuffer) {
      try {
        wb = XLSX.read(existingBuffer, { type: 'buffer' });
        ws = wb.Sheets[sheetName];
        
        // Convert existing data to JSON
        const existingData = XLSX.utils.sheet_to_json(ws);
        existingData.push(formattedBooking);
        
        // Create new worksheet with updated data
        ws = XLSX.utils.json_to_sheet(existingData);
        wb.Sheets[sheetName] = ws;
      } catch (error) {
        // If error reading existing file, create new one
        wb = XLSX.utils.book_new();
        ws = XLSX.utils.json_to_sheet([formattedBooking]);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }
    } else {
      // Create new file
      wb = XLSX.utils.book_new();
      ws = XLSX.utils.json_to_sheet([formattedBooking]);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}

