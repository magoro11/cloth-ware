import Link from "next/link";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-black/10 bg-white/70 pb-24 pt-10 backdrop-blur dark:border-white/10 dark:bg-[#0f1118]/70 md:pb-10">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 md:grid-cols-4 md:px-8">
        <div className="md:col-span-2">
          <p className="font-serif text-2xl">{APP_NAME}</p>
          <p className="mt-2 max-w-md text-sm opacity-75">{APP_TAGLINE}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] opacity-60">Marketplace</p>
          <div className="mt-3 space-y-2 text-sm">
            <Link href="/marketplace" className="block hover:opacity-70">
              Browse listings
            </Link>
            <Link href="/list-item" className="block hover:opacity-70">
              List an item
            </Link>
            <Link href="/messages" className="block hover:opacity-70">
              Messaging
            </Link>
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] opacity-60">Company</p>
          <div className="mt-3 space-y-2 text-sm">
            <Link href="/terms" className="block hover:opacity-70">
              Terms
            </Link>
            <Link href="/privacy" className="block hover:opacity-70">
              Privacy
            </Link>
            <Link href="/dashboard" className="block hover:opacity-70">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-7xl border-t border-black/10 px-4 pt-4 text-xs opacity-65 dark:border-white/10 md:px-8">
        {year} {APP_NAME}. All rights reserved.
      </div>
    </footer>
  );
}
