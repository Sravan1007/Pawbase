"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Owner reviews and approves the vet's prescription. Until this happens,
// RLS blocks any caretaker confirmation on this reminder — see
// medication_confirmations policy in supabase/migrations/0001_init.sql.
export async function ownerConfirmPrescription(petId: string, reminderId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("medication_reminders")
    .update({ owner_confirmed_at: new Date().toISOString() })
    .eq("id", reminderId);

  if (error) throw new Error(error.message);
  revalidatePath(`/pets/${petId}/medications`);
}

// Explicit, timestamped "confirmed given" action — never inferred from a
// dismissed notification. Requires can_confirm_medication in caretaker_access
// and an owner-confirmed prescription; both enforced again at the DB level.
export async function confirmMedicationGiven(petId: string, reminderId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("medication_confirmations").insert({
    medication_reminder_id: reminderId,
    caretaker_id: user.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/pets/${petId}/medications`);
}
