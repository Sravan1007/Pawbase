import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { updateBookingStatus } from "./actions";

type Booking = {
  id: string;
  scheduled_at: string;
  type: string;
  status: string;
  pets: { id: string; name: string; species: string } | { id: string; name: string; species: string }[] | null;
};

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export default async function VetDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: vetProfile } = await supabase
    .from("vets")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  const [{ data: bookings }, { data: accessRows }] = await Promise.all([
    supabase
      .from("vet_bookings")
      .select("id, scheduled_at, type, status, pets(id, name, species)")
      .eq("vet_id", user.id)
      .neq("status", "cancelled")
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("caretaker_access")
      .select("pets(id, name, species, breed)")
      .eq("user_id", user.id)
      .eq("role", "vet"),
  ]);

  const today = new Date();
  const todaysBookings = (bookings ?? []).filter((b) => isSameDay(new Date(b.scheduled_at), today));
  const upcomingBookings = (bookings ?? []).filter((b) => !isSameDay(new Date(b.scheduled_at), today));

  const patients = (accessRows ?? [])
    .map((row) => (Array.isArray(row.pets) ? row.pets[0] : row.pets))
    .filter(Boolean);

  const confirmAction = updateBookingStatus.bind(null);

  function BookingRow({ b }: { b: Booking }) {
    const pet = Array.isArray(b.pets) ? b.pets[0] : b.pets;
    return (
      <div className="card-compact flex items-center justify-between gap-4">
        <div>
          <p className="font-medium text-stone-900">{pet?.name ?? "Pet"}</p>
          <p className="text-sm text-stone-500">
            {new Date(b.scheduled_at).toLocaleString(undefined, {
              weekday: "short",
              hour: "numeric",
              minute: "2-digit",
              month: "short",
              day: "numeric",
            })}{" "}
            · {b.type === "virtual" ? "Video call" : "In-clinic"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={
              b.status === "confirmed"
                ? "badge-success"
                : b.status === "completed"
                  ? "badge-neutral"
                  : "badge-warning"
            }
          >
            {b.status}
          </span>
          {b.status === "requested" && (
            <form action={confirmAction.bind(null, b.id, "confirmed")}>
              <button type="submit" className="btn-secondary btn-sm">
                Confirm
              </button>
            </form>
          )}
          {b.status === "confirmed" && (
            <form action={confirmAction.bind(null, b.id, "completed")}>
              <button type="submit" className="btn-secondary btn-sm">
                Mark done
              </button>
            </form>
          )}
          {pet && (
            <Link href={`/vet/pets/${pet.id}/prescribe`} className="btn-ghost btn-sm">
              Prescribe
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
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

      <section className="flex flex-col gap-3">
        {todaysBookings.length > 0 ? (
          todaysBookings.map((b) => <BookingRow key={b.id} b={b as Booking} />)
        ) : (
          <div className="empty-state">Nothing on the books for today.</div>
        )}
      </section>

      {upcomingBookings.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="section-title">Upcoming</h2>
          {upcomingBookings.map((b) => (
            <BookingRow key={b.id} b={b as Booking} />
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="section-title">Patients with standing access</h2>
        {patients.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          </div>
        ) : (
          <p className="text-sm text-stone-400">
            No standing patients yet — owners grant this after a booking if you&apos;ll be
            prescribing ongoing medication.
          </p>
        )}
      </section>
    </div>
  );
}
