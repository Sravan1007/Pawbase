import Link from "next/link";
import { createPet } from "./actions";

const commonSpecies = ["Dog", "Cat", "Bird", "Rabbit", "Other"];

export default async function NewPetPage({
  searchParams,
}: {
  searchParams: Promise<{ onboarding?: string }>;
}) {
  const { onboarding } = await searchParams;
  const isOnboarding = onboarding === "1";

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="page-title">
          {isOnboarding ? "Let's add your pet 🐾" : "Add a pet"}
        </h1>
        <p className="page-subtitle">
          {isOnboarding
            ? "Just the basics for now — you can upload vaccination records and other documents right after."
            : "Add another pet to your account."}
        </p>
      </div>
      <form action={createPet} className="card flex flex-col gap-4">
        <label className="field-label">
          Name
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
          Breed
          <input name="breed" placeholder="e.g. Golden Retriever" className="input" />
        </label>
        <label className="field-label">
          Date of birth
          <input name="dob" type="date" className="input" />
        </label>
        <label className="field-label">
          Critical medical info (allergies, conditions)
          <textarea
            name="medical_notes"
            rows={3}
            placeholder="Shown on the public QR emergency page"
            className="input"
          />
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary">
            {isOnboarding ? "Create pet & continue" : "Create pet"}
          </button>
          {isOnboarding && (
            <Link href="/dashboard" className="btn-ghost">
              Skip for now
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
