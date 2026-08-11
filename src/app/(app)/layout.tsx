import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/consultation", label: "Vet Consultation" },
  { href: "/virtual-consultation", label: "Virtual Consultation" },
  { href: "/grooming", label: "Grooming" },
  { href: "/shop", label: "Shop" },
  { href: "/community", label: "Paw Community" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-lg font-bold text-stone-900">
            🐾 Pet Passport
          </Link>
          <nav className="flex flex-wrap items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="nav-link">
                {link.label}
              </Link>
            ))}
          </nav>
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
