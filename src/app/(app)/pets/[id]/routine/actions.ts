"use server";

import { requireUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addRoutine(petId: string, formData: FormData) {
  const { supabase, user } = await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!title) throw new Error("Give the routine a name");

  const { error } = await supabase.from("pet_care_routines").insert({
    pet_id: petId,
    title,
    notes,
    created_by: user.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/pets/${petId}/routine`);
}

// One check-off per routine per day — the unique(routine_id, completed_on)
// constraint is the real enforcement; this just gives a clean error instead
// of a raw Postgres conflict when someone double-taps the button.
export async function logRoutineToday(petId: string, routineId: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("pet_care_routine_logs").insert({
    routine_id: routineId,
    pet_id: petId,
    completed_by: user.id,
  });

  if (error && error.code !== "23505") throw new Error(error.message);
  revalidatePath(`/pets/${petId}/routine`);
}
