"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Drawer } from "@/components/ui/Drawer";
import { isValidPhone, isValidEmail, isNonNegativeNumber } from "@/lib/utils";
import type { Lead, LeadSource, LeadStatus, PropertyType } from "@/lib/types";

const SOURCES = ["Website", "Instagram", "Facebook", "WhatsApp", "Referral", "Walk-in", "Call", "Other"];
const PROPERTY_TYPES = ["Apartment", "Villa", "Plot", "Commercial", "Office", "Shop", "Other"];
const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "SITE_VISIT", "NEGOTIATION", "WON", "LOST"];

export function LeadFormDrawer({
  open,
  onClose,
  lead,
}: {
  open: boolean;
  onClose: () => void;
  lead?: Lead | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const isEdit = !!lead;

  const [form, setForm] = useState({
    full_name: lead?.full_name ?? "",
    phone: lead?.phone ?? "",
    email: lead?.email ?? "",
    source: (lead?.source ?? "Website") as LeadSource,
    property_type: (lead?.property_type ?? "Apartment") as PropertyType,
    bhk: lead?.bhk ?? "",
    preferred_location: lead?.preferred_location ?? "",
    min_budget: lead?.min_budget?.toString() ?? "",
    max_budget: lead?.max_budget?.toString() ?? "",
    notes: lead?.notes ?? "",
    status: (lead?.status ?? "NEW") as LeadStatus,
    next_followup_date: lead?.next_followup_date ?? "",
    next_followup_time: lead?.next_followup_time ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.full_name.trim()) e.full_name = "Name is required.";
    if (!isValidPhone(form.phone)) e.phone = "Enter a valid phone number.";
    if (!isValidEmail(form.email)) e.email = "Enter a valid email.";
    if (form.min_budget && !isNonNegativeNumber(form.min_budget)) e.min_budget = "Invalid amount.";
    if (form.max_budget && !isNonNegativeNumber(form.max_budget)) e.max_budget = "Invalid amount.";
    if (
      form.min_budget &&
      form.max_budget &&
      Number(form.min_budget) > Number(form.max_budget)
    ) {
      e.max_budget = "Max budget must be greater than min budget.";
    }
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
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      source: form.source,
      property_type: form.property_type,
      bhk: form.bhk.trim() || null,
      preferred_location: form.preferred_location.trim() || null,
      min_budget: form.min_budget ? Number(form.min_budget) : null,
      max_budget: form.max_budget ? Number(form.max_budget) : null,
      notes: form.notes.trim() || null,
      status: form.status,
      next_followup_date: form.next_followup_date || null,
      next_followup_time: form.next_followup_time || null,
    };

    if (isEdit && lead) {
      const { error } = await supabase.from("leads").update(payload).eq("id", lead.id);
      if (!error) {
        if (payload.status !== lead.status) {
          await supabase.from("activities").insert({
            user_id: user.id,
            lead_id: lead.id,
            type: "status_changed",
            description: `${payload.full_name} moved to ${payload.status.replace("_", " ")}`,
          });
        }
        // If a new follow-up date was set, create a pending followup row
        if (payload.next_followup_date && payload.next_followup_date !== lead.next_followup_date) {
          await supabase.from("followups").insert({
            user_id: user.id,
            lead_id: lead.id,
            purpose: "Follow-up",
            due_date: payload.next_followup_date,
            due_time: payload.next_followup_time,
            status: "PENDING",
          });
        }
      }
    } else {
      const { data: newLead, error } = await supabase
        .from("leads")
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();
      if (!error && newLead) {
        await supabase.from("activities").insert({
          user_id: user.id,
          lead_id: newLead.id,
          type: "lead_created",
          description: `${payload.full_name} added as a new lead (${payload.source})`,
        });
        if (payload.next_followup_date) {
          await supabase.from("followups").insert({
            user_id: user.id,
            lead_id: newLead.id,
            purpose: "Initial follow-up",
            due_date: payload.next_followup_date,
            due_time: payload.next_followup_time,
            status: "PENDING",
          });
        }
      }
    }

    setSaving(false);
    onClose();
    router.refresh();
  }

  return (
    <Drawer open={open} onClose={onClose} title={isEdit ? "Edit Lead" : "New Lead"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Full name *</label>
          <input className="input" value={form.full_name} onChange={(e) => update("full_name", e.target.value)} placeholder="Rahul Sharma" />
          {errors.full_name && <p className="field-error">{errors.full_name}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Phone *</label>
            <input className="input" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+91 98765 43210" />
            {errors.phone && <p className="field-error">{errors.phone}</p>}
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="optional" />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Source</label>
            <select className="input" value={form.source} onChange={(e) => update("source", e.target.value as LeadSource)}>
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => update("status", e.target.value as LeadStatus)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </div>
        </div>

        <div className="border-t border-surface-border pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Requirement</p>
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
          <div className="mt-3">
            <label className="label">Preferred location</label>
            <input className="input" value={form.preferred_location} onChange={(e) => update("preferred_location", e.target.value)} placeholder="Whitefield" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="label">Min budget (₹)</label>
              <input className="input" value={form.min_budget} onChange={(e) => update("min_budget", e.target.value)} placeholder="5000000" />
              {errors.min_budget && <p className="field-error">{errors.min_budget}</p>}
            </div>
            <div>
              <label className="label">Max budget (₹)</label>
              <input className="input" value={form.max_budget} onChange={(e) => update("max_budget", e.target.value)} placeholder="7000000" />
              {errors.max_budget && <p className="field-error">{errors.max_budget}</p>}
            </div>
          </div>
        </div>

        <div className="border-t border-surface-border pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Next follow-up date</label>
              <input type="date" className="input" value={form.next_followup_date} onChange={(e) => update("next_followup_date", e.target.value)} />
            </div>
            <div>
              <label className="label">Time</label>
              <input type="time" className="input" value={form.next_followup_time} onChange={(e) => update("next_followup_time", e.target.value)} />
            </div>
          </div>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Anything worth remembering about this lead" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create lead"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
