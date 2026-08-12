"use client";

import { useState } from "react";
import type { OwnedPet } from "@/lib/pets";
import { bookGrooming } from "./actions";
import { tiers } from "./tiers";
import { createPetInline } from "@/app/(app)/pets/new/actions";

const commonSpecies = ["Dog", "Cat", "Bird", "Rabbit", "Other"];

export default function GroomingForm({ pets }: { pets: OwnedPet[] }) {
  const [localPets, setLocalPets] = useState(pets);
  const [addingPet, setAddingPet] = useState(false);
  const [petError, setPetError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAddPet(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddingPet(true);
    setPetError(null);
    const form = e.currentTarget;
    try {
      const newPet = await createPetInline(new FormData(form));
      setLocalPets((prev) => [...prev, newPet as OwnedPet]);
      form.reset();
    } catch (err) {
      setPetError(err instanceof Error ? err.message : "Could not add pet");
    } finally {
      setAddingPet(false);
    }
  }

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

  if (localPets.length === 0) {
    return (
      <form onSubmit={handleAddPet} className="card flex flex-col gap-4">
        <p className="text-sm text-stone-600">
          Add your pet to book — takes a few seconds, and you can fill in the rest later.
        </p>
        <label className="field-label">
          Pet name
          <input name="name" required placeholder="Biscuit" className="input" />
        </label>
        <label className="field-label">
          Species
          <select name="species" required defaultValue="" className="input">
            <option value="" disabled>
              Choose one
            </option>
            {commonSpecies.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Breed (optional)
          <input name="breed" placeholder="e.g. Golden Retriever" className="input" />
        </label>
        {petError && <p className="text-sm text-[var(--danger)]">{petError}</p>}
        <button type="submit" disabled={addingPet} className="btn-primary self-start">
          {addingPet ? "Adding..." : "Add pet & continue"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
      <label className="field-label">
        Pet
        <select name="pet_id" required className="input">
          {localPets.map((p) => (
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
