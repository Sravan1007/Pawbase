import { getAccessiblePets } from "@/lib/pets";
import GroomingForm from "./GroomingForm";
import { tiers } from "./tiers";

export default async function GroomingPage() {
  const pets = await getAccessiblePets();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="page-title">Pet Grooming</h1>
        <p className="page-subtitle">
          Bath, trim, and spa services — pick a tier and book a slot for your pet.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {tiers.map((t) => (
          <div key={t.id} className="card-compact">
            <div className="flex items-baseline justify-between">
              <p className="font-semibold text-stone-900">{t.name}</p>
              <p className="font-semibold text-[var(--accent)]">{t.price}</p>
            </div>
            <p className="mt-1 text-sm text-stone-500">{t.desc}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="section-title mb-4">Book grooming</h2>
        <GroomingForm pets={pets} />
      </section>
    </div>
  );
}
