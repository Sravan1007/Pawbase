import { requireUser } from "@/lib/supabase/server";
import Link from "next/link";

export default async function VetLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3 sm:px-8">
          <Link href="/vet/dashboard" className="flex items-center gap-1.5 text-lg font-bold text-stone-900">
            🩺 Pet Passport <span className="badge-neutral">Vet Portal</span>
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit" className="btn-ghost btn-sm">
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="page-shell">{children}</main>
    </div>
  );
}
