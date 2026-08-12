import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import ChecklistCard from "./ChecklistCard";
import TravelSelector from "./TravelSelector";
import TravelModeToggle from "./TravelModeToggle";
import Reveal from "@/components/motion/Reveal";

export default async function TravelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ airline?: string; country?: string }>;
}) {
  const { id } = await params;
  const { airline: airlineParam, country: countryParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Kept separate from the travel-mode fields below: if those columns
  // don't exist yet (pending migration), a single combined query would
  // fail entirely and 404 this whole page instead of just hiding the
  // traveling-mode toggle.
  const { data: pet } = await supabase.from("pets").select("id, name, owner_id").eq("id", id).maybeSingle();
  if (!pet) notFound();

  const isOwner = user?.id === pet.owner_id;

  const { data: travelState } = await supabase
    .from("pets")
    .select("travel_mode_active, travel_destination")
    .eq("id", id)
    .maybeSingle();

  const [{ data: rulesets }, { data: progress }] = await Promise.all([
    supabase
      .from("travel_rulesets")
      .select("id, name, kind, required_documents, last_verified_at")
      .order("kind", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("travel_checklist_progress")
      .select("ruleset_id, fulfilled_documents")
      .eq("pet_id", id),
  ]);

  const progressByRuleset = new Map(
    (progress ?? []).map((p) => [p.ruleset_id, p.fulfilled_documents]),
  );

  const airlines = (rulesets ?? []).filter((r) => r.kind === "airline");
  const countries = (rulesets ?? []).filter((r) => r.kind === "country");

  const selectedAirline = airlines.find((a) => a.id === airlineParam);
  const selectedCountry = countries.find((c) => c.id === countryParam);

  function renderCard(r: NonNullable<typeof selectedAirline>) {
    return (
      <ChecklistCard
        key={r.id}
        petId={id}
        ruleset={r}
        lastVerifiedLabel={new Date(r.last_verified_at).toLocaleDateString("en-US", {
          timeZone: "UTC",
        })}
        initialFulfilled={progressByRuleset.get(r.id) ?? []}
      />
    );
  }

  return (
    <Reveal className="flex flex-col gap-8">
      <div>
        <Link href={`/pets/${id}`} className="text-sm text-[var(--accent)] hover:underline">
          ← {pet.name}
        </Link>
        <h1 className="page-title mt-1">Travel Documents</h1>
        <p className="page-subtitle">
          Pick the airline and/or destination country you&apos;re traveling with — the checklist
          below is a starting point, not a guarantee of acceptance. Always confirm directly with
          the airline or destination authority before you travel. You fill and submit the actual
          forms yourself; this just tracks what you&apos;ve handled.
        </p>
      </div>

      <TravelSelector
        petId={id}
        airlines={airlines}
        countries={countries}
        selectedAirline={airlineParam ?? ""}
        selectedCountry={countryParam ?? ""}
      />

      {isOwner && (
        <TravelModeToggle
          petId={id}
          active={travelState?.travel_mode_active ?? false}
          destination={
            travelState?.travel_mode_active
              ? (travelState.travel_destination ?? null)
              : (selectedCountry?.name ?? null)
          }
        />
      )}

      {selectedAirline || selectedCountry ? (
        <section className="flex flex-col gap-4">
          {selectedAirline && renderCard(selectedAirline)}
          {selectedCountry && renderCard(selectedCountry)}
        </section>
      ) : (
        <div className="empty-state">
          Select an airline or destination above to see its document checklist.
        </div>
      )}

      {(rulesets ?? []).length === 0 && (
        <div className="empty-state">No travel rulesets available yet.</div>
      )}
    </Reveal>
  );
}
