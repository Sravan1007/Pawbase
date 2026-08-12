"use client";

import Link from "next/link";
import { useState } from "react";
import { updateBookingStatus, setMeetingLink } from "./actions";
import { one } from "@/lib/supabase/relations";

export type Booking = {
  id: string;
  scheduled_at: string;
  type: string;
  status: string;
  meeting_url: string | null;
  pets: { id: string; name: string; species: string } | { id: string; name: string; species: string }[] | null;
};

// "Today" has to mean the vet's own local day, not the server's — this runs
// client-side so `new Date()` resolves in the vet's actual browser timezone
// rather than wherever the Next.js server process happens to be deployed.
function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function MeetingLinkControl({ bookingId, meetingUrl }: { bookingId: string; meetingUrl: string | null }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(meetingUrl ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await setMeetingLink(bookingId, value.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex w-full items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://meet.google.com/..."
          className="input mt-0 flex-1 text-xs"
        />
        <button type="button" onClick={save} disabled={saving} className="btn-secondary btn-sm shrink-0">
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    );
  }

  return meetingUrl ? (
    <div className="flex items-center gap-2 text-xs">
      <a href={meetingUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
        {meetingUrl}
      </a>
      <button type="button" onClick={() => setEditing(true)} className="text-stone-400 hover:underline">
        Edit
      </button>
    </div>
  ) : (
    <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-[var(--accent)] hover:underline">
      + Add call link
    </button>
  );
}

function BookingRow({ b }: { b: Booking }) {
  const pet = one(b.pets);
  return (
    <div className="card-compact flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
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
            <form action={updateBookingStatus.bind(null, b.id, "confirmed")}>
              <button type="submit" className="btn-secondary btn-sm">
                Confirm
              </button>
            </form>
          )}
          {b.status === "confirmed" && (
            <form action={updateBookingStatus.bind(null, b.id, "completed")}>
              <button type="submit" className="btn-secondary btn-sm">
                Mark done
              </button>
            </form>
          )}
          {pet && (
            <>
              <Link href={`/vet/pets/${pet.id}/patient`} className="btn-ghost btn-sm">
                History
              </Link>
              <Link href={`/vet/pets/${pet.id}/prescribe`} className="btn-ghost btn-sm">
                Prescribe
              </Link>
            </>
          )}
        </div>
      </div>
      {b.type === "virtual" && b.status !== "cancelled" && (
        <MeetingLinkControl bookingId={b.id} meetingUrl={b.meeting_url} />
      )}
    </div>
  );
}

export function BookingsList({ bookings }: { bookings: Booking[] }) {
  const today = new Date();
  const todaysBookings = bookings.filter((b) => isSameDay(new Date(b.scheduled_at), today));
  const upcomingBookings = bookings.filter((b) => !isSameDay(new Date(b.scheduled_at), today));

  return (
    <>
      <section className="flex flex-col gap-3">
        {todaysBookings.length > 0 ? (
          todaysBookings.map((b) => <BookingRow key={b.id} b={b} />)
        ) : (
          <div className="empty-state">Nothing on the books for today.</div>
        )}
      </section>

      {upcomingBookings.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="section-title">Upcoming</h2>
          {upcomingBookings.map((b) => (
            <BookingRow key={b.id} b={b} />
          ))}
        </section>
      )}
    </>
  );
}
