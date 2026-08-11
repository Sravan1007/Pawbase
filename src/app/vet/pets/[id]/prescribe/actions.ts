"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createPrescription(
  petId: string,
  data: { photoUrl: string; dose: string; schedule: string },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("medication_reminders").insert({
    pet_id: petId,
    prescribed_by: user.id,
    photo_url: data.photoUrl,
    dose: data.dose,
    schedule: data.schedule,
  });

  if (error) throw new Error(error.message);
  redirect("/vet/dashboard");
}
