'use client';

import type { ReactNode } from 'react';


export default function InvoiceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="invoice-layout">
      
      {children}
      {/* No Footer */}
      
      <style jsx global>{`
        /* Hide any global navbar/footer if they exist */
        .navbar,
        .footer,
        nav,
        footer {
          display: none !important;
        }
        
        /* Ensure full height and proper scrolling */
        html, body {
          height: 100%;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          overflow-y: auto;
        }
        
        .invoice-layout {
          min-height: 100vh;
          overflow-y: auto;
          overflow-x: hidden;
        }
      `}</style>
    </div>
  );
}
