"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { AuthWelcomeToast } from "@/components/auth-welcome-toast";
import { ToastProvider } from "@/components/toast-provider";

type Props = { children: React.ReactNode };

export function AppProviders({ children }: Props) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ToastProvider>
          <AuthWelcomeToast />
          {children}
        </ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
