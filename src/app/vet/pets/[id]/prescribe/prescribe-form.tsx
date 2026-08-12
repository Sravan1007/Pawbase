"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { createPrescription } from "./actions";

export default function PrescribeForm({
  petId,
  caretakers,
}: {
  petId: string;
  caretakers: { id: string; label: string }[];
}) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [dose, setDose] = useState("");
  const [schedule, setSchedule] = useState("");
  const [doseTimes, setDoseTimes] = useState("");
  const [assignedCaretakerId, setAssignedCaretakerId] = useState("");
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

      await createPrescription(petId, {
        photoUrl: publicUrl,
        dose,
        schedule,
        doseTimes: doseTimes
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        assignedCaretakerId: assignedCaretakerId || null,
      });
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
      <label className="field-label">
        Dose times (comma-separated, 24h — optional)
        <input
          placeholder="e.g. 08:00, 20:00"
          value={doseTimes}
          onChange={(e) => setDoseTimes(e.target.value)}
          className="input"
        />
      </label>
      {caretakers.length > 0 && (
        <label className="field-label">
          Assign to a caretaker (optional — leaves it open to any caretaker if unset)
          <select
            value={assignedCaretakerId}
            onChange={(e) => setAssignedCaretakerId(e.target.value)}
            className="input"
          >
            <option value="">Any caretaker</option>
            {caretakers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <button type="submit" disabled={submitting} className="btn-primary self-start">
        {submitting ? "Saving..." : "Send to owner for review"}
      </button>
    </form>
  );
}
