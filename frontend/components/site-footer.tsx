import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-black/10 bg-white dark:border-white/10 dark:bg-[#0f1219]">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid gap-10 py-12 md:grid-cols-4">
          <div>
            <p className="font-serif text-2xl">{APP_NAME}</p>
            <p className="mt-3 max-w-xs text-sm leading-7 text-black/70 dark:text-white/72">
              Your go-to marketplace for modern fashion. Discover the latest trends with secure checkout and fast delivery.
            </p>
            <div className="mt-6 flex gap-3">
              <a href="#" aria-label="Facebook" className="rounded-full border border-black/10 p-2 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10">FB</a>
              <a href="#" aria-label="Instagram" className="rounded-full border border-black/10 p-2 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10">IG</a>
              <a href="#" aria-label="X" className="rounded-full border border-black/10 p-2 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10">X</a>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-black/60 dark:text-white/60">Need Help?</p>
            <div className="mt-4 space-y-3 text-sm">
              <Link href="/help" className="block hover:opacity-70">Help Center</Link>
              <Link href="/help?page=place+an+order" className="block hover:opacity-70">Place an Order</Link>
              <Link href="/help?page=pay+for+your+order" className="block hover:opacity-70">Payment Options</Link>
              <Link href="/help?page=track+your+order" className="block hover:opacity-70">Track Your Order</Link>
              <Link href="/help?page=returns" className="block hover:opacity-70">Returns & Refunds</Link>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-black/60 dark:text-white/60">Useful Links</p>
            <div className="mt-4 space-y-3 text-sm">
              <Link href="/marketplace" className="block hover:opacity-70">Marketplace</Link>
              <Link href="/list-item" className="block hover:opacity-70">Sell on {APP_NAME}</Link>
              <Link href="/cart" className="block hover:opacity-70">Cart</Link>
              <Link href="/wishlist" className="block hover:opacity-70">Wishlist</Link>
              <Link href="/terms" className="block hover:opacity-70">Terms & Conditions</Link>
              <Link href="/privacy" className="block hover:opacity-70">Privacy Policy</Link>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-black/60 dark:text-white/60">Contact Us</p>
            <div className="mt-4 space-y-3 text-sm">
              <p>Email: support@{APP_NAME.toLowerCase()}.com</p>
              <p>Phone: +254 700 000 000</p>
              <a href="https://wa.me/254700000000" target="_blank" rel="noreferrer" className="block hover:opacity-70">WhatsApp Chat</a>
              <p className="text-black/60 dark:text-white/60"> Nairobi, Kenya</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-black/10 py-6 md:flex-row dark:border-white/10">
          <p className="text-xs text-black/60 dark:text-white/60">{year} {APP_NAME}. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs text-black/60 dark:text-white/60">
            <span>Cash on Delivery</span>
            <span>Visa</span>
            <span>Mastercard</span>
            <span>M-Pesa</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
