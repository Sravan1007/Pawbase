import { createClient } from "@/lib/supabase/server";

export type OwnedPet = { id: string; name: string; species: string };

// Pets the current user owns or has caretaker/vet/secondary_contact access
// to — shared by any page that needs a "which pet is this for" selector
// (consultation, grooming, shop, community).
export async function getAccessiblePets(): Promise<OwnedPet[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const [{ data: owned }, { data: accessRows }] = await Promise.all([
    supabase.from("pets").select("id, name, species").eq("owner_id", user.id),
    supabase.from("caretaker_access").select("pets(id, name, species)").eq("user_id", user.id),
  ]);

  const caretakerPets = (accessRows ?? [])
    .map((row) => (Array.isArray(row.pets) ? row.pets[0] : row.pets))
    .filter((p): p is OwnedPet => Boolean(p));

  const byId = new Map<string, OwnedPet>();
  [...(owned ?? []), ...caretakerPets].forEach((p) => byId.set(p.id, p));
  return Array.from(byId.values());
}
