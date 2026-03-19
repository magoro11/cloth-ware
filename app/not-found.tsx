import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-[60vh] max-w-3xl place-items-center px-4 py-16 text-center">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] opacity-60">404</p>
        <h1 className="mt-3 font-serif text-5xl">Look not found</h1>
        <p className="mt-4 text-sm opacity-75">The page you requested is unavailable or has moved.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/marketplace" className="rounded-full bg-black px-5 py-2 text-sm text-white dark:bg-white dark:text-black">
            Browse Marketplace
          </Link>
          <Link href="/" className="rounded-full border border-black/20 px-5 py-2 text-sm dark:border-white/20">
            Back Home
          </Link>
        </div>
      </div>
    </main>
  );
}
