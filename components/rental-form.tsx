"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

type Props = {
  itemId: string;
};

type Quote = {
  days: number;
  rentalAmount: number;
  securityDeposit: number;
  commissionAmount: number;
  ownerPayoutAmount: number;
  totalCharge: number;
  lateFeePerDay: number;
};

export function RentalForm({ itemId }: Props) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function getQuote() {
    setLoading(true);
    setError(null);
    setQuote(null);
    const res = await fetch("/api/bookings/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, startDate, endDate }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Unable to get quote");
    setQuote(data.quote);
  }

  async function bookNow() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, startDate, endDate }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      return setError(data.error || "Booking failed");
    }
    const stripeRes = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: data.booking.id }),
    });
    const stripeData = await stripeRes.json();
    setLoading(false);
    if (!stripeRes.ok) return setError(stripeData.error || "Checkout failed");
    if (stripeData.checkoutUrl) window.location.href = stripeData.checkoutUrl;
  }

  return (
    <section className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
      <h3 className="font-semibold">Rent this item</h3>
      <div className="mt-4 grid gap-3">
        <label className="text-sm">
          Start date
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2"
          />
        </label>
        <label className="text-sm">
          End date
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2"
          />
        </label>
        <button
          onClick={getQuote}
          disabled={loading || !startDate || !endDate}
          className="rounded-lg bg-black px-4 py-2 text-white transition hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {loading ? "Calculating..." : "Get quote"}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {quote ? (
        <div className="mt-4 space-y-1 text-sm">
          <p>Days: {quote.days}</p>
          <p>Rental: {formatCurrency(quote.rentalAmount)}</p>
          <p>Deposit: {formatCurrency(quote.securityDeposit)}</p>
          <p>Late fee/day: {formatCurrency(quote.lateFeePerDay)}</p>
          <p className="font-semibold">Total due now: {formatCurrency(quote.totalCharge)}</p>
          <button
            onClick={bookNow}
            disabled={loading}
            className="mt-2 w-full rounded-lg border border-black/20 px-4 py-2 transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Proceed to payment
          </button>
        </div>
      ) : null}
    </section>
  );
}
