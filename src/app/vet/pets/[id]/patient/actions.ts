"use server";

import { requireUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addVisitNote(petId: string, note: string) {
  const { supabase, user } = await requireUser();
  const trimmed = note.trim();
  if (!trimmed) throw new Error("Write a note first");

  const { error } = await supabase.from("vet_visit_notes").insert({
    pet_id: petId,
    vet_id: user.id,
    note: trimmed,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/vet/pets/${petId}/patient`);
  revalidatePath(`/pets/${petId}`);
}
