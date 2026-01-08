export default function CancelBookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100vh', width: '100%', background: '#000' }}>
      {/* No Navbar - Clean layout for cancel booking page */}
      {children}
      {/* No Footer - Clean layout for cancel booking page */}
    </div>
  );
}
