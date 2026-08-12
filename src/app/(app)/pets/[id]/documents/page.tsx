import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/supabase/relations";
import { notFound } from "next/navigation";
import Link from "next/link";
import UploadForm from "./UploadForm";
import { shareDocumentWithVet, revokeDocumentShare } from "./actions";

const typeLabels: Record<string, string> = {
  vaccination: "Vaccination",
  vet_record: "Vet record",
  prescription: "Prescription",
  travel_doc: "Travel document",
  insurance: "Insurance",
};

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: pet } = await supabase.from("pets").select("id, name").eq("id", id).maybeSingle();
  if (!pet) notFound();

  const [{ data: documents }, { data: bookings }] = await Promise.all([
    supabase
      .from("documents")
      .select("id, type, file_url, expiry_date, uploaded_at")
      .eq("pet_id", id)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("vet_bookings")
      .select("id, scheduled_at, type, vets(profiles!vets_id_fkey(full_name))")
      .eq("pet_id", id)
      .neq("status", "cancelled")
      .order("scheduled_at", { ascending: true }),
  ]);

  // Signed URLs — the `documents` bucket is private, so file_url is a
  // storage path, not a public URL; resolve to short-lived links in one
  // batched call rather than one round-trip per document.
  const signedUrls = new Map<string, string>();
  if (documents && documents.length > 0) {
    const { data: signedUrlResults } = await supabase.storage
      .from("documents")
      .createSignedUrls(documents.map((d) => d.file_url), 300);
    (signedUrlResults ?? []).forEach((result, i) => {
      if (result.signedUrl) signedUrls.set(documents[i].id, result.signedUrl);
    });
  }

  const { data: shares } = await supabase
    .from("document_shares")
    .select("id, document_id, vet_bookings(scheduled_at, vets(profiles!vets_id_fkey(full_name)))")
    .in("document_id", (documents ?? []).map((d) => d.id).length > 0 ? (documents ?? []).map((d) => d.id) : ["00000000-0000-0000-0000-000000000000"]);

  const sharesByDoc = new Map<string, typeof shares>();
  (shares ?? []).forEach((s) => {
    const list = sharesByDoc.get(s.document_id) ?? [];
    list.push(s);
    sharesByDoc.set(s.document_id, list);
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href={`/pets/${id}`} className="text-sm text-[var(--accent)] hover:underline">
          ← {pet.name}
        </Link>
        <h1 className="page-title mt-1">Documents</h1>
        <p className="page-subtitle">
          Vaccination records, vet visits, and anything else worth keeping — share specific
          documents with a vet for an upcoming visit instead of granting full access.
        </p>
      </div>

      <UploadForm petId={id} />

      <section className="flex flex-col gap-3">
        {documents && documents.length > 0 ? (
          documents.map((doc) => {
            const docShares = sharesByDoc.get(doc.id) ?? [];
            const shareAction = shareDocumentWithVet.bind(null, id);
            return (
              <div key={doc.id} className="card-compact flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-stone-900">{typeLabels[doc.type] ?? doc.type}</p>
                    <p className="text-xs text-stone-500">
                      Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                      {doc.expiry_date && ` · expires ${doc.expiry_date}`}
                    </p>
                  </div>
                  {signedUrls.has(doc.id) && (
                    <a
                      href={signedUrls.get(doc.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary btn-sm shrink-0"
                    >
                      View
                    </a>
                  )}
                </div>

                {docShares.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {docShares.map((s) => {
                      const booking = one(s.vet_bookings);
                      const vet = booking ? one(booking.vets) : null;
                      const vetProfile = vet ? one(vet.profiles) : null;
                      return (
                        <li key={s.id} className="flex items-center justify-between text-xs text-stone-500">
                          <span>
                            Shared with {vetProfile?.full_name ?? "vet"}
                            {booking && ` for ${new Date(booking.scheduled_at).toLocaleDateString()}`}
                          </span>
                          <form action={revokeDocumentShare.bind(null, id, s.id)}>
                            <button type="submit" className="text-[var(--danger)] hover:underline">
                              Revoke
                            </button>
                          </form>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {bookings && bookings.length > 0 && (
                  <form action={shareAction} className="flex items-center gap-2">
                    <input type="hidden" name="document_id" value={doc.id} />
                    <select name="booking_id" required className="input mt-0 flex-1 text-xs">
                      <option value="">Share with vet for...</option>
                      {bookings.map((b) => {
                        const vet = one(b.vets);
                        const vetProfile = vet ? one(vet.profiles) : null;
                        return (
                          <option key={b.id} value={b.id}>
                            {vetProfile?.full_name ?? "Vet"} · {new Date(b.scheduled_at).toLocaleDateString()} ({b.type})
                          </option>
                        );
                      })}
                    </select>
                    <button type="submit" className="btn-secondary btn-sm shrink-0">
                      Share
                    </button>
                  </form>
                )}
              </div>
            );
          })
        ) : (
          <div className="empty-state">No documents uploaded yet.</div>
        )}
      </section>
    </div>
  );
}
