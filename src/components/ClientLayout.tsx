'use client';

import Navbar from "../components/Navbar";
import Footer from "./Footer";
import FloatingNavigation from "./FloatingNavigation";
import SmoothScroll from "./SmoothScroll";
import BookingPopup from "./BookingPopup";
import CancelBookingPopup from "./CancelBookingPopup";
import { DatePickerProvider } from "@/contexts/DatePickerContext";
import { BookingProvider, useBooking } from "@/contexts/BookingContext";
import LayoutContent from "./LayoutContent";

interface ClientLayoutProps {
  children: React.ReactNode;
}

function ClientLayoutContent({ children }: ClientLayoutProps) {
  const { isBookingPopupOpen, closeBookingPopup, isCancelBookingPopupOpen, closeCancelBookingPopup, cancelBookingData } = useBooking();

  return (
    <>
      <Navbar />
      <SmoothScroll />
      <LayoutContent>
        {children}
      </LayoutContent>
      <Footer />
      <FloatingNavigation />
      <BookingPopup isOpen={isBookingPopupOpen} onClose={closeBookingPopup} />
      <CancelBookingPopup isOpen={isCancelBookingPopupOpen} onClose={closeCancelBookingPopup} bookingData={cancelBookingData} />
    </>
  );
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <DatePickerProvider>
      <BookingProvider>
        <ClientLayoutContent>
          {children}
        </ClientLayoutContent>
      </BookingProvider>
    </DatePickerProvider>
  );
}
