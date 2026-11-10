"use client";

import { useState } from "react";
import { listAddresses, createAddress, updateAddress, deleteAddress } from "@/backend/actions/address.actions";
import { formatCurrency } from "@/backend/lib/utils";
import { Plus, Trash2, Edit3, MapPin, Home, ChevronRight } from "lucide-react";

interface Address {
  id: string;
  label: string;
  name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  county: string;
  town: string | null;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    label: string;
    name: string;
    phone: string;
    line1: string;
    line2: string;
    city: string;
    county: string;
    town: string;
    postalCode: string;
    isDefault: boolean;
    country: string;
  }>({
    label: "home",
    name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    county: "",
    town: "",
    postalCode: "",
    isDefault: false,
    country: "KE",
  });

  async function load() {
    try {
      setLoading(true);
      const res = await listAddresses();
      setAddresses(res.addresses ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load addresses");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingId) {
        await updateAddress({ id: editingId, ...formData });
      } else {
        await createAddress(formData);
      }
      setOpen(false);
      setFormData({
        label: "home",
        name: "",
        phone: "",
        line1: "",
        line2: "",
        city: "",
        county: "",
        town: "",
        postalCode: "",
        isDefault: false,
        country: "KE",
      });
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to save address");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this address?")) return;
    try {
      await deleteAddress({ id });
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete address");
    }
  }

  async function handleSetDefault(id: string) {
    try {
      await updateAddress({ id, isDefault: true });
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to set default address");
    }
  }

  const labelIcons: Record<string, any> = { home: Home, work: Home };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black dark:text-white">Saved Addresses</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Manage your delivery addresses across Kenya
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ label: "home", name: "", phone: "", line1: "", line2: "", city: "", county: "", town: "", postalCode: "", isDefault: false, country: "KE" });
            setOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-[#F68B1E] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#e07d18]"
        >
          <Plus className="size-4" /> Add Address
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-64 flex items-center justify-center">Loading...</div>
      ) : addresses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 p-12 text-center dark:border-white/20">
          <p className="text-black/60 dark:text-white/60">No saved addresses</p>
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.map((addr) => (
            <div key={addr.id} className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-[#151822]">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                      addr.isDefault ? "bg-[#059669]/10 text-[#059669]" : "bg-black/5 text-black/60 dark:bg-white/5 dark:text-white/60"
                    }`}>
                      {addr.isDefault ? "Default" : addr.label}
                    </span>
                    {addr.label === "home" && <Home className="size-4" fill="#059669" />}
                    {addr.label === "work" && <Home className="size-4" fill="#059669" />}
                  </div>
                  <p className="text-sm font-medium text-black dark:text-white">{addr.name}</p>
                  <p className="text-sm text-black/70 dark:text-white/70">
                    {addr.line1} {addr.line2 ? addr.line2 + ", " : ""}{addr.city}, {addr.county}
                    {addr.town ? addr.town + ", " : ""}{addr.postalCode ? addr.postalCode + ", " : ""}
                  </p>
                  <p className="text-sm text-black/70 dark:text-white/70 mt-1">
                    <MapPin className="size-3.5 inline mr-1" /> {addr.phone}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  {addr.isDefault ? null : (
                    <button
                      onClick={() => handleSetDefault(addr.id)}
                      className="text-xs font-medium text-[#059669] hover:underline"
                    >
                      Set as Default
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditingId(addr.id);
                      setFormData({
                        label: addr.label,
                        name: addr.name,
                        phone: addr.phone,
                        line1: addr.line1,
                        line2: addr.line2 ?? "",
                        city: addr.city,
                        county: addr.county,
                        town: addr.town ?? "",
                        postalCode: addr.postalCode ?? "",
                        isDefault: addr.isDefault,
                        country: addr.country,
                      });
                      setOpen(true);
                    }}
                    className="text-xs font-medium text-[#c25e30] hover:underline"
                  >
                    Edit
                  </button>
                  {!addr.isDefault && (
                    <button
                      onClick={() => handleDelete(addr.id)}
                      className="text-xs font-medium text-[#dc2626] hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center" aria-hidden={!open ? "true" : "false"}>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
        <div className="relative bg-white p-6 rounded-2xl shadow-xl dark:bg-[#151822] w-full max-w-md mx-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-black dark:text-white">{editingId ? "Edit Address" : "Add Address"}</h2>
            <button onClick={() => setOpen(false)} className="text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white">
              <ChevronRight className="size-5 rotate-90" />
            </button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4">
              <div>
                <label className="block text-xs font-semibold text-black/60 dark:text-white/60 mb-1">
                  Label
                </label>
                <select
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
                >
                  <option value="home">Home</option>
                  <option value="work">Work</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-black/60 dark:text-white/60 mb-1">
                  Full Name
                </label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-black/60 dark:text-white/60 mb-1">
                  Phone
                </label>
                <input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0712345678"
                  className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-black/60 dark:text-white/60 mb-1">
                  Street Address
                </label>
                <input
                  value={formData.line1}
                  onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                  placeholder="Koinange Street"
                  className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-black/60 dark:text-white/60 mb-1">
                  Apartment/Suite (optional)
                </label>
                <input
                  value={formData.line2}
                  onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
                  placeholder="Flat 4B"
                  className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
                />
              </div>
              <div className="grid gap-4">
                <div>
                  <label className="block text-xs font-semibold text-black/60 dark:text-white/60 mb-1">
                    City
                  </label>
                  <input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Nairobi"
                    className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-black/60 dark:text-white/60 mb-1">
                    County
                  </label>
                  <input
                    value={formData.county}
                    onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                    placeholder="Nairobi"
                    className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4">
                <div>
                  <label className="block text-xs font-semibold text-black/60 dark:text-white/60 mb-1">
                    Town (optional)
                  </label>
                  <input
                    value={formData.town}
                    onChange={(e) => setFormData({ ...formData, town: e.target.value })}
                    placeholder="Westlands"
                    className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-black/60 dark:text-white/60 mb-1">
                    Postal Code (optional)
                  </label>
                  <input
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    placeholder="00100"
                    className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="rounded border-black/15 bg-[#F68B1E] text-[#F68B1E] focus:ring-0"
                />
                <label htmlFor="isDefault" className="text-sm text-black/70 dark:text-white/70">
                  Set as default address
                </label>
              </div>
            </div>
            <div className="mt-6 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-lg border border-black/15 px-4 py-2.5 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-full bg-[#F68B1E] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#e07d18]"
              >
                Save Address
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
