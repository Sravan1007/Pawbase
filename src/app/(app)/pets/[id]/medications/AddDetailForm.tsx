"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { addMedicationDetail } from "./actions";

export function AddDetailForm({ petId, reminderId }: { petId: string; reminderId: string }) {
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [doseTimes, setDoseTimes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      let photoUrl: string | null = null;
      if (photo) {
        const supabase = createClient();
        const path = `${petId}/${Date.now()}-${photo.name}`;
        const { error: uploadError } = await supabase.storage.from("medication-photos").upload(path, photo);
        if (uploadError) throw uploadError;
        photoUrl = supabase.storage.from("medication-photos").getPublicUrl(path).data.publicUrl;
      }

      await addMedicationDetail(petId, reminderId, {
        photoUrl,
        doseTimes: doseTimes
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setOpen(false);
      setPhoto(null);
      setDoseTimes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-[var(--accent)] hover:underline">
        + Add photo / dose times
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-lg bg-stone-50 p-3">
      <label className="field-label text-xs">
        Extra photo (optional)
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          className="mt-1 block w-full text-xs text-stone-600"
        />
      </label>
      <label className="field-label text-xs">
        Dose times (comma-separated, 24h — e.g. 08:00, 20:00)
        <input value={doseTimes} onChange={(e) => setDoseTimes(e.target.value)} className="input mt-1 text-xs" />
      </label>
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={handleSave} disabled={saving} className="btn-secondary btn-sm">
          {saving ? "Saving..." : "Save"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-stone-400">
          Cancel
        </button>
      </div>
    </div>
  );
}
