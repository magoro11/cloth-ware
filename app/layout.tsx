import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AppProviders } from "@/frontend/components/providers/app-providers";
import { SiteHeader } from "@/frontend/components/site-header";
import { SiteFooter } from "@/frontend/components/site-footer";
import { MobileBottomNav } from "@/frontend/components/mobile-bottom-nav";
import { AnalyticsTracker } from "@/frontend/components/analytics-tracker";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: `${APP_NAME} | Modern Fashion Store`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_TAGLINE,
  keywords: ["fashion", "clothing", "modern style", "shoes", "bags", "sale"],
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
      <body className="antialiased">
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
