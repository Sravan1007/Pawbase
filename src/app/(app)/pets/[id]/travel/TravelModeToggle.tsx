"use client";

import { useState } from "react";
import { setTravelMode } from "./actions";

export default function TravelModeToggle({
  petId,
  active,
  destination,
}: {
  petId: string;
  active: boolean;
  destination: string | null;
}) {
  const [saving, setSaving] = useState(false);

  async function handleStart() {
    setSaving(true);
    try {
      await setTravelMode(petId, true, destination);
    } finally {
      setSaving(false);
    }
  }

  async function handleEnd() {
    setSaving(true);
    try {
      await setTravelMode(petId, false, null);
    } finally {
      setSaving(false);
    }
  }

  if (active) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-[var(--accent-soft)] px-4 py-3">
        <span className="text-sm text-stone-700">
          ✈️ Traveling mode is on{destination ? ` — heading to ${destination}` : ""}. A
          &quot;Traveling&quot; tab is showing nearby vets in the nav.
        </span>
        <button type="button" onClick={handleEnd} disabled={saving} className="btn-secondary btn-sm shrink-0">
          {saving ? "Saving..." : "End trip"}
        </button>
      </div>
    );
  }

  return (
    <button type="button" onClick={handleStart} disabled={saving} className="btn-secondary self-start">
      {saving ? "Saving..." : "Start traveling mode"}
    </button>
  );
}
