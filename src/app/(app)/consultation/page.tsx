import { getAccessiblePets } from "@/lib/pets";
import { getVetListings } from "@/lib/vets";
import BookingForm from "@/components/BookingForm";
import { bookConsultation } from "./actions";

const services = [
  { title: "Regular Health Check-Up", desc: "Routine wellness exam to catch issues early." },
  { title: "Injury, Wound & Trauma Care", desc: "Urgent hands-on care for cuts, sprains, and accidents." },
  { title: "Dental", desc: "Checkups and cleaning to keep teeth and gums healthy." },
  { title: "Deworming", desc: "Scheduled deworming appropriate for your pet's age and weight." },
  { title: "Tick & Flea Control", desc: "Prevention and treatment plans for parasites." },
  { title: "Vaccination", desc: "Core and lifestyle vaccines, logged straight to the document vault." },
];

export default async function ConsultationPage() {
  const [pets, vets] = await Promise.all([getAccessiblePets(), getVetListings()]);
  const action = bookConsultation.bind(null, "in_person");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="page-title">Vet Consultation</h1>
        <p className="page-subtitle">
          In-clinic visits with vets already on Pet Passport — book a time and they&apos;ll
          confirm.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {services.map((s) => (
          <div key={s.title} className="card-compact">
            <p className="font-semibold text-stone-900">{s.title}</p>
            <p className="mt-1 text-sm text-stone-500">{s.desc}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="section-title mb-4">Book a consultation</h2>
        <BookingForm pets={pets} vets={vets} action={action} submitLabel="Request appointment" />
      </section>
    </div>
  );
}
