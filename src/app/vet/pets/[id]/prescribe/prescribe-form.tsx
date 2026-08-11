"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { createPrescription } from "./actions";

export default function PrescribeForm({ petId }: { petId: string }) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [dose, setDose] = useState("");
  const [schedule, setSchedule] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!photo) {
      setError("A photo of the medication is required.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const path = `${petId}/${Date.now()}-${photo.name}`;
      const { error: uploadError } = await supabase.storage
        .from("medication-photos")
        .upload(path, photo);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("medication-photos").getPublicUrl(path);

      await createPrescription(petId, { photoUrl: publicUrl, dose, schedule });
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : "Could not save prescription");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
      <label className="field-label">
        Photo of the prescribed medication
        <input
          type="file"
          accept="image/*"
          required
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          className="mt-1 block w-full text-sm text-stone-600"
        />
      </label>
      <label className="field-label">
        Dose
        <input
          placeholder="e.g. 1 tablet, 5mg"
          required
          value={dose}
          onChange={(e) => setDose(e.target.value)}
          className="input"
        />
      </label>
      <label className="field-label">
        Schedule
        <input
          placeholder="e.g. Twice daily with food"
          required
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          className="input"
        />
      </label>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <button type="submit" disabled={submitting} className="btn-primary self-start">
        {submitting ? "Saving..." : "Send to owner for review"}
      </button>
    </form>
  );
}
