import { requireUser } from "@/lib/supabase/server";
import VetOnboardForm from "./VetOnboardForm";

export default async function VetOnboardPage() {
  const { user } = await requireUser();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="page-title">Vet profile</h1>
        <p className="page-subtitle">
          v1 onboarding is manual — enter your own credentials. There&apos;s no separate
          verification step yet; this is what shows as your trust signal and on the public
          clinic directory.
        </p>
      </div>
      <VetOnboardForm userId={user.id} />
    </div>
  );
}
