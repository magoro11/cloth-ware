"use client";

import Image from "next/image";
import { FormEvent, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, X, Plus, Minus } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { useImageUpload } from "@/frontend/hooks/use-image-upload";
import { cn } from "@/backend/lib/utils";

type InitialProduct = {
  id: string;
  title: string;
  brand: string | null;
  garmentType: string | null;
  description: string;
  categoryId: string | null;
  basePrice: number;
  isPublished: boolean;
  isFeatured: boolean;
  variants: Array<{
    id: string;
    sku: string;
    size: string;
    color: string | null;
    fabric: string | null;
    price: number | null;
    stock: number;
    isActive: boolean;
  }>;
  images: { url: string; sortOrder: number }[];
};

type VariantForm = {
  id?: string;
  sku: string;
  size: string;
  color: string;
  fabric: string;
  price: string;
  stock: string;
  isActive: boolean;
};

export function ListProductForm({ initialProduct }: { initialProduct?: InitialProduct }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [variants, setVariants] = useState<VariantForm[]>([]);

  const { images, addFiles, removeImage, addManualUrl, urls, isUploading } =
    useImageUpload(
      initialProduct?.images.map((img) => img.url) ?? [],
      { maxFiles: 10 },
    );

  // Initialize variants from product
  if (initialProduct && variants.length === 0) {
    setVariants(
      initialProduct.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        size: v.size,
        color: v.color || "",
        fabric: v.fabric || "",
        price: v.price?.toString() || "",
        stock: v.stock.toString(),
        isActive: v.isActive,
      }))
    );
  }

  // Add default variant if empty
  if (variants.length === 0) {
    setVariants([{ sku: "", size: "M", color: "", fabric: "", price: "", stock: "0", isActive: true }]);
  }

  function addVariant() {
    setVariants([...variants, { sku: "", size: "M", color: "", fabric: "", price: "", stock: "0", isActive: true }]);
  }

  function removeVariant(index: number) {
    if (variants.length <= 1) return;
    setVariants(variants.filter((_, i) => i !== index));
  }

  function updateVariant(index: number, field: keyof VariantForm, value: string | boolean) {
    setVariants(variants.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  }

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

    // Validate variants
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.sku.trim()) {
        setStatus({ ok: false, message: `Variant ${i + 1}: SKU is required` });
        return;
      }
      if (!v.size.trim()) {
        setStatus({ ok: false, message: `Variant ${i + 1}: Size is required` });
        return;
      }
      if (!v.price || Number(v.price) < 0) {
        setStatus({ ok: false, message: `Variant ${i + 1}: Valid price is required` });
        return;
      }
      if (!v.stock || Number(v.stock) < 0) {
        setStatus({ ok: false, message: `Variant ${i + 1}: Valid stock is required` });
        return;
      }
    }

    const form = new FormData(event.currentTarget);
    const payload = {
      title: String(form.get("title")),
      brand: String(form.get("brand")),
      garmentType: String(form.get("garmentType")) || null,
      description: String(form.get("description")),
      categoryId: String(form.get("categoryId")) || null,
      basePrice: Number(form.get("basePrice")),
      isPublished: form.get("isPublished") === "on",
      isFeatured: form.get("isFeatured") === "on",
      images: urls,
      variants: variants.map((v) => ({
        id: v.id,
        sku: v.sku.trim(),
        size: v.size.trim(),
        color: v.color.trim() || null,
        fabric: v.fabric.trim() || null,
        price: v.price ? Number(v.price) : null,
        stock: Number(v.stock),
        isActive: v.isActive,
      })),
    };

    setLoading(true);
    setStatus(null);

    const res = await fetch(
      initialProduct ? `/api/products/${initialProduct.id}` : "/api/products",
      {
        method: initialProduct ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setStatus({
        ok: true,
        message: initialProduct
          ? "Product updated successfully."
          : "Product created! It will appear in the marketplace after approval.",
      });
      if (!initialProduct) event.currentTarget.reset();
    } else {
      setStatus({ ok: false, message: data.error || "Unable to save product." });
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
          {initialProduct ? "Edit product" : "List new product"}
        </h1>
        <p className="mt-1 text-sm opacity-70">
          {initialProduct
            ? "Update the product details."
            : "New products go live after admin approval."}
        </p>
      </div>

      {/* ── Images ── */}
      <fieldset className="grid gap-3">
        <legend className="text-sm font-medium">
          Photos <span className="opacity-50">(up to 10)</span>
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
            images.length >= 10 && "pointer-events-none opacity-50",
          )}
        >
          <ImagePlus className="size-7 opacity-50" />
          <span className="font-medium">Click or drag & drop photos here</span>
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

                {img.uploading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Loader2 className="size-5 animate-spin text-white" />
                  </div>
                ) : null}

                {img.error ? (
                  <div title={img.error} className="absolute inset-0 flex items-center justify-center bg-rose-600/70 text-xs text-white">
                    <X className="size-5" />
                  </div>
                ) : null}

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

      {/* ── Basic Details ── */}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          Title
          <input
            name="title"
            defaultValue={initialProduct?.title}
            required
            className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5"
            placeholder="e.g. Classic Cotton T-Shirt"
          />
        </label>
        <label className="text-sm">
          Brand
          <input
            name="brand"
            defaultValue={initialProduct?.brand ?? ""}
            required
            className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5"
            placeholder="e.g. Nike"
          />
        </label>
        <label className="text-sm">
          Garment Type
          <input
            name="garmentType"
            defaultValue={initialProduct?.garmentType ?? ""}
            required
            className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5"
            placeholder="e.g. Dress, Shirt, Jeans, Coat"
          />
        </label>
      </div>

      <label className="text-sm">
        Description
        <textarea
          name="description"
          defaultValue={initialProduct?.description}
          required
          minLength={20}
          rows={4}
          className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5"
          placeholder="Describe the product, materials, fit, and features (min 20 characters)"
        />
      </label>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm">
          Category
          <select
            name="categoryId"
            defaultValue={initialProduct?.categoryId || ""}
            className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5"
          >
            <option value="" disabled>
              Select category (optional)
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          Base Price (KES)
          <input
            type="number"
            name="basePrice"
            defaultValue={initialProduct?.basePrice}
            min={0}
            required
            className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5"
            placeholder="Default price for variants without override"
          />
        </label>

        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              name="isPublished"
              type="checkbox"
              defaultChecked={initialProduct?.isPublished ?? true}
              className="rounded border-black/15" />
            Published
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              name="isFeatured"
              type="checkbox"
              defaultChecked={initialProduct?.isFeatured ?? false}
              className="rounded border-black/15" />
            Featured
          </label>
        </div>
      </div>

      {/* ── Variants ── */}
      <fieldset className="grid gap-3">
        <legend className="flex items-center justify-between text-sm font-medium">
          Product Variants
          <button type="button" onClick={addVariant} className="flex items-center gap-1 text-xs text-[#c25e30] hover:underline">
            <Plus className="size-3" /> Add variant
          </button>
        </legend>

        <div className="space-y-3">
          {variants.map((variant, idx) => (
            <div key={variant.id || idx} className="rounded-xl border border-black/10 p-4 dark:border-white/10">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">Variant {idx + 1}</span>
                {variants.length > 1 && (
                  <button type="button" onClick={() => removeVariant(idx)} className="text-red-500 hover:opacity-70 text-sm">
                    Remove
                  </button>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <label className="text-sm">
                  SKU
                  <input
                    value={variant.sku}
                    onChange={(e) => updateVariant(idx, "sku", e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5"
                    placeholder="e.g. CTS-BLK-M"
                  />
                </label>

                <label className="text-sm">
                  Size
                  <input
                    value={variant.size}
                    onChange={(e) => updateVariant(idx, "size", e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5"
                    placeholder="e.g. M, L, XL, 32, 34"
                  />
                </label>

                  <label className="text-sm">
                    Color (optional)
                    <input
                      value={variant.color}
                      onChange={(e) => updateVariant(idx, "color", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5"
                      placeholder="e.g. Black, Navy, Red"
                    />
                  </label>

                  <label className="text-sm">
                    Fabric (optional)
                    <input
                      value={variant.fabric}
                      onChange={(e) => updateVariant(idx, "fabric", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5"
                      placeholder="e.g. Cotton, Silk, Denim"
                    />
                  </label>

                <div className="md:col-span-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={variant.isActive}
                      onChange={(e) => updateVariant(idx, "isActive", e.target.checked)}
                      className="rounded border-black/15" />
                    Active
                  </label>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 mt-3">
                <label className="text-sm">
                  Price (KES) <span className="opacity-50">(optional - uses base price)</span>
                  <input
                    type="number"
                    value={variant.price}
                    onChange={(e) => updateVariant(idx, "price", e.target.value)}
                    min={0}
                    step="1"
                    className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5"
                    placeholder="Leave blank for base price"
                  />
                </label>

                <label className="text-sm">
                  Stock
                  <input
                    type="number"
                    value={variant.stock}
                    onChange={(e) => updateVariant(idx, "stock", e.target.value)}
                    min={0}
                    required
                    className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2.5"
                    placeholder="e.g. 50"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
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
          : initialProduct
          ? "Save product"
          : "Publish product"}
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