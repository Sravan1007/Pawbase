import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/supabase/relations";
import { notFound } from "next/navigation";
import PrescribeForm from "./prescribe-form";

export default async function PrescribePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: pet } = await supabase.from("pets").select("name").eq("id", id).maybeSingle();
  if (!pet) notFound();

  const { data: caretakerRows } = await supabase
    .from("caretaker_access")
    .select("user_id, profiles(full_name, email)")
    .eq("pet_id", id)
    .eq("role", "caretaker");

  const caretakers = (caretakerRows ?? [])
    .map((c) => {
      const profile = one(c.profiles);
      return profile ? { id: c.user_id, label: profile.full_name || profile.email } : null;
    })
    .filter((c): c is { id: string; label: string } => Boolean(c));

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="page-title">Prescribe for {pet.name}</h1>
        <p className="page-subtitle">
          The owner reviews and confirms this before any caretaker can mark a dose as given.
        </p>
      </div>
      <PrescribeForm petId={id} caretakers={caretakers} />
    </div>
  );
}
