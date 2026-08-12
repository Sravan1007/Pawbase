"use server";

import { requireUser } from "@/lib/supabase/server";

export async function bookGrooming(formData: FormData) {
  const { supabase } = await requireUser();

  const petId = String(formData.get("pet_id") ?? "");
  const service = String(formData.get("service") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!petId || !service) {
    throw new Error("Pet and service are required");
  }

  const { error } = await supabase.from("orders").insert({
    pet_id: petId,
    type: "spa",
    status: "pending",
    details: { service, notes: notes || null },
  });

  if (error) throw new Error(error.message);
}
