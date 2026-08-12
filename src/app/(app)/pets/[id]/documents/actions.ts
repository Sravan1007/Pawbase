"use server";

import { requireUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createDocument(
  petId: string,
  data: { type: string; filePath: string; expiryDate: string | null },
) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("documents").insert({
    pet_id: petId,
    type: data.type,
    file_url: data.filePath, // storage object path — bucket is private, resolved to a signed URL on read
    expiry_date: data.expiryDate,
    uploaded_by: user.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/pets/${petId}/documents`);
}

export async function shareDocumentWithVet(petId: string, formData: FormData) {
  const { supabase, user } = await requireUser();

  const documentId = String(formData.get("document_id") ?? "");
  const bookingId = String(formData.get("booking_id") ?? "");
  if (!documentId || !bookingId) throw new Error("Pick a booking to share with");

  const { data: booking, error: bookingError } = await supabase
    .from("vet_bookings")
    .select("vet_id, pet_id")
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) throw new Error("Booking not found");
  if (booking.pet_id !== petId) throw new Error("That booking isn't for this pet");

  const { error } = await supabase.from("document_shares").insert({
    document_id: documentId,
    booking_id: bookingId,
    vet_id: booking.vet_id,
    shared_by: user.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/pets/${petId}/documents`);
}

export async function revokeDocumentShare(petId: string, shareId: string) {
  const { supabase } = await requireUser();

  const { error } = await supabase.from("document_shares").delete().eq("id", shareId);
  if (error) throw new Error(error.message);
  revalidatePath(`/pets/${petId}/documents`);
}
