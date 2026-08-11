"use client";

import { useState } from "react";
import { saveChecklistProgress } from "./actions";

export default function ChecklistCard({
  petId,
  ruleset,
  lastVerifiedLabel,
  initialFulfilled,
}: {
  petId: string;
  ruleset: { id: string; name: string; kind: string; required_documents: string[] };
  lastVerifiedLabel: string;
  initialFulfilled: string[];
}) {
  const [fulfilled, setFulfilled] = useState<Set<string>>(new Set(initialFulfilled));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggle(doc: string) {
    setSaved(false);
    setFulfilled((prev) => {
      const next = new Set(prev);
      if (next.has(doc)) next.delete(doc);
      else next.add(doc);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveChecklistProgress(petId, ruleset.id, Array.from(fulfilled));
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const allDone = ruleset.required_documents.every((d) => fulfilled.has(d));

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-stone-900">{ruleset.name}</p>
          <p className="text-xs text-stone-400">Last verified {lastVerifiedLabel}</p>
        </div>
        {allDone && <span className="badge-success shrink-0">All set</span>}
      </div>

      <ul className="flex flex-col gap-2">
        {ruleset.required_documents.map((doc) => (
          <li key={doc}>
            <label className="flex items-start gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={fulfilled.has(doc)}
                onChange={() => toggle(doc)}
                className="mt-0.5"
              />
              {doc}
            </label>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-secondary btn-sm">
          {saving ? "Saving..." : "Save progress"}
        </button>
        {saved && <span className="text-xs text-[var(--success)]">Saved ✓</span>}
      </div>
    </div>
  );
}
