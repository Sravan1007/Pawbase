"use client";

import { useState } from "react";
import { addVisitNote } from "./actions";

export function VisitNoteForm({ petId }: { petId: string }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await addVisitNote(petId, note);
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save note");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="Remarks for this visit — visible to the owner"
        className="input"
      />
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
      <button type="submit" disabled={saving || !note.trim()} className="btn-secondary btn-sm self-start">
        {saving ? "Saving..." : "Add note"}
      </button>
    </form>
  );
}
