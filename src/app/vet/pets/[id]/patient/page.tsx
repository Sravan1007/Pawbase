import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/supabase/relations";
import { notFound } from "next/navigation";
import Link from "next/link";
import { VisitNoteForm } from "./VisitNoteForm";

const typeLabels: Record<string, string> = {
  vaccination: "Vaccination",
  vet_record: "Vet record",
  prescription: "Prescription",
  travel_doc: "Travel document",
  insurance: "Insurance",
};

export default async function PatientHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: pet } = await supabase
    .from("pets")
    .select("id, name, species, breed, medical_notes")
    .eq("id", id)
    .maybeSingle();
  if (!pet) notFound();

  const [{ data: shares }, { data: reminders }, { data: routines }, { data: visitNotes }] = await Promise.all([
    // Only documents this vet was explicitly shared for a booking with this
    // pet — never the pet's full document vault (see document_shares RLS).
    supabase
      .from("document_shares")
      .select("id, documents!inner(id, type, file_url, expiry_date, uploaded_at, pet_id)")
      .eq("vet_id", user.id)
      .eq("documents.pet_id", id),
    // Readable via vet_has_booking_with_pet (0008) once this vet has any
    // non-cancelled booking with the pet, independent of standing access.
    supabase
      .from("medication_reminders")
      .select("id, dose, schedule, photo_url, owner_confirmed_at, created_at")
      .eq("pet_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("pet_care_routines")
      .select("id, title, notes, pet_care_routine_logs(completed_on)")
      .eq("pet_id", id)
      .eq("active", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("vet_visit_notes")
      .select("id, note, created_at, vet_id")
      .eq("pet_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const documents = (shares ?? []).map((s) => one(s.documents)).filter(Boolean);
  const signedUrls = new Map<string, string>();
  if (documents.length > 0) {
    const { data: signedUrlResults } = await supabase.storage
      .from("documents")
      .createSignedUrls(documents.map((d) => d!.file_url), 300);
    (signedUrlResults ?? []).forEach((result, i) => {
      if (result.signedUrl) signedUrls.set(documents[i]!.id, result.signedUrl);
    });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div>
        <h1 className="page-title">{pet.name}&apos;s history</h1>
        <p className="page-subtitle">
          {[pet.species, pet.breed].filter(Boolean).join(" · ")} — shared documents, past
          prescriptions, and current care routine ahead of this appointment.
        </p>
      </div>

      {pet.medical_notes && (
        <section className="card border-[var(--warning)]/30 bg-[var(--warning-soft)]">
          <h2 className="section-title mb-1 text-[var(--warning)]">Critical medical info</h2>
          <p className="whitespace-pre-wrap text-stone-800">{pet.medical_notes}</p>
        </section>
      )}

      <section className="card">
        <h2 className="section-title mb-3">Shared documents</h2>
        {documents.length > 0 ? (
          <ul className="flex flex-col gap-2 text-sm">
            {documents.map((doc) => (
              <li key={doc!.id} className="flex items-center justify-between gap-3">
                <span>
                  {typeLabels[doc!.type] ?? doc!.type}
                  {doc!.expiry_date && (
                    <span className="text-stone-400"> · expires {doc!.expiry_date}</span>
                  )}
                </span>
                {signedUrls.has(doc!.id) && (
                  <a
                    href={signedUrls.get(doc!.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary btn-sm shrink-0"
                  >
                    View
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-400">
            No documents shared with you for this pet yet.
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="section-title mb-3">Prescription history</h2>
        {reminders && reminders.length > 0 ? (
          <ul className="flex flex-col gap-3 text-sm">
            {reminders.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3">
                <span>
                  {m.dose} — {m.schedule}
                  <span className="text-stone-400">
                    {" "}
                    · {new Date(m.created_at).toLocaleDateString()}
                  </span>
                </span>
                <span className={m.owner_confirmed_at ? "badge-success" : "badge-warning"}>
                  {m.owner_confirmed_at ? "Confirmed" : "Awaiting owner review"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-400">No prior prescriptions on file.</p>
        )}
      </section>

      <section className="card">
        <h2 className="section-title mb-3">Daily care routine</h2>
        {routines && routines.length > 0 ? (
          <ul className="flex flex-col gap-2 text-sm">
            {routines.map((r) => {
              const logs = (r.pet_care_routine_logs ?? []) as { completed_on: string }[];
              const lastDone = logs.sort((a, b) => (a.completed_on < b.completed_on ? 1 : -1))[0];
              return (
                <li key={r.id} className="flex items-center justify-between gap-3">
                  <span>
                    {r.title}
                    {r.notes && <span className="text-stone-400"> — {r.notes}</span>}
                  </span>
                  <span className="text-xs text-stone-400">
                    {lastDone ? `Last done ${lastDone.completed_on}` : "Not logged yet"}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-stone-400">No routine set up for this pet yet.</p>
        )}
      </section>

      <section className="card">
        <h2 className="section-title mb-3">Visit notes</h2>
        <VisitNoteForm petId={id} />
        {visitNotes && visitNotes.length > 0 && (
          <ul className="mt-4 flex flex-col gap-3 border-t border-[var(--border)] pt-3 text-sm">
            {visitNotes.map((n) => (
              <li key={n.id}>
                <p className="text-stone-700">{n.note}</p>
                <p className="text-xs text-stone-400">{new Date(n.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href={`/vet/pets/${id}/prescribe`} className="btn-primary self-start">
        Prescribe medication
      </Link>
    </div>
  );
}
