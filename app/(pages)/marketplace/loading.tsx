export default function MarketplaceLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="h-10 w-72 animate-pulse rounded-xl bg-black/10 dark:bg-white/10" />
      <div className="mt-5 h-20 animate-pulse rounded-2xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.03]" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
            <div className="aspect-[3/4] animate-pulse bg-black/10 dark:bg-white/10" />
            <div className="space-y-2 p-4">
              <div className="h-3 w-20 animate-pulse rounded bg-black/10 dark:bg-white/10" />
              <div className="h-4 w-40 animate-pulse rounded bg-black/10 dark:bg-white/10" />
              <div className="h-3 w-24 animate-pulse rounded bg-black/10 dark:bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
