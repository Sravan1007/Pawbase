// Supabase's JS client types a joined to-one relation as `T | T[] | null`
// (the array case shows up depending on how the foreign key/relationship is
// inferred) — this normalizes either shape to a single row or null.
export function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
