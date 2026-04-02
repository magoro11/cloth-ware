"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useToast } from "@/components/toast-provider";
import { PurchaseCheckoutButton } from "@/components/purchase-checkout-button";
import { formatCurrency } from "@/lib/utils";
import { notifyCartChanged } from "@/components/add-to-cart-button";

type CartItem = {
  id: string;
  itemId: string;
  item: {
    id: string;
    title: string;
    brand: string;
    sellingPrice: number | null;
    rentalPricePerDay: number;
    images: { url: string }[];
    owner: { name: string | null; email: string | null };
  };
};

export function CartList({ initialItems }: { initialItems: CartItem[] }) {
  const { pushToast } = useToast();
  const [items, setItems] = useState(initialItems);
  const [busyId, setBusyId] = useState<string | null>(null);

  const total = useMemo(
    () => items.reduce((sum, entry) => sum + (entry.item.sellingPrice ?? 0), 0),
    [items],
  );
  const purchasableItemIds = useMemo(
    () => items.filter((entry) => entry.item.sellingPrice).map((entry) => entry.itemId),
    [items],
  );

  async function removeItem(itemId: string) {
    setBusyId(itemId);
    const response = await fetch("/api/cart", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    const payload = await response.json();
    setBusyId(null);

    if (!response.ok) {
      pushToast(payload.error || "Unable to update cart");
      return;
    }

    setItems((prev) => prev.filter((entry) => entry.itemId !== itemId));
    notifyCartChanged(payload.count);
    pushToast("Removed from cart");
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/15 p-8 text-center text-sm opacity-75 dark:border-white/20">
        Your cart is empty. Add buy-now items from the marketplace to collect them here.
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
      <div className="space-y-4">
        {items.map((entry) => (
          <article key={entry.id} className="grid gap-4 rounded-2xl border border-black/10 p-4 dark:border-white/10 md:grid-cols-[120px,1fr]">
            <div className="overflow-hidden rounded-xl bg-black/5 dark:bg-white/5">
              {entry.item.images[0]?.url ? (
                <Image
                  src={entry.item.images[0].url}
                  alt={entry.item.title}
                  width={240}
                  height={320}
                  unoptimized
                  className="aspect-[3/4] h-full w-full object-cover"
                />
              ) : (
                <div className="grid aspect-[3/4] place-content-center text-sm opacity-60">No image</div>
              )}
            </div>
            <div className="flex flex-col justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest opacity-65">{entry.item.brand}</p>
                <Link href={`/item/${entry.item.id}`} className="mt-1 block font-semibold hover:opacity-70">
                  {entry.item.title}
                </Link>
                <p className="mt-2 text-sm opacity-70">
                  Sold by {entry.item.owner.name || entry.item.owner.email || "Luxury seller"}
                </p>
                <p className="mt-2 text-sm opacity-70">
                  Rental option remains available separately at {formatCurrency(entry.item.rentalPricePerDay)}/day.
                </p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{formatCurrency(entry.item.sellingPrice ?? 0)}</p>
                <button
                  onClick={() => removeItem(entry.itemId)}
                  disabled={busyId === entry.itemId}
                  className="rounded-lg border border-black/15 px-3 py-2 text-sm hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
                >
                  {busyId === entry.itemId ? "Removing..." : "Remove"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <aside className="h-fit rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <h2 className="font-semibold">Order summary</h2>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span>Items</span>
            <span>{items.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
        <p className="mt-4 text-xs opacity-65">
          Secure checkout runs through Stripe and removes sold pieces from all carts after payment.
        </p>
        <PurchaseCheckoutButton
          itemIds={purchasableItemIds}
          source="cart"
          disabled={purchasableItemIds.length === 0}
          className="mt-4 w-full"
        >
          Checkout now
        </PurchaseCheckoutButton>
      </aside>
    </div>
  );
}
