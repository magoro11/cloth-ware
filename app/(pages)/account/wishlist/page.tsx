"use client";

import { useState } from "react";
import { listWishlist, addToWishlist, removeFromWishlist, isWishlisted } from "@/backend/actions/wishlist.actions";
import { ProductCard } from "@/frontend/components/product-card";
import { Heart, ShoppingBag } from "lucide-react";

export default function WishlistPage() {
  const [items, setItems] = useState<Array<{
    id: string;
    title: string;
    brand: string;
    garmentType: string | null;
    images: { url: string }[];
    variants: { id: string; price: number | null; stock: number }[];
    basePrice: number;
    isWishlisted: boolean;
    isInCart: boolean;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const res = await listWishlist();
      const mapped = (res.items ?? []).map((wi: any) => {
        const product = wi.product;
        const variants = product.variants ?? [];
        const minPrice =
          variants.filter((v: any) => v.price !== null).length > 0
            ? Math.min(...variants.filter((v: any) => v.price !== null).map((v: any) => v.price!))
            : product.basePrice;
        return {
          id: product.id,
          title: product.title,
          brand: product.brand ?? "",
          garmentType: product.garmentType ?? null,
          images: product.images ?? [],
          variants: variants.map((v: any) => ({
            id: v.id,
            price: v.price,
            stock: v.stock,
          })),
          basePrice: product.basePrice,
          isWishlisted: true,
          isInCart: false,
        };
      });
      setItems(mapped);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  }

  async function toggleWishlist(productId: string) {
    setItems((prev) => prev.map((item) =>
      item.id === productId ? { ...item, isWishlisted: false } : item
    ));
    try {
      const already = await isWishlisted({ productId });
      if (already.wishlisted) {
        await removeFromWishlist({ productId });
        setItems((prev) => prev.filter((i) => i.id !== productId));
      } else {
        await addToWishlist({ productId });
        setItems((prev) => prev.map((item) =>
          item.id === productId ? { ...item, isWishlisted: true } : item
        ));
      }
    } catch (e: any) {
      setItems((prev) => prev.map((item) =>
        item.id === productId ? { ...item, isWishlisted: true } : item
      ));
      setError(e?.message ?? "Failed to update wishlist");
    }
  }

  async function addToCart(productId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    // Add first available variant to cart
    const item = items.find((i) => i.id === productId);
    if (!item) return;
    const variant = item.variants.find((v) => (v.stock ?? 0) > 0) || item.variants[0];
    if (!variant) return;
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: variant.id, quantity: 1 }),
      });
      if (res.ok) {
        // Remove from wishlist after adding to cart
        await removeFromWishlist({ productId });
        setItems((prev) => prev.filter((i) => i.id !== productId));
      }
    } catch {
      // ignore
    }
  }

  if (loading) return <div className="h-64 flex items-center justify-center">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black dark:text-white">Saved Items</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Your wishlist is saved across devices
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 p-16 text-center dark:border-white/20">
          <Heart className="mb-4 size-12 opacity-20" />
          <p className="text-black/60 dark:text-white/60">Your wishlist is empty</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <ProductCard key={item.id} product={{ ...item, isWishlisted: true }} />
          ))}
        </div>
      )}
    </main>
  );
}
