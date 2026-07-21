"use client";

import { useState } from "react";
import { Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";

export function UpgradeRoleCard() {
  const router = useRouter();
  const { pushToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleUpgrade() {
    setBusy(true);
    const res = await fetch("/api/user/upgrade-role", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      pushToast(data.error || "Unable to upgrade account");
      return;
    }
    setDone(true);
    pushToast("Account upgraded to Seller! Redirecting…");
    // Force a full reload so the session role is refreshed server-side
    setTimeout(() => router.push("/dashboard/seller"), 1200);
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300">
        Your account has been upgraded to Seller. Redirecting to your seller dashboard…
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
      <div className="flex items-start gap-3">
        <span className="rounded-xl border border-black/10 p-2.5 dark:border-white/10">
          <Store className="size-5 text-[#b97834]" />
        </span>
        <div>
          <h2 className="font-serif text-2xl">Become a Seller</h2>
          <p className="mt-1 text-sm opacity-75">
            Upgrade your account to list clothes for rent or sale, manage your
            inventory, and receive payouts. No credit card needed.
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2 text-sm">
        {[
          "List items for rent and resale",
          "Manage bookings and availability",
          "Receive Stripe payouts after returns",
          "Access the seller analytics dashboard",
        ].map((feature) => (
          <li key={feature} className="flex items-center gap-2 opacity-80">
            <span className="size-1.5 rounded-full bg-[#b97834]" />
            {feature}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={handleUpgrade}
        disabled={busy}
        className="mt-5 w-full rounded-lg bg-black px-4 py-2.5 text-sm text-white transition hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {busy ? "Upgrading…" : "Upgrade to Seller — free"}
      </button>
    </div>
  );
}
