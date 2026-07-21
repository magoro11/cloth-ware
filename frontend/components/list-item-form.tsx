"use client";

import Image from "next/image";
import { FormEvent, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { CONDITIONS, CATEGORIES, EVENT_TYPES } from "@/lib/constants";
import { useImageUpload } from "@/frontend/hooks/use-image-upload";
import { cn } from "@/backend/lib/utils";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const { images, addFiles, removeImage, addManualUrl, urls, isUploading } =
    useImageUpload(
      initialItem?.images.map((img) => img.url) ?? [],
      { maxFiles: 8 },
    );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (urls.length === 0) {
      setStatus({ ok: false, message: "Please add at least one image." });
      return;
    }
    if (isUploading) {
      setStatus({ ok: false, message: "Please wait for images to finish uploading." });
      return;
    }

    const form = new FormData(event.currentTarget);
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
      images: urls,
    };

    setLoading(true);
    setStatus(null);

    const res = await fetch(
      initialItem ? `/api/items/${initialItem.id}` : "/api/items",
      {
        method: initialItem ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setStatus({
        ok: true,
        message: initialItem
          ? "Listing updated successfully."
          : "Item listed! It will appear in the marketplace after admin approval.",
      });
      if (!initialItem) event.currentTarget.reset();
    } else {
      setStatus({ ok: false, message: data.error || "Unable to save item." });
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }

  function handleManualAdd() {
    if (!manualUrl.trim()) return;
    addManualUrl(manualUrl.trim());
    setManualUrl("");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-5 rounded-2xl border border-black/10 p-6 dark:border-white/10"
    >
      <div>
        <h1 className="font-serif text-3xl">
          {initialItem ? "Edit listing" : "List your item"}
        </h1>
        <p className="mt-1 text-sm opacity-70">
          {initialItem
            ? "Update the details renters will see."
            : "New listings go live after admin approval."}
        </p>
      </div>

      {/* ── Images ── */}
      <fieldset className="grid gap-3">
        <legend className="text-sm font-medium">
          Photos <span className="opacity-50">(up to 8)</span>
        </legend>

        {/* Drop zone */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload images"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-sm transition",
            dragOver
              ? "border-[#b97834] bg-[#b97834]/5"
              : "border-black/20 hover:border-black/40 dark:border-white/20 dark:hover:border-white/40",
            images.length >= 8 && "pointer-events-none opacity-50",
          )}
        >
          <ImagePlus className="size-7 opacity-50" />
          <span className="font-medium">Click or drag &amp; drop photos here</span>
          <span className="opacity-60">JPEG, PNG, WebP or GIF · max 5 MB each</span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="sr-only"
          onChange={handleFileChange}
          aria-hidden="true"
        />

        {/* Thumbnails */}
        {images.length > 0 ? (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {images.map((img, idx) => (
              <div
                key={img.preview}
                className="group relative aspect-square overflow-hidden rounded-lg border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5"
              >
                {img.preview ? (
                  <Image
                    src={img.preview}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : null}

                {/* Uploading overlay */}
                {img.uploading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Loader2 className="size-5 animate-spin text-white" />
                  </div>
                ) : null}

                {/* Error overlay */}
                {img.error ? (
                  <div
                    title={img.error}
                    className="absolute inset-0 flex items-center justify-center bg-rose-600/70 text-xs text-white"
                  >
                    <X className="size-5" />
                  </div>
                ) : null}

                {/* Remove button */}
                {!img.uploading ? (
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    aria-label="Remove image"
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                  >
                    <Trash2 className="size-3" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {/* Manual URL fallback */}
        <div className="flex gap-2">
          <input
            type="url"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleManualAdd())}
            placeholder="Or paste an image URL and press Add"
            className="flex-1 rounded-lg border border-black/15 bg-transparent p-2 text-sm dark:border-white/20"
          />
          <button
            type="button"
            onClick={handleManualAdd}
            disabled={!manualUrl.trim()}
            className="rounded-lg border border-black/15 px-3 py-2 text-sm hover:bg-black/5 disabled:opacity-40 dark:border-white/20 dark:hover:bg-white/10"
          >
            Add
          </button>
        </div>
      </fieldset>

      {/* ── Details ── */}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          Title
          <input
            name="title"
            defaultValue={initialItem?.title}
            required
            className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5"
            placeholder="e.g. Floral midi dress"
          />
        </label>
        <label className="text-sm">
          Brand
          <input
            name="brand"
            defaultValue={initialItem?.brand}
            required
            className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5"
            placeholder="e.g. Zara"
          />
        </label>
      </div>

      <label className="text-sm">
        Description
        <textarea
          name="description"
          defaultValue={initialItem?.description}
          required
          minLength={20}
          rows={4}
          className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5"
          placeholder="Describe fit, fabric, colour, and any notable details (min 20 characters)"
        />
      </label>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm">
          Category
          <select
            name="category"
            defaultValue={initialItem?.category ?? ""}
            required
            className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5"
          >
            <option value="" disabled>
              Select category
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          Size
          <input
            name="size"
            defaultValue={initialItem?.size}
            required
            className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5"
            placeholder="XS / S / M / L / UK10…"
          />
        </label>

        <label className="text-sm">
          Condition
          <select
            name="condition"
            defaultValue={initialItem?.condition ?? "EXCELLENT"}
            className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5"
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          Location
          <input
            name="location"
            defaultValue={initialItem?.location ?? ""}
            className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5"
            placeholder="City or neighbourhood"
          />
        </label>
        <label className="text-sm">
          Occasion
          <select
            name="occasion"
            defaultValue={initialItem?.occasion ?? ""}
            className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5"
          >
            <option value="">Any occasion</option>
            {EVENT_TYPES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ── Pricing ── */}
      <fieldset className="grid gap-3 rounded-xl border border-black/10 p-4 dark:border-white/10 md:grid-cols-3">
        <legend className="px-1 text-sm font-medium">Pricing (in cents / lowest unit)</legend>
        <label className="text-sm">
          Rental price / day
          <input
            type="number"
            name="rentalPricePerDay"
            defaultValue={initialItem?.rentalPricePerDay}
            min={100}
            required
            className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5"
            placeholder="e.g. 500 = KES 5"
          />
        </label>
        <label className="text-sm">
          Security deposit
          <input
            type="number"
            name="securityDeposit"
            defaultValue={initialItem?.securityDeposit}
            min={100}
            required
            className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5"
            placeholder="e.g. 2000"
          />
        </label>
        <label className="text-sm">
          Selling price{" "}
          <span className="opacity-50">(optional)</span>
          <input
            type="number"
            name="sellingPrice"
            defaultValue={initialItem?.sellingPrice ?? ""}
            min={100}
            className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5"
            placeholder="Leave blank to rent-only"
          />
        </label>
      </fieldset>

      <button
        type="submit"
        disabled={loading || isUploading}
        className="rounded-lg bg-black px-4 py-2.5 text-white transition hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {isUploading
          ? "Uploading images…"
          : loading
          ? "Saving…"
          : initialItem
          ? "Save listing"
          : "Publish listing"}
      </button>

      {status ? (
        <p
          className={cn(
            "rounded-lg border p-3 text-sm",
            status.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300"
              : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300",
          )}
        >
          {status.message}
        </p>
      ) : null}
    </form>
  );
}
