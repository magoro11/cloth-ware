"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/toast-provider";

type Props = {
  itemId: string;
  isAvailable: boolean;
};

export function SellerListingActions({ itemId, isAvailable }: Props) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [busy, setBusy] = useState<"toggle" | "delete" | null>(null);

  async function toggleAvailability() {
    setBusy("toggle");
    const response = await fetch(`/api/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !isAvailable }),
    });
    const payload = await response.json();
    setBusy(null);

    if (!response.ok) {
      pushToast(payload.error || "Unable to update listing");
      return;
    }

    pushToast(isAvailable ? "Listing marked unavailable" : "Listing available again");
    router.refresh();
  }

  async function deleteListing() {
    setBusy("delete");
    const response = await fetch(`/api/items/${itemId}`, { method: "DELETE" });
    const payload = await response.json();
    setBusy(null);

    if (!response.ok) {
      pushToast(payload.error || "Unable to delete listing");
      return;
    }

    pushToast("Listing deleted");
    router.refresh();
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <a href={`/list-item?id=${itemId}`} className="rounded-lg border border-black/15 px-3 py-1.5 text-xs hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10">
        Edit
      </a>
      <button
        type="button"
        onClick={toggleAvailability}
        disabled={busy !== null}
        className="rounded-lg border border-black/15 px-3 py-1.5 text-xs hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
      >
        {busy === "toggle" ? "Saving..." : isAvailable ? "Mark unavailable" : "Mark available"}
      </button>
      <button
        type="button"
        onClick={deleteListing}
        disabled={busy !== null}
        className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/40 dark:text-rose-200 dark:hover:bg-rose-500/10"
      >
        {busy === "delete" ? "Deleting..." : "Delete"}
      </button>
    </div>
  );
}
