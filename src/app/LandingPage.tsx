import Link from "next/link";
import NotifySignup from "@/components/NotifySignup";
import ScrollHeader from "@/components/ScrollHeader";
import Reveal from "@/components/motion/Reveal";
import StaggerGrid from "@/components/motion/StaggerGrid";

const features = [
  {
    title: "Document vault",
    desc: "Vaccination records, vet visits, and travel paperwork — organized, searchable, and shareable with a vet for just one visit.",
  },
  {
    title: "QR emergency tag",
    desc: "A lost pet's tag opens a no-login public page with medical info and your contact — works even if your plan has lapsed.",
  },
  {
    title: "Caretaker coordination",
    desc: "Grant a caretaker access, and medication only goes live for them once you've reviewed and confirmed the vet's prescription.",
  },
  {
    title: "Daily care routine",
    desc: "Track baths, combing, walks, and anything else your pet needs day to day — shared between owner and caretaker.",
  },
  {
    title: "Vet booking",
    desc: "Book in-clinic or virtual consultations with vets on Pet Passport, complete with clinic photos, amenities, and reviews.",
  },
  {
    title: "Universal Pet ID",
    desc: "Every pet gets a short, shareable code and a home for its full booking and medical history, reachable any time.",
  },
];

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <ScrollHeader className="header-dark sticky top-0 z-10 bg-[var(--ink)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="flex items-center gap-1.5 text-lg font-bold text-stone-900" style={{ fontFamily: "var(--font-heading)" }}>
            🐾 Pet Passport
          </span>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/clinics" className="nav-link">
              Clinics
            </Link>
            <Link href="/spa" className="nav-link">
              Grooming
            </Link>
            <Link href="/login" className="nav-link">
              Log in
            </Link>
            <Link href="/signup" className="btn-primary btn-sm">
              Sign up
            </Link>
          </nav>
        </div>
      </ScrollHeader>

      <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-5 py-20 text-center sm:px-8">
        <h1
          className="text-4xl font-bold text-stone-900 sm:text-5xl"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          One hub for <em className="italic text-[var(--accent)]">everything</em> your pet needs
        </h1>
        <p className="max-w-xl text-lg text-stone-500">
          Documents, vet care, daily routines, and an emergency tag that always works — for
          owners, caretakers, and the vets they trust.
        </p>
        <div className="mt-2 flex items-center gap-3">
          <Link href="/signup" className="btn-primary">
            Get started
          </Link>
          <Link href="/clinics" className="btn-secondary">
            Browse clinics
          </Link>
        </div>
      </Reveal>

      <StaggerGrid className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 px-5 pb-24 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="card-compact">
            <p className="font-semibold text-stone-900">{f.title}</p>
            <p className="mt-1 text-sm text-stone-500">{f.desc}</p>
          </div>
        ))}
      </StaggerGrid>

      <Reveal className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 px-5 pb-24 text-center sm:px-8">
        <p className="font-semibold text-stone-900">Not ready to sign up yet?</p>
        <p className="text-sm text-stone-500">Get an email when we ship something new.</p>
        <NotifySignup />
      </Reveal>
    </main>
  );
}
