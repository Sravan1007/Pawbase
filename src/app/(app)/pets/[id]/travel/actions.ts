"use server";

import { requireUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveChecklistProgress(
  petId: string,
  rulesetId: string,
  fulfilledDocuments: string[],
) {
  const { supabase } = await requireUser();

  const { error } = await supabase.from("travel_checklist_progress").upsert(
    {
      pet_id: petId,
      ruleset_id: rulesetId,
      fulfilled_documents: fulfilledDocuments,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "pet_id,ruleset_id" },
  );

  if (error) throw new Error(error.message);
  revalidatePath(`/pets/${petId}/travel`);
}

// Simple on/off toggle (not date-range trip tracking) — while active, the
// (app) nav shows a "Traveling" tab with nearby vets for this pet's
// destination. Owner-only, matching "pets: owner updates" (0001) — a
// caretaker's attempt here silently updates zero rows rather than erroring,
// since RLS just filters the row out rather than rejecting the statement.
export async function setTravelMode(petId: string, active: boolean, destination: string | null) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("pets")
    .update({ travel_mode_active: active, travel_destination: active ? destination : null })
    .eq("id", petId)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath(`/pets/${petId}/travel`);
  revalidatePath("/traveling");
}
