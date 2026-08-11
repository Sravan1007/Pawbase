import { Resend } from "resend";

// Sandbox default — works out of the box with no domain setup, but Resend
// restricts delivery to the account's own signup email until a sending
// domain is verified. Swap for a verified address (e.g. notifications@your
// domain) once one exists.
const FROM_ADDRESS = "Pet Passport <onboarding@resend.dev>";

// Best-effort: a failed email should never break the medication chain
// itself (confirming a prescription still has to succeed even if the
// notification doesn't go out). Callers don't need to await error handling.
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("sendEmail skipped: RESEND_API_KEY not set", { to, subject });
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from: FROM_ADDRESS, to, subject, html });
    if (error) console.error("sendEmail failed", { to, subject, error });
  } catch (err) {
    console.error("sendEmail threw", { to, subject, err });
  }
}

export function prescriptionReadyForReviewEmail(petName: string, dose: string, schedule: string) {
  return {
    subject: `${petName} has a new prescription to review`,
    html: `
      <p>A vet has prescribed medication for <strong>${petName}</strong>:</p>
      <p><strong>Dose:</strong> ${dose}<br><strong>Schedule:</strong> ${schedule}</p>
      <p>Review and confirm it in Pet Passport before any caretaker can mark a dose as given.</p>
    `,
  };
}

export function medicationConfirmedEmail(petName: string, dose: string, schedule: string) {
  return {
    subject: `${petName}'s medication is ready to administer`,
    html: `
      <p>The owner has confirmed a prescription for <strong>${petName}</strong>:</p>
      <p><strong>Dose:</strong> ${dose}<br><strong>Schedule:</strong> ${schedule}</p>
      <p>Open Pet Passport and tap "Confirmed given" each time you administer it — a photo of the
      medication is shown there so you can match it before confirming.</p>
    `,
  };
}
