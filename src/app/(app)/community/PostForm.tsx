"use client";

import { useState } from "react";
import type { OwnedPet } from "@/lib/pets";
import { createPost } from "./actions";

export default function PostForm({ pets }: { pets: OwnedPet[] }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = e.currentTarget;
    try {
      await createPost(new FormData(form));
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-3">
      <textarea
        name="content"
        required
        rows={3}
        placeholder="Share a tip, a photo caption, or a question with other pet parents..."
        className="input"
      />
      {pets.length > 0 && (
        <label className="field-label">
          Tag a pet (optional)
          <select name="pet_id" defaultValue="" className="input">
            <option value="">No pet</option>
            {pets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <button type="submit" disabled={submitting} className="btn-primary self-start">
        {submitting ? "Posting..." : "Post"}
      </button>
    </form>
  );
}
