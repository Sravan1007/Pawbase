import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/supabase/relations";

export type VetListing = {
  id: string;
  clinic_name: string | null;
  credentials: string | null;
  years_experience: number | null;
  full_name: string;
  designation: string | null;
  photo_url: string | null;
  species_focus: string[];
  clinic_photos: string[];
  clinic_address: string | null;
  amenities: string[];
  avg_rating: number | null;
  review_count: number;
  contact_email: string | null;
  contact_phone: string | null;
  lat: number | null;
  lng: number | null;
};

// `vets` has two FKs to `profiles` — `id` (the vet's own identity) and
// `onboarded_by` (who onboarded them, usually themselves) — so the embed
// must name the constraint explicitly or PostgREST rejects the query
// entirely (PGRST201, "more than one relationship was found") and every
// vet listing silently comes back empty.
const vetSelect =
  "id, clinic_name, credentials, years_experience, designation, photo_url, species_focus, clinic_photos, clinic_address, amenities, lat, lng, profiles!vets_id_fkey(full_name, email, phone), vet_reviews(rating)";

function toListing(v: {
  id: string;
  clinic_name: string | null;
  credentials: string | null;
  years_experience: number | null;
  designation: string | null;
  photo_url: string | null;
  species_focus: string[] | null;
  clinic_photos: string[] | null;
  clinic_address: string | null;
  amenities: string[] | null;
  lat: number | null;
  lng: number | null;
  profiles: unknown;
  vet_reviews: { rating: number }[] | null;
}): VetListing {
  type VetProfile = { full_name: string; email: string; phone: string | null };
  const profile = one(v.profiles as VetProfile | VetProfile[] | null);
  const ratings = v.vet_reviews ?? [];
  return {
    id: v.id,
    clinic_name: v.clinic_name,
    credentials: v.credentials,
    years_experience: v.years_experience,
    full_name: profile?.full_name ?? "Vetted professional",
    designation: v.designation,
    photo_url: v.photo_url,
    species_focus: v.species_focus ?? [],
    clinic_photos: v.clinic_photos ?? [],
    clinic_address: v.clinic_address,
    amenities: v.amenities ?? [],
    avg_rating: ratings.length > 0 ? ratings.reduce((a, r) => a + r.rating, 0) / ratings.length : null,
    review_count: ratings.length,
    contact_email: profile?.email ?? null,
    contact_phone: profile?.phone ?? null,
    lat: v.lat,
    lng: v.lng,
  };
}

// All onboarded vets — browsable for booking regardless of prior
// caretaker_access (that grant happens once a booking leads to an ongoing
// relationship, e.g. before a vet can prescribe medication). Works both
// inside the authenticated (app) portal and from the public (no-login)
// clinic directory — vets, vet profiles, and vet_reviews are all publicly
// readable per the RLS policies in 0007/0008.
export async function getVetListings(): Promise<VetListing[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("vets").select(vetSelect).order("years_experience", { ascending: false });
  return (data ?? []).map(toListing);
}

export async function getVetListing(id: string): Promise<VetListing | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("vets").select(vetSelect).eq("id", id).maybeSingle();
  return data ? toListing(data) : null;
}
