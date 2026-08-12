"use server";

import { requireUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateBookingStatus(
  bookingId: string,
  status: "confirmed" | "completed" | "cancelled",
) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("vet_bookings")
    .update({ status })
    .eq("id", bookingId)
    .eq("vet_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/vet/dashboard");
}

// The call link the vet is using for a virtual consultation (Zoom/Meet/
// whatever they use) — no built-in video calling in v1, this is just a
// place for the owner to find the link the vet already sent.
export async function setMeetingLink(bookingId: string, meetingUrl: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("vet_bookings")
    .update({ meeting_url: meetingUrl || null })
    .eq("id", bookingId)
    .eq("vet_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/vet/dashboard");
}

// Resolves a human-readable Pet ID (PP-XXXXXX) to the internal pet id and
// sends the vet to the existing appointment-scoped patient history page —
// doesn't grant any new visibility, just a faster way in than clicking
// through from a booking.
export async function lookupPetByCode(formData: FormData) {
  const code = String(formData.get("pet_code") ?? "").trim().toUpperCase();
  if (!code) return;

  const { supabase } = await requireUser();
  const { data: pet } = await supabase.from("pets").select("id").eq("pet_code", code).maybeSingle();

  if (!pet) {
    redirect(`/vet/dashboard?lookup_error=1`);
  }
  redirect(`/vet/pets/${pet.id}/patient`);
}
