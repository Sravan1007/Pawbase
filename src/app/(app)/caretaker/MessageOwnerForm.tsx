"use client";

import { useState } from "react";
import { sendMessageToOwner } from "./actions";

export function MessageOwnerForm({ petId }: { petId: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      await sendMessageToOwner(petId, message);
      setMessage("");
      setSent(true);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost btn-sm">
        💬 Message owner
        {sent && <span className="ml-1 text-[var(--success)]">✓ sent</span>}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        placeholder="e.g. Biscuit seemed a bit low-energy today"
        className="input"
      />
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={handleSend} disabled={sending || !message.trim()} className="btn-primary btn-sm">
          {sending ? "Sending..." : "Send"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-stone-400">
          Cancel
        </button>
      </div>
    </div>
  );
}
