"use client";

import { useState } from "react";
import { CheckCircle2, PackageCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";

type Props = {
  bookingId: string;
  status: string;
};

export function SellerBookingActions({ bookingId, status }: Props) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [busy, setBusy] = useState<"delivered" | "returned" | null>(null);

  async function updateStatus(action: "delivered" | "returned") {
    setBusy(action);
    const res = await fetch(`/api/seller/bookings/${bookingId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      pushToast(data.error || "Unable to update booking");
      return;
    }
    pushToast(action === "delivered" ? "Marked as delivered" : "Return received");
    router.refresh();
  }

  const canMarkDelivered = status === "CONFIRMED";
  const canMarkReturned = status === "ACTIVE" || status === "LATE";

  if (!canMarkDelivered && !canMarkReturned) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {canMarkDelivered ? (
        <button
          type="button"
          onClick={() => updateStatus("delivered")}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-lg border border-black/15 px-3 py-1.5 text-xs hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
        >
          <PackageCheck className="size-3.5" />
          {busy === "delivered" ? "Saving…" : "Mark as delivered"}
        </button>
      ) : null}

      {canMarkReturned ? (
        <button
          type="button"
          onClick={() => updateStatus("returned")}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 px-3 py-1.5 text-xs text-emerald-800 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-700/40 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
        >
          <CheckCircle2 className="size-3.5" />
          {busy === "returned" ? "Saving…" : "Mark as returned"}
        </button>
      ) : null}
    </div>
  );
}
