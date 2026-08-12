"use client";

import { useEffect, useState } from "react";

// No scheduler/cron exists in this app — this is a client-computed
// "due now / overdue" read purely from the current time vs dose_times, not
// a pushed notification. Starts as null on both server and client render
// (nothing to compute without a real clock) and fills in after mount, to
// avoid a hydration mismatch from branching on `new Date()` during SSR.
export function DueStatus({ doseTimes }: { doseTimes: string[] }) {
  const [label, setLabel] = useState<{ text: string; overdue: boolean } | null>(null);

  useEffect(() => {
    if (doseTimes.length === 0) return;

    // Deferred to a callback (not called synchronously in the effect body)
    // to satisfy react-hooks/set-state-in-effect.
    const timer = setTimeout(() => {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      let closest: { minutes: number; diff: number; text: string } | null = null;
      for (const t of doseTimes) {
        const [h, m] = t.split(":").map(Number);
        if (Number.isNaN(h) || Number.isNaN(m)) continue;
        const minutes = h * 60 + m;
        const diff = minutes - nowMinutes;
        if (!closest || Math.abs(diff) < Math.abs(closest.diff)) {
          closest = { minutes, diff, text: t };
        }
      }
      if (!closest) return;

      if (closest.diff < -30) {
        setLabel({ text: `Overdue — was due ${closest.text}`, overdue: true });
      } else if (closest.diff <= 30) {
        setLabel({ text: `Due now (${closest.text})`, overdue: false });
      } else {
        setLabel({ text: `Next dose ${closest.text}`, overdue: false });
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [doseTimes]);

  if (!label) return null;

  return (
    <span className={label.overdue ? "badge-warning" : "badge-neutral"} title="Not a pushed reminder — this is just today's schedule read against your clock">
      {label.text}
    </span>
  );
}
