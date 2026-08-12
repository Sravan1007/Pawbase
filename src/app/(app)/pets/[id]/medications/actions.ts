"use server";

import { requireUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { medicationConfirmedEmail, sendEmail } from "@/lib/email";
import { one } from "@/lib/supabase/relations";

// Owner reviews and approves the vet's prescription. Until this happens,
// RLS blocks any caretaker confirmation on this reminder — see
// medication_confirmations policy in supabase/migrations/0001_init.sql.
export async function ownerConfirmPrescription(petId: string, reminderId: string) {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("medication_reminders")
    .update({ owner_confirmed_at: new Date().toISOString() })
    .eq("id", reminderId);

  if (error) throw new Error(error.message);

  const [{ data: pet }, { data: reminder }, { data: caretakers }] = await Promise.all([
    supabase.from("pets").select("name").eq("id", petId).maybeSingle(),
    supabase.from("medication_reminders").select("dose, schedule").eq("id", reminderId).maybeSingle(),
    supabase
      .from("caretaker_access")
      .select("profiles(email)")
      .eq("pet_id", petId)
      .eq("can_confirm_medication", true),
  ]);

  if (pet && reminder) {
    const { subject, html } = medicationConfirmedEmail(pet.name, reminder.dose, reminder.schedule);
    const emails = (caretakers ?? [])
      .map((c) => one(c.profiles)?.email)
      .filter((email): email is string => Boolean(email));
    await Promise.all(emails.map((to) => sendEmail({ to, subject, html })));
  }

  revalidatePath(`/pets/${petId}/medications`);
}

// Explicit, timestamped "confirmed given" action — never inferred from a
// dismissed notification. Requires can_confirm_medication in caretaker_access
// and an owner-confirmed prescription; both enforced again at the DB level.
export async function confirmMedicationGiven(petId: string, reminderId: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("medication_confirmations").insert({
    medication_reminder_id: reminderId,
    caretaker_id: user.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/pets/${petId}/medications`);
}

// Owner layers on more photos / dose times after the vet's initial entry —
// appended, never replacing what the vet wrote (see 0010).
export async function addMedicationDetail(
  petId: string,
  reminderId: string,
  data: { photoUrl: string | null; doseTimes: string[] },
) {
  const { supabase } = await requireUser();

  const { data: existing } = await supabase
    .from("medication_reminders")
    .select("owner_photo_urls, dose_times")
    .eq("id", reminderId)
    .maybeSingle();

  const { error } = await supabase
    .from("medication_reminders")
    .update({
      owner_photo_urls: data.photoUrl
        ? [...(existing?.owner_photo_urls ?? []), data.photoUrl]
        : (existing?.owner_photo_urls ?? []),
      dose_times: [...new Set([...(existing?.dose_times ?? []), ...data.doseTimes])],
    })
    .eq("id", reminderId);

  if (error) throw new Error(error.message);
  revalidatePath(`/pets/${petId}/medications`);
}
