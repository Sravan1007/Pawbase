import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/supabase/relations";
import { notFound } from "next/navigation";
import Image from "next/image";
import { confirmMedicationGiven, ownerConfirmPrescription } from "./actions";
import { DueStatus } from "./DueStatus";
import { AddDetailForm } from "./AddDetailForm";
import Reveal from "@/components/motion/Reveal";
import StaggerGrid from "@/components/motion/StaggerGrid";

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
      "id, dose, schedule, photo_url, owner_photo_urls, dose_times, assigned_caretaker_id, owner_confirmed_at, medication_confirmations(id, confirmed_at, caretaker_id, profiles(full_name))",
    )
    .eq("pet_id", id)
    .order("created_at", { ascending: false });

  const ownerConfirm = ownerConfirmPrescription.bind(null, id);
  const caretakerConfirm = confirmMedicationGiven.bind(null, id);

  return (
    <Reveal className="flex flex-col gap-6">
      <h1 className="page-title">{pet.name}&apos;s medication</h1>

      {reminders && reminders.length > 0 ? (
        <StaggerGrid className="flex flex-col gap-4">
          {reminders.map((m) => {
            const confirmations = (m.medication_confirmations ?? []) as Array<{
              id: string;
              confirmed_at: string;
              caretaker_id: string;
              profiles: { full_name: string } | { full_name: string }[] | null;
            }>;
            // Assigning the medication to one caretaker narrows who can
            // confirm it — mirrors the RLS check in 0010, this is just the
            // UI reflecting the same rule so the button doesn't appear for
            // someone whose confirm would be rejected anyway.
            const canThisUserConfirm =
              canConfirmMedication && (!m.assigned_caretaker_id || m.assigned_caretaker_id === user.id);

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
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      {m.owner_confirmed_at ? (
                        <span className="badge-success">
                          Owner confirmed {new Date(m.owner_confirmed_at).toLocaleString()}
                        </span>
                      ) : (
                        <span className="badge-warning">Awaiting owner review</span>
                      )}
                      {m.dose_times && m.dose_times.length > 0 && <DueStatus doseTimes={m.dose_times} />}
                    </div>
                  </div>
                </div>

                {m.owner_photo_urls && m.owner_photo_urls.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {m.owner_photo_urls.map((url: string) => (
                      <Image
                        key={url}
                        src={url}
                        alt="Additional medication photo"
                        width={56}
                        height={56}
                        className="h-14 w-14 rounded-lg object-cover"
                      />
                    ))}
                  </div>
                )}

                {isOwner && !m.owner_confirmed_at && (
                  <form action={ownerConfirm.bind(null, m.id)} className="mt-3">
                    <button type="submit" className="btn-primary btn-sm">
                      Confirm prescription
                    </button>
                  </form>
                )}

                {canThisUserConfirm && m.owner_confirmed_at && (
                  <form action={caretakerConfirm.bind(null, m.id)} className="mt-3">
                    <button type="submit" className="btn-secondary btn-sm">
                      Confirmed given
                    </button>
                  </form>
                )}

                {isOwner && (
                  <div className="mt-3">
                    <AddDetailForm petId={id} reminderId={m.id} />
                  </div>
                )}

                {confirmations.length > 0 && (
                  <div className="mt-3 border-t border-[var(--border)] pt-3">
                    <p className="mb-1 text-xs font-semibold uppercase text-stone-400">
                      Dose log
                    </p>
                    <ul className="flex flex-col gap-1 text-sm">
                      {confirmations.map((c) => {
                        const profile = one(c.profiles);
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
        </StaggerGrid>
      ) : (
        <div className="empty-state">
          No prescriptions yet. A vet needs to add one from the doctor portal.
        </div>
      )}
    </Reveal>
  );
}
