import { createClient, requireUser } from "@/lib/supabase/server";
import Link from "next/link";
import { SOSButton } from "@/components/SOSButton";
import ScrollHeader from "@/components/ScrollHeader";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/consultation", label: "Vet Consultation" },
  { href: "/virtual-consultation", label: "Virtual Consultation" },
  { href: "/grooming", label: "Grooming" },
  { href: "/shop", label: "Shop" },
  { href: "/community", label: "Paw Community" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  // RLS ("pets: access via ownership or caretaker_access") already scopes
  // this to pets the viewer can see — no extra owner/caretaker filter
  // needed. Shown to both owner and caretaker so whoever's actually
  // traveling with the pet sees the nearby-vet lookup.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: travelingPets }, { data: caretakerRows }] = await Promise.all([
    supabase.from("pets").select("id").eq("travel_mode_active", true).limit(1),
    user
      ? supabase.from("caretaker_access").select("id").eq("user_id", user.id).eq("role", "caretaker").limit(1)
      : Promise.resolve({ data: null }),
  ]);
  const isTraveling = (travelingPets ?? []).length > 0;
  const isCaretaker = (caretakerRows ?? []).length > 0;

  return (
    <div className="min-h-screen">
      <ScrollHeader className="header-dark sticky top-0 z-10 bg-[var(--ink)]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 sm:px-8">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-lg font-bold text-stone-900" style={{ fontFamily: "var(--font-heading)" }}>
            🐾 Pet Passport
          </Link>
          <nav className="flex flex-wrap items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="nav-link">
                {link.label}
              </Link>
            ))}
            {isCaretaker && (
              <Link href="/caretaker" className="nav-link">
                My Tasks
              </Link>
            )}
            {isTraveling && (
              <Link href="/traveling" className="nav-link font-semibold text-[var(--accent)]">
                ✈️ Traveling
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-3">
            <SOSButton />
            <Link href="/profile" className="nav-link">
              Profile
            </Link>
            <form action="/auth/signout" method="post">
              <button type="submit" className="btn-ghost btn-sm">
                Log out
              </button>
            </form>
          </div>
        </div>
      </ScrollHeader>
      <main className="page-shell">{children}</main>
    </div>
  );
}
