"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function saveChecklistProgress(
  petId: string,
  rulesetId: string,
  fulfilledDocuments: string[],
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
