"use client";

import { useState } from "react";
import { deletePet } from "./actions";

export default function DeletePetButton({ petId, petName }: { petId: string; petName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setDeleting(true);
    setError(null);
    try {
      await deletePet(petId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete pet");
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-stone-500">Delete {petName} and all its records?</span>
        <button
          type="button"
          disabled={deleting}
          onClick={handleConfirm}
          className="rounded-md bg-[var(--danger)] px-2 py-1 text-xs font-semibold text-white"
        >
          {deleting ? "Deleting..." : "Confirm delete"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="text-xs text-stone-400">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs font-medium text-[var(--danger)] hover:underline"
      >
        Delete pet
      </button>
      {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}
