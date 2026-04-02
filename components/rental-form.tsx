"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

type Props = {
  itemId: string;
  defaults?: {
    preferredPaymentMethod?: "CARD" | "MPESA" | null;
    preferredFulfillmentMethod?: "DELIVERY" | "PICKUP" | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    country?: string | null;
    phone?: string | null;
  };
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

export function RentalForm({ itemId, defaults }: Props) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "MPESA">(defaults?.preferredPaymentMethod || "CARD");
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"DELIVERY" | "PICKUP">(defaults?.preferredFulfillmentMethod || "DELIVERY");
  const [fulfillmentAddress, setFulfillmentAddress] = useState(
    [defaults?.addressLine1, defaults?.addressLine2, defaults?.city, defaults?.country].filter(Boolean).join(", "),
  );
  const [mpesaPhone, setMpesaPhone] = useState(defaults?.phone || "");
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
      body: JSON.stringify({
        itemId,
        startDate,
        endDate,
        paymentMethod,
        fulfillmentMethod,
        fulfillmentAddress,
        mpesaPhone,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      return setError(data.error || "Booking failed");
    }

    if (paymentMethod === "MPESA") {
      const mpesaRes = await fetch("/api/mpesa/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: data.booking.id, phone: mpesaPhone }),
      });
      const mpesaData = await mpesaRes.json();
      setLoading(false);
      if (!mpesaRes.ok) return setError(mpesaData.error || "M-Pesa checkout failed");
      setError(`M-Pesa prompt sent. Checkout request ${mpesaData.mpesa?.CheckoutRequestID || "created"}.`);
      return;
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
        <label className="text-sm">
          Payment method
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as "CARD" | "MPESA")}
            className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2"
          >
            <option value="CARD">Card</option>
            <option value="MPESA">M-Pesa</option>
          </select>
        </label>
        <label className="text-sm">
          Delivery / Pickup
          <select
            value={fulfillmentMethod}
            onChange={(e) => setFulfillmentMethod(e.target.value as "DELIVERY" | "PICKUP")}
            className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2"
          >
            <option value="DELIVERY">Delivery</option>
            <option value="PICKUP">Pickup</option>
          </select>
        </label>
        {fulfillmentMethod === "DELIVERY" ? (
          <label className="text-sm">
            Delivery address
            <textarea
              value={fulfillmentAddress}
              onChange={(e) => setFulfillmentAddress(e.target.value)}
              className="mt-1 min-h-24 w-full rounded-lg border border-black/15 bg-transparent p-2"
              placeholder="Where should the item be delivered?"
            />
          </label>
        ) : null}
        {paymentMethod === "MPESA" ? (
          <label className="text-sm">
            M-Pesa phone
            <input
              value={mpesaPhone}
              onChange={(e) => setMpesaPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2"
              placeholder="2547XXXXXXXX"
            />
          </label>
        ) : null}
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
          <p>Payment method: {paymentMethod === "MPESA" ? "M-Pesa" : "Card"}</p>
          <p>Fulfillment: {fulfillmentMethod === "DELIVERY" ? "Delivery" : "Pickup"}</p>
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
