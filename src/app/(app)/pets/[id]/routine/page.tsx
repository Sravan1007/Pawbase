import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { RoutineList } from "./RoutineList";
import { addRoutine } from "./actions";
import Reveal from "@/components/motion/Reveal";

export default async function RoutinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: pet } = await supabase.from("pets").select("id, name").eq("id", id).maybeSingle();
  if (!pet) notFound();

  const { data: routines } = await supabase
    .from("pet_care_routines")
    .select("id, title, notes, pet_care_routine_logs(completed_on)")
    .eq("pet_id", id)
    .eq("active", true)
    .order("created_at", { ascending: true });

  const routineList = (routines ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    notes: r.notes,
    logs: r.pet_care_routine_logs ?? [],
  }));

  const addRoutineAction = addRoutine.bind(null, id);

  return (
    <Reveal className="flex flex-col gap-8">
      <div>
        <Link href={`/pets/${id}`} className="text-sm text-[var(--accent)] hover:underline">
          ← {pet.name}
        </Link>
        <h1 className="page-title mt-1">Daily care routine</h1>
        <p className="page-subtitle">
          Bath, comb, walks — anything you want tracked day to day. Owner and caretakers both
          see and check off the same list, and a vet can see it once they have an appointment.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="section-title">Today</h2>
        <RoutineList petId={id} routines={routineList} />
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="section-title">Add a routine</h2>
        <form action={addRoutineAction} className="flex flex-col gap-3">
          <label className="field-label">
            Name
            <input name="title" required placeholder="e.g. Bath, Comb, Evening walk" className="input" />
          </label>
          <label className="field-label">
            Notes (optional)
            <input name="notes" placeholder="e.g. Oatmeal shampoo only" className="input" />
          </label>
          <button type="submit" className="btn-primary self-start">
            Add routine
          </button>
        </form>
      </section>
    </Reveal>
  );
}
