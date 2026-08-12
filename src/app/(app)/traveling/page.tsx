import { createClient } from "@/lib/supabase/server";
import { getVetListings } from "@/lib/vets";
import { redirect } from "next/navigation";
import { NearbyVets } from "./NearbyVets";

export default async function TravelingPage() {
  const supabase = await createClient();

  const [{ data: travelingPets }, vets] = await Promise.all([
    supabase.from("pets").select("id, name, travel_destination").eq("travel_mode_active", true),
    getVetListings(),
  ]);

  // Nothing traveling right now — the nav link that leads here disappears
  // too, but a direct visit shouldn't dead-end on an empty page.
  if (!travelingPets || travelingPets.length === 0) {
    redirect("/dashboard");
  }

  const vetsWithLocation = vets.filter((v) => v.lat != null && v.lng != null);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="page-title">✈️ Traveling</h1>
        <p className="page-subtitle">
          {travelingPets.map((p) => p.name).join(", ")}{" "}
          {travelingPets.length === 1 ? "is" : "are"} in traveling mode
          {travelingPets[0]?.travel_destination ? ` — heading to ${travelingPets[0].travel_destination}` : ""}.
          Nearby vets on Pet Passport, sorted by distance from wherever you are right now.
        </p>
      </div>

      <section>
        <h2 className="section-title mb-3">Nearby vets</h2>
        <NearbyVets vets={vetsWithLocation} />
      </section>

      <p className="text-sm text-stone-400">
        Grooming and pet-supply shops nearby are coming in a future update — for now this covers
        vet clinics only.
      </p>
    </div>
  );
}
