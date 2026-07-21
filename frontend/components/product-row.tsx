"use client";

import Link from "next/link";
import { ItemCard } from "@/frontend/components/item-card";

type ProductRowProps = {
  items: Array<{
    id: string;
    title: string;
    brand: string;
    category: string;
    size: string;
    sellingPrice: number | null;
    originalPrice?: number | null;
    condition?: string;
    reviews?: { rating: number }[];
    isWishlisted?: boolean;
    isInCart?: boolean;
    images: { url: string }[];
  }>;
  title: string;
  href?: string;
};

export function ProductRow({ items, title, href }: ProductRowProps) {
  return (
    <section className="mt-10">
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-serif text-2xl">{title}</h2>
        {href ? (
          <Link href={href} className="text-sm font-semibold text-[#c25e30] hover:opacity-70">
            See All
          </Link>
        ) : null}
      </div>
      <div className="mt-4 -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 snap-x snap-mandatory md:mx-0 md:px-0">
        {items.map((item) => (
          <div key={item.id} className="min-w-[260px] max-w-[260px] snap-start">
            <ItemCard item={item} />
          </div>
        ))}
      </div>
    </section>
  );
}
