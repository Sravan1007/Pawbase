"use server";

import { requireUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function inviteCaretaker(petId: string, formData: FormData) {
  const { supabase } = await requireUser();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "caretaker");
  // The DB CHECK constraint also enforces this, but validating here keeps a
  // crafted request from ever reaching the insert with role='owner' — the
  // UI only ever offers caretaker/secondary_contact/vet.
  const allowedRoles = ["caretaker", "secondary_contact", "vet"];
  if (!allowedRoles.includes(role)) {
    throw new Error("Invalid role");
  }
  const canConfirmMedication = formData.get("can_confirm_medication") === "on";
  const finderMayCall = formData.get("finder_may_call") === "on";
  const vetMayCall = formData.get("vet_may_call") === "on";

  // v1 assumes the caretaker already has an account — no marketplace/invite
  // flow to find a new caretaker (see PRD §6, out of scope for v1).
  const { data: invitee, error: lookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (lookupError || !invitee) {
    throw new Error(
      "No Pet Passport account found for that email. The caretaker needs to sign up first.",
    );
  }

  const { error } = await supabase.from("caretaker_access").insert({
    pet_id: petId,
    user_id: invitee.id,
    role,
    can_confirm_medication: canConfirmMedication,
    finder_may_call: finderMayCall,
    vet_may_call: vetMayCall,
  });

  if (error) throw new Error(error.message);

  redirect(`/pets/${petId}`);
}
