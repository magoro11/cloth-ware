"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";

type Props = {
  bookingId: string;
  /** Only PENDING or CONFIRMED can be cancelled */
  status: string;
};

const CANCELLABLE = new Set(["PENDING", "CONFIRMED"]);

export function CancelBookingButton({ bookingId, status }: Props) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (!CANCELLABLE.has(status)) return null;

  async function handleCancel() {
    setBusy(true);
    const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      pushToast(data.error || "Unable to cancel booking");
      return;
    }
    setOpen(false);
    pushToast("Booking cancelled");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
      >
        <X className="size-3.5" />
        Cancel booking
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-[#151822]">
            <h3 id="cancel-dialog-title" className="font-serif text-2xl">
              Cancel this booking?
            </h3>
            <p className="mt-2 text-sm opacity-70">
              This cannot be undone. The seller will be notified.
            </p>
            <label className="mt-4 block text-sm">
              Reason (optional)
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={400}
                placeholder="Let the seller know why you're cancelling..."
                className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5 dark:border-white/20"
              />
            </label>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="flex-1 rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              >
                Keep booking
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={busy}
                className="flex-1 rounded-lg bg-rose-600 px-4 py-2 text-sm text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {busy ? "Cancelling…" : "Yes, cancel"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
