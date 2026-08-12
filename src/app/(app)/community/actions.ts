"use server";

import { requireUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createPost(formData: FormData) {
  const { supabase, user } = await requireUser();

  const content = String(formData.get("content") ?? "").trim();
  const petId = String(formData.get("pet_id") ?? "").trim() || null;

  if (!content) {
    throw new Error("Write something before posting");
  }

  const { error } = await supabase.from("community_posts").insert({
    author_id: user.id,
    pet_id: petId,
    content,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/community");
}
