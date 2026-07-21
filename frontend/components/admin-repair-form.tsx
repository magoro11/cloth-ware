"use client";

import { FormEvent, useState } from "react";

export function AdminRepairForm() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/repairs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: String(form.get("itemId")),
        bookingId: String(form.get("bookingId") || ""),
        adminNote: String(form.get("adminNote")),
        repairCost: Number(form.get("repairCost")),
      }),
    });
    const payload = await res.json();
    setLoading(false);
    setMessage(res.ok ? "Repair logged." : payload.error || "Failed to log repair.");
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl border border-black/10 p-5 dark:border-white/10">
      <h2 className="font-serif text-2xl">Log repair cost</h2>
      <input name="itemId" placeholder="Item ID" required className="rounded-lg border border-black/15 bg-transparent p-2.5" />
      <input name="bookingId" placeholder="Booking ID (optional)" className="rounded-lg border border-black/15 bg-transparent p-2.5" />
      <textarea name="adminNote" placeholder="Repair notes" required className="min-h-24 rounded-lg border border-black/15 bg-transparent p-2.5" />
      <input name="repairCost" type="number" min={100} placeholder="Repair cost cents" required className="rounded-lg border border-black/15 bg-transparent p-2.5" />
      <button disabled={loading} className="rounded-lg bg-black px-4 py-2.5 text-white dark:bg-white dark:text-black">
        {loading ? "Saving..." : "Submit"}
      </button>
      {message ? <p className="text-sm opacity-80">{message}</p> : null}
    </form>
  );
}
