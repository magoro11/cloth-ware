"use client";

import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";

function notifyCartChanged(count?: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("cart:changed", { detail: { count } }));
}

type Props = {
  itemId: string;
  inCart?: boolean;
  disabled?: boolean;
  className?: string;
};

export function AddToCartButton({ itemId, inCart = false, disabled = false, className }: Props) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState(inCart);

  async function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (added) {
      router.push("/cart");
      return;
    }

    setSaving(true);
    const response = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    const payload = await response.json();
    setSaving(false);

    if (!response.ok) {
      pushToast(payload.error || "Sign in to add items to cart");
      return;
    }

    setAdded(true);
    notifyCartChanged(payload.count);
    pushToast("Added to cart");
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || saving}
      className={className ?? "inline-flex items-center justify-center gap-2 rounded-lg border border-black/15 px-3 py-2 text-sm hover:bg-black/5 disabled:opacity-60 dark:border-white/20 dark:hover:bg-white/10"}
    >
      <ShoppingBag className="size-4" />
      {added ? "View cart" : saving ? "Adding..." : "Add to cart"}
    </button>
  );
}

export { notifyCartChanged };
