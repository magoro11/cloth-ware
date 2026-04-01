"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/toast-provider";
import { AddToCartButton } from "@/components/add-to-cart-button";

type ItemCardProps = {
  item: {
    id: string;
    title: string;
    brand: string;
    category: string;
    size: string;
    condition?: string;
    rentalPricePerDay: number;
    sellingPrice: number | null;
    securityDeposit?: number;
    owner?: { role?: string };
    reviews?: { rating: number }[];
    isWishlisted?: boolean;
    isInCart?: boolean;
    images: { url: string }[];
  };
};

export function ItemCard({ item }: ItemCardProps) {
  const { pushToast } = useToast();
  const [wishlisted, setWishlisted] = useState(Boolean(item.isWishlisted));
  const [saving, setSaving] = useState(false);

  const averageRating = item.reviews?.length
    ? (item.reviews.reduce((acc, review) => acc + review.rating, 0) / item.reviews.length).toFixed(1)
    : null;

  async function toggleWishlist(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    setSaving(true);
    const response = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id }),
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
    <Link
      href={`/item/${item.id}`}
      className="group overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-[#151822]"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-black/5 dark:bg-white/5">
        <button
          onClick={toggleWishlist}
          disabled={saving}
          className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 text-black shadow dark:bg-black/60 dark:text-white"
          aria-label="Toggle wishlist"
        >
          <Heart className={`size-4 ${wishlisted ? "fill-current" : ""}`} />
        </button>

        {item.images[0]?.url ? (
          <Image
            src={item.images[0].url}
            alt={item.title}
            width={800}
            height={1000}
            unoptimized
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-content-center text-sm opacity-60">No image</div>
        )}
      </div>

      <div className="space-y-1 p-4">
        <p className="text-xs uppercase tracking-widest opacity-70">{item.brand}</p>
        <h3 className="font-medium">{item.title}</h3>
        <p className="text-xs opacity-70">{item.category} | Size {item.size}</p>

        <div className="flex flex-wrap gap-1 pt-1 text-[11px]">
          {item.securityDeposit ? (
            <span className="rounded-full border border-black/15 px-2 py-0.5 dark:border-white/20">Deposit required</span>
          ) : null}
          {item.condition ? <span className="rounded-full bg-black/5 px-2 py-0.5 dark:bg-white/10">{item.condition}</span> : null}
          {item.owner?.role === "LENDER" || item.owner?.role === "ADMIN" ? (
            <span className="rounded-full bg-black px-2 py-0.5 text-white dark:bg-white dark:text-black">Verified seller</span>
          ) : null}
          {averageRating ? <span className="rounded-full border border-black/15 px-2 py-0.5 dark:border-white/20">{averageRating} stars</span> : null}
        </div>

        <p className="text-sm">
          <span className="font-semibold">{formatCurrency(item.rentalPricePerDay)}</span>/day
          {item.sellingPrice ? <span className="ml-2 opacity-80">Buy {formatCurrency(item.sellingPrice)}</span> : null}
        </p>
        {item.sellingPrice ? (
          <div className="pt-2">
            <AddToCartButton itemId={item.id} inCart={item.isInCart} className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm hover:bg-black/5 disabled:opacity-60 dark:border-white/20 dark:hover:bg-white/10" />
          </div>
        ) : null}
      </div>
    </Link>
  );
}
