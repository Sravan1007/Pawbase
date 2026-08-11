import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import { confirmMedicationGiven, ownerConfirmPrescription } from "./actions";

export default async function MedicationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: pet } = await supabase
    .from("pets")
    .select("id, name, owner_id")
    .eq("id", id)
    .maybeSingle();
  if (!pet) notFound();

  const isOwner = pet.owner_id === user.id;

  const { data: access } = await supabase
    .from("caretaker_access")
    .select("can_confirm_medication")
    .eq("pet_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  const canConfirmMedication = access?.can_confirm_medication ?? false;

  const { data: reminders } = await supabase
    .from("medication_reminders")
    .select(
      "id, dose, schedule, photo_url, owner_confirmed_at, medication_confirmations(id, confirmed_at, caretaker_id, profiles(full_name))",
    )
    .eq("pet_id", id)
    .order("created_at", { ascending: false });

  const ownerConfirm = ownerConfirmPrescription.bind(null, id);
  const caretakerConfirm = confirmMedicationGiven.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="page-title">{pet.name}&apos;s medication</h1>

      {reminders && reminders.length > 0 ? (
        <div className="flex flex-col gap-4">
          {reminders.map((m) => {
            const confirmations = (m.medication_confirmations ?? []) as Array<{
              id: string;
              confirmed_at: string;
              caretaker_id: string;
              profiles: { full_name: string } | { full_name: string }[] | null;
            }>;

            return (
              <div key={m.id} className="card">
                <div className="flex gap-4">
                  {m.photo_url && (
                    <Image
                      src={m.photo_url}
                      alt="Prescribed medication"
                      width={72}
                      height={72}
                      className="h-18 w-18 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-stone-900">{m.dose}</p>
                    <p className="text-sm text-stone-500">{m.schedule}</p>
                    <p className="mt-1 text-xs">
                      {m.owner_confirmed_at ? (
                        <span className="badge-success">
                          Owner confirmed {new Date(m.owner_confirmed_at).toLocaleString()}
                        </span>
                      ) : (
                        <span className="badge-warning">Awaiting owner review</span>
                      )}
                    </p>
                  </div>
                </div>

                {isOwner && !m.owner_confirmed_at && (
                  <form action={ownerConfirm.bind(null, m.id)} className="mt-3">
                    <button type="submit" className="btn-primary btn-sm">
                      Confirm prescription
                    </button>
                  </form>
                )}

                {canConfirmMedication && m.owner_confirmed_at && (
                  <form action={caretakerConfirm.bind(null, m.id)} className="mt-3">
                    <button type="submit" className="btn-secondary btn-sm">
                      Confirmed given
                    </button>
                  </form>
                )}

                {confirmations.length > 0 && (
                  <div className="mt-3 border-t border-[var(--border)] pt-3">
                    <p className="mb-1 text-xs font-semibold uppercase text-stone-400">
                      Dose log
                    </p>
                    <ul className="flex flex-col gap-1 text-sm">
                      {confirmations.map((c) => {
                        const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
                        return (
                          <li key={c.id} className="text-stone-600">
                            {profile?.full_name ?? "Caretaker"} —{" "}
                            {new Date(c.confirmed_at).toLocaleString()}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          No prescriptions yet. A vet needs to add one from the doctor portal.
        </div>
      )}
    </div>
  );
}
