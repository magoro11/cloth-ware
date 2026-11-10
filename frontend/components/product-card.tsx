"use client";

import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/backend/lib/utils";
import { ShoppingBag, Heart } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";

function notifyCartChanged(count?: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("cart:changed", { detail: { count } }));
}

type ProductCardProps = {
  product: {
    id: string;
    title: string;
    brand: string;
    images: { url: string }[];
    variants: { id: string; price: number | null; stock: number }[];
    basePrice: number;
    isWishlisted?: boolean;
    isInCart?: boolean;
  };
};

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [wishlisted, setWishlisted] = useState(product.isWishlisted || false);
  const [addingToCart, setAddingToCart] = useState(false);

  const minPrice = product.variants.length > 0
    ? Math.min(...product.variants.map((v) => v.price ?? product.basePrice))
    : product.basePrice;

  const primaryImage = product.images[0]?.url ?? null;

  async function handleWishlist(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    try {
      const res = await fetch("/api/wishlist", {
        method: wishlisted ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });

      if (!res.ok) {
        pushToast("Sign in to save items");
        return;
      }

      setWishlisted(!wishlisted);
      pushToast(wishlisted ? "Removed from wishlist" : "Added to wishlist");
    } catch {
      pushToast("Unable to update wishlist");
    }
  }

  async function handleAddToCart(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (addingToCart) return;

    setAddingToCart(true);
    try {
      // Use first available variant
      const variant = product.variants.find((v) => v.stock > 0) || product.variants[0];
      if (!variant) {
        pushToast("Product out of stock");
        return;
      }

      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: variant.id, quantity: 1 }),
      });

      const payload = await res.json();
      if (!res.ok) {
        pushToast(payload.error || "Sign in to add items to cart");
        return;
      }

      notifyCartChanged(payload.count);
      pushToast("Added to cart");
    } catch {
      pushToast("Unable to add to cart");
    } finally {
      setAddingToCart(false);
    }
  }

  return (
    <Link href={`/product/${product.id}`} className="group flex flex-col">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-black/5 bg-black/5 dark:border-white/10 dark:bg-white/5">
        {primaryImage ? (
          <Image src={primaryImage} alt={product.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" unoptimized />
        ) : (
          <div className="grid h-full place-content-center text-sm opacity-60">No image</div>
        )}
        <button
          onClick={handleWishlist}
          className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 backdrop-blur dark:bg-black/60 transition-opacity opacity-0 group-hover:opacity-100"
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart className={`size-4 ${wishlisted ? "fill-red-500 text-red-500" : "text-black/60 dark:text-white/60"}`} />
        </button>
      </div>
      <div className="mt-2 space-y-1">
        <p className="text-xs uppercase tracking-widest opacity-60 truncate">{product.brand}</p>
        <p className="font-medium text-sm truncate">{product.title}</p>
        <p className="text-sm font-semibold text-[#c25e30]">{formatCurrency(minPrice)}</p>
      </div>
      <button
        onClick={handleAddToCart}
        disabled={addingToCart}
        className="mt-2 w-full rounded-lg border border-black/15 px-3 py-1.5 text-xs font-medium hover:bg-black/5 disabled:opacity-60 dark:border-white/20 dark:hover:bg-white/10"
      >
        <ShoppingBag className="size-3 inline mr-1" />
        {addingToCart ? "Adding..." : "Add to cart"}
      </button>
    </Link>
  );
}