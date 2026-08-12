"use server";

import { requireUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendEmail, sosAlertEmail } from "@/lib/email";

export async function updateProfile(data: {
  fullName: string;
  dob: string | null;
  phone: string;
  photoUrl: string | null;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactEmail: string;
}) {
  const { supabase, user } = await requireUser();

  const { data: existing } = await supabase
    .from("profiles")
    .select("photo_url")
    .eq("id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: data.fullName,
      dob: data.dob,
      phone: data.phone || null,
      photo_url: data.photoUrl ?? existing?.photo_url ?? null,
      emergency_contact_name: data.emergencyContactName || null,
      emergency_contact_phone: data.emergencyContactPhone || null,
      emergency_contact_email: data.emergencyContactEmail || null,
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/profile");
}

// Best-effort, immediate notification to the caller's own emergency
// contact — not tied to any specific pet. Never treated as confirmed
// delivery (same "best-effort" posture as every other email in the app,
// see src/lib/email.ts), so the UI just tells the user it was sent.
export async function sendSOS() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, emergency_contact_email")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.emergency_contact_email) {
    throw new Error("Add an emergency contact email in your profile first.");
  }

  const { subject, html } = sosAlertEmail(profile.full_name, new Date().toLocaleString());
  await sendEmail({ to: profile.emergency_contact_email, subject, html });
}
