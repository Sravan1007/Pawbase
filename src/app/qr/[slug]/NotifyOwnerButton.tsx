"use client";

import { useState } from "react";
import { notifyOwner } from "./actions";

export function NotifyOwnerButton({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      await notifyOwner(slug, contact);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return <p className="text-sm font-medium text-[var(--success)]">✓ Owner notified — thank you!</p>;
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary w-full">
        📣 Notify owner I found this pet
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="field-label">
        Your phone or name (optional, so the owner can reach you)
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="e.g. 555-0100 or Jamie at the park"
          className="input"
        />
      </label>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <button type="button" onClick={handleSend} disabled={sending} className="btn-primary w-full">
        {sending ? "Sending..." : "Send notification"}
      </button>
    </div>
  );
}
