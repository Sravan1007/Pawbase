import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { confirmMedicationGiven } from "../pets/[id]/medications/actions";

type Pet = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  photo_url: string | null;
  pet_code: string | null;
};

type CareItem = {
  id: string;
  dose: string;
  schedule: string;
  photo_url: string | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: ownedPets } = await supabase
    .from("pets")
    .select("id, name, species, breed, photo_url, pet_code")
    .eq("owner_id", user.id);

  const { data: accessRows } = await supabase
    .from("caretaker_access")
    .select("can_confirm_medication, pets(id, name, species, breed, photo_url, pet_code)")
    .eq("user_id", user.id)
    .eq("role", "caretaker");

  const ownedIds = new Set((ownedPets ?? []).map((p) => p.id));
  const caretakerPets = (accessRows ?? [])
    .map((row) => {
      const pet = Array.isArray(row.pets) ? row.pets[0] : row.pets;
      return pet && !ownedIds.has(pet.id) ? { pet: pet as Pet, canConfirm: row.can_confirm_medication } : null;
    })
    .filter((r): r is { pet: Pet; canConfirm: boolean } => Boolean(r));

  // Brand-new account with nothing set up yet — jump straight into onboarding.
  if ((ownedPets ?? []).length === 0 && caretakerPets.length === 0) {
    redirect("/pets/new?onboarding=1");
  }

  const caretakerPetIds = caretakerPets.map((c) => c.pet.id);
  const { data: careItems } =
    caretakerPetIds.length > 0
      ? await supabase
          .from("medication_reminders")
          .select("id, pet_id, dose, schedule, photo_url")
          .in("pet_id", caretakerPetIds)
          .not("owner_confirmed_at", "is", null)
      : { data: [] };

  const careByPet = new Map<string, CareItem[]>();
  (careItems ?? []).forEach((item) => {
    const list = careByPet.get(item.pet_id) ?? [];
    list.push(item);
    careByPet.set(item.pet_id, list);
  });

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="page-title">Your pets</h1>
          <Link href="/pets/new" className="btn-primary btn-sm">
            + Add pet
          </Link>
        </div>

        {(ownedPets ?? []).length === 0 ? (
          <div className="empty-state">No pets yet — add your first one.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(ownedPets ?? []).map((pet) => (
              <Link key={pet.id} href={`/pets/${pet.id}`} className="card-compact flex items-center gap-4 hover:border-[var(--accent)]">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-2xl">
                  🐾
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-stone-900">{pet.name}</p>
                  <p className="truncate text-sm text-stone-500">
                    {[pet.species, pet.breed].filter(Boolean).join(" · ")}
                  </p>
                  {pet.pet_code && (
                    <p className="mt-0.5 font-mono text-xs text-stone-400">{pet.pet_code}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {caretakerPets.length > 0 && (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="section-title">Pets you care for</h2>
            <p className="text-sm text-stone-500">Today&apos;s medication — tap to confirm once given.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {caretakerPets.map(({ pet, canConfirm }) => {
              const items = careByPet.get(pet.id) ?? [];
              const confirmAction = confirmMedicationGiven.bind(null, pet.id);
              return (
                <div key={pet.id} className="card-compact flex flex-col gap-3">
                  <Link href={`/pets/${pet.id}`} className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xl">
                      🐾
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-900">{pet.name}</p>
                      <p className="truncate text-sm text-stone-500">{pet.species}</p>
                    </div>
                  </Link>
                  {items.length === 0 ? (
                    <p className="text-sm text-stone-400">No active medication.</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {items.map((item) => (
                        <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2 text-sm">
                          <span className="min-w-0 truncate">
                            {item.dose} — {item.schedule}
                          </span>
                          {canConfirm && (
                            <form action={confirmAction.bind(null, item.id)}>
                              <button type="submit" className="btn-secondary btn-sm shrink-0">
                                Confirm given
                              </button>
                            </form>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
