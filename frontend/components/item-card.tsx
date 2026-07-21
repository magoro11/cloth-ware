"use client";

import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { formatCurrency } from "@/backend/lib/utils";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { WishlistButton } from "@/frontend/components/wishlist-button";

type ItemCardProps = {
  item: {
    id: string;
    title: string;
    brand: string;
    category: string;
    size: string;
    sellingPrice: number | null;
    originalPrice?: number | null;
    condition?: string;
    owner?: { role?: string };
    reviews?: { rating: number }[];
    isWishlisted?: boolean;
    isInCart?: boolean;
    images: { url: string }[];
  };
};

export function ItemCard({ item }: ItemCardProps) {
  const averageRating = item.reviews?.length
    ? (item.reviews.reduce((acc, review) => acc + review.rating, 0) / item.reviews.length).toFixed(1)
    : null;
  const reviewCount = item.reviews?.length ?? 0;

  const discount =
    item.originalPrice && item.sellingPrice
      ? Math.round(((item.originalPrice - item.sellingPrice) / item.originalPrice) * 100)
      : null;

  const stars = averageRating
    ? Array.from({ length: 5 }, (_, i) =>
        i < Math.round(Number(averageRating)) ? (
          <Star key={i} className="size-3 fill-[#ffbf00] text-[#ffbf00]" />
        ) : (
          <Star key={i} className="size-3 text-black/20" />
        ),
      )
    : null;

  return (
    <Link
      href={`/item/${item.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white transition hover:shadow-lg dark:border-white/10 dark:bg-[#151822]"
    >
      <div className="relative aspect-square overflow-hidden bg-black/5 dark:bg-white/5">
        <WishlistButton itemId={item.id} initialWishlisted={item.isWishlisted} className="absolute right-2 top-2 z-10 rounded-full p-1.5" />
        {item.images[0]?.url ? (
          <Image
            src={item.images[0].url}
            alt={item.title}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-content-center text-sm opacity-60">No image</div>
        )}
        {discount ? (
          <span className="absolute left-2 top-2 rounded-full bg-[#c25e30] px-2 py-1 text-[11px] font-semibold text-white">
            -{discount}%
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="text-[11px] uppercase tracking-widest opacity-60">{item.brand}</p>
        <h3 className="line-clamp-2 text-sm font-medium">{item.title}</h3>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            {item.sellingPrice ? (
              <div className="flex items-baseline gap-2">
                <p className="text-base font-semibold text-[#c25e30]">{formatCurrency(item.sellingPrice)}</p>
                {item.originalPrice && item.sellingPrice ? (
                  <p className="text-[11px] line-through opacity-60">{formatCurrency(item.originalPrice)}</p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm font-medium text-black/60 dark:text-white/60">Price on request</p>
            )}
            <p className="text-[11px] text-black/50 dark:text-white/50">Free delivery</p>
          </div>
          {averageRating ? (
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-0.5">{stars}</div>
              <span className="text-[10px] font-medium text-black/60 dark:text-white/60">({reviewCount})</span>
            </div>
          ) : null}
        </div>

        {item.sellingPrice ? (
          <div className="pt-2">
            <AddToCartButton itemId={item.id} inCart={item.isInCart} className="w-full rounded-lg border border-black/10 px-3 py-2 text-xs hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10" />
          </div>
        ) : null}
      </div>
    </Link>
  );
}
