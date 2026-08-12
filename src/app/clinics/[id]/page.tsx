import { createClient } from "@/lib/supabase/server";
import { getVetListing } from "@/lib/vets";
import { notFound } from "next/navigation";
import Link from "next/link";
import Reveal from "@/components/motion/Reveal";
import StaggerGrid from "@/components/motion/StaggerGrid";

export default async function ClinicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    vet,
    { data: reviews },
  ] = await Promise.all([
    supabase.auth.getUser(),
    getVetListing(id),
    supabase
      .from("vet_reviews")
      .select("id, rating, comment, created_at")
      .eq("vet_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!vet) notFound();

  const bookHref = user ? "/consultation" : "/login?next=/consultation";

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 text-lg font-bold text-stone-900">
            🐾 Pet Passport
          </Link>
          <Link href="/clinics" className="text-sm text-stone-600 hover:text-stone-900">
            ← All clinics
          </Link>
        </div>
      </header>

      <main className="page-shell">
        <Reveal className="mx-auto flex max-w-2xl flex-col gap-8">
          <div className="flex items-center gap-4">
            {vet.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vet.photo_url} alt="" className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent-soft)] text-3xl">
                🩺
              </div>
            )}
            <div>
              <h1 className="page-title">{vet.full_name}</h1>
              {vet.designation && <p className="text-stone-500">{vet.designation}</p>}
              {vet.clinic_name && <p className="text-stone-700">{vet.clinic_name}</p>}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-stone-500">
            {vet.years_experience != null && <span>{vet.years_experience} years experience</span>}
            {vet.avg_rating != null && (
              <span>
                ★ {vet.avg_rating.toFixed(1)} ({vet.review_count} review{vet.review_count === 1 ? "" : "s"})
              </span>
            )}
          </div>

          {vet.credentials && (
            <section className="card">
              <h2 className="section-title mb-2">Credentials</h2>
              <p className="whitespace-pre-wrap text-sm text-stone-700">{vet.credentials}</p>
            </section>
          )}

          {(vet.clinic_address || vet.amenities.length > 0 || vet.species_focus.length > 0) && (
            <section className="card flex flex-col gap-2">
              <h2 className="section-title">Clinic</h2>
              {vet.clinic_address && <p className="text-sm text-stone-700">{vet.clinic_address}</p>}
              {vet.species_focus.length > 0 && (
                <p className="text-sm text-stone-500">Sees: {vet.species_focus.join(", ")}</p>
              )}
              {vet.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {vet.amenities.map((a) => (
                    <span key={a} className="badge-neutral">
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}

          {vet.clinic_photos.length > 0 && (
            <StaggerGrid className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {vet.clinic_photos.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt="Clinic" className="aspect-square w-full rounded-lg object-cover" />
              ))}
            </StaggerGrid>
          )}

          <section className="card">
            <h2 className="section-title mb-3">Reviews</h2>
            {reviews && reviews.length > 0 ? (
              <ul className="flex flex-col gap-3 text-sm">
                {reviews.map((r) => (
                  <li key={r.id} className="border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-stone-900">{"★".repeat(r.rating)}</span>
                      <span className="text-xs text-stone-400">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {r.comment && <p className="mt-1 text-stone-600">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-stone-400">No reviews yet.</p>
            )}
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <Link href={bookHref} className="btn-primary">
              Book with {vet.full_name}
            </Link>
            {vet.contact_email && (
              <a href={`mailto:${vet.contact_email}`} className="btn-secondary">
                Email
              </a>
            )}
            {vet.contact_phone && (
              <a href={`tel:${vet.contact_phone}`} className="btn-secondary">
                Call
              </a>
            )}
          </div>
        </Reveal>
      </main>
    </div>
  );
}
