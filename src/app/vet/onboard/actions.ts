"use server";

import { requireUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Manual onboarding for v1: the vet fills their own credentials, no
// verification workflow. The "trust signal" on their profile is exactly
// what's entered here — see PRD §3.3 / §6.
export async function onboardVet(data: {
  clinicName: string;
  credentials: string;
  yearsExperience: number | null;
  designation: string;
  photoUrl: string | null;
  clinicAddress: string;
  amenities: string[];
  speciesFocus: string[];
  clinicPhotos: string[];
  lat: number | null;
  lng: number | null;
}) {
  const { supabase, user } = await requireUser();

  // Revisiting this form (edit profile) shouldn't drop photos uploaded in a
  // previous save — only add to them.
  const { data: existing } = await supabase
    .from("vets")
    .select("photo_url, clinic_photos, lat, lng")
    .eq("id", user.id)
    .maybeSingle();

  const { error } = await supabase.from("vets").upsert({
    id: user.id,
    clinic_name: data.clinicName || null,
    credentials: data.credentials || null,
    years_experience: data.yearsExperience,
    designation: data.designation || null,
    photo_url: data.photoUrl ?? existing?.photo_url ?? null,
    clinic_address: data.clinicAddress || null,
    amenities: data.amenities,
    species_focus: data.speciesFocus,
    clinic_photos: [...(existing?.clinic_photos ?? []), ...data.clinicPhotos],
    lat: data.lat ?? existing?.lat ?? null,
    lng: data.lng ?? existing?.lng ?? null,
    onboarded_by: user.id,
  });

  if (error) throw new Error(error.message);
  redirect("/vet/dashboard");
}
