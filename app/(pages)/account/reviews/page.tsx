"use client";

import { useState } from "react";
import { ReviewForm } from "@/frontend/components/review-form";

export default function ReviewsPage() {
  const [openReview, setOpenReview] = useState<string | null>(null);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black dark:text-white">My Reviews</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Share your thoughts on products you've purchased
        </p>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-[#151822]">
        <p className="text-sm text-black/60 dark:text-white/60 mb-4">
          No reviews yet. Start by reviewing a product you've received.
        </p>
        <button
          onClick={() => setOpenReview("prompt")}
          className="inline-flex items-center gap-2 rounded-full bg-[#F68B1E] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#e07d18]"
        >
          Write a Review
        </button>
      </div>

      {openReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" aria-hidden={openReview ? "false" : "true"}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpenReview(null)} />
          <div className="relative bg-white p-6 rounded-2xl shadow-xl dark:bg-[#151822] w-full max-w-md mx-4 mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-black dark:text-white">Write a Review</h2>
              <button onClick={() => setOpenReview(null)} className="text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white">
                ✕
              </button>
            </div>
            <ReviewForm itemId="placeholder" />
          </div>
        </div>
      )}
    </main>
  );
}
