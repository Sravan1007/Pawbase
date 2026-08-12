import { requireUser } from "@/lib/supabase/server";
import Link from "next/link";
import ScrollHeader from "@/components/ScrollHeader";

export default async function VetLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <div className="min-h-screen">
      <ScrollHeader className="header-dark sticky top-0 z-10 bg-[var(--ink)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 sm:px-8">
          <Link href="/vet/dashboard" className="flex items-center gap-1.5 text-lg font-bold text-stone-900" style={{ fontFamily: "var(--font-heading)" }}>
            🩺 Pet Passport <span className="badge-neutral">Vet Portal</span>
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit" className="btn-ghost btn-sm">
              Log out
            </button>
          </form>
        </div>
      </ScrollHeader>
      <main className="page-shell">{children}</main>
    </div>
  );
}
