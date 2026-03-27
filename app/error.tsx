"use client";

import Link from "next/link";
import { useEffect } from "react";
import { isDatabaseUnavailable } from "@/lib/errors";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (isDatabaseUnavailable(error)) {
      console.warn(error.message);
      return;
    }

    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto grid min-h-[60vh] max-w-3xl place-items-center px-4 py-16 text-center">
      <div className="rounded-2xl border border-black/10 bg-white/70 p-8 shadow-sm dark:border-white/10 dark:bg-[#151822]/80">
        <h1 className="font-serif text-4xl">Something went wrong</h1>
        <p className="mt-2 text-sm opacity-75">
          We could not complete that request. Please retry or return to the marketplace.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={reset} className="rounded-full bg-black px-5 py-2 text-sm text-white dark:bg-white dark:text-black">
            Try again
          </button>
          <Link href="/marketplace" className="rounded-full border border-black/20 px-5 py-2 text-sm dark:border-white/20">
            Browse items
          </Link>
        </div>
      </div>
    </main>
  );
}
