"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast-provider";

type Props = {
  itemId: string;
  initialWishlisted?: boolean;
  className?: string;
  showLabel?: boolean;
};

export function WishlistButton({
  itemId,
  initialWishlisted = false,
  className,
  showLabel = false,
}: Props) {
  const { pushToast } = useToast();
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [saving, setSaving] = useState(false);

  async function toggleWishlist(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    setSaving(true);
    const response = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    const payload = await response.json();
    setSaving(false);

    if (!response.ok) {
      pushToast(payload.error || "Sign in to save wishlist items");
      return;
    }

    setWishlisted(Boolean(payload.wishlisted));
    pushToast(payload.wishlisted ? "Added to wishlist" : "Removed from wishlist");
  }

  return (
    <button
      type="button"
      onClick={toggleWishlist}
      disabled={saving}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border border-black/15 bg-white/90 px-3 py-2 text-sm text-black shadow-sm dark:border-white/20 dark:bg-black/60 dark:text-white",
        className,
      )}
      aria-label="Toggle wishlist"
    >
      <Heart className={cn("size-4", wishlisted && "fill-current")} />
      {showLabel ? (wishlisted ? "Saved" : "Add to Wishlist") : null}
    </button>
  );
}
