import { requireUser } from "@/lib/supabase/server";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, dob, phone, photo_url, emergency_contact_name, emergency_contact_phone, emergency_contact_email")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="page-title">Your profile</h1>
        <p className="page-subtitle">
          Visible to people you share a pet with — owner, caretakers, and the vets you book with.
        </p>
      </div>
      <ProfileForm
        userId={user.id}
        profile={
          profile ?? {
            full_name: "",
            dob: null,
            phone: null,
            photo_url: null,
            emergency_contact_name: null,
            emergency_contact_phone: null,
            emergency_contact_email: null,
          }
        }
      />
    </div>
  );
}
