'use client';

import { usePathname } from 'next/navigation';
import ClientLayout from './ClientLayout';

interface AdminLayoutWrapperProps {
  children: React.ReactNode;
}

export default function AdminLayoutWrapper({ children }: AdminLayoutWrapperProps) {
  const pathname = usePathname();
  
  // Check if current path is an admin route, management route, test page, or ManualBooking page
  const isAdminRoute = pathname.startsWith('/Administrator');
  const isManagementRoute = pathname.startsWith('/management');
  const isTestRoute = pathname.startsWith('/test-counters');
  const isManualBookingRoute = pathname.startsWith('/ManualBooking');
  const isEditBookingRoute = pathname.toLowerCase().startsWith('/editbooking');
  const isOrderFoodRoute = pathname.startsWith('/order-items');
  
  // If it's an admin route, management route, test route, ManualBooking route, edit booking, or order items page,
  // render children directly without navbar/footer. Admin/management layouts are handled in their own layout files.
  if (isAdminRoute || isManagementRoute || isTestRoute || isManualBookingRoute || isEditBookingRoute || isOrderFoodRoute) {
    return <>{children}</>;
  }
  
  return (
    <ClientLayout>
      {children}
    </ClientLayout>
  );
}
