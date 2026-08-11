import Link from "next/link";
import { getAccessiblePets } from "@/lib/pets";
import { getVetListings } from "@/lib/vets";
import BookingForm from "@/components/BookingForm";
import { bookConsultation } from "../consultation/actions";

const benefits = [
  { title: "No travel, no waiting room", desc: "Talk to a vet from wherever your pet is calmest." },
  { title: "Good for follow-ups", desc: "Post-treatment check-ins and medication reviews." },
  { title: "Fast for minor concerns", desc: "Rashes, mild digestive issues, behavior questions." },
  { title: "Escalates when needed", desc: "The vet will tell you plainly if an in-person visit is required." },
];

export default async function VirtualConsultationPage() {
  const [pets, vets] = await Promise.all([getAccessiblePets(), getVetListings()]);
  const action = bookConsultation.bind(null, "virtual");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="page-title">Virtual Vet Consultation</h1>
        <p className="page-subtitle">
          A video call with a vet on Pet Passport — best for questions, follow-ups, and things
          that don&apos;t need a hands-on exam.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {benefits.map((b) => (
          <div key={b.title} className="card-compact">
            <p className="font-semibold text-stone-900">{b.title}</p>
            <p className="mt-1 text-sm text-stone-500">{b.desc}</p>
          </div>
        ))}
      </div>

      <p className="rounded-xl bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning)]">
        Not a substitute for emergency or in-person care. If your pet is in acute distress, book
        an in-clinic{" "}
        <Link href="/consultation" className="font-medium underline">
          Vet Consultation
        </Link>{" "}
        instead.
      </p>

      <section>
        <h2 className="section-title mb-4">Book a video call</h2>
        <BookingForm pets={pets} vets={vets} action={action} submitLabel="Request video call" />
      </section>
    </div>
  );
}
