"use client";

import { useState } from "react";
import { sendSOS } from "@/app/(app)/profile/actions";

export function SOSButton() {
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<"sent" | "error" | null>(null);

  async function handleConfirm() {
    setSending(true);
    setResult(null);
    try {
      await sendSOS();
      setResult("sent");
    } catch {
      setResult("error");
    } finally {
      setSending(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-stone-500">Alert your emergency contact?</span>
        <button
          type="button"
          disabled={sending}
          onClick={handleConfirm}
          className="rounded-md bg-[var(--danger)] px-2 py-1 text-xs font-semibold text-white"
        >
          {sending ? "Sending..." : "Confirm"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="text-xs text-stone-400">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-md border border-[var(--danger)] px-2 py-1 text-xs font-semibold text-[var(--danger)]"
      >
        SOS
      </button>
      {result === "sent" && <span className="text-xs text-[var(--success)]">Alert sent</span>}
      {result === "error" && (
        <span className="text-xs text-[var(--danger)]">Couldn&apos;t send — set an emergency contact in your profile</span>
      )}
    </div>
  );
}
