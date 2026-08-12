import Link from "next/link";

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
      <header className="border-b border-[var(--border)] px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="flex items-center gap-1.5 text-lg font-bold text-stone-900">
            🐾 Pet Passport
          </span>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/clinics" className="text-stone-600 hover:text-stone-900">
              Clinics
            </Link>
            <Link href="/spa" className="text-stone-600 hover:text-stone-900">
              Grooming
            </Link>
            <Link href="/login" className="text-stone-600 hover:text-stone-900">
              Log in
            </Link>
            <Link href="/signup" className="btn-primary btn-sm">
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-5 py-20 text-center sm:px-8">
        <h1 className="text-4xl font-bold text-stone-900 sm:text-5xl">
          One hub for everything your pet needs
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
      </section>

      <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 px-5 pb-24 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="card-compact">
            <p className="font-semibold text-stone-900">{f.title}</p>
            <p className="mt-1 text-sm text-stone-500">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
