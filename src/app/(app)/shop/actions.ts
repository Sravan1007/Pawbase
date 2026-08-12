"use server";

import { requireUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function orderProduct(formData: FormData) {
  const { supabase } = await requireUser();

  const petId = String(formData.get("pet_id") ?? "");
  const productName = String(formData.get("product_name") ?? "");
  const price = String(formData.get("price") ?? "");

  if (!petId || !productName) {
    throw new Error("Pick a pet before ordering");
  }

  const { error } = await supabase.from("orders").insert({
    pet_id: petId,
    type: "shop",
    status: "pending",
    details: { product: productName, price, quantity: 1 },
  });

  if (error) throw new Error(error.message);
  revalidatePath("/shop");
}
