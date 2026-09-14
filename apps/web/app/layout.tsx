import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { BRAND, SITE_URL } from "@/lib/site";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "800", "900"],
  variable: "--font-hanken",
  display: "swap",
});

// Identifiers only: Job IDs, Application References, phone numbers.
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  // Link previews need absolute image URLs; every relative path resolves here.
  metadataBase: new URL(SITE_URL),
  title: { default: BRAND.site, template: `%s · ${BRAND.site}` },
  description: "Open roles at FINCLUST. Apply in about a minute with your CV.",
  openGraph: {
    siteName: BRAND.site,
    type: "website",
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fffdf8",
  // No maximumScale: pinch-zoom must never be disabled.
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${hanken.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  );
}
