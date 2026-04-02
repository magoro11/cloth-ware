"use client";

import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { CartLink } from "@/components/cart-link";
import { APP_NAME } from "@/lib/constants";

export function SiteHeader() {
  const { data } = useSession();
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-[#0e0f14]/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        <Link href="/" className="font-serif text-2xl tracking-wide">
          {APP_NAME}
        </Link>
        <nav className="hidden items-center gap-4 text-sm md:flex">
          <Link href="/marketplace" className="hover:opacity-70">
            Marketplace
          </Link>
          <Link href="/list-item" className="hover:opacity-70">
            Seller Hub
          </Link>
          <Link href="/dashboard" className="hover:opacity-70">
            Dashboard
          </Link>
          <Link href="/messages" className="hover:opacity-70">
            Messages
          </Link>
          <Link href="/wishlist" className="hover:opacity-70">
            Wishlist
          </Link>
          <Link href="/profile" className="hover:opacity-70">
            Profile
          </Link>
          <CartLink />
          {data?.user?.role === "ADMIN" ? (
            <Link href="/dashboard/admin" className="hover:opacity-70">
              Admin
            </Link>
          ) : null}
          <ThemeToggle />
          {data?.user ? (
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="inline-flex items-center gap-1 rounded-full border border-black/15 px-3 py-1 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              <LogOut className="size-4" />
              Logout
            </button>
          ) : (
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-1 rounded-full border border-black/15 px-3 py-1 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              <UserRound className="size-4" />
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
