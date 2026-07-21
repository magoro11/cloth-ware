"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/backend/lib/utils";
import { useToast } from "@/components/toast-provider";

type Props = {
  itemId: string;
  /** Pre-fill if the user already reviewed this item */
  existingReview?: { rating: number; comment: string } | null;
  onSuccess?: (review: { rating: number; comment: string }) => void;
};

export function ReviewForm({ itemId, existingReview, onSuccess }: Props) {
  const { pushToast } = useToast();
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      pushToast("Please select a star rating.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, rating, comment }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      pushToast(data.error || "Unable to submit review");
      return;
    }
    setSubmitted(true);
    pushToast(existingReview ? "Review updated" : "Review submitted — thank you!");
    onSuccess?.({ rating, comment });
  }

  if (submitted && !existingReview) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300">
        Your review has been submitted. Thank you for the feedback!
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium">Your rating</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              aria-label={`${star} star${star !== 1 ? "s" : ""}`}
              className="p-0.5 transition"
            >
              <Star
                className={cn(
                  "size-7 transition",
                  (hovered || rating) >= star
                    ? "fill-[#b97834] stroke-[#b97834]"
                    : "stroke-black/30 dark:stroke-white/30",
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <label className="block text-sm">
        <span className="font-medium">Comment</span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          minLength={5}
          maxLength={800}
          required
          rows={3}
          placeholder="Share your experience with this item..."
          className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5 text-sm dark:border-white/20"
        />
      </label>

      <button
        type="submit"
        disabled={submitting || rating === 0}
        className="rounded-lg bg-black px-4 py-2 text-sm text-white transition hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {submitting ? "Submitting…" : existingReview ? "Update review" : "Submit review"}
      </button>
    </form>
  );
}
