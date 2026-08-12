import { createClient } from "@/lib/supabase/server";
import { getVetListings } from "@/lib/vets";
import Link from "next/link";

export default async function ClinicsPage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    vets,
  ] = await Promise.all([supabase.auth.getUser(), getVetListings()]);

  const bookHref = user ? "/consultation" : "/login?next=/consultation";

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 text-lg font-bold text-stone-900">
            🐾 Pet Passport
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/spa" className="text-stone-600 hover:text-stone-900">
              Grooming
            </Link>
            {user ? (
              <Link href="/dashboard" className="btn-primary btn-sm">
                Dashboard
              </Link>
            ) : (
              <Link href="/login" className="text-stone-600 hover:text-stone-900">
                Log in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="page-shell">
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="page-title">Clinics on Pet Passport</h1>
            <p className="page-subtitle">
              Browse vets and clinics — booking a time just needs a quick login.
            </p>
          </div>

          {vets.length === 0 ? (
            <div className="empty-state">No clinics onboarded yet — check back soon.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vets.map((v) => (
                <Link
                  key={v.id}
                  href={`/clinics/${v.id}`}
                  className="card-compact flex flex-col gap-2 hover:border-[var(--accent)]"
                >
                  <div className="flex items-center gap-3">
                    {v.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.photo_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xl">
                        🩺
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-stone-900">{v.full_name}</p>
                      {v.designation && <p className="text-xs text-stone-500">{v.designation}</p>}
                    </div>
                  </div>
                  {v.clinic_name && <p className="text-sm text-stone-700">{v.clinic_name}</p>}
                  {v.clinic_address && <p className="text-xs text-stone-400">{v.clinic_address}</p>}
                  <div className="mt-1 flex items-center gap-2 text-xs text-stone-500">
                    {v.years_experience != null && <span>{v.years_experience}y experience</span>}
                    {v.avg_rating != null && (
                      <span>
                        ★ {v.avg_rating.toFixed(1)} ({v.review_count})
                      </span>
                    )}
                  </div>
                  {v.species_focus.length > 0 && (
                    <p className="text-xs text-stone-400">Sees: {v.species_focus.join(", ")}</p>
                  )}
                </Link>
              ))}
            </div>
          )}

          <Link href={bookHref} className="btn-primary self-start">
            Book a consultation
          </Link>
        </div>
      </main>
    </div>
  );
}
