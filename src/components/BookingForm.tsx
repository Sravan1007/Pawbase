"use client";

import { useState } from "react";
import type { OwnedPet } from "@/lib/pets";
import type { VetListing } from "@/lib/vets";
import { createPetInline } from "@/app/(app)/pets/new/actions";

const commonSpecies = ["Dog", "Cat", "Bird", "Rabbit", "Other"];

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
      await action(new FormData(form));
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
