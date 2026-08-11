import { createAdminClient } from "@/lib/supabase/admin";
import Image from "next/image";
import { notFound } from "next/navigation";

// Public, unauthenticated lost-and-found page. No login, no app install,
// and it must stay reachable regardless of the owner's subscription status
// — this route intentionally never checks `subscriptions`.
export default async function QrScanPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: tag } = await supabase
    .from("qr_tags")
    .select("id, status, pet_id, pets(id, name, photo_url, species, breed, medical_notes, owner_id, pet_code)")
    .eq("unique_slug", slug)
    .maybeSingle();

  if (!tag || !tag.pets) notFound();

  const pet = Array.isArray(tag.pets) ? tag.pets[0] : tag.pets;

  const { data: owner } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", pet.owner_id)
    .maybeSingle();

  const { data: secondaryContacts } = await supabase
    .from("caretaker_access")
    .select("finder_may_call, vet_may_call, profiles(full_name, phone)")
    .eq("pet_id", pet.id)
    .eq("role", "secondary_contact");

  const isLost = tag.status === "lost";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 bg-[var(--background)] px-5 py-8 text-stone-900">
      {isLost && (
        <div className="rounded-xl bg-[var(--danger)] px-4 py-3 text-center font-semibold text-white">
          This pet is reported lost — please contact the owner below
        </div>
      )}

      <div className="flex flex-col items-center gap-2 text-center">
        {pet.photo_url ? (
          <Image
            src={pet.photo_url}
            alt={pet.name}
            width={160}
            height={160}
            className="h-40 w-40 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-40 w-40 items-center justify-center rounded-full bg-[var(--accent-soft)] text-4xl">
            🐾
          </div>
        )}
        <h1 className="page-title">{pet.name}</h1>
        <p className="text-stone-500">{[pet.species, pet.breed].filter(Boolean).join(" · ")}</p>
        {pet.pet_code && <p className="font-mono text-xs text-stone-400">{pet.pet_code}</p>}
      </div>

      <section className="card">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Owner contact
        </h2>
        {owner ? (
          <div>
            <p className="font-medium text-stone-900">{owner.full_name}</p>
            {owner.phone && (
              <a href={`tel:${owner.phone}`} className="font-medium text-[var(--accent)] hover:underline">
                {owner.phone}
              </a>
            )}
          </div>
        ) : (
          <p className="text-stone-400">No owner contact on file</p>
        )}
      </section>

      {secondaryContacts && secondaryContacts.length > 0 && (
        <section className="card">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Secondary contact
          </h2>
          {secondaryContacts.map((sc, i) => {
            const contact = Array.isArray(sc.profiles) ? sc.profiles[0] : sc.profiles;
            if (!contact) return null;
            return (
              <div key={i} className="mb-2 last:mb-0">
                <p className="font-medium text-stone-900">{contact.full_name}</p>
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="font-medium text-[var(--accent)] hover:underline">
                    {contact.phone}
                  </a>
                )}
                <p className="text-xs text-stone-400">
                  {[sc.vet_may_call && "Vet may call", sc.finder_may_call && "Finder may call"]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            );
          })}
        </section>
      )}

      {pet.medical_notes && (
        <section className="card border-[var(--warning)]/30 bg-[var(--warning-soft)]">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--warning)]">
            Critical medical info
          </h2>
          <p className="whitespace-pre-wrap text-stone-800">{pet.medical_notes}</p>
        </section>
      )}

      <p className="mt-auto text-center text-xs text-stone-400">
        This page is provided by Pet Passport and stays available even if the
        owner&apos;s subscription has lapsed.
      </p>
    </main>
  );
}
