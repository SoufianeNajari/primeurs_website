import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PWAPrompt from "@/components/PWAPrompt";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Pontault Primeurs - Fruits & Légumes frais",
  description: "Commandez vos fruits, légumes et fromages frais en ligne.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pontault Primeurs",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#2C5530",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <meta name="application-name" content="Pontault Primeurs" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Pontault Primeurs" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#2C5530" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body
        className={`${inter.className} antialiased bg-neutral-50 min-h-screen flex flex-col text-neutral-700 font-normal leading-[1.6]`}
      >
        <CartProvider>
          <Navbar />
          {children}
          <Footer />
          <PWAPrompt />
        </CartProvider>
      </body>
    </html>
  );
}
