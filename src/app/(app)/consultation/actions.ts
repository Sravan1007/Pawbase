"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function bookConsultation(type: "in_person" | "virtual", formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const petId = String(formData.get("pet_id") ?? "");
  const vetId = String(formData.get("vet_id") ?? "");
  const scheduledAt = String(formData.get("scheduled_at") ?? "");

  if (!petId || !vetId || !scheduledAt) {
    throw new Error("Pet, vet, and a time are required");
  }

  const { error } = await supabase.from("vet_bookings").insert({
    pet_id: petId,
    vet_id: vetId,
    type,
    scheduled_at: new Date(scheduledAt).toISOString(),
  });

  if (error) throw new Error(error.message);

  revalidatePath(type === "virtual" ? "/virtual-consultation" : "/consultation");
}
