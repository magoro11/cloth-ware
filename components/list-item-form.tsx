"use client";

import { FormEvent, useState } from "react";
import { CONDITIONS } from "@/lib/constants";

type InitialItem = {
  id: string;
  title: string;
  brand: string;
  description: string;
  category: string;
  size: string;
  condition: string;
  rentalPricePerDay: number;
  sellingPrice: number | null;
  securityDeposit: number;
  location?: string | null;
  occasion?: string | null;
  images: { url: string }[];
};

export function ListItemForm({ initialItem }: { initialItem?: InitialItem }) {
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setLoading(true);
    setStatus("");
    const form = new FormData(formElement);
    const payload = {
      title: String(form.get("title")),
      brand: String(form.get("brand")),
      description: String(form.get("description")),
      category: String(form.get("category")),
      size: String(form.get("size")),
      condition: String(form.get("condition")),
      rentalPricePerDay: Number(form.get("rentalPricePerDay")),
      sellingPrice: form.get("sellingPrice") ? Number(form.get("sellingPrice")) : null,
      securityDeposit: Number(form.get("securityDeposit")),
      location: String(form.get("location") || ""),
      occasion: String(form.get("occasion") || ""),
      images: String(form.get("images"))
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    };

    const res = await fetch(initialItem ? `/api/items/${initialItem.id}` : "/api/items", {
      method: initialItem ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    setStatus(res.ok ? (initialItem ? "Listing updated successfully." : "Item listed successfully.") : data.error || "Unable to save item.");
    if (res.ok && !initialItem) formElement.reset();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl border border-black/10 p-5 dark:border-white/10">
      <h1 className="font-serif text-3xl">{initialItem ? "Edit listing" : "List your branded item"}</h1>
      <p className="text-sm opacity-75">
        {initialItem
          ? "Update the item details your renters will see."
          : "New listings require admin approval before appearing in the public marketplace."}
      </p>
      <input name="title" defaultValue={initialItem?.title} className="rounded-lg border border-black/15 bg-transparent p-2.5" placeholder="Title" required />
      <input name="brand" defaultValue={initialItem?.brand} className="rounded-lg border border-black/15 bg-transparent p-2.5" placeholder="Brand" required />
      <textarea
        name="description"
        defaultValue={initialItem?.description}
        className="min-h-28 rounded-lg border border-black/15 bg-transparent p-2.5"
        placeholder="Detailed description (at least 20 characters)"
        minLength={20}
        required
      />
      <div className="grid gap-3 md:grid-cols-2">
        <input name="category" defaultValue={initialItem?.category} className="rounded-lg border border-black/15 bg-transparent p-2.5" placeholder="Category (Dress, Suit...)" required />
        <input name="size" defaultValue={initialItem?.size} className="rounded-lg border border-black/15 bg-transparent p-2.5" placeholder="Size (XS, S, M...)" required />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <select name="condition" className="rounded-lg border border-black/15 bg-transparent p-2.5" defaultValue={initialItem?.condition || "EXCELLENT"}>
          {CONDITIONS.map((condition) => (
            <option key={condition} value={condition}>
              {condition}
            </option>
          ))}
        </select>
        <input name="images" defaultValue={initialItem?.images.map((image) => image.url).join(", ")} className="rounded-lg border border-black/15 bg-transparent p-2.5" placeholder="Image URLs (comma separated)" required />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <input name="location" defaultValue={initialItem?.location || ""} className="rounded-lg border border-black/15 bg-transparent p-2.5" placeholder="Location (city or neighborhood)" />
        <input name="occasion" defaultValue={initialItem?.occasion || ""} className="rounded-lg border border-black/15 bg-transparent p-2.5" placeholder="Occasion (Wedding, Party, Office)" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <input type="number" min={100} name="rentalPricePerDay" defaultValue={initialItem?.rentalPricePerDay} className="rounded-lg border border-black/15 bg-transparent p-2.5" placeholder="Rental/day cents" required />
        <input type="number" min={100} name="sellingPrice" defaultValue={initialItem?.sellingPrice ?? ""} className="rounded-lg border border-black/15 bg-transparent p-2.5" placeholder="Selling price cents (optional)" />
        <input type="number" min={100} name="securityDeposit" defaultValue={initialItem?.securityDeposit} className="rounded-lg border border-black/15 bg-transparent p-2.5" placeholder="Deposit cents" required />
      </div>
      <button
        disabled={loading}
        className="rounded-lg bg-black px-4 py-2.5 text-white transition hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {loading ? "Saving..." : initialItem ? "Save listing" : "Publish listing"}
      </button>
      {status ? <p className="text-sm opacity-80">{status}</p> : null}
    </form>
  );
}
