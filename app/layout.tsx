import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PWAPrompt from "@/components/PWAPrompt";
import { Analytics } from "@vercel/analytics/next";
import { SITE, DEFAULT_OG_IMAGE } from "@/lib/site";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Fruits, légumes et fromages frais à Pontault-Combault`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  manifest: "/manifest.json",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — Fruits, légumes et fromages frais`,
    description: SITE.description,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.name,
    description: SITE.description,
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pontault Primeurs",
  },
  formatDetection: {
    telephone: false,
  },
};

const DAY_MAP: Record<string, string> = {
  Monday: "Mo", Tuesday: "Tu", Wednesday: "We", Thursday: "Th",
  Friday: "Fr", Saturday: "Sa", Sunday: "Su",
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "GroceryStore",
  "@id": `${SITE.url}/#localbusiness`,
  name: SITE.name,
  description: SITE.description,
  url: SITE.url,
  telephone: SITE.telephone,
  email: SITE.email,
  image: DEFAULT_OG_IMAGE,
  priceRange: "€€",
  address: {
    "@type": "PostalAddress",
    streetAddress: SITE.address.street,
    postalCode: SITE.address.postalCode,
    addressLocality: SITE.address.city,
    addressRegion: SITE.address.region,
    addressCountry: SITE.address.country,
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: SITE.geo.latitude,
    longitude: SITE.geo.longitude,
  },
  openingHoursSpecification: SITE.horaires.map((h) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: h.day,
    opens: h.open,
    closes: h.close,
  })),
  openingHours: SITE.horaires.map((h) => `${DAY_MAP[h.day]} ${h.open}-${h.close}`),
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
        />
      </head>
      <body
        className={`${inter.className} antialiased bg-neutral-50 min-h-screen flex flex-col text-neutral-700 font-normal leading-[1.6]`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:bg-white focus:text-neutral-900 focus:px-4 focus:py-2 focus:border focus:border-green-primary focus:outline-none"
        >
          Aller au contenu principal
        </a>
        <CartProvider>
          <Navbar />
          <div id="main-content">{children}</div>
          <Footer />
          <PWAPrompt />
        </CartProvider>
        <Analytics />
      </body>
    </html>
  );
}
