import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/supabase/relations";
import Link from "next/link";
import { redirect } from "next/navigation";
import { confirmMedicationGiven } from "../pets/[id]/medications/actions";
import { DueStatus } from "../pets/[id]/medications/DueStatus";
import { RoutineList } from "../pets/[id]/routine/RoutineList";
import { MessageOwnerForm } from "./MessageOwnerForm";
import Reveal from "@/components/motion/Reveal";
import StaggerGrid from "@/components/motion/StaggerGrid";

export default async function CaretakerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: accessRows } = await supabase
    .from("caretaker_access")
    .select("pet_id, can_confirm_medication, pets(id, name, species, photo_url)")
    .eq("user_id", user.id)
    .eq("role", "caretaker");

  const pets = (accessRows ?? [])
    .map((row) => {
      const pet = one(row.pets);
      return pet ? { pet, canConfirm: row.can_confirm_medication } : null;
    })
    .filter((r): r is { pet: { id: string; name: string; species: string; photo_url: string | null }; canConfirm: boolean } =>
      Boolean(r),
    );

  // This page only makes sense for someone actually caring for a pet —
  // send an owner (or a caretaker with nothing assigned yet) to the
  // regular dashboard instead of a page with nothing on it.
  if (pets.length === 0) {
    redirect("/dashboard");
  }

  const petIds = pets.map((p) => p.pet.id);

  const [{ data: reminders }, { data: routines }] = await Promise.all([
    supabase
      .from("medication_reminders")
      .select("id, pet_id, dose, schedule, dose_times, assigned_caretaker_id")
      .in("pet_id", petIds)
      .not("owner_confirmed_at", "is", null),
    supabase
      .from("pet_care_routines")
      .select("id, pet_id, title, notes, pet_care_routine_logs(completed_on)")
      .in("pet_id", petIds)
      .eq("active", true),
  ]);

  const remindersByPet = new Map<string, typeof reminders>();
  (reminders ?? []).forEach((r) => {
    const list = remindersByPet.get(r.pet_id) ?? [];
    list.push(r);
    remindersByPet.set(r.pet_id, list);
  });

  const routinesByPet = new Map<string, typeof routines>();
  (routines ?? []).forEach((r) => {
    const list = routinesByPet.get(r.pet_id) ?? [];
    list.push(r);
    routinesByPet.set(r.pet_id, list);
  });

  return (
    <Reveal className="flex flex-col gap-10">
      <div>
        <h1 className="page-title">Your caretaker tasks</h1>
        <p className="page-subtitle">
          Today&apos;s medication and routine for the pets you help with. Full pet
          management (documents, travel, sharing) stays in the owner&apos;s dashboard —
          use the pet link below if you need it.
        </p>
      </div>

      <StaggerGrid className="flex flex-col gap-10">
      {pets.map(({ pet, canConfirm }) => {
        const petReminders = (remindersByPet.get(pet.id) ?? []).filter(
          (r) => !r.assigned_caretaker_id || r.assigned_caretaker_id === user.id,
        );
        const petRoutines = (routinesByPet.get(pet.id) ?? []).map((r) => ({
          id: r.id,
          title: r.title,
          notes: r.notes,
          logs: r.pet_care_routine_logs ?? [],
        }));
        const confirmAction = confirmMedicationGiven.bind(null, pet.id);

        return (
          <section key={pet.id} className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <Link href={`/pets/${pet.id}`} className="flex items-center gap-3">
                {pet.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pet.photo_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xl">
                    🐾
                  </div>
                )}
                <div>
                  <p className="text-lg font-semibold text-stone-900">{pet.name}</p>
                  <p className="text-sm text-stone-500">{pet.species}</p>
                </div>
              </Link>
              <MessageOwnerForm petId={pet.id} />
            </div>

            <div className="card-compact">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
                Medication
              </h3>
              {petReminders.length === 0 ? (
                <p className="text-sm text-stone-400">Nothing active right now.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {petReminders.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2">
                        {r.dose} — {r.schedule}
                        {r.dose_times && r.dose_times.length > 0 && <DueStatus doseTimes={r.dose_times} />}
                      </span>
                      {canConfirm && (
                        <form action={confirmAction.bind(null, r.id)}>
                          <button type="submit" className="btn-secondary btn-sm">
                            Confirmed given
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card-compact">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
                Daily routine
              </h3>
              <RoutineList petId={pet.id} routines={petRoutines} />
            </div>
          </section>
        );
      })}
      </StaggerGrid>
    </Reveal>
  );
}
