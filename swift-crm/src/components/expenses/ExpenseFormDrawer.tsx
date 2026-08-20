"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Drawer } from "@/components/ui/Drawer";
import { isNonNegativeNumber, todayISO } from "@/lib/utils";
import type { ExpenseCategory } from "@/lib/types";

const CATEGORIES = ["Advertising", "Travel", "Office", "Marketing", "Brokerage", "Salary", "Other"];

export function ExpenseFormDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    title: "",
    category: "Advertising" as ExpenseCategory,
    amount: "",
    expense_date: todayISO(),
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.title.trim()) return setError("Title is required.");
    if (!form.amount || !isNonNegativeNumber(form.amount)) return setError("Enter a valid amount.");

    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("expenses").insert({
      user_id: user.id,
      title: form.title.trim(),
      category: form.category,
      amount: Number(form.amount),
      expense_date: form.expense_date,
      notes: form.notes.trim() || null,
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setForm({ title: "", category: "Advertising", amount: "", expense_date: todayISO(), notes: "" });
    onClose();
    router.refresh();
  }

  return (
    <Drawer open={open} onClose={onClose} title="New Expense">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Title *</label>
          <input className="input" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Instagram lead ads" />
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={form.category} onChange={(e) => update("category", e.target.value as ExpenseCategory)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Amount (₹) *</label>
            <input className="input" value={form.amount} onChange={(e) => update("amount", e.target.value)} placeholder="5000" />
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={form.expense_date} onChange={(e) => update("expense_date", e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
        </div>

        {error && <p className="field-error">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? "Saving…" : "Add expense"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
