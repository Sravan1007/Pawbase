"use server";

import { requireUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { prescriptionReadyForReviewEmail, sendEmail } from "@/lib/email";

export async function createPrescription(
  petId: string,
  data: {
    photoUrl: string;
    dose: string;
    schedule: string;
    doseTimes: string[];
    assignedCaretakerId: string | null;
  },
) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("medication_reminders").insert({
    pet_id: petId,
    prescribed_by: user.id,
    photo_url: data.photoUrl,
    dose: data.dose,
    schedule: data.schedule,
    dose_times: data.doseTimes,
    assigned_caretaker_id: data.assignedCaretakerId,
  });

  if (error) throw new Error(error.message);

  const { data: pet } = await supabase.from("pets").select("name, owner_id").eq("id", petId).maybeSingle();
  if (pet) {
    const { data: owner } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", pet.owner_id)
      .maybeSingle();
    if (owner) {
      const { subject, html } = prescriptionReadyForReviewEmail(pet.name, data.dose, data.schedule);
      await sendEmail({ to: owner.email, subject, html });
    }
  }

  redirect("/vet/dashboard");
}
