'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import NetflixLoader from './ui/loading';

interface LoadingWrapperProps {
  children: React.ReactNode;
}

export default function LoadingWrapper({ children }: LoadingWrapperProps) {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  
  // Check if we're on an admin route
  const isAdminRoute = pathname.startsWith('/Administrator');
  const isManagementRoute = pathname.startsWith('/management');
  const isTestRoute = pathname.startsWith('/test-counters');
  const isManualBookingRoute = pathname.startsWith('/ManualBooking');
  const isEditBookingRoute = pathname.toLowerCase().startsWith('/editbooking');
  const isOrderFoodRoute = pathname.startsWith('/order-items');
  const isShellRoute =
    isAdminRoute ||
    isManagementRoute ||
    isTestRoute ||
    isManualBookingRoute ||
    isEditBookingRoute ||
    isOrderFoodRoute;

  useEffect(() => {
    setMounted(true);

    if (isShellRoute) {
      setIsLoading(false);
      return;
    }

    const alreadyShown = sessionStorage.getItem('fmt_main_loader_shown') === 'true';
    if (alreadyShown) {
      setIsLoading(false);
      return;
    }

    // Show loading only once per tab session (first main-site load)
    setIsLoading(true);
    const timer = setTimeout(() => {
      sessionStorage.setItem('fmt_main_loader_shown', 'true');
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isShellRoute]);

  const shouldShowLoader = !isShellRoute && (!mounted || isLoading);

  return (
    <>
      <div style={{ visibility: shouldShowLoader ? 'hidden' : 'visible' }}>{children}</div>
      {shouldShowLoader ? <NetflixLoader /> : null}
    </>
  );
}
