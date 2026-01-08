'use client';

import { usePathname } from 'next/navigation';
import ClientLayout from './ClientLayout';

interface AdminLayoutWrapperProps {
  children: React.ReactNode;
}

export default function AdminLayoutWrapper({ children }: AdminLayoutWrapperProps) {
  const pathname = usePathname();
  
  // Check if current path is an admin route
  const isAdminRoute = pathname.startsWith('/Administrator');
  
  // If it's an admin route, render children directly (admin layout is handled in Administrator/layout.tsx)
  if (isAdminRoute) {
    return <>{children}</>;
  }
  
  return (
    <ClientLayout>
      {children}
    </ClientLayout>
  );
}
