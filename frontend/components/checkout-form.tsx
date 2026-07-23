"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import { formatCurrency } from "@/backend/lib/utils";
import { z } from "zod";

const checkoutSchema = z.object({
  address1: z.string().min(1, "Address is required"),
  address2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),
});

type CheckoutFormProps = {
  total: number;
};

export function CheckoutForm({ total }: CheckoutFormProps) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function placeOrder(formData: FormData) {
    setLoading(true);
    setErrors({});

    const raw = {
      address1: String(formData.get("address1") || ""),
      address2: String(formData.get("address2") || ""),
      city: String(formData.get("city") || ""),
      country: String(formData.get("country") || ""),
    };

    const result = checkoutSchema.safeParse(raw);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      setLoading(false);
      return;
    }

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: result.data, paymentMethod }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      pushToast(data.error || "Unable to place order");
      return;
    }

    pushToast("Order placed successfully!");
    router.push(`/checkout/success?orderId=${data.orderId}`);
  }

  return (
    <form action={placeOrder} className="rounded-2xl border border-black/5 p-5 dark:border-white/10">
      <h2 className="font-semibold text-black dark:text-white">Delivery Address</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <input name="address1" required placeholder="Address line 1" className={`w-full rounded-lg border px-3 py-2 text-sm dark:border-white/10 ${errors.address1 ? "border-red-500" : "border-black/10"}`} />
          {errors.address1 ? <p className="mt-1 text-xs text-red-500">{errors.address1}</p> : null}
        </div>
        <input name="address2" placeholder="Address line 2" className="rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10" />
        <div>
          <input name="city" required placeholder="City" className={`w-full rounded-lg border px-3 py-2 text-sm dark:border-white/10 ${errors.city ? "border-red-500" : "border-black/10"}`} />
          {errors.city ? <p className="mt-1 text-xs text-red-500">{errors.city}</p> : null}
        </div>
        <div>
          <input name="country" required placeholder="Country" className={`w-full rounded-lg border px-3 py-2 text-sm dark:border-white/10 ${errors.country ? "border-red-500" : "border-black/10"}`} />
          {errors.country ? <p className="mt-1 text-xs text-red-500">{errors.country}</p> : null}
        </div>
      </div>

      <h2 className="mt-6 font-semibold text-black dark:text-white">Payment Method</h2>
      <div className="mt-3 grid gap-2">
        {["stripe", "mpesa", "paypal", "cod"].map((option) => (
          <label key={option} className="flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 dark:border-white/10">
            <input
              type="radio"
              name="paymentMethod"
              value={option}
              checked={paymentMethod === option}
              onChange={(e) => setPaymentMethod(e.target.value)}
            />
            <span className="text-sm text-black dark:text-white">
              {option === "stripe" ? "Card Payment (Stripe)" : option === "mpesa" ? "M-Pesa" : option === "paypal" ? "PayPal" : "Cash on Delivery"}
            </span>
          </label>
        ))}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-lg bg-[#F68B1E] px-4 py-3 text-sm font-semibold text-white hover:bg-[#e07d18] disabled:opacity-50"
      >
        {loading ? "Processing..." : `Pay ${formatCurrency(total)}`}
      </button>
    </form>
  );
}
