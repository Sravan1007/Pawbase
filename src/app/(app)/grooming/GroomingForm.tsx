"use client";

import Link from "next/link";
import { useState } from "react";
import type { OwnedPet } from "@/lib/pets";
import { bookGrooming } from "./actions";
import { tiers } from "./tiers";

export default function GroomingForm({ pets }: { pets: OwnedPet[] }) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = e.currentTarget;
    try {
      await bookGrooming(new FormData(form));
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
        Service
        <select name="service" required className="input">
          {tiers.map((t) => (
            <option key={t.id} value={t.name}>
              {t.name} — {t.price}
            </option>
          ))}
        </select>
      </label>
      <label className="field-label">
        Notes for the groomer (optional)
        <textarea name="notes" rows={2} className="input" />
      </label>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      {done && <p className="text-sm text-[var(--success)]">Booked — you&apos;ll get a confirmation shortly.</p>}
      <button type="submit" disabled={submitting} className="btn-primary self-start">
        {submitting ? "Booking..." : "Book grooming"}
      </button>
    </form>
  );
}
