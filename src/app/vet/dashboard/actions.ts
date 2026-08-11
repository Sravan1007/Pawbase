"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function updateBookingStatus(
  bookingId: string,
  status: "confirmed" | "completed" | "cancelled",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("vet_bookings")
    .update({ status })
    .eq("id", bookingId)
    .eq("vet_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/vet/dashboard");
}
