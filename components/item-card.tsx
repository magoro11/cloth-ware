"use client";

import Link from "next/link";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { WishlistButton } from "@/components/wishlist-button";

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
  const averageRating = item.reviews?.length
    ? (item.reviews.reduce((acc, review) => acc + review.rating, 0) / item.reviews.length).toFixed(1)
    : null;

  return (
    <Link
      href={`/item/${item.id}`}
      className="group overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-[#151822]"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-black/5 dark:bg-white/5">
        <WishlistButton itemId={item.id} initialWishlisted={item.isWishlisted} className="absolute right-3 top-3 z-10 p-2" />

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
