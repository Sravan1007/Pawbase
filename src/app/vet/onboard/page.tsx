import { onboardVet } from "./actions";

export default function VetOnboardPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="page-title">Vet profile</h1>
        <p className="page-subtitle">
          v1 onboarding is manual — enter your own credentials. There&apos;s no separate
          verification step yet; this is what shows as your trust signal on your profile.
        </p>
      </div>
      <form action={onboardVet} className="card flex flex-col gap-4">
        <label className="field-label">
          Clinic name
          <input name="clinic_name" placeholder="Sunrise Pet Clinic" className="input" />
        </label>
        <label className="field-label">
          Credentials
          <textarea
            name="credentials"
            rows={3}
            placeholder="e.g. DVM, board certifications"
            className="input"
          />
        </label>
        <label className="field-label">
          Years of experience
          <input name="years_experience" type="number" min={0} className="input" />
        </label>
        <button type="submit" className="btn-primary self-start">
          Save profile
        </button>
      </form>
    </div>
  );
}
