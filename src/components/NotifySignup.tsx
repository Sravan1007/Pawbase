"use client";

import { useState } from "react";
import { MorphingButton } from "@/components/ui/morphing-button";

export default function NotifySignup() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  if (submittedEmail) {
    return (
      <p className="text-sm text-stone-500">
        Thanks — we&apos;ll email <span className="font-medium text-stone-900">{submittedEmail}</span> when
        there&apos;s something new.
      </p>
    );
  }

  return <MorphingButton buttonText="Notify me" onSubmit={setSubmittedEmail} />;
}
