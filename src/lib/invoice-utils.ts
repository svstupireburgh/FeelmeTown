// Invoice utility functions for FeelME Town

export interface BookingDataForInvoice {
  id: string;
  name: string;
  email: string;
  phone: string;
  theaterName: string;
  date: string;
  time: string;
  occasion: string;
  numberOfPeople: number;
  totalAmount: number;
  pricingData?: {
    theaterBasePrice?: number;
    extraGuestFee?: number;
    slotBookingFee?: number;
  };
  extraGuestsCount?: number;
  extraGuestCharges?: number;
  advancePayment?: number;
  venuePayment?: number;
}

/**
 * Generate PDF invoice for a booking
 * @param bookingData - The booking data to generate invoice for
 * @returns Promise<Blob> - PDF blob for download
 */
export const generateInvoicePDF = async (bookingData: BookingDataForInvoice): Promise<Blob> => {
  const response = await fetch('/api/generate-invoice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bookingData),
  });

  if (!response.ok) {
    throw new Error('Failed to generate invoice PDF');
  }

  return await response.blob();
};

/**
 * Download invoice PDF for a booking
 * @param bookingData - The booking data to generate invoice for
 * @param filename - Optional custom filename (defaults to invoice-{bookingId}.pdf)
 */
export const downloadInvoicePDF = async (
  bookingData: BookingDataForInvoice, 
  filename?: string
): Promise<void> => {
  try {
    const pdfBlob = await generateInvoicePDF(bookingData);
    
    // Create download link
    const url = window.URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `invoice-${bookingData.id}.pdf`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading invoice PDF:', error);
    throw error;
  }
};

/**
 * Preview invoice HTML in new tab (for testing)
 * @param bookingId - The booking ID to preview
 */
export const previewInvoiceHTML = (bookingId: string): void => {
  const previewUrl = `/api/generate-invoice?bookingId=${bookingId}`;
  window.open(previewUrl, '_blank');
};

/**
 * Format booking data for invoice generation
 * @param rawBookingData - Raw booking data from database
 * @returns Formatted booking data for invoice
 */
export const formatBookingDataForInvoice = (rawBookingData: any): BookingDataForInvoice => {
  return {
    id: rawBookingData.id || rawBookingData._id || 'N/A',
    name: rawBookingData.name || 'Customer',
    email: rawBookingData.email || '',
    phone: rawBookingData.phone || '',
    theaterName: rawBookingData.theaterName || 'Theater',
    date: rawBookingData.date || new Date().toLocaleDateString('en-GB'),
    time: rawBookingData.time || '',
    occasion: rawBookingData.occasion || 'Booking',
    numberOfPeople: Number(rawBookingData.numberOfPeople || 2),
    totalAmount: Number(rawBookingData.totalAmount || 0),
    pricingData: rawBookingData.pricingData || {},
    extraGuestsCount: Number(rawBookingData.extraGuestsCount || 0),
    extraGuestCharges: Number(rawBookingData.extraGuestCharges || 0),
    advancePayment: Number(rawBookingData.advancePayment || 0),
    venuePayment: Number(rawBookingData.venuePayment || 0),
  };
};

export default {
  generateInvoicePDF,
  downloadInvoicePDF,
  previewInvoiceHTML,
  formatBookingDataForInvoice,
};
