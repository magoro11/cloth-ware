"use client";

import { useState } from "react";
import { useToast } from "@/components/toast-provider";

type Profile = {
  email: string;
  name: string | null;
  image: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  country: string | null;
  preferredPaymentMethod: "CARD" | "MPESA" | null;
  preferredFulfillmentMethod: "DELIVERY" | "PICKUP" | null;
};

export function ProfileForm({ initialProfile }: { initialProfile: Profile }) {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(form.get("name") || ""),
        phone: String(form.get("phone") || ""),
        addressLine1: String(form.get("addressLine1") || ""),
        addressLine2: String(form.get("addressLine2") || ""),
        city: String(form.get("city") || ""),
        country: String(form.get("country") || ""),
        image: String(form.get("image") || ""),
        preferredPaymentMethod: String(form.get("preferredPaymentMethod") || "") || null,
        preferredFulfillmentMethod: String(form.get("preferredFulfillmentMethod") || "") || null,
      }),
    });
    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      pushToast(payload.error || "Unable to save profile");
      return;
    }

    pushToast("Profile updated");
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-black/10 p-5 dark:border-white/10">
      <div>
        <h1 className="font-serif text-3xl">Profile</h1>
        <p className="mt-2 text-sm opacity-75">Personal info, address details, and default checkout preferences.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          Name
          <input name="name" defaultValue={initialProfile.name || ""} className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5" required />
        </label>
        <label className="text-sm">
          Email
          <input value={initialProfile.email} disabled className="mt-1 w-full rounded-lg border border-black/10 bg-black/[0.03] p-2.5 opacity-75 dark:bg-white/[0.04]" />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          Phone
          <input name="phone" defaultValue={initialProfile.phone || ""} className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5" />
        </label>
        <label className="text-sm">
          Profile image URL
          <input name="image" defaultValue={initialProfile.image || ""} className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5" />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          Address line 1
          <input name="addressLine1" defaultValue={initialProfile.addressLine1 || ""} className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5" />
        </label>
        <label className="text-sm">
          Address line 2
          <input name="addressLine2" defaultValue={initialProfile.addressLine2 || ""} className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5" />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          City
          <input name="city" defaultValue={initialProfile.city || ""} className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5" />
        </label>
        <label className="text-sm">
          Country
          <input name="country" defaultValue={initialProfile.country || ""} className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5" />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          Preferred payment method
          <select name="preferredPaymentMethod" defaultValue={initialProfile.preferredPaymentMethod || ""} className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5">
            <option value="">Choose later</option>
            <option value="CARD">Card</option>
            <option value="MPESA">M-Pesa</option>
          </select>
        </label>
        <label className="text-sm">
          Preferred delivery option
          <select name="preferredFulfillmentMethod" defaultValue={initialProfile.preferredFulfillmentMethod || ""} className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5">
            <option value="">Choose later</option>
            <option value="DELIVERY">Delivery</option>
            <option value="PICKUP">Pickup</option>
          </select>
        </label>
      </div>

      <button disabled={loading} className="rounded-lg bg-black px-4 py-2.5 text-white hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black">
        {loading ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
