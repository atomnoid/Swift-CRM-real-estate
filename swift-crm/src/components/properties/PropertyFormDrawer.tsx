"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Drawer } from "@/components/ui/Drawer";
import { isNonNegativeNumber } from "@/lib/utils";
import type { Property, PropertyType, Furnishing, PropertyStatus } from "@/lib/types";

const PROPERTY_TYPES = ["Apartment", "Villa", "Plot", "Commercial", "Office", "Shop", "Other"];
const STATUSES = ["AVAILABLE", "HOLD", "SOLD", "RENTED"];
const FURNISHING = ["Fully Furnished", "Semi Furnished", "Unfurnished"];

export function PropertyFormDrawer({
  open,
  onClose,
  property,
}: {
  open: boolean;
  onClose: () => void;
  property?: Property | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const isEdit = !!property;

  const [form, setForm] = useState({
    title: property?.title ?? "",
    property_type: (property?.property_type ?? "Apartment") as PropertyType,
    bhk: property?.bhk ?? "",
    location: property?.location ?? "",
    address: property?.address ?? "",
    area_sqft: property?.area_sqft?.toString() ?? "",
    price: property?.price?.toString() ?? "",
    floor: property?.floor ?? "",
    total_floors: property?.total_floors ?? "",
    furnishing: (property?.furnishing ?? "Unfurnished") as Furnishing,
    possession_status: property?.possession_status ?? "",
    status: (property?.status ?? "AVAILABLE") as PropertyStatus,
    owner_developer: property?.owner_developer ?? "",
    description: property?.description ?? "",
    notes: property?.notes ?? "",
    image_url: property?.image_url ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Title is required.";
    if (!form.location.trim()) e.location = "Location is required.";
    if (!form.price || !isNonNegativeNumber(form.price)) e.price = "Enter a valid price.";
    if (form.area_sqft && !isNonNegativeNumber(form.area_sqft)) e.area_sqft = "Invalid area.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const payload = {
      title: form.title.trim(),
      property_type: form.property_type,
      bhk: form.bhk.trim() || null,
      location: form.location.trim(),
      address: form.address.trim() || null,
      area_sqft: form.area_sqft ? Number(form.area_sqft) : null,
      price: Number(form.price),
      floor: form.floor.trim() || null,
      total_floors: form.total_floors.trim() || null,
      furnishing: form.furnishing,
      possession_status: form.possession_status.trim() || null,
      status: form.status,
      owner_developer: form.owner_developer.trim() || null,
      description: form.description.trim() || null,
      notes: form.notes.trim() || null,
      image_url: form.image_url.trim() || null,
    };

    if (isEdit && property) {
      await supabase.from("properties").update(payload).eq("id", property.id);
    } else {
      await supabase.from("properties").insert({ ...payload, user_id: user.id });
    }

    setSaving(false);
    onClose();
    router.refresh();
  }

  return (
    <Drawer open={open} onClose={onClose} title={isEdit ? "Edit Property" : "New Property"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Title *</label>
          <input className="input" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Prestige Lakeside Habitat" />
          {errors.title && <p className="field-error">{errors.title}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Property type</label>
            <select className="input" value={form.property_type} onChange={(e) => update("property_type", e.target.value as PropertyType)}>
              {PROPERTY_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">BHK</label>
            <input className="input" value={form.bhk} onChange={(e) => update("bhk", e.target.value)} placeholder="2 BHK" />
          </div>
        </div>

        <div>
          <label className="label">Location *</label>
          <input className="input" value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="Whitefield" />
          {errors.location && <p className="field-error">{errors.location}</p>}
        </div>
        <div>
          <label className="label">Address</label>
          <input className="input" value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Full address" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Area (sqft)</label>
            <input className="input" value={form.area_sqft} onChange={(e) => update("area_sqft", e.target.value)} placeholder="1200" />
            {errors.area_sqft && <p className="field-error">{errors.area_sqft}</p>}
          </div>
          <div>
            <label className="label">Price (₹) *</label>
            <input className="input" value={form.price} onChange={(e) => update("price", e.target.value)} placeholder="6500000" />
            {errors.price && <p className="field-error">{errors.price}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Floor</label>
            <input className="input" value={form.floor} onChange={(e) => update("floor", e.target.value)} placeholder="7" />
          </div>
          <div>
            <label className="label">Total floors</label>
            <input className="input" value={form.total_floors} onChange={(e) => update("total_floors", e.target.value)} placeholder="14" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Furnishing</label>
            <select className="input" value={form.furnishing} onChange={(e) => update("furnishing", e.target.value as Furnishing)}>
              {FURNISHING.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => update("status", e.target.value as PropertyStatus)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Possession status</label>
          <input className="input" value={form.possession_status} onChange={(e) => update("possession_status", e.target.value)} placeholder="Ready to Move" />
        </div>
        <div>
          <label className="label">Owner / Developer</label>
          <input className="input" value={form.owner_developer} onChange={(e) => update("owner_developer", e.target.value)} placeholder="Prestige Group" />
        </div>
        <div>
          <label className="label">Image URL</label>
          <input className="input" value={form.image_url} onChange={(e) => update("image_url", e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={3} value={form.description} onChange={(e) => update("description", e.target.value)} />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add property"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
