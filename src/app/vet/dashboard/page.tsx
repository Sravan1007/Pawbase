import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { BookingsList } from "./BookingsList";
import { lookupPetByCode } from "./actions";
import { one } from "@/lib/supabase/relations";
import Reveal from "@/components/motion/Reveal";
import StaggerGrid from "@/components/motion/StaggerGrid";

export default async function VetDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ lookup_error?: string }>;
}) {
  const { lookup_error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: vetProfile }, { data: bookings }, { data: accessRows }] = await Promise.all([
    supabase.from("vets").select("id").eq("id", user.id).maybeSingle(),
    supabase
      .from("vet_bookings")
      .select("id, scheduled_at, type, status, meeting_url, pets(id, name, species)")
      .eq("vet_id", user.id)
      .neq("status", "cancelled")
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("caretaker_access")
      .select("pets(id, name, species, breed)")
      .eq("user_id", user.id)
      .eq("role", "vet"),
  ]);

  const patients = (accessRows ?? []).map((row) => one(row.pets)).filter(Boolean);

  return (
    <Reveal className="flex flex-col gap-10">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Today&apos;s appointments</h1>
        <Link href="/vet/onboard" className="text-sm font-medium text-[var(--accent)] hover:underline">
          {vetProfile ? "Edit profile" : "Complete your profile"}
        </Link>
      </div>

      {!vetProfile && (
        <p className="rounded-lg bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning)]">
          Complete your vet profile before prescribing medication — it&apos;s what pet owners see
          as your credentials.
        </p>
      )}

      <form action={lookupPetByCode} className="card-compact flex items-end gap-2">
        <label className="field-label flex-1">
          Look up a patient by Pet ID
          <input name="pet_code" placeholder="PP-XXXXXX" className="input" />
        </label>
        <button type="submit" className="btn-secondary btn-sm">
          Open
        </button>
      </form>
      {lookup_error === "1" && (
        <p className="text-sm text-[var(--danger)]">
          No pet found with that ID, or you don&apos;t have access to it yet (a booking or
          standing access is required).
        </p>
      )}

      <BookingsList bookings={bookings ?? []} />

      <section className="flex flex-col gap-3">
        <h2 className="section-title">Patients with standing access</h2>
        {patients.length > 0 ? (
          <StaggerGrid className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {patients.map((pet) => (
              <Link
                key={pet!.id}
                href={`/vet/pets/${pet!.id}/prescribe`}
                className="card-compact hover:border-[var(--accent)]"
              >
                <p className="font-medium text-stone-900">{pet!.name}</p>
                <p className="text-sm text-stone-500">
                  {[pet!.species, pet!.breed].filter(Boolean).join(" · ")}
                </p>
              </Link>
            ))}
          </StaggerGrid>
        ) : (
          <p className="text-sm text-stone-400">
            No standing patients yet — owners grant this after a booking if you&apos;ll be
            prescribing ongoing medication.
          </p>
        )}
      </section>
    </Reveal>
  );
}
