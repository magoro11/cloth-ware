import type { Metadata } from "next";
import { Suspense } from "react";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: `${APP_NAME} | Luxury Fashion Rental and Resale`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_TAGLINE,
  keywords: ["luxury fashion rental", "designer resale", "dress rental", "secure deposits", "seller payouts"],
  openGraph: {
    title: APP_NAME,
    description: APP_TAGLINE,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <AppProviders>
          <SiteHeader />
          <Suspense fallback={null}>
            <AnalyticsTracker />
          </Suspense>
          <div className="min-h-[calc(100vh-4rem)]">{children}</div>
          <SiteFooter />
          <MobileBottomNav />
        </AppProviders>
      </body>
    </html>
  );
}
