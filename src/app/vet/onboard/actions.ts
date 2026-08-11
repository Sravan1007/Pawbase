"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Manual onboarding for v1: the vet fills their own credentials, no
// verification workflow. The "trust signal" on their profile is exactly
// what's entered here — see PRD §3.3 / §6.
export async function onboardVet(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const clinicName = String(formData.get("clinic_name") ?? "").trim() || null;
  const credentials = String(formData.get("credentials") ?? "").trim() || null;
  const yearsExperienceRaw = String(formData.get("years_experience") ?? "").trim();
  const yearsExperience = yearsExperienceRaw ? Number(yearsExperienceRaw) : null;

  const { error } = await supabase.from("vets").upsert({
    id: user.id,
    clinic_name: clinicName,
    credentials,
    years_experience: yearsExperience,
    onboarded_by: user.id,
  });

  if (error) throw new Error(error.message);
  redirect("/vet/dashboard");
}
