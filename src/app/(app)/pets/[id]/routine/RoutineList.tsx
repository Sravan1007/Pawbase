"use client";

import { useState } from "react";
import { logRoutineToday } from "./actions";

export type Routine = {
  id: string;
  title: string;
  notes: string | null;
  logs: { completed_on: string }[];
};

// "Today" resolves in the caretaker's own browser timezone, not the
// server's — same reasoning as the vet dashboard's day bucketing.
function todayLocal() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function RoutineList({ petId, routines }: { petId: string; routines: Routine[] }) {
  const [pending, setPending] = useState<string | null>(null);
  const today = todayLocal();

  async function handleLog(routineId: string) {
    setPending(routineId);
    try {
      await logRoutineToday(petId, routineId);
    } finally {
      setPending(null);
    }
  }

  if (routines.length === 0) {
    return <p className="text-sm text-stone-400">No routines set up yet — add one below.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {routines.map((r) => {
        const doneToday = r.logs.some((l) => l.completed_on === today);
        return (
          <li key={r.id} className="card-compact flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-stone-900">{r.title}</p>
              {r.notes && <p className="text-sm text-stone-500">{r.notes}</p>}
            </div>
            <button
              type="button"
              disabled={doneToday || pending === r.id}
              onClick={() => handleLog(r.id)}
              className={doneToday ? "badge-success" : "btn-secondary btn-sm"}
            >
              {doneToday ? "Done today" : pending === r.id ? "Saving..." : "Mark done today"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
