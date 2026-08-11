"use server";

import { createClient } from "@/lib/supabase/server";
import { generatePetCode } from "@/lib/petCode";
import { randomUUID } from "crypto";
import { redirect } from "next/navigation";

export async function createPet(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const species = String(formData.get("species") ?? "").trim();
  const breed = String(formData.get("breed") ?? "").trim() || null;
  const dob = String(formData.get("dob") ?? "").trim() || null;
  const medicalNotes = String(formData.get("medical_notes") ?? "").trim() || null;

  if (!name || !species) {
    throw new Error("Name and species are required");
  }

  // Generated client-side and inserted without .select() — an INSERT ...
  // RETURNING that re-checks the SELECT policy (has_pet_access, a security
  // definer function) against the just-inserted row can spuriously fail to
  // see it within the same statement. A plain insert plus a known id avoids
  // that Postgres RLS/visibility edge case entirely.
  const petId = randomUUID();

  // Universal Pet ID (pet_code) is unique; retry a handful of times on the
  // astronomically unlikely chance of a collision rather than failing outright.
  let insertError: { code?: string; message: string } | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { error } = await supabase.from("pets").insert({
      id: petId,
      owner_id: user.id,
      name,
      species,
      breed,
      dob,
      medical_notes: medicalNotes,
      pet_code: generatePetCode(),
    });
    insertError = error;
    if (!error || error.code !== "23505") break;
  }

  if (insertError) {
    throw new Error(insertError.message);
  }

  // Every pet gets a QR emergency tag at creation — a pet should never be
  // without one, and this stays live even if the owner's plan lapses.
  await supabase.from("qr_tags").insert({
    pet_id: petId,
    unique_slug: randomUUID(),
  });

  redirect(`/pets/${petId}`);
}
