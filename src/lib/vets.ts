import { createClient } from "@/lib/supabase/server";

export type VetListing = {
  id: string;
  clinic_name: string | null;
  credentials: string | null;
  years_experience: number | null;
  full_name: string;
};

// All onboarded vets — browsable for booking regardless of prior
// caretaker_access (that grant happens once a booking leads to an ongoing
// relationship, e.g. before a vet can prescribe medication).
export async function getVetListings(): Promise<VetListing[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vets")
    .select("id, clinic_name, credentials, years_experience, profiles(full_name)")
    .order("years_experience", { ascending: false });

  return (data ?? []).map((v) => {
    const profile = Array.isArray(v.profiles) ? v.profiles[0] : v.profiles;
    return {
      id: v.id,
      clinic_name: v.clinic_name,
      credentials: v.credentials,
      years_experience: v.years_experience,
      full_name: profile?.full_name ?? "Vetted professional",
    };
  });
}
