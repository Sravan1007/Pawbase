"use client";

import Link from "next/link";
import { useState } from "react";
import type { OwnedPet } from "@/lib/pets";
import type { VetListing } from "@/lib/vets";

export default function BookingForm({
  pets,
  vets,
  action,
  submitLabel,
}: {
  pets: OwnedPet[];
  vets: VetListing[];
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = e.currentTarget;
    try {
      await action(new FormData(form));
      setDone(true);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not book");
    } finally {
      setSubmitting(false);
    }
  }

  if (pets.length === 0) {
    return (
      <p className="empty-state">
        Add a pet first before booking — head to{" "}
        <Link href="/pets/new" className="font-medium text-[var(--accent)] hover:underline">
          Add a pet
        </Link>
        .
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
      <label className="field-label">
        Pet
        <select name="pet_id" required className="input">
          {pets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.species})
            </option>
          ))}
        </select>
      </label>
      <label className="field-label">
        Vet
        <select name="vet_id" required className="input">
          {vets.length === 0 && <option value="">No vets onboarded yet</option>}
          {vets.map((v) => (
            <option key={v.id} value={v.id}>
              {v.full_name}
              {v.clinic_name ? ` — ${v.clinic_name}` : ""}
              {v.years_experience ? ` (${v.years_experience}y exp)` : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="field-label">
        Preferred time
        <input name="scheduled_at" type="datetime-local" required className="input" />
      </label>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      {done && <p className="text-sm text-[var(--success)]">Requested — the vet will confirm shortly.</p>}
      <button type="submit" disabled={submitting || vets.length === 0} className="btn-primary self-start">
        {submitting ? "Booking..." : submitLabel}
      </button>
    </form>
  );
}
