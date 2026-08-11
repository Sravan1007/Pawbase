import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import CopyCodeButton from "./CopyCodeButton";

export default async function PetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: pet } = await supabase
    .from("pets")
    .select("id, name, species, breed, dob, medical_notes, owner_id, pet_code")
    .eq("id", id)
    .maybeSingle();

  if (!pet) notFound();

  const [{ data: documents }, { data: qrTag }, { data: medReminders }, { data: caretakers }] =
    await Promise.all([
      supabase
        .from("documents")
        .select("id, type, expiry_date, uploaded_at")
        .eq("pet_id", id)
        .order("uploaded_at", { ascending: false }),
      supabase.from("qr_tags").select("unique_slug, status").eq("pet_id", id).maybeSingle(),
      supabase
        .from("medication_reminders")
        .select("id, dose, schedule, owner_confirmed_at, photo_url")
        .eq("pet_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("caretaker_access")
        .select("id, role, profiles(full_name, email)")
        .eq("pet_id", id),
    ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{pet.name}</h1>
          <p className="page-subtitle">
            {[pet.species, pet.breed].filter(Boolean).join(" · ")}
            {pet.dob ? ` · born ${pet.dob}` : ""}
          </p>
        </div>
        {pet.pet_code && (
          <div className="card-compact flex items-center gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-stone-400">Universal Pet ID</p>
              <p className="font-mono text-lg font-semibold text-stone-900">{pet.pet_code}</p>
            </div>
            <CopyCodeButton code={pet.pet_code} />
          </div>
        )}
      </div>

      {qrTag && (
        <section className="card">
          <h2 className="section-title mb-2">QR emergency tag</h2>
          <p className="text-sm text-stone-500">
            Status: <span className="badge-success">{qrTag.status}</span>
          </p>
          <Link href={`/qr/${qrTag.unique_slug}`} className="mt-2 inline-block text-sm font-medium text-[var(--accent)] hover:underline">
            View public emergency page →
          </Link>
        </section>
      )}

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">Documents</h2>
          <Link href={`/pets/${id}/documents`} className="text-sm font-medium text-[var(--accent)] hover:underline">
            {documents && documents.length > 0 ? "View & upload →" : "Upload →"}
          </Link>
        </div>
        {documents && documents.length > 0 ? (
          <ul className="flex flex-col gap-1 text-sm">
            {documents.slice(0, 4).map((doc) => (
              <li key={doc.id} className="flex justify-between">
                <span className="capitalize">{doc.type.replace("_", " ")}</span>
                {doc.expiry_date && <span className="text-stone-400">expires {doc.expiry_date}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-400">No documents uploaded yet.</p>
        )}
      </section>

      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Travel Documents</h2>
          <Link href={`/pets/${id}/travel`} className="text-sm font-medium text-[var(--accent)] hover:underline">
            View checklist →
          </Link>
        </div>
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">Medication</h2>
          <Link href={`/pets/${id}/medications`} className="text-sm font-medium text-[var(--accent)] hover:underline">
            View all →
          </Link>
        </div>
        {medReminders && medReminders.length > 0 ? (
          <ul className="flex flex-col gap-2 text-sm">
            {medReminders.map((m) => (
              <li key={m.id} className="flex items-center justify-between">
                <span>
                  {m.dose} — {m.schedule}
                </span>
                <span className={m.owner_confirmed_at ? "badge-success" : "badge-warning"}>
                  {m.owner_confirmed_at ? "Confirmed" : "Awaiting owner review"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-400">No prescriptions yet.</p>
        )}
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">Caretakers</h2>
          <Link href={`/pets/${id}/caretakers/new`} className="text-sm font-medium text-[var(--accent)] hover:underline">
            Invite
          </Link>
        </div>
        {caretakers && caretakers.length > 0 ? (
          <ul className="flex flex-col gap-1 text-sm">
            {caretakers.map((c) => {
              const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
              return (
                <li key={c.id} className="flex justify-between">
                  <span>{profile?.full_name ?? profile?.email}</span>
                  <span className="badge-neutral capitalize">{c.role.replace("_", " ")}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-stone-400">No caretakers added yet.</p>
        )}
      </section>

      {pet.medical_notes && (
        <section className="card border-[var(--warning)]/30 bg-[var(--warning-soft)]">
          <h2 className="section-title mb-1 text-[var(--warning)]">Critical medical info</h2>
          <p className="whitespace-pre-wrap text-stone-800">{pet.medical_notes}</p>
        </section>
      )}
    </div>
  );
}
