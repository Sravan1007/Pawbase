"use client";

import { useState } from "react";
import { deletePet } from "./actions";

// Native confirm() rather than the two-step inline UI used on the pet
// detail page (DeletePetButton) — this sits inside a card that's otherwise
// a single big <Link>, so there's no room for expanded confirm state
// without restructuring the whole card.
export default function QuickDeleteButton({ petId, petName }: { petId: string; petName: string }) {
  const [deleting, setDeleting] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete ${petName} and all its records? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await deletePet(petId);
    } catch {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={deleting}
      title={`Delete ${petName}`}
      className="absolute right-2 top-2 rounded-full p-1 text-stone-400 hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
    >
      {deleting ? "…" : "✕"}
    </button>
  );
}
