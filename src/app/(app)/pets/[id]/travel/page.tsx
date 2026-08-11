import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import ChecklistCard from "./ChecklistCard";

export default async function TravelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: pet } = await supabase.from("pets").select("id, name").eq("id", id).maybeSingle();
  if (!pet) notFound();

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

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href={`/pets/${id}`} className="text-sm text-[var(--accent)] hover:underline">
          ← {pet.name}
        </Link>
        <h1 className="page-title mt-1">Travel Documents</h1>
        <p className="page-subtitle">
          A checklist of what&apos;s typically required — not a guarantee of acceptance. Always
          confirm directly with the airline or destination authority before you travel. You fill
          and submit the actual forms yourself; this just tracks what you&apos;ve handled.
        </p>
      </div>

      {airlines.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="section-title">Airlines</h2>
          {airlines.map((r) => (
            <ChecklistCard
              key={r.id}
              petId={id}
              ruleset={r}
              lastVerifiedLabel={new Date(r.last_verified_at).toLocaleDateString("en-US", {
                timeZone: "UTC",
              })}
              initialFulfilled={progressByRuleset.get(r.id) ?? []}
            />
          ))}
        </section>
      )}

      {countries.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="section-title">Destination Countries</h2>
          {countries.map((r) => (
            <ChecklistCard
              key={r.id}
              petId={id}
              ruleset={r}
              lastVerifiedLabel={new Date(r.last_verified_at).toLocaleDateString("en-US", {
                timeZone: "UTC",
              })}
              initialFulfilled={progressByRuleset.get(r.id) ?? []}
            />
          ))}
        </section>
      )}

      {(rulesets ?? []).length === 0 && (
        <div className="empty-state">No travel rulesets available yet.</div>
      )}
    </div>
  );
}
