import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-black/10 bg-[#0f1219] text-white dark:border-white/10 dark:bg-[#0f1219]">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid gap-10 py-12 md:grid-cols-4">
          <div>
            <p className="font-serif text-2xl text-white">{APP_NAME}</p>
            <p className="mt-3 max-w-xs text-sm leading-7 text-white/80">
              Your go-to marketplace for modern fashion. Discover the latest trends with secure checkout and fast delivery.
            </p>
            <div className="mt-6 flex gap-3">
              <a href="#" aria-label="Facebook" className="rounded-full border border-white/20 p-2 text-white hover:bg-white/10">FB</a>
              <a href="#" aria-label="Instagram" className="rounded-full border border-white/20 p-2 text-white hover:bg-white/10">IG</a>
              <a href="#" aria-label="X" className="rounded-full border border-white/20 p-2 text-white hover:bg-white/10">X</a>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Need Help?</p>
            <div className="mt-4 space-y-3 text-sm text-white/85">
              <Link href="/help" className="block hover:text-white">Help Center</Link>
              <Link href="/help?page=place+an+order" className="block hover:text-white">Place an Order</Link>
              <Link href="/help?page=pay+for+your+order" className="block hover:text-white">Payment Options</Link>
              <Link href="/help?page=track+your+order" className="block hover:text-white">Track Your Order</Link>
              <Link href="/help?page=returns" className="block hover:text-white">Returns & Refunds</Link>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Useful Links</p>
            <div className="mt-4 space-y-3 text-sm text-white/85">
              <Link href="/marketplace" className="block hover:text-white">Marketplace</Link>
              <Link href="/list-item" className="block hover:text-white">Sell on {APP_NAME}</Link>
              <Link href="/cart" className="block hover:text-white">Cart</Link>
              <Link href="/wishlist" className="block hover:text-white">Wishlist</Link>
              <Link href="/terms" className="block hover:text-white">Terms & Conditions</Link>
              <Link href="/privacy" className="block hover:text-white">Privacy Policy</Link>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Contact Us</p>
            <div className="mt-4 space-y-3 text-sm text-white/85">
              <p>Email: support@{APP_NAME.toLowerCase()}.com</p>
              <p>Phone: +254 700 000 000</p>
              <a href="https://wa.me/254714218493" target="_blank" rel="noreferrer" className="block hover:text-white">WhatsApp Chat</a>
              <p className="text-white/60"> Nairobi, Kenya</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 py-6 md:flex-row">
          <p className="text-xs text-white/70">{year} {APP_NAME}. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs text-white/70">
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
