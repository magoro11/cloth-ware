"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { CartLink } from "@/components/cart-link";
import { APP_NAME } from "@/lib/constants";

export function SiteHeader() {
  const { data } = useSession();
  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-white dark:border-white/10 dark:bg-[#0f1219]">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 md:px-8">
        <Link href="/" className="shrink-0 font-serif text-xl font-semibold tracking-tight">
          {APP_NAME}
        </Link>

        <div className="hidden flex-1 items-center md:flex">
          <div className="flex w-full max-w-2xl items-center rounded-full border border-black/10 bg-black/[0.03] px-4 py-2 dark:border-white/10 dark:bg-white/5">
            <input
              type="search"
              placeholder="Search for clothes, shoes, brands..."
              className="w-full bg-transparent text-sm outline-none"
            />
            <button className="ml-3 rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-black">
              Search
            </button>
          </div>
        </div>

        <nav className="ml-auto flex items-center gap-4 text-xs font-medium">
          <div className="hidden items-center gap-4 md:flex">
            {data?.user ? (
              <details className="relative">
                <summary className="cursor-pointer list-none hover:opacity-70">Account</summary>
                <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-black/10 bg-white p-2 shadow-lg dark:border-white/10 dark:bg-[#151a24]">
                  <Link href="/orders" className="block rounded-xl px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5">My Orders</Link>
                  <Link href="/wishlist" className="block rounded-xl px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5">Wishlist</Link>
                  <Link href="/profile" className="block rounded-xl px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5">Profile</Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <LogOut className="size-3.5" /> Logout
                  </button>
                </div>
              </details>
            ) : (
              <Link href="/auth/signin" className="hover:opacity-70">Sign in</Link>
            )}
            <Link href="/help" className="hover:opacity-70">Help</Link>
          </div>
          <CartLink />
          <a
            href="https://wa.me/254700000000"
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-full border border-black/10 p-2 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10 md:flex"
            aria-label="Chat on WhatsApp"
          >
            <svg viewBox="0 0 24 24" className="size-4 fill-current">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </a>
        </nav>
      </div>

      <div className="border-t border-black/5 dark:border-white/5 md:hidden">
        <div className="mx-auto max-w-7xl px-4 py-2">
          <div className="flex items-center rounded-full border border-black/10 bg-black/[0.03] px-4 py-2 dark:border-white/10 dark:bg-white/5">
            <input
              type="search"
              placeholder="Search for clothes, shoes, brands..."
              className="w-full bg-transparent text-sm outline-none"
            />
            <button className="ml-3 rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-black">
              Search
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-black/5 dark:border-white/5">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <nav className="flex items-center gap-6 overflow-x-auto text-xs font-medium md:text-sm">
            <Link href="/marketplace?category=Women" className="whitespace-nowrap py-2 hover:opacity-70">Women</Link>
            <Link href="/marketplace?category=Men" className="whitespace-nowrap py-2 hover:opacity-70">Men</Link>
            <Link href="/marketplace?category=Shoes" className="whitespace-nowrap py-2 hover:opacity-70">Shoes</Link>
            <Link href="/marketplace?category=Bags" className="whitespace-nowrap py-2 hover:opacity-70">Bags</Link>
            <Link href="/marketplace?category=Accessories" className="whitespace-nowrap py-2 hover:opacity-70">Accessories</Link>
            <Link href="/marketplace?category=Sale" className="whitespace-nowrap py-2 font-semibold text-[#c25e30] hover:opacity-70">Sale</Link>
          </nav>
        </div>
      </div>

      <div className="border-t border-black/5 dark:border-white/5">
        <div className="mx-auto max-w-7xl flex gap-3 overflow-x-auto px-4 py-3 md:px-8">
          <Link href="/" className="flex min-w-[200px] items-center gap-3 rounded-xl border border-black/5 bg-black/90 p-3 text-white dark:border-white/10">
            <div>
              <p className="text-xs font-semibold">Text to Order</p>
              <p className="text-[11px] text-white/70">Chat with us on WhatsApp</p>
            </div>
          </Link>
          <Link href="/marketplace?category=Sale" className="flex min-w-[200px] items-center gap-3 rounded-xl border border-black/5 bg-[#c25e30] p-3 text-white dark:border-white/10">
            <div>
              <p className="text-xs font-semibold">Flash Sale</p>
              <p className="text-[11px] text-white/80">Up to 50% off selected items</p>
            </div>
          </Link>
          <Link href="/list-item" className="flex min-w-[200px] items-center gap-3 rounded-xl border border-black/5 bg-black/90 p-3 text-white dark:border-white/10">
            <div>
              <p className="text-xs font-semibold">Sell on ATELIER</p>
              <p className="text-[11px] text-white/70">Start selling today</p>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
