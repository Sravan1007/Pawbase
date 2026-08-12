import { createAdminClient } from "@/lib/supabase/admin";
import { one } from "@/lib/supabase/relations";
import Image from "next/image";
import { notFound } from "next/navigation";
import { NotifyOwnerButton } from "./NotifyOwnerButton";

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

  const pet = one(tag.pets)!;

  const [{ data: owner }, { data: secondaryContactRows }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, email").eq("id", pet.owner_id).maybeSingle(),
    supabase
      .from("caretaker_access")
      .select("finder_may_call, vet_may_call, profiles(full_name, phone)")
      .eq("pet_id", pet.id)
      .eq("role", "secondary_contact"),
  ]);

  // Only surface a secondary contact the owner actually opted in to expose
  // on this no-login public page — the two consent flags must gate
  // rendering, not just the caption text.
  const secondaryContacts = (secondaryContactRows ?? []).filter(
    (sc) => sc.finder_may_call || sc.vet_may_call,
  );

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
            width={200}
            height={200}
            className="h-48 w-48 rounded-full border-4 border-white object-cover shadow-lg"
          />
        ) : (
          <div className="flex h-48 w-48 items-center justify-center rounded-full bg-[var(--accent-soft)] text-5xl">
            🐾
          </div>
        )}
        {pet.photo_url && <p className="text-xs text-stone-400">Confirm this is the pet you found</p>}
        <h1 className="page-title">{pet.name}</h1>
        <p className="text-stone-500">{[pet.species, pet.breed].filter(Boolean).join(" · ")}</p>
        {pet.pet_code && (
          <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-4 py-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Pet ID</span>
            <span className="font-mono text-sm font-bold text-stone-900">{pet.pet_code}</span>
          </div>
        )}
      </div>

      <NotifyOwnerButton slug={slug} />

      <section className="card border-2 border-[var(--accent)]">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Owner contact
        </h2>
        {owner ? (
          <div className="flex flex-col gap-2">
            <p className="text-lg font-semibold text-stone-900">{owner.full_name}</p>
            <div className="flex flex-wrap gap-2">
              {owner.phone && (
                <a href={`tel:${owner.phone}`} className="btn-primary btn-sm">
                  📞 Call {owner.phone}
                </a>
              )}
              {owner.email && (
                <a href={`mailto:${owner.email}`} className="btn-secondary btn-sm">
                  ✉️ Email
                </a>
              )}
            </div>
          </div>
        ) : (
          <p className="text-stone-400">No owner contact on file</p>
        )}
      </section>

      {secondaryContacts.length > 0 && (
        <section className="card">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Secondary contact
          </h2>
          {secondaryContacts.map((sc, i) => {
            const contact = one(sc.profiles);
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
