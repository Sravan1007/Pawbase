"use server";

import { requireUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// RLS ("pets: owner deletes", 0001) already restricts this to the pet's
// owner — the `.eq("owner_id", user.id)` here is belt-and-suspenders, not
// the actual enforcement. Every other pet-scoped table references pets(id)
// with `on delete cascade`, so documents, medications, bookings, etc. all
// go with it.
export async function deletePet(petId: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("pets").delete().eq("id", petId).eq("owner_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
