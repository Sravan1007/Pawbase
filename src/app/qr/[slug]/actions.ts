"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { one } from "@/lib/supabase/relations";
import { sendEmail, petFoundNotificationEmail } from "@/lib/email";

// Public, unauthenticated action — same trust model as the QR page itself
// (unique_slug is an unguessable UUID, not a login). Uses the admin client
// because there's no signed-in user to run this under.
export async function notifyOwner(slug: string, finderContact: string) {
  const supabase = createAdminClient();

  const { data: tag } = await supabase
    .from("qr_tags")
    .select("pets(name, owner_id)")
    .eq("unique_slug", slug)
    .maybeSingle();

  const pet = tag ? one(tag.pets) : null;
  if (!pet) throw new Error("Tag not found");

  const { data: owner } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", pet.owner_id)
    .maybeSingle();

  if (!owner?.email) throw new Error("No owner contact on file");

  const { subject, html } = petFoundNotificationEmail(pet.name, finderContact.trim() || null);
  await sendEmail({ to: owner.email, subject, html });
}
