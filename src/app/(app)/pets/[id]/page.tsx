import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/supabase/relations";
import { generateQrDataUrl } from "@/lib/qrcode";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import CopyCodeButton from "./CopyCodeButton";
import DeletePetButton from "./DeletePetButton";
import { QrCodeCard } from "./QrCodeCard";

export default async function PetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: pet } = await supabase
    .from("pets")
    .select("id, name, species, breed, dob, medical_notes, owner_id, pet_code, photo_url")
    .eq("id", id)
    .maybeSingle();

  if (!pet) notFound();

  const isOwner = user?.id === pet.owner_id;

  const [{ data: documents }, { data: qrTag }, { data: medReminders }, { data: caretakers }, { data: bookings }] =
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
        .select("id, role, profiles(full_name, email, photo_url)")
        .eq("pet_id", id),
      supabase
        .from("vet_bookings")
        .select("id, scheduled_at, type, status, meeting_url, vets(profiles!vets_id_fkey(full_name))")
        .eq("pet_id", id)
        .order("scheduled_at", { ascending: false }),
    ]);

  // Independent of the Promise.all above (which gates nothing critical) —
  // vet_visit_notes/documents new columns are additive, no crash risk if
  // this table doesn't exist yet on an unmigrated DB.
  const { data: visitNotes } = await supabase
    .from("vet_visit_notes")
    .select("id, note, created_at, vets(profiles!vets_id_fkey(full_name))")
    .eq("pet_id", id)
    .order("created_at", { ascending: false });

  let qrDataUrl: string | null = null;
  let emergencyUrl: string | null = null;
  if (qrTag) {
    const h = await headers();
    const host = h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    emergencyUrl = `${proto}://${host}/qr/${qrTag.unique_slug}`;
    qrDataUrl = await generateQrDataUrl(emergencyUrl);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {pet.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pet.photo_url} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)] text-2xl">
              🐾
            </div>
          )}
          <div>
            <h1 className="page-title">{pet.name}</h1>
            <p className="page-subtitle">
              {[pet.species, pet.breed].filter(Boolean).join(" · ")}
              {pet.dob ? ` · born ${pet.dob}` : ""}
            </p>
            {isOwner && <DeletePetButton petId={pet.id} petName={pet.name} />}
          </div>
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
        <section className="card flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="section-title mb-2">QR emergency tag</h2>
            <p className="text-sm text-stone-500">
              Status: <span className="badge-success">{qrTag.status}</span>
            </p>
            <Link href={`/qr/${qrTag.unique_slug}`} className="mt-2 inline-block text-sm font-medium text-[var(--accent)] hover:underline">
              View public emergency page →
            </Link>
            <p className="mt-3 max-w-xs text-xs text-stone-400">
              Print this and attach it to a collar tag, or scan it yourself to confirm what a
              finder would see.
            </p>
          </div>
          {qrDataUrl && emergencyUrl && (
            <QrCodeCard petName={pet.name} dataUrl={qrDataUrl} emergencyUrl={emergencyUrl} />
          )}
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
        <div className="flex items-center justify-between">
          <h2 className="section-title">Daily Care Routine</h2>
          <Link href={`/pets/${id}/routine`} className="text-sm font-medium text-[var(--accent)] hover:underline">
            View & track →
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
          <h2 className="section-title">Vet bookings</h2>
        </div>
        {bookings && bookings.length > 0 ? (
          <ul className="flex flex-col gap-2 text-sm">
            {bookings.map((b) => {
              const vet = one(b.vets);
              const vetProfile = vet ? one(vet.profiles) : null;
              return (
                <li key={b.id} className="flex items-center justify-between gap-3">
                  <span>
                    {vetProfile?.full_name ?? "Vet"} — {new Date(b.scheduled_at).toLocaleDateString()}
                    <span className="text-stone-400"> · {b.type === "virtual" ? "Video call" : "In-clinic"}</span>
                    {b.type === "virtual" && b.meeting_url && b.status !== "cancelled" && (
                      <>
                        {" "}
                        ·{" "}
                        <a
                          href={b.meeting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[var(--accent)] hover:underline"
                        >
                          Join call
                        </a>
                      </>
                    )}
                  </span>
                  <span
                    className={
                      b.status === "confirmed"
                        ? "badge-success"
                        : b.status === "completed"
                          ? "badge-neutral"
                          : b.status === "cancelled"
                            ? "badge-neutral"
                            : "badge-warning"
                    }
                  >
                    {b.status}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-stone-400">No bookings yet.</p>
        )}
      </section>

      <section className="card">
        <h2 className="section-title mb-3">Vet visit notes</h2>
        {visitNotes && visitNotes.length > 0 ? (
          <ul className="flex flex-col gap-3 text-sm">
            {visitNotes.map((n) => {
              const vet = one(n.vets);
              const vetProfile = vet ? one(vet.profiles) : null;
              return (
                <li key={n.id}>
                  <p className="text-stone-700">{n.note}</p>
                  <p className="text-xs text-stone-400">
                    {vetProfile?.full_name ?? "Vet"} · {new Date(n.created_at).toLocaleString()}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-stone-400">No visit notes yet.</p>
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
              const profile = one(c.profiles);
              return (
                <li key={c.id} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {profile?.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.photo_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 text-xs">
                        🐾
                      </span>
                    )}
                    {profile?.full_name ?? profile?.email}
                  </span>
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
