"use server";

import { requireUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";

export async function sendMessageToOwner(petId: string, message: string) {
  const { supabase, user } = await requireUser();
  const trimmed = message.trim();
  if (!trimmed) throw new Error("Write a message first");

  const [{ data: pet }, { data: sender }] = await Promise.all([
    supabase.from("pets").select("name, owner_id").eq("id", petId).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  if (!pet) throw new Error("Pet not found");

  const { error } = await supabase.from("pet_messages").insert({
    pet_id: petId,
    sender_id: user.id,
    message: trimmed,
  });
  if (error) throw new Error(error.message);

  const { data: owner } = await supabase.from("profiles").select("email").eq("id", pet.owner_id).maybeSingle();
  if (owner?.email) {
    await sendEmail({
      to: owner.email,
      subject: `${sender?.full_name ?? "A caretaker"} sent a message about ${pet.name}`,
      html: `<p><strong>${sender?.full_name ?? "A caretaker"}</strong> wrote about <strong>${pet.name}</strong>:</p><p>${trimmed}</p>`,
    });
  }

  revalidatePath("/caretaker");
}
