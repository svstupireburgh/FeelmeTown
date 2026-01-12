import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LoadingWrapper from "@/components/LoadingWrapper";
import AdminLayoutWrapper from "@/components/AdminLayoutWrapper";
import InspectGuard from "@/components/guards/InspectGuard";

// MongoDB TTL indexes handle automatic deletion now


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FeelMe Town",
  description: "Your Private World",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://checkout.razorpay.com/v1/checkout.js" async></script>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
        <InspectGuard />
        <LoadingWrapper>
          <AdminLayoutWrapper>
            {children}
          </AdminLayoutWrapper>
        </LoadingWrapper>
      </body>
    </html>
  );
}
