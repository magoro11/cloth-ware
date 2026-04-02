"use client";

import { type ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard } from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { cn } from "@/lib/utils";

type Props = {
  itemIds: string[];
  source: "item" | "cart";
  className?: string;
  disabled?: boolean;
  children?: ReactNode;
};

export function PurchaseCheckoutButton({
  itemIds,
  source,
  className,
  disabled = false,
  children,
}: Props) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  async function handleClick() {
    if (itemIds.length === 0) {
      pushToast("Your cart is empty.");
      return;
    }

    setSubmitting(true);
    const response = await fetch("/api/stripe/purchase-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemIds, source }),
    });
    const payload = await response.json();
    setSubmitting(false);

    if (response.status === 401) {
      router.push("/auth/signin");
      return;
    }

    if (!response.ok) {
      pushToast(payload.error || "Unable to start checkout");
      return;
    }

    if (payload.checkoutUrl) {
      window.location.href = payload.checkoutUrl;
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || submitting}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black",
        className,
      )}
    >
      <CreditCard className="size-4" />
      {submitting ? "Redirecting..." : children ?? "Checkout"}
    </button>
  );
}
