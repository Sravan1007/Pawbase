import { createClient } from "@/lib/supabase/server";
import { tiers } from "@/app/(app)/grooming/tiers";
import Link from "next/link";

export default async function PublicSpaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const bookHref = user ? "/grooming" : "/login?next=/grooming";

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 text-lg font-bold text-stone-900">
            🐾 Pet Passport
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/clinics" className="text-stone-600 hover:text-stone-900">
              Clinics
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
            <h1 className="page-title">Pet Grooming</h1>
            <p className="page-subtitle">
              Bath, trim, and spa services — pick a tier and book a slot once you&apos;re logged
              in.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {tiers.map((t) => (
              <div key={t.id} className="card-compact">
                <div className="flex items-baseline justify-between">
                  <p className="font-semibold text-stone-900">{t.name}</p>
                  <p className="font-semibold text-[var(--accent)]">{t.price}</p>
                </div>
                <p className="mt-1 text-sm text-stone-500">{t.desc}</p>
              </div>
            ))}
          </div>

          <Link href={bookHref} className="btn-primary self-start">
            Book grooming
          </Link>
        </div>
      </main>
    </div>
  );
}
